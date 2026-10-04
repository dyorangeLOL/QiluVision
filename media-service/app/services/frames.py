from dataclasses import asdict, dataclass
from pathlib import Path

from PIL import Image, ImageOps

from app.services.ffmpeg import resolve_tool, run_command


@dataclass(frozen=True)
class GeneratedFrame:
    filename: str
    path: str
    position: int
    timestamp: float

    def to_dict(self) -> dict[str, str | int | float]:
        return asdict(self)


def representative_frame_count(duration: float) -> int:
    if duration < 12:
        return 3
    if duration < 90:
        return 5
    return 8


def sampling_timestamps(duration: float) -> list[float]:
    count = representative_frame_count(duration)
    start = min(max(duration * 0.08, 0.15), duration * 0.25)
    end = max(min(duration * 0.92, duration - 0.15), duration * 0.75)
    if end <= start:
        start, end = duration * 0.1, duration * 0.9
    step = (end - start) / (count - 1)
    return [round(start + index * step, 3) for index in range(count)]


def create_image_thumbnail(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = ImageOps.exif_transpose(image).convert("RGB")
        image.thumbnail((960, 540), Image.Resampling.LANCZOS)
        image.save(destination, format="JPEG", quality=86, optimize=True)


def _extract_frame(source: Path, destination: Path, timestamp: float, width: int = 1280) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    run_command(
        [
            resolve_tool("ffmpeg"),
            "-hide_banner",
            "-loglevel",
            "error",
            "-ss",
            f"{timestamp:.3f}",
            "-i",
            str(source),
            "-frames:v",
            "1",
            "-vf",
            f"scale='min({width},iw)':-2",
            "-q:v",
            "3",
            "-y",
            str(destination),
        ]
    )


def extract_representative_frames(
    source: Path, frames_directory: Path, duration: float
) -> list[GeneratedFrame]:
    frames: list[GeneratedFrame] = []
    for position, timestamp in enumerate(sampling_timestamps(duration), start=1):
        filename = f"frame_{position:03d}.jpg"
        destination = frames_directory / filename
        _extract_frame(source, destination, timestamp)
        frames.append(
            GeneratedFrame(
                filename=filename,
                path=str(destination.resolve()),
                position=position,
                timestamp=timestamp,
            )
        )
    return frames


def create_video_thumbnail(source: Path, destination: Path, duration: float) -> None:
    timestamps = sampling_timestamps(duration)
    _extract_frame(source, destination, timestamps[len(timestamps) // 2], width=960)
