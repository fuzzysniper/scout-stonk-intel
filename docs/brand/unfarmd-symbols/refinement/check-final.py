"""Validate final vectors, preserved originals and true-size browser PNG samples."""
from pathlib import Path
import hashlib
import json
import struct
import xml.etree.ElementTree as ET
root = Path(__file__).resolve().parent.parent
reviewed = json.loads((root / 'asset-checks.json').read_text())['assets']
for name, expected in reviewed.items():
    raw = (root / 'assets' / name).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == expected['sha256'], f'Reviewed original changed: {name}'
manifest = {}
pair = []
for suffix, color in (('', '#000'), ('-reversed', '#e8e0cd')):
    path = root / 'final' / f'outlier{suffix}.svg'
    raw = path.read_bytes()
    svg = ET.fromstring(raw)
    assert svg.attrib['viewBox'] == '0 0 64 64'
    assert svg.attrib['fill'] == color
    assert svg.attrib['role'] == 'img' and 'refined' in svg.attrib['aria-label']
    assert [node.tag for node in svg] == ['{http://www.w3.org/2000/svg}path']
    assert set(svg[0].attrib) == {'d'}
    assert len(raw) < 450
    pair.append(svg[0].attrib['d'])
    manifest[path.name] = {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
    for size in (16, 24, 32, 64):
        png = root / 'final' / f'outlier{suffix}-{size}.png'
        raw_png = png.read_bytes()
        assert raw_png[:8] == b'\x89PNG\r\n\x1a\n'
        assert struct.unpack('>II', raw_png[16:24]) == (size, size)
        assert raw_png[25] == 6, 'RGBA required for transparent samples'
        manifest[png.name] = {'width': size, 'height': size, 'bytes': len(raw_png), 'sha256': hashlib.sha256(raw_png).hexdigest()}
assert pair[0] == pair[1], 'Black and bone must have identical geometry'
assert pair[0] != ET.parse(root / 'assets/outlier.svg').getroot()[0].attrib['d']
print(json.dumps({'result': 'PASS', 'preservedOriginals': len(reviewed), 'assets': manifest}, indent=2))
