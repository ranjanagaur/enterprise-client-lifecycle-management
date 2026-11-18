"""Customer and employee onboarding routes.

Questionnaire text served here is demonstration sample content.
"""

import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend import models
from backend.security import (
    get_current_user,
    get_db,
    get_employee,
    hash_password,
    issue_session,
    revoke_session,
    verify_password,
)

router = APIRouter()
STORAGE = Path(__file__).resolve().parent / "storage"
MAX_BYTES = 10 * 1024 * 1024
ALLOWED_SUFFIXES = {".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx", ".txt"}
STATUSES = {
    "Draft",
    "Pending",
    "Submitted",
    "Under Review",
    "Information Required",
    "Resubmitted",
    "Approved",
    "Rejected",
}


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ResetRequest(BaseModel):
    email: EmailStr


class ResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class ProfileUpdate(BaseModel):
    trading_name: str | None = None
    registered_address: str | None = None
    principal_place_of_business: str | None = None
    designation: str | None = None
    contact_number: str | None = None


class LanguageUpdate(BaseModel):
    language: str


class AnswerUpdate(BaseModel):
    language: str = "en"
    answers: list[dict]


class PartyBody(BaseModel):
    party_type: str
    full_name: str = Field(min_length=2, max_length=200)
    date_of_birth: str | None = None
    nationality: str | None = None
    relationship_to_organisation: str | None = None
    ownership_percentage: str | None = None
    country_of_residence: str | None = None


class RequestReply(BaseModel):
    message: str = Field(min_length=2)


class StatusBody(BaseModel):
    status: str


class ReviewBody(BaseModel):
    outcome: str
    comment: str | None = None


class InfoRequestBody(BaseModel):
    description: str = Field(min_length=3)
    related_type: str | None = None
    due_date: str | None = None


class RiskBody(BaseModel):
    country_risk: str
    business_risk: str
    ownership_risk: str
    pep_status: str
    sanctions_status: str
    notes: str | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _audit(db: Session, actor_id: int | None, application_id: int | None, event: str, detail: str) -> None:
    db.add(
        models.AuditLog(
            actor_user_id=actor_id,
            application_id=application_id,
            event=event,
            detail=detail,
        )
    )


def _notify(db: Session, user_id: int, title: str, body: str) -> None:
    db.add(models.Notification(user_id=user_id, title=title, body=body))


def _membership(db: Session, user: models.User) -> models.OrganisationMember:
    membership = (
        db.query(models.OrganisationMember)
        .filter(models.OrganisationMember.user_id == user.id)
        .first()
    )
    if membership is None:
        raise HTTPException(status_code=403, detail="No organisation is linked to this account.")
    return membership


def _application_for_org(db: Session, organisation_id: int) -> models.OnboardingApplication:
    application = (
        db.query(models.OnboardingApplication)
        .filter(models.OnboardingApplication.organisation_id == organisation_id)
        .order_by(models.OnboardingApplication.id.desc())
        .first()
    )
    if application is None:
        raise HTTPException(status_code=404, detail="No onboarding application was found.")
    return application


def _sync_status(db: Session, application: models.OnboardingApplication, status: str) -> None:
    application.status = status
    application.updated_at = _now()
    organisation = db.query(models.Organisation).filter(models.Organisation.id == application.organisation_id).one()
    client = db.query(models.Client).filter(models.Client.id == organisation.client_id).one()
    client.onboarding_status = status


def _sample_version(db: Session) -> models.QuestionnaireVersion:
    template = (
        db.query(models.QuestionnaireTemplate)
        .filter(models.QuestionnaireTemplate.code == "corporate_ddq_sample")
        .one()
    )
    return (
        db.query(models.QuestionnaireVersion)
        .filter(models.QuestionnaireVersion.template_id == template.id)
        .order_by(models.QuestionnaireVersion.version_number.desc())
        .first()
    )


def _assignment(db: Session, application: models.OnboardingApplication) -> models.QuestionnaireAssignment:
    version = _sample_version(db)
    assignment = (
        db.query(models.QuestionnaireAssignment)
        .filter(
            models.QuestionnaireAssignment.application_id == application.id,
            models.QuestionnaireAssignment.version_id == version.id,
        )
        .one_or_none()
    )
    if assignment is None:
        assignment = models.QuestionnaireAssignment(
            application_id=application.id,
            version_id=version.id,
        )
        db.add(assignment)
        db.flush()
    return assignment


def _latest_response(db: Session, assignment_id: int) -> models.QuestionnaireResponse | None:
    return (
        db.query(models.QuestionnaireResponse)
        .filter(models.QuestionnaireResponse.assignment_id == assignment_id)
        .order_by(models.QuestionnaireResponse.version_number.desc())
        .first()
    )


