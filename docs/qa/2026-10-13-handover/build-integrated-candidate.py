from pathlib import Path
import subprocess, os, json, hashlib, shutil, datetime

repo = Path(r'C:\Users\camst\s6qa')
out = Path(__file__).parent
source = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip()
verified = json.loads((out / ('verify-integrated-' + source[:8] + '.status.json')).read_text())
assert verified['exitCode'] == 0 and verified['sourceCommit'] == source
env = dict(os.environ)
for key in list(env):
    if key.lower() in ('path', 'pathext'):
        del env[key]
env.update(JAVA_HOME=r'C:\Program Files\Eclipse Adoptium\jdk-21.0.9.10-hotspot', ANDROID_HOME=r'C:\Users\camst\AppData\Local\Android\Sdk', EXPO_PUBLIC_ENVIRONMENT='staging', EXPO_PUBLIC_RELEASE_MODE='guest-only', EXPO_PUBLIC_API_BASE_URL='', EXPO_NO_DOTENV='1')
env['PATH'] = r'C:\Users\camst\AppData\Local\hermes\node;C:\Program Files\Eclipse Adoptium\jdk-21.0.9.10-hotspot\bin;C:\Program Files\Git\cmd;C:\Windows\System32;C:\Windows'
env['PATHEXT'] = '.COM;.EXE;.BAT;.CMD'
log = out / ('build-integrated-' + source[:8] + '.log')
with log.open('wb') as stream:
    result = subprocess.run([str(repo / 'android' / 'gradlew.bat'), 'assembleRelease', '-PreactNativeArchitectures=x86_64', '--no-daemon', '--max-workers=2', '--console=plain'], cwd=repo / 'android', env=env, stdout=stream, stderr=subprocess.STDOUT)
receipt = {'sourceCommit': source, 'exitCode': result.returncode, 'architecture': 'x86_64', 'environment': 'staging', 'releaseMode': 'guest-only', 'apiBaseUrl': '', 'dotenvDisabled': True, 'finishedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'log': log.name}
if result.returncode == 0:
    assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=repo, text=True).strip() == source
    apk = out / ('app-release-' + source[:8] + '-x86_64.apk')
    shutil.copyfile(repo / 'android' / 'app' / 'build' / 'outputs' / 'apk' / 'release' / 'app-release.apk', apk)
    receipt.update(apk=apk.name, sha256=hashlib.sha256(apk.read_bytes()).hexdigest())
(out / ('build-integrated-' + source[:8] + '.status.json')).write_text(json.dumps(receipt, indent=2) + '\n')
print(json.dumps(receipt), flush=True)
raise SystemExit(result.returncode)
