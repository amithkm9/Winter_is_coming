"""Package only the static client. Backend files and secrets are excluded."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import sys

root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
if not (dist / 'index.html').is_file():
    raise SystemExit('Run npm run build first.')
winter = '--winter' in sys.argv
destination = root / 'artifacts' / ('winter-paris-3d-itch.zip' if winter else 'learnsign-forest-itch.zip')
destination.parent.mkdir(exist_ok=True)
with ZipFile(destination, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(dist.rglob('*')):
        if path.is_file():
            if winter and path.relative_to(dist).as_posix() == 'index.html':
                archive.writestr('index.html', (dist / 'winter.html').read_bytes())
                continue
            archive.write(path, path.relative_to(dist))
print(f'Created {destination} ({destination.stat().st_size:,} bytes)')
