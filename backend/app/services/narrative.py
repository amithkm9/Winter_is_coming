"""Narrative engine: Gemini-generated briefings with deterministic fallback.

Every Gemini failure mode (missing key, timeout, malformed JSON, HTTP error)
degrades to the built-in profiles so the game stays playable fully offline.
"""

import json
import logging

import httpx

from app.core.config import Settings, settings
from app.data.districts import District
from app.models.task import Narrative, SequenceStep

logger = logging.getLogger(__name__)

GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)

PROMPT = """You are the narrative engine of the cyberpunk resistance game
"Winter is Coming", set in a Paris frozen by the rogue super-intelligence
NEXUS-PARIS. Humans resist using sign language because the AI intercepts all
speech and radio.

District: {district_name}
AI node: {boss_node}
Theme: {theme}
Difficulty tier: {tier} of 4
Required signs, in order: {signs}

Reply with ONLY a JSON object with exactly these string keys:
"handlerBriefing" (a resistance handler's radio-silent order to the player,
mentioning the required signs), "aiTaunt" (one cold line from {boss_node}),
"cipherRiddle" (a one-sentence riddle hinting at the signs without naming
them literally). Keep each value under 220 characters."""


def _signs_text(sequence: list[SequenceStep]) -> str:
    return ", ".join(step.displayName for step in sequence)


def fallback_narrative(district: District, tier: int,
                       sequence: list[SequenceStep]) -> Narrative:
    signs = _signs_text(sequence)
    return Narrative(
        handlerBriefing=(
            f"Resistance Comms: '{district.name} is dark. {district.theme}. "
            f"Transmit the cipher — {signs} — and hold each sign steady until "
            f"the node drops.'"
        ),
        aiTaunt=(
            f"{district.bossNode}: 'Human optical signals are obsolete. "
            f"Yield to the winter.'"
        ),
        cipherRiddle=(
            f"Tier {tier} lock on {district.bossNode}: only hands that speak "
            f"without sound can open it."
        ),
        source="fallback",
    )


def _parse_response(payload: dict) -> dict[str, str]:
    text = payload["candidates"][0]["content"]["parts"][0]["text"].strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[len("json"):]
    data = json.loads(text)
    return {
        key: str(data[key]).strip()
        for key in ("handlerBriefing", "aiTaunt", "cipherRiddle")
    }


async def generate_narrative(
    district: District,
    tier: int,
    sequence: list[SequenceStep],
    config: Settings | None = None,
    client: httpx.AsyncClient | None = None,
) -> Narrative:
    config = config or settings
    if not config.gemini_enabled:
        return fallback_narrative(district, tier, sequence)

    prompt = PROMPT.format(
        district_name=district.name,
        boss_node=district.bossNode,
        theme=district.theme,
        tier=tier,
        signs=_signs_text(sequence),
    )
    request = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 1.0, "responseMimeType": "application/json"},
    }
    url = GEMINI_ENDPOINT.format(model=config.gemini_model)

    owns_client = client is None
    client = client or httpx.AsyncClient(timeout=config.gemini_timeout_seconds)
    try:
        response = await client.post(
            url,
            json=request,
            headers={"x-goog-api-key": config.gemini_api_key or ""},
            timeout=config.gemini_timeout_seconds,
        )
        response.raise_for_status()
        fields = _parse_response(response.json())
    except (httpx.HTTPError, KeyError, IndexError, ValueError, TypeError) as exc:
        logger.warning("Gemini narrative generation failed, using fallback: %s", exc)
        return fallback_narrative(district, tier, sequence)
    finally:
        if owns_client:
            await client.aclose()

    return Narrative(**fields, source="gemini")
