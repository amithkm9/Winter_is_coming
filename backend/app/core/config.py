"""Runtime configuration for the task generation engine."""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str | None
    gemini_model: str
    gemini_timeout_seconds: float
    allowed_origins: tuple[str, ...]

    @property
    def gemini_enabled(self) -> bool:
        return bool(self.gemini_api_key)


def load_settings() -> Settings:
    origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
    return Settings(
        gemini_api_key=os.getenv("GEMINI_API_KEY") or None,
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash"),
        gemini_timeout_seconds=float(os.getenv("GEMINI_TIMEOUT_SECONDS", "3.0")),
        allowed_origins=tuple(o.strip() for o in origins.split(",") if o.strip()),
    )


settings = load_settings()
