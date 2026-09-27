"""Package the Winter static client. Backend files and secrets are excluded."""

import argparse
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

parser = argparse.ArgumentParser(description="Package Winter is Coming for itch.io.")
# Retain the old command flag for existing local launch scripts.
parser.add_argument("--winter", action="store_true", help=argparse.SUPPRESS)
parser.parse_args()

root = Path(__file__).resolve().parents[1]
dist = root / "dist"
if not (dist / "index.html").is_file():
    raise SystemExit("Run npm run build first.")
destination = root / "artifacts" / "winter-paris-3d-itch.zip"
destination.parent.mkdir(exist_ok=True)
with ZipFile(destination, "w", ZIP_DEFLATED) as archive:
    for path in sorted(dist.rglob("*")):
        if path.is_file():
            archive.write(path, path.relative_to(dist))
print(f"Created {destination} ({destination.stat().st_size:,} bytes)")
