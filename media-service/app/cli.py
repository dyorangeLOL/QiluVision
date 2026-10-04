import argparse
import json
import sys
from pathlib import Path

from app.services.ffmpeg import MediaCommandError, MediaToolUnavailableError
from app.services.processor import process_media


def main() -> int:
    parser = argparse.ArgumentParser(description="Process one QiluVision media asset.")
    parser.add_argument("--source", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--type", required=True, choices=("image", "video"))
    args = parser.parse_args()

    try:
        result = process_media(Path(args.source), Path(args.output), args.type)
    except (MediaCommandError, MediaToolUnavailableError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 1

    print(json.dumps(result, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
