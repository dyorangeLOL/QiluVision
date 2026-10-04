import os
import subprocess
from pathlib import Path
from shutil import which

from app.config import repository_root, settings


class MediaToolUnavailableError(RuntimeError):
    """Raised when FFmpeg or ffprobe cannot be resolved."""


class MediaCommandError(RuntimeError):
    """Raised when an FFmpeg-family command fails."""


def _local_tool(name: str) -> Path | None:
    executable = f"{name}.exe" if os.name == "nt" else name
    candidates = list((repository_root() / "tools" / "ffmpeg").glob(f"**/bin/{executable}"))
    return candidates[0] if candidates else None


def resolve_tool(name: str) -> str:
    configured = settings.ffmpeg_path if name == "ffmpeg" else settings.ffprobe_path
    configured_path = Path(configured)
    if configured_path.is_file():
        return str(configured_path.resolve())

    path_match = which(configured)
    if path_match:
        return path_match

    local_match = _local_tool(name)
    if local_match:
        return str(local_match.resolve())

    raise MediaToolUnavailableError(
        f"{name} is unavailable. Install FFmpeg and ensure {name} is on PATH, "
        f"or set {name.upper()}_PATH to the executable."
    )


def tools_available() -> bool:
    try:
        resolve_tool("ffmpeg")
        resolve_tool("ffprobe")
        return True
    except MediaToolUnavailableError:
        return False


def run_command(command: list[str]) -> subprocess.CompletedProcess[str]:
    completed = subprocess.run(
        command,
        capture_output=True,
        check=False,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if completed.returncode != 0:
        message = completed.stderr.strip() or completed.stdout.strip() or "Unknown media error"
        raise MediaCommandError(message[-2000:])
    return completed
