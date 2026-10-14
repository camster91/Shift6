from pathlib import Path
import json, hashlib, shutil, subprocess

qa = Path(__file__).parent
repo = Path(r'C:\Users\camst\s6qa')
out = repo / 'docs/qa/2026-10-14-coach-review'
a = json.loads((qa / 'coach-review-voice-editor-retest-export-057d5936.json').read_bytes())
b = json.loads((qa / 'coach-review-keyboard-final-export-3f1752ed.json').read_bytes())
keys = [k for k, v in a.items() if isinstance(v, list)]
assert len(keys) == 36
assert all(a[k] == b[k] for k in keys)
receipt = {'sourceCommit': '3f1752ede2917489e5ff4af103e4fc634fa41273',
           'identicalArrays': len(keys), 'records': sum(len(b[k]) for k in keys),
           'normalKeyboardObservedPass': True, 'font2KeyboardObservedPass': True,
           'firstExportRouteMissedAfterFontRecreation': True,
           'coldRestartThenFreshReceiverVerified': True, 'exportedAt': b.get('exportedAt')}
(qa / 'coach-review-keyboard-final-comparison-3f1752ed.json').write_text(json.dumps(receipt, indent=2)+'\n')
for run in [38534099956, 38534108589, 38534108570]:
    result = subprocess.run(['gh', 'run', 'view', str(run), '--repo', 'camster91/Shift6', '--json', 'headSha,conclusion,jobs'], capture_output=True, check=True)
    (qa / f'coach-review-ci-{run}.json').write_bytes(result.stdout)
patterns = ['coach-review-*.png', 'coach-review-*.xml', 'coach-review-*.json']
for sha in ['2c584311', '057d5936', '3f1752ed']:
    patterns += [f'verify-integrated-{sha}.*', f'build-integrated-{sha}.*']
files = {p for pattern in patterns for p in qa.glob(pattern) if p.is_file()}
for name in ['test-keyboard-057d5936.py', 'test-keyboard-large-057d5936.py',
             'test-voice-editor-057d5936.py', 'test-keyboard-space-3f1752ed.py',
             'test-keyboard-space-large-3f1752ed.py', 'finish-keyboard-voice-evidence.py',
             'export-coach-native.py']:
    files.add(qa / name)
for p in sorted(files):
    shutil.copyfile(p, out / p.name)
manifest = [{'file': p.name, 'bytes': p.stat().st_size,
             'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
            for p in sorted(out.iterdir()) if p.is_file() and p.name != 'manifest.json']
(out / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
print(json.dumps({'comparison': receipt, 'packagedFiles': len(manifest)}))
