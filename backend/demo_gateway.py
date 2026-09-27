"""Temporary itch.io recognition gateway; exposes no files or paid companion APIs.

Run the normal model service on 8100, then this gateway on 8101 and tunnel only 8101.
"""

import os
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response


def create_gateway() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app):
        async with httpx.AsyncClient(
            base_url="http://127.0.0.1:8100", timeout=50, follow_redirects=False
        ) as client:
            app.state.http = client
            yield

    app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
    origins = os.getenv(
        "DEMO_ALLOWED_ORIGINS",
        "https://html-classic.itch.zone,https://html.itch.zone,http://127.0.0.1:5173,http://localhost:5173",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[s.strip() for s in origins.split(",") if s.strip()],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type", "ngrok-skip-browser-warning"],
        allow_credentials=False,
    )

    async def forward(request: Request, path: str):
        data = bytearray()
        async for chunk in request.stream():
            data.extend(chunk)
            if len(data) > 150_000:
                return JSONResponse(status_code=413, content={"detail": "Request too large."})
        try:
            upstream = await app.state.http.request(
                request.method,
                path,
                content=bytes(data),
                headers={"Content-Type": "application/json"},
            )
            if upstream.status_code >= 500:
                return JSONResponse(
                    status_code=503,
                    content={
                        "ready": False,
                        "detail": "The laptop's recognition service is unavailable. Keep the model service running on port 8100.",
                    },
                )
            if path == "/api/health" and upstream.is_success:
                health = upstream.json()
                return JSONResponse(
                    {
                        "gemini": False,
                        "gradium": False,
                        "recognition": bool(health.get("recognition")),
                        "modelExists": bool(health.get("modelExists")),
                    },
                    headers={"Cache-Control": "no-store"},
                )
            headers = {"Cache-Control": "no-store"}
            if "retry-after" in upstream.headers:
                headers["Retry-After"] = upstream.headers["retry-after"]
            return Response(
                content=upstream.content,
                status_code=upstream.status_code,
                media_type="application/json",
                headers=headers,
            )
        except (httpx.HTTPError, ValueError):
            return JSONResponse(
                status_code=503,
                content={
                    "ready": False,
                    "detail": "The laptop's recognition service is unavailable. Start it on port 8100 and retry.",
                },
            )

    @app.get("/api/health")
    async def health(request: Request):
        return await forward(request, "/api/health")

    @app.post("/api/recognition/warmup")
    async def warmup(request: Request):
        return await forward(request, "/api/recognition/warmup")

    @app.post("/api/recognize")
    async def recognize(request: Request):
        return await forward(request, "/api/recognize")

    return app


app = create_gateway()
