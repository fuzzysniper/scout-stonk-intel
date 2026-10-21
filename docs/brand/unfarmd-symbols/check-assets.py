"""Offline structural checks; no providers or app runtime needed."""
from pathlib import Path
import hashlib
import json
import xml.etree.ElementTree as ET
root = Path(__file__).resolve().parent
ns = '{http://www.w3.org/2000/svg}'
manifest = {}
for name in ('outlier', 'skeptic', 'escape'):
    pair = []
    for suffix, color in (('', '#000'), ('-reversed', '#e8e0cd')):
        path = root / 'assets' / f'{name}{suffix}.svg'
        raw = path.read_bytes()
        svg = ET.fromstring(raw)
        assert svg.attrib['viewBox'] == '0 0 64 64'
        assert svg.attrib['fill'] == svg.attrib['color'] == color
        assert svg.attrib['aria-label'].startswith('UNFARMD')
        assert [node.tag for node in svg] == [ns + 'path']
        assert len(raw) < 750
        assert not any(value.startswith(('http:', 'https:', 'data:')) for node in svg.iter() for key, value in node.attrib.items() if key != 'xmlns')
        pair.append(svg[0].attrib)
        manifest[path.name] = {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
    assert pair[0] == pair[1], 'Reversal must preserve original geometry'
board = ET.parse(root / 'comparison.svg').getroot()
assert len(board.findall('.//' + ns + 'symbol')) == 3
assert len(board.findall('.//' + ns + 'use')) == 33
print(json.dumps({'result': 'PASS', 'assets': manifest}, indent=2))
