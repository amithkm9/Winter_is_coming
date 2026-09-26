"""Winter Is Coming companion and landmark inference service.

Run: python -m uvicorn main:app --host 127.0.0.1 --port 8100
"""
from collections import defaultdict, deque
from contextlib import asynccontextmanager
import math
import logging
import os
import time
from typing import Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from starlette.concurrency import run_in_threadpool

from recognition import Recognizer, RecognitionUnavailable

load_dotenv()
logger = logging.getLogger("learnsign.providers")
Sign = Literal["A", "B", "C", "1", "2", "3"]


class HintRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    encounter: str = Field(min_length=1, max_length=80)
    unlocked: list[Sign] = Field(default_factory=list, max_length=6)
    attempts: int = Field(default=0, ge=0, le=1000)


class VoiceRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=500)

    @field_validator("text")
    @classmethod
    def nonempty(cls, value):
        if not value.strip():
            raise ValueError("Text must not be blank")
        return value.strip()


class RecognitionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    frames: list[list[list[float]]] = Field(min_length=30, max_length=30)

    @field_validator("frames")
    @classmethod
    def hand_sequence(cls, frames):
        for frame in frames:
            if len(frame) != 21 or any(len(point) != 3 for point in frame):
                raise ValueError("Every frame must contain 21 XYZ landmarks")
            if any(not math.isfinite(v) or abs(v) > 10 for point in frame for v in point):
                raise ValueError("Landmarks must be finite and within range")
            if max(abs(v - frame[0][i]) for point in frame for i, v in enumerate(point)) <= 1e-8:
                raise ValueError("No usable hand landmarks")
        return frames


# Authored, bounded facts. User-supplied encounter text is never inserted into prompts.
ENCOUNTERS = {
    "winter-arrival": ("Reach the three relay stations in the Louvre courtyard. Avoid drone scan cones and press Enter near a station to begin its bypass.", None),
    "winter-relay": ("Stand beside the relay and press Enter. Choose PRACTISE FIRST to rehearse safely without drone danger; return to the relay when ready. Enter the displayed A, B or C sequence using the keyboard or experimental camera. These letters are game ciphers, not verified sign-language lessons.", None),
    "winter-drone": ("A scan starts a five-second countdown. Move outside the marked area before zero or you are caught. Retry returns you to a checkpoint with restored relays kept.", None),
    "winter-core": ("Bypass all three relays first. Then approach the central core and press Enter to restore this sector's power.", None),
    "winter-liberated": ("The Louvre sector has power again. Open the chapter map to continue to Under the Ice, or stay to find remaining memories.", None),
}


def authored_hint(body: HintRequest) -> dict:
    key = body.encounter.lower().strip()
    text, focus = ENCOUNTERS.get(key, ENCOUNTERS["winter-arrival"])
    return {"text": text, "source": "authored", "focus": focus}


