from pathlib import Path
import subprocess, os, json, datetime

repo = Path(r'C:\Users\camst\s6qa')
out = Path(__file__).parent
source = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
env = dict(os.environ)
for key in list(env):
    if key.lower() in ('path', 'pathext'):
        del env[key]
env['PATH'] = r'C:\Users\camst\AppData\Local\hermes\node;C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\Windows\System32;C:\Windows'
env['PATHEXT'] = '.COM;.EXE;.BAT;.CMD'
log = out / ('verify-integrated-' + source[:8] + '.log')
with log.open('wb') as stream:
    result = subprocess.run([r'C:\Users\camst\AppData\Local\hermes\node\node.exe', r'C:\Users\camst\AppData\Local\hermes\node\node_modules\npm\bin\npm-cli.js', 'run', 'verify'], cwd=repo, env=env, stdout=stream, stderr=subprocess.STDOUT)
receipt = {'sourceCommit': source, 'exitCode': result.returncode, 'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'command': 'npm run verify', 'log': log.name}
(out / ('verify-integrated-' + source[:8] + '.status.json')).write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt), flush=True)
raise SystemExit(result.returncode)
