"""Document category definitions for classification."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class DocumentCategory:
    """A document category with matching rules."""

    id: str
    name: str
    description: str
    timeline_entry_type: str  # Maps to backend EntryType

    # Keywords that strongly indicate this category (any match = high confidence)
    strong_keywords: list[str]

    # Keywords that suggest this category (multiple matches increase confidence)
    weak_keywords: list[str]

    # Semantic description for embedding-based matching
    semantic_description: str

    # Confidence threshold for this category (0-1)
    min_confidence: float = 0.6


# Document categories for child-related documents
DOCUMENT_CATEGORIES: list[DocumentCategory] = [
    DocumentCategory(
        id="medical_report",
        name="Medical Report",
        description="Medical assessments, diagnoses, and health reports",
        timeline_entry_type="MEDICAL",
        strong_keywords=[
            "diagnosis", "icd-10", "icd-11", "medical report", "clinical assessment",
            "physician", "paediatrician", "pediatrician", "gp report", "referral letter",
            "prescription", "medication", "dosage"
        ],
        weak_keywords=[
            "patient", "doctor", "hospital", "clinic", "health", "symptoms",
            "treatment", "condition", "examination", "medical history"
        ],
        semantic_description="Medical document containing diagnosis, health assessment, doctor's report, clinical findings, or prescription information for a child patient"
    ),

    DocumentCategory(
        id="school_report",
        name="School Report",
        description="Academic reports, progress reports, and school assessments",
        timeline_entry_type="SCHOOL_REPORT",
        strong_keywords=[
            "school report", "academic report", "progress report", "end of term",
            "head teacher", "headteacher", "class teacher", "report card",
            "academic year", "term report", "pupil report"
        ],
        weak_keywords=[
            "school", "teacher", "classroom", "learning", "progress", "attainment",
            "grade", "marks", "attendance", "behaviour", "effort", "homework"
        ],
        semantic_description="School academic report showing student progress, grades, teacher comments, and educational achievements"
    ),

    DocumentCategory(
        id="iep",
        name="IEP / EHCP",
        description="Individual Education Plans and Education Health Care Plans",
        timeline_entry_type="EDUCATIONAL",
        strong_keywords=[
            "iep", "ehcp", "individual education plan", "education health care plan",
            "statement of special educational needs", "sen support", "senco",
            "annual review", "provision map", "one page profile"
        ],
        weak_keywords=[
            "targets", "outcomes", "provision", "support plan", "special needs",
            "learning support", "intervention", "reasonable adjustments", "send"
        ],
        semantic_description="Individual Education Plan or Education Health Care Plan document outlining special educational needs, targets, and support provisions"
    ),

    DocumentCategory(
        id="therapy_notes",
        name="Therapy Notes",
        description="Speech therapy, occupational therapy, physiotherapy notes",
        timeline_entry_type="THERAPY",
        strong_keywords=[
            "speech therapy", "speech and language", "salt", "occupational therapy",
            "ot report", "physiotherapy", "therapy session", "therapist report",
            "sensory integration", "asd assessment"
        ],
        weak_keywords=[
            "session", "therapy", "therapist", "goals", "exercises", "activities",
            "progress", "recommendations", "home programme", "strategies"
        ],
        semantic_description="Therapy session notes or report from speech therapist, occupational therapist, or physiotherapist documenting progress and recommendations"
    ),

    DocumentCategory(
        id="psychological_assessment",
        name="Psychological Assessment",
        description="Educational psychology reports and cognitive assessments",
        timeline_entry_type="EDUCATIONAL",
        strong_keywords=[
            "educational psychologist", "ep report", "cognitive assessment",
            "wisc", "wechsler", "psychological assessment", "iq test",
            "psychologist report", "neuropsychological"
        ],
        weak_keywords=[
            "assessment", "cognitive", "abilities", "processing", "memory",
            "attention", "executive function", "recommendations"
        ],
        semantic_description="Educational psychology or neuropsychological assessment report containing cognitive testing results and recommendations"
    ),

    DocumentCategory(
        id="behavior_plan",
        name="Behavior Plan",
        description="Behavior support plans and incident reports",
        timeline_entry_type="BEHAVIOR",
        strong_keywords=[
            "behaviour plan", "behavior plan", "behaviour support", "positive behaviour",
            "incident report", "behaviour log", "antecedent", "consequence",
            "de-escalation", "risk assessment"
        ],
        weak_keywords=[
            "behaviour", "behavior", "triggers", "strategies", "support",
            "intervention", "reward", "consequence", "incident"
        ],
        semantic_description="Behavior support plan or incident report documenting behavioral challenges, triggers, and intervention strategies"
    ),

    DocumentCategory(
        id="sensory_profile",
        name="Sensory Profile",
        description="Sensory processing assessments and profiles",
        timeline_entry_type="SENSORY",
        strong_keywords=[
            "sensory profile", "sensory processing", "sensory assessment",
            "sensory diet", "sensory integration", "dunn sensory profile"
        ],
        weak_keywords=[
            "sensory", "overstimulation", "understimulation", "proprioceptive",
            "vestibular", "tactile", "auditory", "visual processing"
        ],
        semantic_description="Sensory processing assessment or profile documenting sensory preferences, sensitivities, and recommended accommodations"
    ),

    DocumentCategory(
        id="communication_passport",
        name="Communication Passport",
        description="Communication profiles and AAC documentation",
        timeline_entry_type="COMMUNICATION",
        strong_keywords=[
            "communication passport", "communication profile", "aac",
            "augmentative communication", "pecs", "makaton", "communication book"
        ],
        weak_keywords=[
            "communication", "speech", "language", "understanding", "expression",
            "signs", "symbols", "visual supports"
        ],
        semantic_description="Communication passport or profile documenting how a child communicates, their preferences, and communication support needs"
    ),

    DocumentCategory(
        id="care_plan",
        name="Care Plan",
        description="Health care plans and medical protocols",
        timeline_entry_type="MEDICAL",
        strong_keywords=[
            "care plan", "health care plan", "medical protocol", "emergency plan",
            "seizure protocol", "allergy action plan", "asthma plan", "diabetes plan"
        ],
        weak_keywords=[
            "care", "protocol", "emergency", "medication", "administration",
            "monitor", "signs", "action"
        ],
        semantic_description="Healthcare plan or medical protocol for managing a child's ongoing health condition at school or in care settings"
    ),

    DocumentCategory(
        id="general_letter",
        name="General Letter",
        description="Letters and correspondence about the child",
        timeline_entry_type="NOTE",
        strong_keywords=[
            "dear parent", "dear guardian", "to whom it may concern",
            "re:", "reference:"
        ],
        weak_keywords=[
            "letter", "correspondence", "inform", "advise", "confirm",
            "appointment", "meeting", "update"
        ],
        semantic_description="General letter or correspondence regarding a child from school, healthcare provider, or other professional"
    ),
]


def get_category_by_id(category_id: str) -> Optional[DocumentCategory]:
    """Get a category by its ID."""
    for cat in DOCUMENT_CATEGORIES:
        if cat.id == category_id:
            return cat
    return None


def get_all_category_names() -> list[str]:
    """Get list of all category names for classification."""
    return [cat.name for cat in DOCUMENT_CATEGORIES]
