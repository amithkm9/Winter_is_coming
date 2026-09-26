"""Gesture catalogue shared by the task engine and the vision pipeline."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Gesture:
    key: str
    displayName: str
    guideInstructions: str


GESTURES: dict[str, Gesture] = {
    g.key: g
    for g in [
        Gesture(
            "OPEN_PALM",
            "Open Hand / Hello",
            "Raise an open palm towards the camera, fingers spread and fully extended.",
        ),
        Gesture(
            "HALT",
            "Stop / Halt",
            "Hold a flat vertical palm facing the camera, fingers together and thumb tucked.",
        ),
        Gesture(
            "HEART",
            "Love / Heart",
            "Join both hands in front of your chest to form a heart shape.",
        ),
        Gesture(
            "LIGHT",
            "Light / Sun",
            "Start from a closed fist at chin height, then flick all fingers open upwards.",
        ),
        Gesture(
            "BOOK",
            "Knowledge / Book",
            "Place both palms together, then open them like the pages of a book.",
        ),
        Gesture(
            "SILENCE",
            "Silence / Secret",
            "Hold a single index finger vertically in front of your lips.",
        ),
        Gesture(
            "PEACE_V",
            "Victory / Peace (V)",
            "Extend index and middle fingers upward in a 'V' shape with palm facing the camera.",
        ),
        Gesture(
            "FREEDOM",
            "Freedom / Unfreeze",
            "Cross both wrists in front of you, then pull them apart to break the shackles.",
        ),
        Gesture(
            "LISTEN",
            "Listen / Sound",
            "Cup one hand behind your ear and hold it steady towards the camera.",
        ),
        Gesture(
            "WATER",
            "Water / River",
            "Hold a flat hand sideways and ripple it horizontally across the frame.",
        ),
        Gesture(
            "BREAK",
            "Break / Revolt",
            "Raise a closed fist above shoulder height and hold it still.",
        ),
        Gesture(
            "TOGETHER",
            "Help / Together",
            "Rest a closed fist on your open opposite palm and lift both hands together.",
        ),
        Gesture(
            "CODE",
            "Code / Tech",
            "Hold up index and middle fingers pointing sideways, like a bracket pair.",
        ),
        Gesture(
            "SHIELD",
            "Shield / Defend",
            "Raise a flat palm across your chest as if blocking an incoming strike.",
        ),
        Gesture(
            "FIRE",
            "Energy / Fire",
            "Hold a claw-shaped hand at chest height with fingers curled and spread.",
        ),
        Gesture(
            "POINT",
            "Point / Target",
            "Extend only the index finger straight towards the camera.",
        ),
        Gesture(
            "THUMB_UP",
            "Approve / Thumbs Up",
            "Close your fist and extend the thumb straight upwards.",
        ),
    ]
}


def get_gesture(key: str) -> Gesture:
    try:
        return GESTURES[key]
    except KeyError as exc:
        raise KeyError(f"Unknown gesture key: {key}") from exc
