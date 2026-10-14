from pathlib import Path
import shutil,json,hashlib
q=Path(__file__).parent;o=Path(r'C:\Users\camst\s6qa\docs\qa\2026-10-14-coach-review')
patterns=['coach-review-*.png','coach-review-*.xml','coach-review-*.json','coach-review-*.log','coach-review-*.txt','verify-integrated-1f4d33b1*','build-integrated-1f4d33b1.*','workout-focus-diagnostic-1f4d33b1.*','workout-phase-diagnostic-1f4d33b1.*','workout-harness-*','verify-integrated-86a26c44.*','build-integrated-86a26c44.*']
local_only={'coach-review-actual-labels-ime-mode-86a26c44.txt','coach-review-actual-labels-focused-ime-86a26c44.txt'}
if any((o/name).exists() for name in local_only):
 raise RuntimeError('Local-only raw IME dumps already exist in the evidence destination; resolve separately before packaging.')
for pattern in patterns:
 for p in q.glob(pattern):
  if p.is_file() and p.name not in local_only:shutil.copyfile(p,o/p.name)
for name in ['run-a11y-probe-overlap.py','qa-talkback-settings.py','qa-talkback-confirm.py','qa-talkback-action.py','test-actual-labels-1f4d33b1.py','test-actual-labels-86a26c44.py','test-actual-labels-86a26c44-first-harness.py','test-labels-closed-font2-86a26c44.py','test-labels-voice-font2-86a26c44.py','test-voice-paced-86a26c44.py','capture-default-observer-86a26c44.py','read-accessibility-export-ae3efb5a.py','compare-accessibility-export-ae3efb5a.py','check-keyboard-voice-report.py','package-accessibility-labels.py','qa.py','compare-labels-export-86a26c44.py']:
 shutil.copyfile(q/name,o/name)
for relative in ['README.md','AndroidManifest.xml','build.ps1','build-receipt.json','src/com/shift6/qa/a11yprobe/Probe.java']:
 p=q/'a11y-probe'/relative;dest=o/'a11y-probe'/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
for relative in ['README.md','AndroidManifest.xml','build.ps1','build-receipt.json','src/com/shift6/qa/a11yprobedefault/Probe.java']:
 p=q/'a11y-probe-default'/relative;dest=o/'a11y-probe-default'/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dest)
manifest=[{'file':p.relative_to(o).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(o.rglob('*')) if p.is_file() and p.name!='manifest.json']
(o/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf8');print('Raw-byte manifest',len(manifest))
