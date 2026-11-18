"""Reference data for the demonstration onboarding workspace.

Questionnaire wording is sample content for this portfolio. It is not an
approved legal or regulatory questionnaire.
"""

import os
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from backend import models
from backend.security import hash_password

LANGUAGES = ("en", "fr", "es", "ar", "hi", "de")

SECTION_TITLES = {
    "kyc": {
        "en": "KYC Information",
        "fr": "Informations KYC",
        "es": "Información KYC",
        "ar": "معلومات اعرف عميلك",
        "hi": "केवाईसी जानकारी",
        "de": "KYC-Informationen",
    },
    "address": {
        "en": "Incorporation and Address",
        "fr": "Constitution et adresse",
        "es": "Constitución y dirección",
        "ar": "التأسيس والعنوان",
        "hi": "निगमन और पता",
        "de": "Gründung und Anschrift",
    },
    "regulator": {
        "en": "Regulator Details",
        "fr": "Informations sur le régulateur",
        "es": "Datos del regulador",
        "ar": "بيانات الجهة الرقابية",
        "hi": "नियामक विवरण",
        "de": "Angaben zur Aufsicht",
    },
    "ownership": {
        "en": "Ownership Details",
        "fr": "Détails de détention",
        "es": "Datos de titularidad",
        "ar": "تفاصيل الملكية",
        "hi": "स्वामित्व विवरण",
        "de": "Angaben zu Eigentum",
    },
    "bearer": {
        "en": "Bearer Share Details",
        "fr": "Actions au porteur",
        "es": "Acciones al portador",
        "ar": "أسهم لحاملها",
        "hi": "वाहक शेयर विवरण",
        "de": "Inhaberaktien",
    },
    "structure": {
        "en": "Organisation Structure",
        "fr": "Structure de l'organisation",
        "es": "Estructura de la organización",
        "ar": "الهيكل التنظيمي",
        "hi": "संगठन संरचना",
        "de": "Organisationsstruktur",
    },
    "board": {
        "en": "Board of Directors",
        "fr": "Conseil d'administration",
        "es": "Consejo de administración",
        "ar": "مجلس الإدارة",
        "hi": "निदेशक मंडल",
        "de": "Vorstand",
    },
    "controllers": {
        "en": "Controllers",
        "fr": "Personnes exerçant le contrôle",
        "es": "Personas con control",
        "ar": "أصحاب السيطرة",
        "hi": "नियंत्रक",
        "de": "Kontrollpersonen",
    },
    "business": {
        "en": "Customer Base and Business Model",
        "fr": "Clientèle et modèle d'activité",
        "es": "Clientela y modelo de negocio",
        "ar": "قاعدة العملاء ونموذج العمل",
        "hi": "ग्राहक आधार और व्यवसाय मॉडल",
        "de": "Kundenbasis und Geschäftsmodell",
    },
    "sanctions": {
        "en": "Sanctions Compliance",
        "fr": "Conformité aux sanctions",
        "es": "Cumplimiento de sanciones",
        "ar": "الامتثال للعقوبات",
        "hi": "प्रतिबंध अनुपालन",
        "de": "Sanktions-Compliance",
    },
    "declaration": {
        "en": "Declaration",
        "fr": "Déclaration",
        "es": "Declaración",
        "ar": "إقرار",
        "hi": "घोषणा",
        "de": "Erklärung",
    },
}

YES_NO = {
    "yes": {"en": "Yes", "fr": "Oui", "es": "Sí", "ar": "نعم", "hi": "हाँ", "de": "Ja"},
    "no": {"en": "No", "fr": "Non", "es": "No", "ar": "لا", "hi": "नहीं", "de": "Nein"},
}

