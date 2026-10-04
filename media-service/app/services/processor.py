from pathlib import Path

from app.services.ffmpeg import MediaCommandError, resolve_tool
from app.services.frames import (
    create_image_thumbnail,
    create_video_thumbnail,
    extract_representative_frames,
)
from app.services.metadata import probe_video, read_image_metadata


def process_media(source: Path, output_directory: Path, media_type: str) -> dict[str, object]:
    if not source.is_file():
        raise MediaCommandError("Uploaded source file does not exist.")
    output_directory.mkdir(parents=True, exist_ok=True)
    thumbnail = output_directory / "thumbnail.jpg"

    if media_type == "image":
        metadata = read_image_metadata(source)
        create_image_thumbnail(source, thumbnail)
        return {
            **metadata.to_dict(),
            "thumbnail_path": str(thumbnail.resolve()),
            "frames": [],
        }

    if media_type != "video":
        raise MediaCommandError(f"Unsupported media type: {media_type}")

    resolve_tool("ffmpeg")
    resolve_tool("ffprobe")
    metadata = probe_video(source)
    if metadata.duration is None:
        raise MediaCommandError("Video duration is unavailable.")
    create_video_thumbnail(source, thumbnail, metadata.duration)
    frames = extract_representative_frames(
        source, output_directory / "frames", metadata.duration
    )
    return {
        **metadata.to_dict(),
        "thumbnail_path": str(thumbnail.resolve()),
        "frames": [frame.to_dict() for frame in frames],
    }
