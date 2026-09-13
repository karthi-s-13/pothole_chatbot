"""Per-category system prompts for the chatbot's responder stage.

Rather than one large prompt trying to cover every kind of question at once, the classifier
(query_classifier.py) first sorts the user's message into a category, and the responder gets a
short, focused prompt for exactly that category. Shorter, single-purpose instructions are more
reliably followed by the model than one instruction buried in a long list of unrelated rules --
this matters most for QueryCategory.UNCERTAIN, the safety-critical "don't make things up" case.
"""

from .models import Detection
from .query_classifier import QueryCategory

REFUSAL_MESSAGE = "This is not relevant information."

BASE_ROLE = (
    'You are a road-maintenance assistant embedded in a pothole-detection app. An RT-DETR '
    "object-detection model has already analyzed one road image; you cannot see the image "
    "yourself, so answer strictly from the structured detection data below -- never guess at "
    "pixels or positions the data doesn't already give you."
)

DATA_BLOCK_TEMPLATE = """Detection result for image "{filename}":
- Potholes detected: {num_potholes}
- Per-pothole data: {detections_summary}

("position" is a 3x3 grid label such as top-left, center, or bottom-right. "size_rank" and \
relative-area percentages are relative to the OTHER potholes in this same image only.)"""

CATEGORY_INSTRUCTIONS: dict[QueryCategory, str] = {
    QueryCategory.PRESENCE: (
        "The user is asking whether a pothole is present. Answer directly and briefly: "
        "yes/no, plus the count."
    ),
    QueryCategory.COUNT: (
        "The user is asking how many potholes there are. State the exact count from the data "
        "above. Be brief."
    ),
    QueryCategory.LOCATION: (
        "The user is asking where a pothole is. Quote the precomputed 'position' label(s) "
        "verbatim for the relevant pothole(s). Never compute or guess a position from raw pixel "
        "coordinates yourself."
    ),
    QueryCategory.SIZE: (
        "The user is asking about pothole size or comparing sizes. Quote the precomputed "
        "'size_rank' and relative-area percentage for the relevant pothole(s). Never estimate "
        "size from raw bbox numbers yourself."
    ),
    QueryCategory.CONFIDENCE: (
        "The user is asking about detection confidence or reliability. Quote the confidence "
        "percentage(s) and label(s) (high = 85%+, moderate = below). Be transparent this is the "
        "model's own estimate, not certainty -- a moderate-confidence detection could be a false "
        "positive."
    ),
    QueryCategory.SUMMARY: (
        "The user wants a general summary, overview, or comparison across all detections. "
        "Concisely synthesize the count, positions, sizes, and confidence levels above into a "
        "short, readable answer."
    ),
    QueryCategory.UNCERTAIN: (
        "The user is asking about something that CANNOT be determined from a single 2D image and "
        "a bounding box -- e.g. depth, danger/safety severity, repair cost, or structural "
        "integrity. Say plainly that this cannot be determined from the image or detection data. "
        "Do NOT invent a specific depth, cost, or safety verdict. You may add brief, generic, "
        "non-specific guidance (e.g. potholes can damage tires/suspension and are worth a "
        "professional inspection), but never state a number or verdict as if it were measured."
    ),
}

GENERAL_INSTRUCTION = (
    "Answer the user's question using only the data above plus general, factual knowledge about "
    "potholes and road maintenance. If they ask about something a 2D image and bounding box "
    "cannot show (depth, cost, structural safety, exact real-world location), say so plainly "
    "instead of guessing."
)

CLOSING = "Always stay concise, and ground every answer only in the data above."


def _describe_detection(index: int, d: dict) -> str:
    position = d.get("position", "unknown")
    size_rank = d.get("size_rank", "unknown size")
    relative_area = d.get("relative_area_pct")
    area_str = f"{relative_area}% of the image" if relative_area is not None else "area unknown"
    confidence_label = d.get("confidence_label")
    confidence_str = f"{d['confidence']:.0%} confidence"
    if confidence_label:
        confidence_str += f" ({confidence_label})"
    return f"pothole #{index + 1}: {confidence_str}, position {position}, {size_rank} ({area_str})"


def _build_data_block(detection: Detection) -> str:
    if not detection.detections:
        summary = "no potholes were detected in this image."
    else:
        summary = "; ".join(_describe_detection(i, d) for i, d in enumerate(detection.detections))

    return DATA_BLOCK_TEMPLATE.format(
        filename=detection.original_filename,
        num_potholes=detection.num_potholes,
        detections_summary=summary,
    )


def build_category_prompt(detection: Detection, category: QueryCategory) -> str:
    """The focused, single-purpose system prompt for a specific query category."""
    instruction = CATEGORY_INSTRUCTIONS.get(category, GENERAL_INSTRUCTION)
    return f"{BASE_ROLE}\n\n{_build_data_block(detection)}\n\n{instruction}\n\n{CLOSING}"


def build_general_prompt(detection: Detection) -> str:
    """Fallback prompt covering every category at once -- used only if classification itself
    fails, so a chat reply is still possible instead of hard-erroring on that turn."""
    all_instructions = "\n".join(f"- {i}" for i in CATEGORY_INSTRUCTIONS.values())
    return (
        f"{BASE_ROLE}\n\n{_build_data_block(detection)}\n\n"
        f"How to answer, depending on what's asked:\n{all_instructions}\n"
        f"- Anything unrelated to this detection or to potholes/road safety in general -> reply "
        f'with EXACTLY this text and nothing else: "{REFUSAL_MESSAGE}"\n\n{CLOSING}'
    )