CLIENT_TYPES = {
    "bank": {"en": "Bank", "fr": "Banque", "es": "Banco", "ar": "بنك", "hi": "बैंक", "de": "Bank"},
    "financial": {
        "en": "Financial institution",
        "fr": "Institution financière",
        "es": "Institución financiera",
        "ar": "مؤسسة مالية",
        "hi": "वित्तीय संस्था",
        "de": "Finanzinstitut",
    },
    "private": {
        "en": "Private company",
        "fr": "Société privée",
        "es": "Empresa privada",
        "ar": "شركة خاصة",
        "hi": "निजी कंपनी",
        "de": "Privatunternehmen",
    },
    "other": {"en": "Other", "fr": "Autre", "es": "Otro", "ar": "أخرى", "hi": "अन्य", "de": "Sonstiges"},
}

ACTIVITIES = {
    "financial": CLIENT_TYPES["financial"],
    "professional": {
        "en": "Professional services",
        "fr": "Services professionnels",
        "es": "Servicios profesionales",
        "ar": "خدمات مهنية",
        "hi": "पेशेवर सेवाएँ",
        "de": "Professionelle Dienstleistungen",
    },
    "trade": {"en": "Trade", "fr": "Commerce", "es": "Comercio", "ar": "تجارة", "hi": "व्यापार", "de": "Handel"},
    "other": CLIENT_TYPES["other"],
}


def _question(code, kind, required, prompts, options=None):
    return {
        "code": code,
        "type": kind,
        "required": required,
        "prompts": prompts,
        "options": options,
    }


