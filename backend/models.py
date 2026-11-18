
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.database import Base


class Client(Base):
    __tablename__ = "clients"

    # Unique ID for every client
    id = Column(Integer, primary_key=True, index=True)

    # Company information
    company_name = Column(String(200), nullable=False, index=True)
    registration_number = Column(String(100), unique=True, nullable=True)
    country = Column(String(100), nullable=False)

    # Primary contact information
    contact_name = Column(String(150), nullable=False)
    business_email = Column(String(255), unique=True, nullable=False)
    contact_number = Column(String(30), nullable=False)

    # Onboarding information
    onboarding_status = Column(
        String(50),
        nullable=False,
        default="Pending"
    )

    # Automatically records when the client is created
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    organisation = relationship(
        "Organisation",
        back_populates="client",
        uselist=False,
    )


class User(Base):
    """A person who can sign in to the customer or employee portal."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    designation = Column(String(150), nullable=True)
    portal_role = Column(String(30), nullable=False, default="customer", index=True)
    preferred_language = Column(String(10), nullable=False, default="en")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )


class Organisation(Base):
    """Company profile linked one-to-one with an existing client registration."""

    __tablename__ = "organisations"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(
        Integer,
        ForeignKey("clients.id"),
        unique=True,
        nullable=False,
        index=True,
    )
    legal_name = Column(String(200), nullable=False, index=True)
    trading_name = Column(String(200), nullable=True)
    registration_number = Column(String(100), nullable=True, index=True)
    country_of_incorporation = Column(String(100), nullable=False)
    registered_address = Column(String(500), nullable=True)
    principal_place_of_business = Column(String(500), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    client = relationship("Client", back_populates="organisation")
    applications = relationship(
        "OnboardingApplication",
        back_populates="organisation",
    )


class OnboardingApplication(Base):
    """One onboarding case for an organisation. Status matches the client record."""

    __tablename__ = "onboarding_applications"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String(30), unique=True, nullable=False, index=True)
    organisation_id = Column(
        Integer,
        ForeignKey("organisations.id"),
        nullable=False,
        index=True,
    )
    status = Column(String(50), nullable=False, default="Pending", index=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    assigned_employee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    organisation = relationship("Organisation", back_populates="applications")


class OrganisationMember(Base):
    __tablename__ = "organisation_members"
    __table_args__ = (UniqueConstraint("organisation_id", "user_id"),)

    id = Column(Integer, primary_key=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    member_role = Column(String(40), nullable=False, default="customer_admin")


class SessionToken(Base):
    __tablename__ = "session_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)


class QuestionnaireTemplate(Base):
    __tablename__ = "questionnaire_templates"

    id = Column(Integer, primary_key=True)
    code = Column(String(80), unique=True, nullable=False)
    category = Column(String(80), nullable=False)
    name = Column(String(200), nullable=False)


class QuestionnaireVersion(Base):
    __tablename__ = "questionnaire_versions"

    id = Column(Integer, primary_key=True)
    template_id = Column(Integer, ForeignKey("questionnaire_templates.id"), nullable=False)
    version_number = Column(Integer, nullable=False, default=1)
    status = Column(String(40), nullable=False, default="sample")


class QuestionnaireSection(Base):
    __tablename__ = "questionnaire_sections"

    id = Column(Integer, primary_key=True)
    version_id = Column(Integer, ForeignKey("questionnaire_versions.id"), nullable=False, index=True)
    code = Column(String(80), nullable=False)
    position = Column(Integer, nullable=False)


class SectionTranslation(Base):
    __tablename__ = "section_translations"
    __table_args__ = (UniqueConstraint("section_id", "language_code"),)

    id = Column(Integer, primary_key=True)
    section_id = Column(Integer, ForeignKey("questionnaire_sections.id"), nullable=False, index=True)
    language_code = Column(String(10), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    approval_status = Column(String(40), nullable=False, default="demonstration")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True)
    section_id = Column(Integer, ForeignKey("questionnaire_sections.id"), nullable=False, index=True)
    code = Column(String(80), nullable=False)
    position = Column(Integer, nullable=False)
    question_type = Column(String(30), nullable=False)
    is_required = Column(Boolean, nullable=False, default=False)


class QuestionTranslation(Base):
    __tablename__ = "question_translations"
    __table_args__ = (UniqueConstraint("question_id", "language_code"),)

    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, index=True)
    language_code = Column(String(10), nullable=False, index=True)
    prompt = Column(Text, nullable=False)
    help_text = Column(Text, nullable=True)
    approval_status = Column(String(40), nullable=False, default="demonstration")


class AnswerOption(Base):
    __tablename__ = "answer_options"

    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False, index=True)
    code = Column(String(80), nullable=False)
    position = Column(Integer, nullable=False)


class AnswerOptionTranslation(Base):
    __tablename__ = "answer_option_translations"
    __table_args__ = (UniqueConstraint("option_id", "language_code"),)

    id = Column(Integer, primary_key=True)
    option_id = Column(Integer, ForeignKey("answer_options.id"), nullable=False, index=True)
    language_code = Column(String(10), nullable=False)
    label = Column(String(300), nullable=False)
    approval_status = Column(String(40), nullable=False, default="demonstration")


class QuestionnaireAssignment(Base):
    __tablename__ = "questionnaire_assignments"
    __table_args__ = (UniqueConstraint("application_id", "version_id"),)

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("onboarding_applications.id"), nullable=False, index=True)
    version_id = Column(Integer, ForeignKey("questionnaire_versions.id"), nullable=False)


class QuestionnaireResponse(Base):
    __tablename__ = "questionnaire_responses"

    id = Column(Integer, primary_key=True)
    assignment_id = Column(Integer, ForeignKey("questionnaire_assignments.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False, default=1)
    status = Column(String(30), nullable=False, default="draft", index=True)
    language_code = Column(String(10), nullable=False, default="en")
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True)


class ResponseAnswer(Base):
    __tablename__ = "response_answers"
    __table_args__ = (UniqueConstraint("response_id", "question_id"),)

    id = Column(Integer, primary_key=True)
    response_id = Column(Integer, ForeignKey("questionnaire_responses.id"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    value_text = Column(Text, nullable=True)


class RelatedParty(Base):
    __tablename__ = "related_parties"

    id = Column(Integer, primary_key=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False, index=True)
    party_type = Column(String(40), nullable=False, index=True)
    full_name = Column(String(200), nullable=False)
    date_of_birth = Column(String(20), nullable=True)
    nationality = Column(String(100), nullable=True)
    relationship_to_organisation = Column(String(150), nullable=True)
    ownership_percentage = Column(String(20), nullable=True)
    country_of_residence = Column(String(100), nullable=True)


class DocumentRequirement(Base):
    __tablename__ = "document_requirements"

    id = Column(Integer, primary_key=True)
    code = Column(String(80), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    category = Column(String(40), nullable=False, default="company")
    position = Column(Integer, nullable=False, default=0)


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("onboarding_applications.id"), nullable=False, index=True)
    party_id = Column(Integer, ForeignKey("related_parties.id"), nullable=True)
    category = Column(String(40), nullable=False, default="company")
    description = Column(String(300), nullable=True)
    status = Column(String(40), nullable=False, default="Pending", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DocumentRequirementLink(Base):
    __tablename__ = "document_requirement_links"
    __table_args__ = (UniqueConstraint("document_id", "requirement_id"),)

    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    requirement_id = Column(Integer, ForeignKey("document_requirements.id"), nullable=False)


class DocumentVersion(Base):
    __tablename__ = "document_versions"

    id = Column(Integer, primary_key=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False, index=True)
    version_number = Column(Integer, nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_name = Column(String(255), nullable=False)
    media_type = Column(String(120), nullable=True)
    size_bytes = Column(Integer, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class DocumentReview(Base):
    __tablename__ = "document_reviews"

    id = Column(Integer, primary_key=True)
    version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    outcome = Column(String(40), nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class InformationRequest(Base):
    __tablename__ = "information_requests"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("onboarding_applications.id"), nullable=False, index=True)
    reference = Column(String(30), unique=True, nullable=False)
    description = Column(Text, nullable=False)
    related_type = Column(String(40), nullable=True)
    due_date = Column(String(20), nullable=True)
    status = Column(String(30), nullable=False, default="Open", index=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class InformationRequestReply(Base):
    __tablename__ = "information_request_replies"

    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey("information_requests.id"), nullable=False, index=True)
    message = Column(Text, nullable=False)
    document_version_id = Column(Integer, ForeignKey("document_versions.id"), nullable=True)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    actor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    application_id = Column(Integer, ForeignKey("onboarding_applications.id"), nullable=True, index=True)
    event = Column(String(80), nullable=False, index=True)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("onboarding_applications.id"), nullable=False, index=True)
    country_risk = Column(String(20), nullable=False)
    business_risk = Column(String(20), nullable=False)
    ownership_risk = Column(String(20), nullable=False)
    pep_status = Column(String(10), nullable=False)
    sanctions_status = Column(String(10), nullable=False)
    score = Column(Integer, nullable=False)
    level = Column(String(20), nullable=False)
    notes = Column(Text, nullable=True)
    methodology = Column(String(80), nullable=False, default="demonstration")
    assessed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
