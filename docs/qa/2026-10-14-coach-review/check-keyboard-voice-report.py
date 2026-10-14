from pathlib import Path
import subprocess, json, hashlib, re

repo = Path(r'C:\Users\camst\s6qa')
def git(*args):
    return subprocess.run(['git', *args], cwd=repo, capture_output=True, check=True).stdout
folder = 'docs/qa/2026-10-14-coach-review'
manifest = json.loads(git('show', ':'+folder+'/manifest.json'))
for row in manifest:
    data = git('show', ':'+folder+'/'+row['file'])
    assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], row['file']
for name in ['43_SHIPPING_GOAL_AND_TODO.md', '50_LOCAL_COACH_REVIEW_QA.md', '51_LOCAL_VOICE_NATIVE_QA.md', '52_NATIVE_ACCESSIBILITY_AND_LABELS_QA.md']:
    data = (repo / 'docs' / name).read_text(encoding='utf-8')
    for link in re.findall(r'\]\(([^)]+)\)', data):
        if not link.startswith(('https:', '#')):
            assert (repo / 'docs' / link.split('#')[0]).exists(), (name, link)
issues = json.loads(subprocess.run(['gh','issue','list','--repo','camster91/Shift6','--state','open','--limit','200','--json','number,title,url'], capture_output=True, check=True).stdout)
doc = (repo / 'docs/43_SHIPPING_GOAL_AND_TODO.md').read_text(encoding='utf-8')
mapped = [int(n) for line in doc.splitlines() if line.startswith('| #') for n in re.findall(r'#(\d+)', line.split('|')[1])]
assert len(mapped) == len(set(mapped)) == len(issues) == 55
assert set(mapped) == {row['number'] for row in issues}
print(f'PASS: {len(manifest)} staged raw-byte evidence hashes; report links; all {len(issues)} live open issues mapped once')