QUESTIONS = {
    "kyc": [
        _question("legal_name", "textarea", True, {
            "en": "Sample: full legal name of the organisation",
            "fr": "Exemple : dénomination sociale complète",
            "es": "Ejemplo: denominación social completa",
            "ar": "نموذج: الاسم القانوني الكامل للمؤسسة",
            "hi": "नमूना: संगठन का पूरा कानूनी नाम",
            "de": "Beispiel: vollständiger rechtlicher Name",
        }),
        _question("trading_name", "textarea", False, {
            "en": "Sample: trading name, if different",
            "fr": "Exemple : nom commercial, s'il est différent",
            "es": "Ejemplo: nombre comercial, si es distinto",
            "ar": "نموذج: الاسم التجاري، إن كان مختلفاً",
            "hi": "नमूना: व्यापारिक नाम, यदि भिन्न हो",
            "de": "Beispiel: Handelsname, falls abweichend",
        }),
        _question("client_type", "single_choice", True, {
            "en": "Sample: organisation type",
            "fr": "Exemple : type d'organisation",
            "es": "Ejemplo: tipo de organización",
            "ar": "نموذج: نوع المؤسسة",
            "hi": "नमूना: संगठन का प्रकार",
            "de": "Beispiel: Art der Organisation",
        }, CLIENT_TYPES),
    ],
    "address": [
        _question("incorporation_country", "text", True, {
            "en": "Sample: country of incorporation",
            "fr": "Exemple : pays de constitution",
            "es": "Ejemplo: país de constitución",
            "ar": "نموذج: بلد التأسيس",
            "hi": "नमूना: निगमन का देश",
            "de": "Beispiel: Gründungsland",
        }),
        _question("registered_address", "textarea", True, {
            "en": "Sample: registered address",
            "fr": "Exemple : adresse du siège",
            "es": "Ejemplo: domicilio social",
            "ar": "نموذج: العنوان المسجل",
            "hi": "नमूना: पंजीकृत पता",
            "de": "Beispiel: eingetragene Anschrift",
        }),
    ],
    "regulator": [
        _question("regulator_name", "text", False, {
            "en": "Sample: name of the regulator, if applicable",
            "fr": "Exemple : nom du régulateur, le cas échéant",
            "es": "Ejemplo: nombre del regulador, si aplica",
            "ar": "نموذج: اسم الجهة الرقابية، إن وجد",
            "hi": "नमूना: नियामक का नाम, यदि लागू हो",
            "de": "Beispiel: Name der Aufsicht, falls zutreffend",
        }),
    ],
    "ownership": [
        _question("individual_owners", "single_choice", True, {
            "en": "Sample: are there individual owners above 10 percent?",
            "fr": "Exemple : y a-t-il des détenteurs personnes physiques au-dessus de 10 % ?",
            "es": "Ejemplo: ¿hay titulares personas físicas por encima del 10 %?",
            "ar": "نموذج: هل يوجد مالكين أفراد بأكثر من 10 بالمئة؟",
            "hi": "नमूना: क्या 10 प्रतिशत से अधिक के व्यक्तिगत स्वामी हैं?",
            "de": "Beispiel: gibt es natürliche Personen mit über 10 Prozent?",
        }, YES_NO),
    ],
    "bearer": [
        _question("bearer_shares", "single_choice", True, {
            "en": "Sample: can the organisation issue bearer shares?",
            "fr": "Exemple : l'organisation peut-elle émettre des actions au porteur ?",
            "es": "Ejemplo: ¿puede la organización emitir acciones al portador?",
            "ar": "نموذج: هل يمكن للمؤسسة إصدار أسهم لحاملها؟",
            "hi": "नमूना: क्या संगठन वाहक शेयर जारी कर सकता है?",
            "de": "Beispiel: kann die Organisation Inhaberaktien ausgeben?",
        }, YES_NO),
    ],
    "structure": [
        _question("shareholding", "textarea", True, {
            "en": "Sample: describe the ownership structure",
            "fr": "Exemple : décrivez la structure de détention",
            "es": "Ejemplo: describa la estructura de titularidad",
            "ar": "نموذج: صف هيكل الملكية",
            "hi": "नमूना: स्वामित्व संरचना का वर्णन करें",
            "de": "Beispiel: beschreiben Sie die Eigentümerstruktur",
        }),
    ],
    "board": [
        _question("directors_summary", "textarea", True, {
            "en": "Sample: list the directors",
            "fr": "Exemple : indiquez les administrateurs",
            "es": "Ejemplo: indique los directores",
            "ar": "نموذج: اذكر أعضاء مجلس الإدارة",
            "hi": "नमूना: निदेशकों की सूची दें",
            "de": "Beispiel: nennen Sie die Direktoren",
        }),
    ],
    "controllers": [
        _question("has_controllers", "single_choice", True, {
            "en": "Sample: are there controllers other than owners or directors?",
            "fr": "Exemple : y a-t-il des contrôleurs autres que les détenteurs ou administrateurs ?",
            "es": "Ejemplo: ¿hay personas con control distintas de titulares o directores?",
            "ar": "نموذج: هل يوجد أصحاب سيطرة غير المالكين أو المديرين؟",
            "hi": "नमूना: क्या स्वामियों या निदेशकों के अलावा नियंत्रक हैं?",
            "de": "Beispiel: gibt es Kontrollpersonen außer Eigentümern oder Direktoren?",
        }, YES_NO),
    ],
    "business": [
        _question("activities", "multi_choice", False, {
            "en": "Sample: which activities describe the customer base?",
            "fr": "Exemple : quelles activités décrivent la clientèle ?",
            "es": "Ejemplo: ¿qué actividades describen la clientela?",
            "ar": "نموذج: أي الأنشطة تصف قاعدة العملاء؟",
            "hi": "नमूना: कौन सी गतिविधियाँ ग्राहक आधार का वर्णन करती हैं?",
            "de": "Beispiel: welche Tätigkeiten beschreiben die Kundenbasis?",
        }, ACTIVITIES),
    ],
    "sanctions": [
        _question("sanctions_policy", "single_choice", True, {
            "en": "Sample: does the organisation keep a sanctions compliance policy?",
            "fr": "Exemple : l'organisation tient-elle une politique de conformité aux sanctions ?",
            "es": "Ejemplo: ¿mantiene la organización una política de sanciones?",
            "ar": "نموذج: هل تحتفظ المؤسسة بسياسة امتثال للعقوبات؟",
            "hi": "नमूना: क्या संगठन के पास प्रतिबंध अनुपालन नीति है?",
            "de": "Beispiel: hat die Organisation eine Sanktionsrichtlinie?",
        }, YES_NO),
    ],
    "declaration": [
        _question("declarant_name", "text", True, {
            "en": "Sample: full name of the person making this declaration",
            "fr": "Exemple : nom de la personne qui fait cette déclaration",
            "es": "Ejemplo: nombre de quien realiza esta declaración",
            "ar": "نموذج: الاسم الكامل لمقدم هذا الإقرار",
            "hi": "नमूना: यह घोषणा करने वाले व्यक्ति का पूरा नाम",
            "de": "Beispiel: Name der erklärenden Person",
        }),
        _question("declarant_title", "text", True, {
            "en": "Sample: role, such as director or compliance lead",
            "fr": "Exemple : fonction, comme dirigeant ou responsable conformité",
            "es": "Ejemplo: cargo, como director o responsable de cumplimiento",
            "ar": "نموذج: الصفة، مثل مدير أو مسؤول الامتثال",
            "hi": "नमूना: भूमिका, जैसे निदेशक या अनुपालन प्रमुख",
            "de": "Beispiel: Rolle, etwa Direktor oder Compliance-Leitung",
        }),
        _question("declaration_date", "date", True, {
            "en": "Sample: date of declaration",
            "fr": "Exemple : date de la déclaration",
            "es": "Ejemplo: fecha de la declaración",
            "ar": "نموذج: تاريخ الإقرار",
            "hi": "नमूना: घोषणा की तिथि",
            "de": "Beispiel: Datum der Erklärung",
        }),
    ],
}

