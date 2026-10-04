# QiluVision Media Service

Phase 1 media processor for image metadata/thumbnails and FFmpeg video preprocessing.

```powershell
cd media-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e .
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Run the deterministic processor directly:

```powershell
python -m app.cli --source C:\path\clip.mp4 --output C:\path\generated --type video
```

The command writes one thumbnail plus 3, 5, or 8 representative JPEG frames and returns JSON metadata on stdout. FFmpeg command construction remains inside this service rather than Next.js.
