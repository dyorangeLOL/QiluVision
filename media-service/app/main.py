from fastapi import FastAPI

from app.services.ffmpeg import tools_available

app = FastAPI(title="QiluVision Media Service", version="0.1.0")


@app.get("/health", tags=["system"])
def health() -> dict[str, str | bool]:
    """Expose service readiness without processing or fabricating media results."""

    return {
        "status": "ok",
        "ffmpeg_available": tools_available(),
        "phase": "1",
    }