REQUIREMENTS = [
    ("legal_name", "Full Legal Name"),
    ("trading_name", "Trading Name"),
    ("registered_address", "Registered Address"),
    ("principal_place", "Principal Place of Business"),
    ("registration_number", "Registration Number"),
    ("proof_existence", "Proof of Existence"),
    ("proof_regulation", "Proof of Regulation"),
]


def _approval(language: str) -> str:
    return "sample" if language == "en" else "demonstration"


def seed_catalogue(db: Session) -> None:
    template = (
        db.query(models.QuestionnaireTemplate)
        .filter(models.QuestionnaireTemplate.code == "corporate_ddq_sample")
        .one_or_none()
    )
    if template is None:
        template = models.QuestionnaireTemplate(
            code="corporate_ddq_sample",
            category="Corporate Due Diligence",
            name="Corporate due diligence sample",
        )
        db.add(template)
        db.flush()
        version = models.QuestionnaireVersion(
            template_id=template.id,
            version_number=1,
            status="sample",
        )
        db.add(version)
        db.flush()
        for section_index, (section_code, titles) in enumerate(SECTION_TITLES.items(), start=1):
            section = models.QuestionnaireSection(
                version_id=version.id,
                code=section_code,
                position=section_index,
            )
            db.add(section)
            db.flush()
            for language in LANGUAGES:
                db.add(
                    models.SectionTranslation(
                        section_id=section.id,
                        language_code=language,
                        title=titles[language],
                        approval_status=_approval(language),
                    )
                )
            for question_index, question in enumerate(QUESTIONS[section_code], start=1):
                row = models.Question(
                    section_id=section.id,
                    code=question["code"],
                    position=question_index,
                    question_type=question["type"],
                    is_required=question["required"],
                )
                db.add(row)
                db.flush()
                for language in LANGUAGES:
                    db.add(
                        models.QuestionTranslation(
                            question_id=row.id,
                            language_code=language,
                            prompt=question["prompts"][language],
                            help_text="Demonstration sample. Not approved legal wording.",
                            approval_status=_approval(language),
                        )
                    )
                if question["options"]:
                    for option_index, (option_code, labels) in enumerate(question["options"].items(), start=1):
                        option = models.AnswerOption(
                            question_id=row.id,
                            code=option_code,
                            position=option_index,
                        )
                        db.add(option)
                        db.flush()
                        for language in LANGUAGES:
                            db.add(
                                models.AnswerOptionTranslation(
                                    option_id=option.id,
                                    language_code=language,
                                    label=labels[language],
                                    approval_status=_approval(language),
                                )
                            )

    for index, (code, name) in enumerate(REQUIREMENTS, start=1):
        exists = (
            db.query(models.DocumentRequirement)
            .filter(models.DocumentRequirement.code == code)
            .one_or_none()
        )
        if exists is None:
            db.add(
                models.DocumentRequirement(
                    code=code,
                    name=name,
                    category="company",
                    position=index,
                )
            )
    db.commit()


