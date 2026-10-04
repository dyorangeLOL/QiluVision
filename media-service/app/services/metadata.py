import json
from dataclasses import asdict, dataclass
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from app.services.ffmpeg import MediaCommandError, resolve_tool, run_command


@dataclass(frozen=True)
class MediaMetadata:
    width: int
    height: int
    duration: float | None = None
    fps: float | None = None
    codec: str | None = None

    def to_dict(self) -> dict[str, int | float | str | None]:
        return asdict(self)


def read_image_metadata(source: Path) -> MediaMetadata:
    try:
        with Image.open(source) as image:
            image.verify()
        with Image.open(source) as image:
            transposed = ImageOps.exif_transpose(image)
            width, height = transposed.size
        return MediaMetadata(width=width, height=height)
    except (UnidentifiedImageError, OSError) as error:
        raise MediaCommandError(f"Invalid or damaged image: {error}") from error


def _parse_rate(value: str | None) -> float | None:
    if not value or value == "0/0":
        return None
    numerator, separator, denominator = value.partition("/")
    try:
        return float(numerator) / float(denominator) if separator else float(value)
    except (ValueError, ZeroDivisionError):
        return None


def probe_video(source: Path) -> MediaMetadata:
    completed = run_command(
        [
            resolve_tool("ffprobe"),
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height,codec_name,avg_frame_rate:format=duration",
            "-of",
            "json",
            str(source),
        ]
    )
    try:
        payload = json.loads(completed.stdout)
        stream = payload["streams"][0]
        duration = float(payload["format"]["duration"])
        width = int(stream["width"])
        height = int(stream["height"])
    except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as error:
        raise MediaCommandError("ffprobe returned incomplete video metadata.") from error

    if duration <= 0 or width <= 0 or height <= 0:
        raise MediaCommandError("Video duration or resolution is invalid.")

    return MediaMetadata(
        width=width,
        height=height,
        duration=duration,
        fps=_parse_rate(stream.get("avg_frame_rate")),
        codec=stream.get("codec_name"),
    )
