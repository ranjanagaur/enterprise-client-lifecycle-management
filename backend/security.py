import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from backend.database import SessionLocal
from backend import models

PBKDF2_ROUNDS = 200_000


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ROUNDS,
    )
    return f"pbkdf2_sha256${PBKDF2_ROUNDS}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, rounds, salt, digest = stored.split("$", 3)
    except ValueError:
        return False
    if algorithm != "pbkdf2_sha256":
        return False
    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        int(rounds),
    ).hex()
    return secrets.compare_digest(candidate, digest)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_session(db: Session, user: models.User) -> str:
    token = secrets.token_urlsafe(32)
    db.add(
        models.SessionToken(
            user_id=user.id,
            token_hash=_hash_token(token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=12),
        )
    )
    return token


def _user_from_header(authorization: str | None, db: Session) -> models.User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in required.")
    token = authorization.split(" ", 1)[1].strip()
    row = (
        db.query(models.SessionToken)
        .filter(models.SessionToken.token_hash == _hash_token(token))
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=401, detail="Sign in required.")
    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Your session has expired.")
    user = db.query(models.User).filter(models.User.id == row.user_id).one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Sign in required.")
    return user


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.User:
    return _user_from_header(authorization, db)


def get_employee(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> models.User:
    user = _user_from_header(authorization, db)
    if user.portal_role != "employee":
        raise HTTPException(status_code=403, detail="Employee access is required.")
    return user


def revoke_session(db: Session, authorization: str | None) -> None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return
    token = authorization.split(" ", 1)[1].strip()
    db.query(models.SessionToken).filter(
        models.SessionToken.token_hash == _hash_token(token)
    ).delete()
    db.commit()