def _ensure_user(db: Session, email: str, password: str, full_name: str, role: str) -> models.User:
    user = db.query(models.User).filter(models.User.email == email).one_or_none()
    if user is None:
        user = models.User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            portal_role=role,
            preferred_language="en",
            is_active=True,
        )
        db.add(user)
        db.flush()
    return user


def seed_demo_accounts(db: Session) -> None:
    employee_email = os.getenv("EMPLOYEE_EMAIL")
    employee_password = os.getenv("EMPLOYEE_PASSWORD")
    customer_email = os.getenv("CUSTOMER_EMAIL")
    customer_password = os.getenv("CUSTOMER_PASSWORD")

    if employee_email and employee_password:
        _ensure_user(db, employee_email, employee_password, "Demo Reviewer", "employee")

    if customer_email and customer_password:
        user = _ensure_user(db, customer_email, customer_password, "Demo Customer", "customer")
        organisation = db.query(models.Organisation).order_by(models.Organisation.id).first()
        if organisation is not None:
            membership = (
                db.query(models.OrganisationMember)
                .filter(
                    models.OrganisationMember.user_id == user.id,
                    models.OrganisationMember.organisation_id == organisation.id,
                )
                .one_or_none()
            )
            if membership is None:
                db.add(
                    models.OrganisationMember(
                        organisation_id=organisation.id,
                        user_id=user.id,
                        member_role="customer_admin",
                    )
                )
    db.commit()


PORTFOLIO_COUNT = 1000
PORTFOLIO_STATUSES = (
    "Pending",
    "Submitted",
    "Under Review",
    "Approved",
    "Pending",
    "Information Required",
    "Draft",
    "Submitted",
    "Under Review",
    "Resubmitted",
    "Approved",
    "Rejected",
)
_ADJECTIVES = (
    "Northbridge", "Ashford", "Clearwater", "Hartley", "Elm", "Sterling", "Marlow", "Kingswell",
    "Westfield", "Oakmere", "Redlane", "Silverbrook", "Highgate", "Fairhaven", "Langley", "Brighton",
    "Calder", "Merton", "Hawthorn", "Pembroke", "Aldgate", "Riverton", "Stonewell", "Whitmore",
    "Halcyon", "Greystone", "Linden", "Queensgate", "Southwark", "Belmont", "Covington", "Drake",
    "Easton", "Fenchurch", "Glenmore", "Harbour", "Ivy", "Jubilee", "Keats", "Lowell",
)
_NOUNS = (
    "Capital", "Markets", "Treasury", "Advisory", "Holdings", "Partners", "Asset", "Credit",
    "Payments", "Custody", "Exchange", "Finance", "Securities", "Trust", "Wealth", "Ledger",
    "Clearing", "Broking", "Funding", "Reserve", "Ventures", "Commercial", "Merchant", "Nominees",
    "Settlement", "Fiduciary",
)
_PLACES = (
    ("United Kingdom", "London", "Ltd"),
    ("United Kingdom", "Edinburgh", "Limited"),
    ("Ireland", "Dublin", "Limited"),
    ("Netherlands", "Amsterdam", "BV"),
    ("Germany", "Frankfurt", "GmbH"),
    ("France", "Paris", "SA"),
    ("Switzerland", "Zurich", "AG"),
    ("Singapore", "Singapore", "Pte Ltd"),
    ("Luxembourg", "Luxembourg", "SA"),
    ("United Arab Emirates", "Dubai", "Ltd"),
)
_GIVEN = (
    "Avery", "Blair", "Casey", "Drew", "Eden", "Finley", "Gray", "Harper", "Indigo", "Jordan",
    "Kendall", "Logan", "Morgan", "Nico", "Parker", "Quinn", "Reese", "Sawyer", "Taylor", "Winter",
)
_FAMILY = (
    "Alden", "Brooks", "Carter", "Dalton", "Ellison", "Foster", "Grant", "Hale", "Iverson", "Keene",
    "Lang", "Mercer", "Nash", "Osborne", "Prescott", "Quill", "Rowe", "Sutton", "Vale", "Whitaker",
)
_STREETS = (
    "Fictional Wharf", "Sample Lane", "Demonstration Square", "Portfolio Row", "Example Yard",
)


