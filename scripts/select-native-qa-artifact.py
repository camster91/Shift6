"""Reuse a native artifact only when its application source matches this checkout."""

import json
import os
import re
import subprocess
from urllib.parse import quote


repo = os.environ['GITHUB_REPOSITORY']
branch = quote(os.environ['QA_BRANCH'], safe='')
route = f'repos/{repo}/actions/workflows/native-validation.yml/runs?status=success&branch={branch}&per_page=20'
runs = json.loads(subprocess.check_output(['gh', 'api', route]))['workflow_runs']
exclude = [':!docs', ':!README.md', ':!.github', ':!.env.release.example',
           ':!scripts/mobile-runtime-qa.py', ':!scripts/select-native-qa-artifact.py']
for run in runs:
    sha = run['head_sha']
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        continue
    if subprocess.run(['git', 'cat-file', '-e', f'{sha}^{{commit}}'], capture_output=True).returncode:
        continue
    matches = subprocess.run(['git', 'diff', '--quiet', sha, 'HEAD', '--', '.', *exclude]).returncode == 0
    if not matches:
        continue
    artifacts = json.loads(subprocess.check_output(['gh', 'api', f'repos/{repo}/actions/runs/{run["id"]}/artifacts']))['artifacts']
    if not any(a['name'] == 'ios-unsigned-simulator-release' and not a['expired'] for a in artifacts):
        continue
    with open(os.environ['GITHUB_OUTPUT'], 'a') as output:
        output.write(f'run_id={run["id"]}\nsource_sha={sha}\n')
    print(f'Using native run {run["id"]}, source {sha}; application source matches this checkout.')
    break
else:
    raise SystemExit('No successful native artifact matches this app source. Complete Native validation, then rerun this job.')
