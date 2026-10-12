"""Structural PDF QA; visual QA of every rendered page is additionally required."""
import argparse
import re
from pathlib import Path
import pdfplumber
from pypdf import PdfReader

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('pdf', type=Path)
parser.add_argument('--preview', action='store_true')
args = parser.parse_args()
with pdfplumber.open(args.pdf) as document:
    text = '\n'.join(page.extract_text() or '' for page in document.pages)
    assert re.findall(r'Answer Part [1-9]:', text) == [f'Answer Part {number}:' for number in range(1, 10)]
    for prefix, count in [('FR', 10), ('BR', 20), ('AC', 12)]:
        for number in range(1, count + 1):
            assert f'{prefix}-{number:02}' in text, f'Missing {prefix}-{number:02}'
    root = Path(__file__).resolve().parents[1]
    planned = (root / 'docs/lab-04/tests.md').read_text(encoding='utf-8')
    for identifier in set(re.findall(r'L4-[A-Z]+-\d{3}', planned)):
        assert identifier in text, f'Missing concrete test row: {identifier}'
    assert 'My Reflection' in text
    assert 'Expected result:' in text and 'Automated file:' in text and 'Status:' in text
    assert ('PREVIEW' in text) == args.preview
    for page in document.pages:
        for word in page.extract_words():
            assert word['x0'] >= 0 and word['x1'] <= page.width + 1, f'Horizontal clipping on page {page.page_number}'
    print(f'{len(document.pages)} pages; nine headings; numbered contract and all planned test rows present.')
reader = PdfReader(args.pdf)
links = []
for page in reader.pages:
    for annotation in page.get('/Annots', []):
        action = annotation.get_object().get('/A', {})
        if action.get('/URI'):
            links.append(str(action['/URI']))
assert len(links) >= 30
assert all(link.startswith('https://') and '/blob/main/' not in link for link in links)
print(f'{len(links)} HTTPS links; repository document/image links use immutable commits.')
