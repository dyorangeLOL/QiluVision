from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings loaded from the repository environment."""

    media_service_host: str = "127.0.0.1"
    media_service_port: int = 8001
    ffmpeg_path: str = "ffmpeg"
    ffprobe_path: str = "ffprobe"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()


def repository_root() -> Path:
    return Path(__file__).resolve().parents[2]