def _editable_response(db: Session, assignment_id: int, user: models.User, language: str) -> models.QuestionnaireResponse:
    current = _latest_response(db, assignment_id)
    if current is None:
        current = models.QuestionnaireResponse(
            assignment_id=assignment_id,
            version_number=1,
            status="draft",
            language_code=language,
        )
        db.add(current)
        db.flush()
        return current
    if current.status == "draft":
        current.language_code = language
        return current
    raise HTTPException(
        status_code=409,
        detail="This questionnaire version is submitted. A reviewer must request more information before it can be edited.",
    )


def create_customer_account(
    db: Session,
    client: models.Client,
    password: str | None,
    designation: str | None,
    trading_name: str | None,
) -> None:
    db.flush()
    organisation = (
        db.query(models.Organisation)
        .filter(models.Organisation.client_id == client.id)
        .one()
    )
    if trading_name:
        organisation.trading_name = trading_name
    if not password:
        return
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")
    user = models.User(
        email=client.business_email,
        password_hash=hash_password(password),
        full_name=client.contact_name,
        designation=designation,
        portal_role="customer",
        preferred_language="en",
    )
    db.add(user)
    db.flush()
    db.add(
        models.OrganisationMember(
            organisation_id=organisation.id,
            user_id=user.id,
            member_role="customer_admin",
        )
    )
    application = _application_for_org(db, organisation.id)
    _notify(db, user.id, "Registration completed", "Your organisation account is ready.")
    _audit(db, user.id, application.id, "application_created", "Customer account created with the registration.")


def _public_user(user: models.User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "designation": user.designation,
        "portal_role": user.portal_role,
        "preferred_language": user.preferred_language,
    }


@router.post("/auth/login")
def login(body: LoginBody, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).one_or_none()
    if user is None or not user.is_active or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email or password is incorrect.")
    token = issue_session(db, user)
    db.commit()
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}