class RateLimiter:
    """Per-process limits; reverse-proxy/global quotas are needed at public scale."""
    def __init__(self):
        self.hits = defaultdict(deque)

    def check(self, identity: str, route: str):
        now = time.monotonic()
        # Limit state growth without trusting spoofable forwarded-for headers.
        if len(self.hits) > 4000:
            self.hits = defaultdict(deque, {k: v for k, v in self.hits.items() if v and v[-1] > now - 60})
        queue = self.hits[(identity, route)]
        while queue and queue[0] <= now - 60:
            queue.popleft()
        limit = 90 if route == "/api/recognize" else 20
        if len(queue) >= limit:
            raise HTTPException(429, "Please wait before asking again.", headers={"Retry-After": "60"})
        queue.append(now)


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app):
        async with httpx.AsyncClient(timeout=httpx.Timeout(12, connect=4), follow_redirects=False) as client:
            app.state.http = client
            yield

    app = FastAPI(title="Winter Is Coming Service", lifespan=lifespan)
    app.add_middleware(CORSMiddleware,
                       allow_origins=[origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()],
                       allow_methods=["GET", "POST"], allow_headers=["Content-Type"], allow_credentials=False)
    app.state.limiter = RateLimiter()
    app.state.recognizer = Recognizer(os.getenv("LEARNSIGN_MODEL_PATH", ""), float(os.getenv("LEARNSIGN_CONFIDENCE", "0.85")))

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, exc):
        # Avoid returning submitted landmarks/text or non-JSON NaN values.
        return JSONResponse(status_code=422, content={"detail": "Invalid request. Check field types, limits and landmark shape (30 x 21 x 3)."})

    @app.middleware("http")
    async def bounded_body(request, call_next):
        # Stream limit, including requests with no Content-Length header.
        if request.method == "POST":
            data = bytearray()
            async for chunk in request.stream():
                data.extend(chunk)
                if len(data) > 150_000:
                    return JSONResponse(status_code=413, content={"detail": "Request too large."})
            request._body = bytes(data)
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    def limit(request: Request):
        app.state.limiter.check(request.client.host if request.client else "local", request.url.path)

    @app.get("/api/health")
    def health():
        return {"gemini": bool(os.getenv("GEMINI_API_KEY")), "gradium": bool(os.getenv("GRADIUM_API_KEY")),
                "recognition": app.state.recognizer.available, "modelExists": app.state.recognizer.model_exists}

    @app.post("/api/hint")
    async def hint(body: HintRequest, request: Request):
        limit(request)
        fallback = authored_hint(body)
        key = os.getenv("GEMINI_API_KEY")
        if not key:
            return fallback
        persona = ("You are Maëlle, a calm resistance radio guide in frozen Paris. "
                   "Guide the selected deaf, nonspeaking student learning sign language with practical reassurance. "
                   "Do not assume a character name unless supplied. All guidance has matching on-screen text. "
                   "The A/B/C and 1/2/3 labels are fictional terminal ciphers, not verified sign-language teaching. ")
        prompt = (persona +
                  "Give one concise hint, at most 35 words. Use only the supplied authored fact. "
                  "Do not invent locations, powers, controls, sign-language meanings or hand instructions. "
                  f"Authored fact: {fallback['text']} Attempts: {body.attempts}.")
        try:
            model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
            response = await app.state.http.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                headers={"x-goog-api-key": key},
                json={"contents": [{"role": "user", "parts": [{"text": prompt}]}],
                      "generationConfig": {"maxOutputTokens": 150, "temperature": 0.3}})
            response.raise_for_status()
            parts = response.json()["candidates"][0]["content"]["parts"]
            text = " ".join(part.get("text", "") for part in parts if not part.get("thought")).strip()
            if not text or len(text) > 500:
                return fallback
            return {"text": text, "source": "gemini", "focus": fallback["focus"]}
        except httpx.HTTPStatusError as exc:
            # Only numeric status/category: never log headers, keys, URL or body.
            status = exc.response.status_code
            category = {401: "unauthenticated", 403: "forbidden", 404: "model_not_found", 429: "rate_limited"}.get(status, "provider_http_error")
            logger.warning("Gemini fallback category=%s http_status=%s", category, status)
            return fallback
        except httpx.HTTPError as exc:
            logger.warning("Gemini fallback category=transport_error type=%s", type(exc).__name__)
            return fallback
        except (ValueError, KeyError, IndexError, TypeError):
            logger.warning("Gemini fallback category=invalid_response")
            return fallback

    @app.post("/api/voice")
    async def voice(body: VoiceRequest, request: Request):
        limit(request)
        key = os.getenv("GRADIUM_API_KEY")
        if not key:
            raise HTTPException(503, "Gradium voice is not configured. Captions remain available.")
        try:
            response = await app.state.http.post("https://api.gradium.ai/api/post/speech/tts",
                headers={"x-api-key": key}, json={"text": body.text,
                "voice_id": os.getenv("GRADIUM_VOICE_ID", "YTpq7expH9539ERJ"), "output_format": "wav", "only_audio": True})
            response.raise_for_status()
            if not response.content.startswith(b"RIFF") or response.content[8:12] != b"WAVE":
                raise ValueError("Invalid audio")
            return Response(response.content, media_type="audio/wav")
        except (httpx.HTTPError, ValueError):
            raise HTTPException(503, "Gradium voice is temporarily unavailable. Captions remain available.") from None

    @app.post("/api/recognize")
    async def recognize(body: RecognitionRequest, request: Request):
        limit(request)
        try:
            return await run_in_threadpool(app.state.recognizer.recognize, body.frames)
        except RecognitionUnavailable:
            raise HTTPException(503, "Recognition is unavailable. Configure the model and optional TensorFlow dependencies.") from None

    @app.post("/api/recognition/warmup")
    async def recognition_warmup(request: Request):
        limit(request)
        try:
            return await run_in_threadpool(app.state.recognizer.warmup)
        except RecognitionUnavailable:
            return JSONResponse(status_code=503, content={"ready": False,
                "detail": "The recognition model could not start. Check its configured path and TensorFlow dependencies."})

    return app


app = create_app()