def seed_portfolio_customers(db: Session, count: int = PORTFOLIO_COUNT) -> int:
    """Insert synthetic organisation records. Emails use example.com and phones use the UK drama range."""

    existing = {
        email
        for (email,) in db.query(models.Client.business_email)
        .filter(models.Client.business_email.like("portfolio.%@example.com"))
        .all()
    }
    missing = [number for number in range(1, count + 1) if f"portfolio.{number:04d}@example.com" not in existing]
    if not missing:
        return 0

    today = datetime.now(timezone.utc)
    clients: list[models.Client] = []
    for number in missing:
        country, city, form = _PLACES[number % len(_PLACES)]
        adjective = _ADJECTIVES[number % len(_ADJECTIVES)]
        noun = _NOUNS[(number // len(_ADJECTIVES)) % len(_NOUNS)]
        legal_name = f"{adjective} {noun} {form}"
        given = _GIVEN[number % len(_GIVEN)]
        family = _FAMILY[(number // len(_GIVEN)) % len(_FAMILY)]
        status = PORTFOLIO_STATUSES[number % len(PORTFOLIO_STATUSES)]
        created = today - timedelta(days=number % 420, hours=number % 20)
        clients.append(
            models.Client(
                company_name=legal_name,
                registration_number=f"SYN{number:05d}",
                country=country,
                contact_name=f"{given} {family}",
                business_email=f"portfolio.{number:04d}@example.com",
                contact_number=f"+44 1632 {960000 + number - 1}",
                onboarding_status=status,
                created_at=created,
            )
        )
    db.add_all(clients)
    db.flush()

    organisations: list[models.Organisation] = []
    for client, number in zip(clients, missing):
        country, city, _form = _PLACES[number % len(_PLACES)]
        street = _STREETS[number % len(_STREETS)]
        address = f"{20 + (number % 80)} {street}, {city}"
        organisations.append(
            models.Organisation(
                client_id=client.id,
                legal_name=client.company_name,
                trading_name=client.company_name.rsplit(" ", 1)[0] if number % 3 == 0 else None,
                registration_number=client.registration_number,
                country_of_incorporation=country,
                registered_address=address,
                principal_place_of_business=address if number % 2 == 0 else f"1 Sample Lane, {city}",
                created_at=client.created_at,
            )
        )
    db.add_all(organisations)
    db.flush()

    db.add_all(
        [
            models.OnboardingApplication(
                reference=f"APP-{client.id:05d}",
                organisation_id=organisation.id,
                status=client.onboarding_status,
                created_at=client.created_at,
                updated_at=client.created_at,
                submitted_at=client.created_at if client.onboarding_status not in {"Draft", "Pending"} else None,
            )
            for client, organisation in zip(clients, organisations)
        ]
    )
    db.commit()
    return len(clients)


if __name__ == "__main__":
    from backend.database import SessionLocal

    session = SessionLocal()
    try:
        added = seed_portfolio_customers(session)
        total = session.query(models.Client).count()
        print(f"Added {added} synthetic customers. Client records now: {total}.")
    finally:
        session.close()