@router.post("/auth/logout")
def logout(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    revoke_session(db, authorization)
    return {"message": "Signed out."}


@router.get("/auth/me")
def me(user: models.User = Depends(get_current_user)):
    return _public_user(user)


@router.post("/auth/password-reset/request")
def request_reset(body: ResetRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).one_or_none()
    demonstration_code = None
    if user is not None:
        token = secrets.token_urlsafe(24)
        db.add(
            models.PasswordResetToken(
                user_id=user.id,
                token_hash=__import__("hashlib").sha256(token.encode()).hexdigest(),
                expires_at=_now() + timedelta(minutes=30),
            )
        )
        db.commit()
        demonstration_code = token
    return {
        "message": "If the email is registered, a reset code is available. Email delivery is not connected in this demonstration.",
        "demonstration_reset_code": demonstration_code,
    }


@router.post("/auth/password-reset/confirm")
def confirm_reset(body: ResetConfirm, db: Session = Depends(get_db)):
    import hashlib

    token_hash = hashlib.sha256(body.token.encode()).hexdigest()
    row = (
        db.query(models.PasswordResetToken)
        .filter(models.PasswordResetToken.token_hash == token_hash)
        .one_or_none()
    )
    if row is None or row.used_at is not None:
        raise HTTPException(status_code=400, detail="This reset code is not valid.")
    expires_at = row.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < _now():
        raise HTTPException(status_code=400, detail="This reset code has expired.")
    user = db.query(models.User).filter(models.User.id == row.user_id).one()
    user.password_hash = hash_password(body.new_password)
    row.used_at = _now()
    db.commit()
    return {"message": "Password updated. You can sign in."}


@router.post("/auth/password")
def change_password(
    body: PasswordChange,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "Password updated."}


@router.put("/auth/language")
def update_language(
    body: LanguageUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    allowed = {
        "en", "zh", "hi", "es", "fr", "ar", "bn", "pt", "ru", "ur", "id", "de", "ja", "sw", "mr", "te",
        "tr", "ta", "vi", "ko", "fa", "it", "pl", "uk", "nl", "th", "gu", "pa", "ms", "he", "cs", "ro",
        "hu", "el", "sv", "da", "fi", "no", "sk", "bg", "sr", "hr", "lt", "sl", "et", "ca", "sq", "af", "ga", "tl",
    }
    if body.language not in allowed:
        raise HTTPException(status_code=422, detail="That language is not available.")
    user.preferred_language = body.language
    db.commit()
    return _public_user(user)


def _questionnaire_payload(db: Session, application: models.OnboardingApplication, language: str) -> dict:
    assignment = _assignment(db, application)
    response = _latest_response(db, assignment.id)
    answers = {}
    if response is not None:
        for answer in db.query(models.ResponseAnswer).filter(models.ResponseAnswer.response_id == response.id):
            answers[answer.question_id] = answer.value_text
    sections = (
        db.query(models.QuestionnaireSection)
        .filter(models.QuestionnaireSection.version_id == assignment.version_id)
        .order_by(models.QuestionnaireSection.position)
        .all()
    )
    payload_sections = []
    for section in sections:
        title_row = (
            db.query(models.SectionTranslation)
            .filter(
                models.SectionTranslation.section_id == section.id,
                models.SectionTranslation.language_code == language,
            )
            .one_or_none()
        )
        if title_row is None:
            title_row = (
                db.query(models.SectionTranslation)
                .filter(
                    models.SectionTranslation.section_id == section.id,
                    models.SectionTranslation.language_code == "en",
                )
                .one()
            )
        questions = (
            db.query(models.Question)
            .filter(models.Question.section_id == section.id)
            .order_by(models.Question.position)
            .all()
        )
        question_payload = []
        required_done = 0
        required_total = 0
        for question in questions:
            prompt = (
                db.query(models.QuestionTranslation)
                .filter(
                    models.QuestionTranslation.question_id == question.id,
                    models.QuestionTranslation.language_code == language,
                )
                .one_or_none()
            )
            if prompt is None:
                prompt = (
                    db.query(models.QuestionTranslation)
                    .filter(
                        models.QuestionTranslation.question_id == question.id,
                        models.QuestionTranslation.language_code == "en",
                    )
                    .one()
                )
            english = (
                db.query(models.QuestionTranslation)
                .filter(
                    models.QuestionTranslation.question_id == question.id,
                    models.QuestionTranslation.language_code == "en",
                )
                .one()
            )
            options = []
            for option in (
                db.query(models.AnswerOption)
                .filter(models.AnswerOption.question_id == question.id)
                .order_by(models.AnswerOption.position)
            ):
                label = (
                    db.query(models.AnswerOptionTranslation)
                    .filter(
                        models.AnswerOptionTranslation.option_id == option.id,
                        models.AnswerOptionTranslation.language_code == language,
                    )
                    .one_or_none()
                )
                if label is None:
                    label = (
                        db.query(models.AnswerOptionTranslation)
                        .filter(
                            models.AnswerOptionTranslation.option_id == option.id,
                            models.AnswerOptionTranslation.language_code == "en",
                        )
                        .one()
                    )
                options.append({"id": option.id, "code": option.code, "label": label.label})
            value = answers.get(question.id, "")
            if question.is_required:
                required_total += 1
                if value:
                    required_done += 1
            question_payload.append({
                "id": question.id,
                "code": question.code,
                "type": question.question_type,
                "required": question.is_required,
                "prompt": prompt.prompt,
                "english_prompt": english.prompt,
                "approval_status": prompt.approval_status,
                "options": options,
                "answer": value or "",
            })
        payload_sections.append({
            "id": section.id,
            "code": section.code,
            "position": section.position,
            "title": title_row.title,
            "approval_status": title_row.approval_status,
            "complete": required_total == 0 or required_done == required_total,
            "questions": question_payload,
        })
    complete_sections = sum(1 for section in payload_sections if section["complete"])
    return {
        "language": language,
        "notice": "Demonstration sample questions. This is not approved legal or regulatory wording.",
        "translation_status": "sample" if language == "en" else "demonstration",
        "response_status": response.status if response else "not_started",
        "response_version": response.version_number if response else 0,
        "submitted_at": response.submitted_at.isoformat() if response and response.submitted_at else None,
        "editable": response is None or response.status == "draft",
        "sections_complete": complete_sections,
        "sections_total": len(payload_sections),
        "sections": payload_sections,
    }


def _document_payload(db: Session, organisation_id: int) -> list[dict]:
    documents = (
        db.query(models.Document)
        .filter(models.Document.organisation_id == organisation_id)
        .order_by(models.Document.id.desc())
        .all()
    )
    payload = []
    for document in documents:
        versions = (
            db.query(models.DocumentVersion)
            .filter(models.DocumentVersion.document_id == document.id)
            .order_by(models.DocumentVersion.version_number.desc())
            .all()
        )
        requirement_ids = [
            link.requirement_id
            for link in db.query(models.DocumentRequirementLink).filter(
                models.DocumentRequirementLink.document_id == document.id
            )
        ]
        latest_review = None
        if versions:
            latest_review = (
                db.query(models.DocumentReview)
                .filter(models.DocumentReview.version_id == versions[0].id)
                .order_by(models.DocumentReview.id.desc())
                .first()
            )
        payload.append({
            "id": document.id,
            "category": document.category,
            "description": document.description,
            "status": document.status,
            "party_id": document.party_id,
            "requirement_ids": requirement_ids,
            "feedback": latest_review.comment if latest_review else None,
            "versions": [
                {
                    "id": version.id,
                    "version_number": version.version_number,
                    "filename": version.original_filename,
                    "uploaded_at": version.uploaded_at.isoformat() if version.uploaded_at else None,
                }
                for version in versions
            ],
        })
    return payload


@router.get("/customer/workspace")
def customer_workspace(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.portal_role != "customer":
        raise HTTPException(status_code=403, detail="Customer access is required.")
    membership = _membership(db, user)
    organisation = db.query(models.Organisation).filter(models.Organisation.id == membership.organisation_id).one()
    client = db.query(models.Client).filter(models.Client.id == organisation.client_id).one()
    application = _application_for_org(db, organisation.id)
    questionnaire = _questionnaire_payload(db, application, user.preferred_language)
    requirements = db.query(models.DocumentRequirement).order_by(models.DocumentRequirement.position).all()
    documents = _document_payload(db, organisation.id)
    satisfied = set()
    for document in documents:
        if document["status"] != "Rejected":
            satisfied.update(document["requirement_ids"])
    parties = db.query(models.RelatedParty).filter(models.RelatedParty.organisation_id == organisation.id).all()
    requests = (
        db.query(models.InformationRequest)
        .filter(models.InformationRequest.application_id == application.id)
        .order_by(models.InformationRequest.id.desc())
        .all()
    )
    notifications = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == user.id)
        .order_by(models.Notification.id.desc())
        .limit(20)
        .all()
    )
    profile_fields = [
        organisation.legal_name,
        organisation.country_of_incorporation,
        organisation.registered_address,
        organisation.principal_place_of_business,
        client.contact_name,
        client.business_email,
        client.contact_number,
    ]
    profile_percent = round(sum(1 for value in profile_fields if value) / len(profile_fields) * 100)
    questionnaire_percent = round(
        questionnaire["sections_complete"] / questionnaire["sections_total"] * 100
    ) if questionnaire["sections_total"] else 0
    open_requests = [row for row in requests if row.status == "Open"]
    if questionnaire["response_status"] != "submitted":
        next_action = "Complete the sample due diligence questionnaire"
    elif len(satisfied) < len(requirements):
        next_action = "Upload the outstanding company documents"
    elif open_requests:
        next_action = "Reply to the open information request"
    else:
        next_action = "Wait for the employee review"
    return {
        "user": _public_user(user),
        "organisation": {
            "id": organisation.id,
            "legal_name": organisation.legal_name,
            "trading_name": organisation.trading_name,
            "registration_number": organisation.registration_number,
            "country_of_incorporation": organisation.country_of_incorporation,
            "registered_address": organisation.registered_address,
            "principal_place_of_business": organisation.principal_place_of_business,
            "contact_name": client.contact_name,
            "business_email": client.business_email,
            "contact_number": client.contact_number,
        },
        "application": {
            "id": application.id,
            "reference": application.reference,
            "status": application.status,
        },
        "progress": {
            "profile_percent": profile_percent,
            "questionnaire_percent": questionnaire_percent,
            "documents_satisfied": len(satisfied),
            "documents_required": len(requirements),
            "people_unlocked": questionnaire["response_status"] == "submitted",
            "open_requests": len(open_requests),
            "next_action": next_action,
        },
        "requirements": [
            {"id": item.id, "code": item.code, "name": item.name, "satisfied": item.id in satisfied}
            for item in requirements
        ],
        "notifications": [
            {
                "id": item.id,
                "title": item.title,
                "body": item.body,
                "is_read": item.is_read,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in notifications
        ],
        "parties": len(parties),
    }


@router.put("/customer/profile")
def update_profile(
    body: ProfileUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _membership(db, user)
    organisation = db.query(models.Organisation).filter(models.Organisation.id == membership.organisation_id).one()
    client = db.query(models.Client).filter(models.Client.id == organisation.client_id).one()
    if body.trading_name is not None:
        organisation.trading_name = body.trading_name
    if body.registered_address is not None:
        organisation.registered_address = body.registered_address
    if body.principal_place_of_business is not None:
        organisation.principal_place_of_business = body.principal_place_of_business
    if body.designation is not None:
        user.designation = body.designation
    if body.contact_number is not None:
        client.contact_number = body.contact_number
    application = _application_for_org(db, organisation.id)
    _audit(db, user.id, application.id, "profile_updated", "Organisation profile updated.")
    db.commit()
    return {"message": "Profile saved."}


@router.get("/customer/questionnaire")
def get_questionnaire(
    language: str = "en",
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _membership(db, user)
    application = _application_for_org(db, membership.organisation_id)
    db.commit()
    return _questionnaire_payload(db, application, language)


@router.put("/customer/questionnaire")
def save_questionnaire(
    body: AnswerUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _membership(db, user)
    application = _application_for_org(db, membership.organisation_id)
    assignment = _assignment(db, application)
    response = _editable_response(db, assignment.id, user, body.language)
    for item in body.answers:
        question_id = int(item.get("question_id"))
        value = str(item.get("value") or "")
        existing = (
            db.query(models.ResponseAnswer)
            .filter(
                models.ResponseAnswer.response_id == response.id,
                models.ResponseAnswer.question_id == question_id,
            )
            .one_or_none()
        )
        if existing is None:
            db.add(models.ResponseAnswer(response_id=response.id, question_id=question_id, value_text=value))
        else:
            existing.value_text = value
    if application.status == "Pending":
        _sync_status(db, application, "Draft")
    _audit(db, user.id, application.id, "questionnaire_draft_saved", "Questionnaire draft saved.")
    db.commit()
    return _questionnaire_payload(db, application, body.language)


@router.post("/customer/questionnaire/submit")
def submit_questionnaire(
    language: str = "en",
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _membership(db, user)
    application = _application_for_org(db, membership.organisation_id)
    payload = _questionnaire_payload(db, application, language)
    missing = [
        question["prompt"]
        for section in payload["sections"]
        for question in section["questions"]
        if question["required"] and not str(question["answer"]).strip()
    ]
    if missing:
        raise HTTPException(status_code=422, detail="Complete the required sample questions before submitting.")
    assignment = _assignment(db, application)
    response = _editable_response(db, assignment.id, user, language)
    response.status = "submitted"
    response.submitted_at = _now()
    response.submitted_by = user.id
    next_status = "Resubmitted" if response.version_number > 1 else "Submitted"
    if application.status in {"Pending", "Draft", "Information Required"}:
        _sync_status(db, application, next_status)
        if next_status == "Submitted":
            application.submitted_at = _now()
    _notify(db, user.id, "Questionnaire submitted", "Your sample questionnaire was submitted and is now read-only.")
    _audit(db, user.id, application.id, "questionnaire_submitted", f"Version {response.version_number} submitted in {language}.")
    db.commit()
    return _questionnaire_payload(db, application, language)


@router.get("/customer/documents")
def list_documents(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = _membership(db, user)
    return {"documents": _document_payload(db, membership.organisation_id)}


@router.post("/customer/documents")
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("company"),
    description: str = Form(""),
    requirement_ids: str = Form(""),
    party_id: str = Form(""),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _membership(db, user)
    application = _application_for_org(db, membership.organisation_id)
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(status_code=422, detail="Upload a PDF, image, Word, or text file.")
    content = await file.read()
    if not content:
        raise HTTPException(status_code=422, detail="The file is empty.")
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=422, detail="Files must be 10 MB or smaller.")
    if category == "party":
        questionnaire = _questionnaire_payload(db, application, "en")
        if questionnaire["response_status"] != "submitted":
            raise HTTPException(status_code=409, detail="People documents open after the questionnaire is submitted.")
    document = models.Document(
        organisation_id=membership.organisation_id,
        application_id=application.id,
        party_id=int(party_id) if party_id else None,
        category=category,
        description=description or file.filename,
        status="Pending",
    )
    db.add(document)
    db.flush()
    for raw_id in requirement_ids.split(","):
        if raw_id.strip().isdigit():
            db.add(models.DocumentRequirementLink(document_id=document.id, requirement_id=int(raw_id)))
    stored_name = f"{secrets.token_hex(16)}{suffix}"
    STORAGE.mkdir(parents=True, exist_ok=True)
    (STORAGE / stored_name).write_bytes(content)
    db.add(
        models.DocumentVersion(
            document_id=document.id,
            version_number=1,
            original_filename=file.filename or stored_name,
            stored_name=stored_name,
            media_type=file.content_type,
            size_bytes=len(content),
            uploaded_by=user.id,
        )
    )
    _notify(db, user.id, "Document uploaded", description or file.filename or "A document was uploaded.")
    _audit(db, user.id, application.id, "document_uploaded", file.filename or stored_name)
    db.commit()
    return {"documents": _document_payload(db, membership.organisation_id)}


@router.get("/customer/documents/{version_id}")
def download_own_document(
    version_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _membership(db, user)
    version = db.query(models.DocumentVersion).filter(models.DocumentVersion.id == version_id).one_or_none()
    if version is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    document = db.query(models.Document).filter(models.Document.id == version.document_id).one()
    if document.organisation_id != membership.organisation_id:
        raise HTTPException(status_code=403, detail="You cannot open this document.")
    path = STORAGE / version.stored_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="The stored file is missing.")
    return FileResponse(path, filename=version.original_filename, media_type=version.media_type)


@router.get("/customer/parties")
def list_parties(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = _membership(db, user)
    rows = db.query(models.RelatedParty).filter(models.RelatedParty.organisation_id == membership.organisation_id).all()
    return {"parties": [_party(row) for row in rows]}


def _party(row: models.RelatedParty) -> dict:
    return {
        "id": row.id,
        "party_type": row.party_type,
        "full_name": row.full_name,
        "date_of_birth": row.date_of_birth,
        "nationality": row.nationality,
        "relationship_to_organisation": row.relationship_to_organisation,
        "ownership_percentage": row.ownership_percentage,
        "country_of_residence": row.country_of_residence,
    }


@router.post("/customer/parties")
def add_party(
    body: PartyBody,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.party_type not in {"director", "beneficial_owner", "key_controller"}:
        raise HTTPException(status_code=422, detail="Unknown person type.")
    membership = _membership(db, user)
    application = _application_for_org(db, membership.organisation_id)
    questionnaire = _questionnaire_payload(db, application, "en")
    if questionnaire["response_status"] != "submitted":
        raise HTTPException(status_code=409, detail="Add people after the questionnaire is submitted.")
    row = models.RelatedParty(organisation_id=membership.organisation_id, **body.model_dump())
    db.add(row)
    _audit(db, user.id, application.id, "party_added", f"{body.party_type}: {body.full_name}")
    db.commit()
    db.refresh(row)
    return _party(row)


@router.get("/customer/requests")
def customer_requests(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    membership = _membership(db, user)
    application = _application_for_org(db, membership.organisation_id)
    rows = (
        db.query(models.InformationRequest)
        .filter(models.InformationRequest.application_id == application.id)
        .order_by(models.InformationRequest.id.desc())
        .all()
    )
    return {"requests": [_request_payload(db, row) for row in rows]}


def _request_payload(db: Session, row: models.InformationRequest) -> dict:
    replies = (
        db.query(models.InformationRequestReply)
        .filter(models.InformationRequestReply.request_id == row.id)
        .order_by(models.InformationRequestReply.id)
        .all()
    )
    return {
        "id": row.id,
        "reference": row.reference,
        "description": row.description,
        "related_type": row.related_type,
        "due_date": row.due_date,
        "status": row.status,
        "replies": [
            {"id": reply.id, "message": reply.message, "submitted_at": reply.submitted_at.isoformat() if reply.submitted_at else None}
            for reply in replies
        ],
    }


@router.post("/customer/requests/{request_id}/reply")
def reply_request(
    request_id: int,
    body: RequestReply,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    membership = _membership(db, user)
    application = _application_for_org(db, membership.organisation_id)
    row = (
        db.query(models.InformationRequest)
        .filter(
            models.InformationRequest.id == request_id,
            models.InformationRequest.application_id == application.id,
        )
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Request not found.")
    if row.status == "Closed":
        raise HTTPException(status_code=409, detail="This request is closed.")
    db.add(models.InformationRequestReply(request_id=row.id, message=body.message, submitted_by=user.id))
    row.status = "Responded"
    _notify(db, user.id, "Response sent", f"{row.reference} was updated.")
    _audit(db, user.id, application.id, "information_request_replied", row.reference)
    db.commit()
    return _request_payload(db, row)


@router.post("/customer/notifications/{notification_id}/read")
def mark_read(
    notification_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    row = (
        db.query(models.Notification)
        .filter(models.Notification.id == notification_id, models.Notification.user_id == user.id)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Notification not found.")
    row.is_read = True
    db.commit()
    return {"message": "Marked as read."}


def _risk_score(body: RiskBody) -> tuple[int, str, str]:
    points = {"Low": 5, "Medium": 15, "High": 25}
    score = points.get(body.country_risk, 5) + points.get(body.business_risk, 5) + points.get(body.ownership_risk, 5)
    if body.pep_status == "Yes":
        score += 20
    if body.sanctions_status == "Yes":
        score += 40
    if body.sanctions_status == "Yes" or score >= 60:
        level = "High"
    elif score >= 30:
        level = "Medium"
    else:
        level = "Low"
    return score, level, "demonstration"


@router.get("/employee/dashboard")
def employee_dashboard(user: models.User = Depends(get_employee), db: Session = Depends(get_db)):
    applications = db.query(models.OnboardingApplication).all()
    def count(status: str) -> int:
        return sum(1 for row in applications if row.status == status)
    recent = (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.id.desc())
        .limit(8)
        .all()
    )
    return {
        "total": len(applications),
        "pending": count("Pending") + count("Draft"),
        "submitted": count("Submitted") + count("Resubmitted"),
        "under_review": count("Under Review"),
        "information_required": count("Information Required"),
        "approved": count("Approved"),
        "rejected": count("Rejected"),
        "activity": [
            {"id": row.id, "event": row.event, "detail": row.detail, "created_at": row.created_at.isoformat() if row.created_at else None}
            for row in recent
        ],
    }


@router.get("/employee/applications")
def employee_applications(
    search: str = "",
    status: str = "",
    user: models.User = Depends(get_employee),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(models.OnboardingApplication, models.Organisation, models.Client)
        .join(models.Organisation, models.OnboardingApplication.organisation_id == models.Organisation.id)
        .join(models.Client, models.Organisation.client_id == models.Client.id)
        .order_by(models.OnboardingApplication.id.desc())
        .all()
    )
    needle = search.lower().strip()
    open_counts = dict(
        db.query(models.InformationRequest.application_id, func.count(models.InformationRequest.id))
        .filter(models.InformationRequest.status == "Open")
        .group_by(models.InformationRequest.application_id)
        .all()
    )
    latest_level: dict[int, str] = {}
    risk_rows = (
        db.query(models.RiskAssessment.application_id, models.RiskAssessment.level)
        .order_by(models.RiskAssessment.id.desc())
        .all()
    )
    for application_id, level in risk_rows:
        latest_level.setdefault(application_id, level)
    results = []
    for application, organisation, client in rows:
        if status and application.status != status:
            continue
        haystack = " ".join([
            application.reference,
            organisation.legal_name,
            organisation.country_of_incorporation or "",
            organisation.registration_number or "",
            client.business_email,
        ]).lower()
        if needle and needle not in haystack:
            continue
        results.append({
            "id": application.id,
            "reference": application.reference,
            "legal_name": organisation.legal_name,
            "country": organisation.country_of_incorporation,
            "registration_number": organisation.registration_number,
            "email": client.business_email,
            "status": application.status,
            "risk": latest_level.get(application.id, "Not assessed"),
            "outstanding": open_counts.get(application.id, 0),
            "created_at": application.created_at.isoformat() if application.created_at else None,
        })
    return results


@router.get("/employee/applications/{application_id}")
def employee_application_detail(
    application_id: int,
    user: models.User = Depends(get_employee),
    db: Session = Depends(get_db),
):
    application = db.query(models.OnboardingApplication).filter(models.OnboardingApplication.id == application_id).one_or_none()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found.")
    organisation = db.query(models.Organisation).filter(models.Organisation.id == application.organisation_id).one()
    client = db.query(models.Client).filter(models.Client.id == organisation.client_id).one()
    parties = db.query(models.RelatedParty).filter(models.RelatedParty.organisation_id == organisation.id).all()
    requests = db.query(models.InformationRequest).filter(models.InformationRequest.application_id == application.id).all()
    audits = (
        db.query(models.AuditLog)
        .filter(models.AuditLog.application_id == application.id)
        .order_by(models.AuditLog.id.desc())
        .all()
    )
    risks = (
        db.query(models.RiskAssessment)
        .filter(models.RiskAssessment.application_id == application.id)
        .order_by(models.RiskAssessment.id.desc())
        .all()
    )
    return {
        "application": {
            "id": application.id,
            "reference": application.reference,
            "status": application.status,
        },
        "organisation": {
            "legal_name": organisation.legal_name,
            "trading_name": organisation.trading_name,
            "registration_number": organisation.registration_number,
            "country": organisation.country_of_incorporation,
            "registered_address": organisation.registered_address,
            "principal_place_of_business": organisation.principal_place_of_business,
            "contact_name": client.contact_name,
            "email": client.business_email,
            "phone": client.contact_number,
        },
        "questionnaire": _questionnaire_payload(db, application, "en"),
        "documents": _document_payload(db, organisation.id),
        "parties": [_party(row) for row in parties],
        "requests": [_request_payload(db, row) for row in requests],
        "risk": [
            {
                "id": row.id,
                "score": row.score,
                "level": row.level,
                "notes": row.notes,
                "methodology": row.methodology,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in risks
        ],
        "audit": [
            {"id": row.id, "event": row.event, "detail": row.detail, "created_at": row.created_at.isoformat() if row.created_at else None}
            for row in audits
        ],
    }


@router.post("/employee/applications/{application_id}/status")
def update_status(
    application_id: int,
    body: StatusBody,
    user: models.User = Depends(get_employee),
    db: Session = Depends(get_db),
):
    if body.status not in STATUSES:
        raise HTTPException(status_code=422, detail="Unknown status.")
    application = db.query(models.OnboardingApplication).filter(models.OnboardingApplication.id == application_id).one_or_none()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found.")
    _sync_status(db, application, body.status)
    members = db.query(models.OrganisationMember).filter(models.OrganisationMember.organisation_id == application.organisation_id).all()
    for member in members:
        _notify(db, member.user_id, "Application status changed", f"{application.reference} is now {body.status}.")
    _audit(db, user.id, application.id, "status_changed", body.status)
    db.commit()
    return {"status": application.status}


@router.post("/employee/documents/{version_id}/review")
def review_document(
    version_id: int,
    body: ReviewBody,
    user: models.User = Depends(get_employee),
    db: Session = Depends(get_db),
):
    if body.outcome not in {"Verified", "Rejected", "Replacement Requested"}:
        raise HTTPException(status_code=422, detail="Unknown review outcome.")
    version = db.query(models.DocumentVersion).filter(models.DocumentVersion.id == version_id).one_or_none()
    if version is None:
        raise HTTPException(status_code=404, detail="Document version not found.")
    document = db.query(models.Document).filter(models.Document.id == version.document_id).one()
    document.status = body.outcome
    db.add(models.DocumentReview(version_id=version.id, reviewer_id=user.id, outcome=body.outcome, comment=body.comment))
    members = db.query(models.OrganisationMember).filter(models.OrganisationMember.organisation_id == document.organisation_id).all()
    for member in members:
        _notify(db, member.user_id, f"Document {body.outcome.lower()}", body.comment or version.original_filename)
    _audit(db, user.id, document.application_id, "document_reviewed", f"{version.original_filename}: {body.outcome}")
    db.commit()
    return {"status": document.status}


@router.get("/employee/documents/{version_id}")
def employee_download(
    version_id: int,
    user: models.User = Depends(get_employee),
    db: Session = Depends(get_db),
):
    version = db.query(models.DocumentVersion).filter(models.DocumentVersion.id == version_id).one_or_none()
    if version is None:
        raise HTTPException(status_code=404, detail="Document not found.")
    path = STORAGE / version.stored_name
    if not path.exists():
        raise HTTPException(status_code=404, detail="The stored file is missing.")
    return FileResponse(path, filename=version.original_filename, media_type=version.media_type)


@router.post("/employee/applications/{application_id}/requests")
def create_request(
    application_id: int,
    body: InfoRequestBody,
    user: models.User = Depends(get_employee),
    db: Session = Depends(get_db),
):
    application = db.query(models.OnboardingApplication).filter(models.OnboardingApplication.id == application_id).one_or_none()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found.")
    last = db.query(models.InformationRequest).order_by(models.InformationRequest.id.desc()).first()
    count = (last.id if last else 0) + 1
    row = models.InformationRequest(
        application_id=application.id,
        reference=f"IR-{count:04d}",
        description=body.description,
        related_type=body.related_type,
        due_date=body.due_date,
        created_by=user.id,
    )
    db.add(row)
    _sync_status(db, application, "Information Required")
    if body.related_type == "questionnaire":
        assignment = _assignment(db, application)
        current = _latest_response(db, assignment.id)
        if current is not None and current.status == "submitted":
            draft = models.QuestionnaireResponse(
                assignment_id=assignment.id,
                version_number=current.version_number + 1,
                status="draft",
                language_code=current.language_code,
            )
            db.add(draft)
            db.flush()
            for answer in db.query(models.ResponseAnswer).filter(models.ResponseAnswer.response_id == current.id):
                db.add(models.ResponseAnswer(response_id=draft.id, question_id=answer.question_id, value_text=answer.value_text))
    members = db.query(models.OrganisationMember).filter(models.OrganisationMember.organisation_id == application.organisation_id).all()
    for member in members:
        _notify(db, member.user_id, "Additional information requested", body.description)
    _audit(db, user.id, application.id, "information_requested", body.description)
    db.commit()
    db.refresh(row)
    return _request_payload(db, row)


@router.post("/employee/requests/{request_id}/close")
def close_request(
    request_id: int,
    user: models.User = Depends(get_employee),
    db: Session = Depends(get_db),
):
    row = db.query(models.InformationRequest).filter(models.InformationRequest.id == request_id).one_or_none()
    if row is None:
        raise HTTPException(status_code=404, detail="Request not found.")
    row.status = "Closed"
    _audit(db, user.id, row.application_id, "information_request_closed", row.reference)
    db.commit()
    return _request_payload(db, row)


@router.post("/employee/applications/{application_id}/risk")
def save_risk(
    application_id: int,
    body: RiskBody,
    user: models.User = Depends(get_employee),
    db: Session = Depends(get_db),
):
    application = db.query(models.OnboardingApplication).filter(models.OnboardingApplication.id == application_id).one_or_none()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found.")
    score, level, methodology = _risk_score(body)
    row = models.RiskAssessment(
        application_id=application.id,
        country_risk=body.country_risk,
        business_risk=body.business_risk,
        ownership_risk=body.ownership_risk,
        pep_status=body.pep_status,
        sanctions_status=body.sanctions_status,
        score=score,
        level=level,
        notes=body.notes,
        methodology=methodology,
        assessed_by=user.id,
    )
    db.add(row)
    _audit(db, user.id, application.id, "risk_assessed", f"Demonstration score {score}, level {level}.")
    db.commit()
    return {"score": score, "level": level, "methodology": methodology}
