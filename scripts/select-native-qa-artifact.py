"""Reuse a native artifact only when its application source matches this checkout."""

import json
import os
import re
import subprocess
from urllib.parse import quote
from native_artifact_source import SOURCE_PATHS


repo = os.environ['GITHUB_REPOSITORY']
branch = quote(os.environ['QA_BRANCH'], safe='')
exact_run = os.environ.get('QA_NATIVE_BUILD_RUN', '')
if exact_run:
    if not re.fullmatch(r'[1-9][0-9]*', exact_run):
        raise SystemExit('Invalid triggering Native validation run identity.')
    route = f'repos/{repo}/actions/runs/{exact_run}'
    runs = [json.loads(subprocess.check_output(['gh', 'api', route]))]
else:
    route = f'repos/{repo}/actions/workflows/native-validation.yml/runs?status=success&branch={branch}&per_page=20'
    runs = json.loads(subprocess.check_output(['gh', 'api', route]))['workflow_runs']
for run in runs:
    if exact_run and str(run.get('id')) != exact_run:
        continue
    if (run.get('status') != 'completed' or run.get('conclusion') != 'success' or
            run.get('head_branch') != os.environ['QA_BRANCH'] or
            (run.get('head_repository') or {}).get('full_name', '').lower() != repo.lower() or
            run.get('path', '').split('@', 1)[0] != '.github/workflows/native-validation.yml'):
        continue
    sha = run['head_sha']
    if not re.fullmatch(r'[0-9a-f]{40}', sha):
        continue
    if subprocess.run(['git', 'cat-file', '-e', f'{sha}^{{commit}}'], capture_output=True).returncode:
        continue
    # Old builds did not emit source proof. They cannot be reused by the new verifier.
    if subprocess.run(['git', 'cat-file', '-e', f'{sha}:scripts/native_artifact_source.py'], capture_output=True).returncode:
        continue
    matches = subprocess.run(['git', 'diff', '--quiet', sha, 'HEAD', '--', *SOURCE_PATHS]).returncode == 0
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
    raise SystemExit('No successful proven native artifact matches this app source. Complete Native validation, then rerun this job.')
