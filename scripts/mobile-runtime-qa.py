"""Native iOS guest QA with real UI assertions and screenshots; no production data."""

import base64
from contextlib import closing
import datetime
import json
import os
from pathlib import Path
import plistlib
import re
import sqlite3
import subprocess
import time
import traceback
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

OUT = Path('native-qa/evidence')
OUT.mkdir(parents=True, exist_ok=True)
BASE = 'http://127.0.0.1:4723'
SESSION = None
STEP = 0
SYNTHETIC_SCOPE_CONFIRMED = False
RESULT = {
    'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'sourceSha': os.environ.get('QA_NATIVE_SOURCE'),
    'nativeRun': os.environ.get('QA_NATIVE_RUN'),
    'scope': 'iPhone simulator; synthetic guest records; no physical-device, screen-reader or human-study claim',
    'steps': [],
}


def request(method, path, body=None, timeout=240):
    data = None if body is None else json.dumps(body).encode()
    req = Request(BASE + path, data=data, method=method, headers={'Content-Type': 'application/json'})
    try:
        with urlopen(req, timeout=timeout) as response:
            result = json.load(response)
    except HTTPError as error:
        raise RuntimeError(error.read().decode()) from error
    value = result.get('value')
    if isinstance(value, dict) and value.get('error'):
        raise RuntimeError(json.dumps(value))
    return value


def command(method, path, body=None):
    return request(method, f'/session/{SESSION}{path}', body)


def source():
    return command('GET', '/source')


def snapshot(name):
    global STEP
    STEP += 1
    stem = f'{STEP:02}-{name}'
    tree = source()
    (OUT / f'{stem}.xml').write_text(tree)
    (OUT / f'{stem}.png').write_bytes(base64.b64decode(command('GET', '/screenshot')))
    RESULT['steps'].append({'step': STEP, 'name': name, 'screenshot': f'{stem}.png'})
    print(f'Captured {stem}', flush=True)
    return tree


def elements(label):
    return command('POST', '/elements', {'using': 'accessibility id', 'value': label})


def element_id(element):
    return element.get('element-6066-11e4-a52e-4f735466cecf') or element['ELEMENT']


def swipe(direction):
    source()  # Observe the current native hierarchy before every gesture.
    command('POST', '/execute/sync', {'script': 'mobile: swipe', 'args': [{'direction': direction}]})


def find(label, scroll=True, last=False, editable=False):
    for attempt in range(14 if scroll else 1):
        tree = source()
        nodes = [n for n in ET.fromstring(tree).iter() if n.get('name') == label or n.get('label') == label]
        found = elements(label)
        if editable:
            kinds = {'XCUIElementTypeTextField', 'XCUIElementTypeSecureTextField', 'XCUIElementTypeTextView'}
            nodes = [n for n in nodes if n.get('type', n.tag) in kinds]
            found = [e for e in found if command('GET', f'/element/{element_id(e)}/attribute/type') in kinds]
        if found and any(n.get('visible') == 'true' for n in nodes):
            return element_id(found[-1] if last else found[0])
        if not scroll:
            break
        above = any(float(n.get('y', '0')) < 80 for n in nodes)
        swipe('down' if above else 'up')
    raise RuntimeError(f'No visible native control: {label}')


def click(label, last=False):
    control = find(label, last=last)
    command('POST', f'/element/{control}/click', {})
    time.sleep(0.5)
    print(f'Clicked {label}', flush=True)


def fill(label, value):
    control = find(label, editable=True)
    command('POST', f'/element/{control}/click', {})
    time.sleep(0.5)
    command('POST', f'/element/{control}/clear', {})
    command('POST', f'/element/{control}/value', {'text': value})
    time.sleep(0.5)
    observed = command('GET', f'/element/{control}/attribute/value')
    if observed != value:
        raise AssertionError(f'Text input {label} contained {observed!r}, expected {value!r}')
    try:
        command('POST', '/hide_keyboard', {})
    except RuntimeError:
        swipe('up')  # The shared screen dismisses the keyboard on drag.
    print(f'Entered synthetic value in {label}', flush=True)


def expect(text, timeout=20):
    until = time.monotonic() + timeout
    while time.monotonic() < until:
        if text in source():
            return
        time.sleep(0.5)
    raise AssertionError(f'Native UI did not contain: {text}')


def to_top():
    for _ in range(8):
        swipe('down')


def restart():
    command('POST', '/execute/sync', {'script': 'mobile: terminateApp', 'args': [{'bundleId': 'com.shift6.app'}]})
    command('POST', '/execute/sync', {'script': 'mobile: activateApp', 'args': [{'bundleId': 'com.shift6.app'}]})
    time.sleep(1)


def confirm_private_cycle_start():
    """Confirm only the reviewed private-cycle alert, preserving its explicit date/zone."""
    expect('Start this six-week cycle?')
    tree = snapshot('private-cycle-date-timezone-confirmation')
    alerts = [node for node in ET.fromstring(tree).iter()
              if node.get('type', node.tag) == 'XCUIElementTypeAlert']
    if len(alerts) != 1:
        raise AssertionError('Expected exactly one native private-cycle alert')
    labels = {value for node in alerts[0].iter()
              for key in ('name', 'label', 'value') if (value := node.get(key))}
    if not {'Start this six-week cycle?', 'Cancel', 'Start cycle'}.issubset(labels):
        raise AssertionError('Expected the private-cycle confirmation title and exact buttons')
    pattern = (r'Start date (\d{4}-\d{2}-\d{2}) · ([A-Za-z0-9_+/-]+)\. '
               r'This saves the six-week calendar for your current private plan\. '
               r'Any current active cycle will be paused; its history stays unchanged\.')
    previews = [match for label in labels if (match := re.fullmatch(pattern, label))]
    if len(previews) != 1:
        raise AssertionError('Expected one explicit private-plan start date/timezone preview')
    preview = previews[0]
    datetime.date.fromisoformat(preview.group(1))  # Reject an invalid displayed calendar date.
    RESULT['privateCycleStartPreview'] = {'date': preview.group(1), 'timeZone': preview.group(2)}
    click('Start cycle')


def verify_recovered_workout():
    """Focus mode restores the current draft before explicitly reviewing saved sets."""
    draft_input = find('QA Hold set 2 duration in seconds', editable=True)
    draft_value = command('GET', f'/element/{draft_input}/attribute/value')
    if draft_value != '12':
        raise AssertionError(f'Recovered set 2 draft was {draft_value!r}, expected 12')
    snapshot('workout-current-draft-recovered-in-focus-mode')
    click('Review all sets and adjustments')
    expect('Edit QA Hold set 1')
    saved_input = find('QA Hold set 1 duration in seconds', editable=True)
    saved_value = command('GET', f'/element/{saved_input}/attribute/value')
    if saved_value != '20':
        raise AssertionError(f'Recovered completed set was {saved_value!r}, expected 20')
    draft_input = find('QA Hold set 2 duration in seconds', editable=True)
    draft_value = command('GET', f'/element/{draft_input}/attribute/value')
    if draft_value != '12':
        raise AssertionError(f'Reviewed set 2 draft was {draft_value!r}, expected 12')
    snapshot('workout-recovered-values')


# Fixed schema names from src/db/migrations.ts. Only this fresh simulator's
# deliberately named synthetic journey is selected; no arbitrary table lookup.
SYNTHETIC_SESSION_QUERY = '''SELECT s.id FROM workout_sessions s
    JOIN training_cycles c ON c.id=s.cycle_id
    JOIN user_program_versions v ON v.id=s.program_version_id
    JOIN json_each(v.version_json, '$.workouts') w
    ON json_extract(w.value, '$.id')=s.workout_id
    WHERE c.user_id=? AND json_extract(w.value, '$.title')=?'''
SYNTHETIC_GOAL_QUERY = 'SELECT id FROM shifts WHERE user_id=? AND block_objective=?'
SYNTHETIC_DIAGNOSTIC_QUERIES = {
    'onboarding_drafts': ('SELECT user_id, substr(state_json,1,8193) AS state_json, updated_at FROM onboarding_drafts WHERE user_id=?', ('guest-user',)),
    'user_profiles': ('SELECT id, unit_system, experience, training_days_per_week, preferred_session_minutes, health_connection FROM user_profiles WHERE id=?', ('guest-user',)),
    'workout_sessions': (f'SELECT id,cycle_id,workout_id,program_version_id,status,started_at,completed_at FROM workout_sessions WHERE id IN ({SYNTHETIC_SESSION_QUERY})', ('guest-user', 'QA Session')),
    'completed_sets': (f'SELECT id,session_id,workout_exercise_id,set_number,load,reps,duration_seconds,distance_meters,rpe,rir,completed_at FROM completed_sets WHERE session_id IN ({SYNTHETIC_SESSION_QUERY})', ('guest-user', 'QA Session')),
    'workout_drafts': (f'SELECT session_id,substr(values_json,1,8193) AS values_json,updated_at FROM workout_drafts WHERE session_id IN ({SYNTHETIC_SESSION_QUERY})', ('guest-user', 'QA Session')),
    'workout_check_ins': (f'SELECT session_id,energy,soreness,perceived_exertion,discomfort_reported,created_at,updated_at FROM workout_check_ins WHERE session_id IN ({SYNTHETIC_SESSION_QUERY})', ('guest-user', 'QA Session')),
    'shifts': ('SELECT id,user_id,cycle_id,baseline_state,baseline_observation_id,review_state,substr(target_json,1,8193) AS target_json FROM shifts WHERE user_id=? AND block_objective=?', ('guest-user', 'QA hold goal')),
    'shift_observations': (f'SELECT id,shift_id,user_id,source,unit,substr(value_json,1,8193) AS value_json,corrects_observation_id,workout_session_id,measured_at,recorded_at FROM shift_observations WHERE shift_id IN ({SYNTHETIC_GOAL_QUERY}) AND user_id=?', ('guest-user', 'QA hold goal', 'guest-user')),
    'shift_goal_revisions': (f'SELECT id,shift_id,user_id,previous_revision_id,substr(target_json,1,8193) AS target_json,recorded_at FROM shift_goal_revisions WHERE shift_id IN ({SYNTHETIC_GOAL_QUERY}) AND user_id=?', ('guest-user', 'QA hold goal', 'guest-user')),
    'personal_goal_events': (f'SELECT id,user_id,shift_id,kind,substr(payload_json,1,8193) AS payload_json,recorded_at FROM personal_goal_events WHERE shift_id IN ({SYNTHETIC_GOAL_QUERY}) AND user_id=?', ('guest-user', 'QA hold goal', 'guest-user')),
}


def read_synthetic_diagnostic_table(db, table, row_limit=10):
    if table not in SYNTHETIC_DIAGNOSTIC_QUERIES:
        raise ValueError('Unknown diagnostic table')
    if type(row_limit) is not int or not 1 <= row_limit <= 10:
        raise ValueError('Diagnostic row limit must be between 1 and 10')
    query, params = SYNTHETIC_DIAGNOSTIC_QUERIES[table]
    count = db.execute(f'SELECT COUNT(*) FROM ({query})', params).fetchone()[0]
    rows = []
    for row in db.execute(query + ' ORDER BY 1 LIMIT ?', (*params, row_limit)):
        record = dict(row)
        truncated = []
        for key, value in record.items():
            if isinstance(value, str) and len(value) > 8192:
                record[key] = value[:8192]
                truncated.append(key)
        if truncated:
            record['_truncatedColumns'] = truncated
        rows.append(record)
    return {'selectedCount': count, 'rows': rows, 'rowsTruncated': count > len(rows)}


def collect_synthetic_diagnostics(db_path, *, synthetic_only=False, row_limit=10):
    if synthetic_only is not True:
        raise ValueError('Diagnostics require explicit synthetic simulator scope')
    results = {'scope': 'Synthetic guest setup/profile plus exact QA Session workout and QA hold goal records; diagnostic readback, not acceptance', 'tables': {}}
    with closing(sqlite3.connect(Path(db_path).resolve().as_uri() + '?mode=ro', uri=True)) as db:
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA query_only=ON')
        for table in SYNTHETIC_DIAGNOSTIC_QUERIES:
            try:
                results['tables'][table] = read_synthetic_diagnostic_table(db, table, row_limit)
            except sqlite3.OperationalError as error:
                results['tables'][table] = {'blocked': str(error)}
    return results


def confirm_synthetic_diagnostic_scope(environment, initial_tree, verify_source):
    """Narrow the known fresh hosted workflow, not arbitrary reused simulators."""
    expected = {'GITHUB_ACTIONS': 'true', 'RUNNER_ENVIRONMENT': 'github-hosted',
                'RUNNER_OS': 'macOS', 'CI': '1', 'GITHUB_REPOSITORY': 'camster91/Shift6',
                'GITHUB_WORKFLOW': 'Native runtime QA', 'GITHUB_JOB': 'ios-guest-journey'}
    if any(environment.get(key) != value for key, value in expected.items()):
        return {'confirmed': False, 'reason': 'Fresh hosted runtime workflow scope unconfirmed'}
    if not environment.get('GITHUB_WORKFLOW_REF', '').startswith('camster91/Shift6/.github/workflows/native-runtime-qa.yml@'):
        return {'confirmed': False, 'reason': 'Runtime workflow identity unconfirmed'}
    sha = environment.get('QA_NATIVE_SOURCE', '')
    if not re.fullmatch(r'[0-9a-f]{40}', sha) or not re.fullmatch(r'[1-9][0-9]*', environment.get('QA_NATIVE_RUN', '')):
        return {'confirmed': False, 'reason': 'Native source/build identity unconfirmed'}
    visible_setup = any(node.get('visible') == 'true' and
                        'SETUP · 1 OF 6' in {node.get(key) for key in ('name', 'label', 'value')}
                        for node in ET.fromstring(initial_tree).iter())
    if not visible_setup:
        return {'confirmed': False, 'reason': 'Initial setup step one was not observed'}
    proof = verify_source(sha)  # Existing exact source/context/payload verifier.
    if proof.get('checkout_sha') != sha or proof.get('platform') != 'ios':
        return {'confirmed': False, 'reason': 'Verified native proof identity mismatch'}
    return {'confirmed': True, 'reason': 'Known fresh hosted workflow, verified native source and initial setup step one',
            'nativeSource': sha, 'nativeBuildRun': environment['QA_NATIVE_RUN']}


def capture_confirmed_synthetic_diagnostics(scope_confirmed, locate_databases):
    if scope_confirmed is not True:
        return {'skipped': 'Synthetic hosted simulator and initial setup scope unconfirmed'}
    return [collect_synthetic_diagnostics(path, synthetic_only=True) for path in locate_databases()]


def journey():
    global SYNTHETIC_SCOPE_CONFIRMED
    expect('SETUP', timeout=45)
    initial_tree = snapshot('setup-goal')
    from native_artifact_source import verify_manifest
    diagnostic_scope = confirm_synthetic_diagnostic_scope(
        os.environ, initial_tree,
        lambda sha: verify_manifest(Path.cwd(), 'ios', Path('native-qa/native-source.json'), sha),
    )
    RESULT['syntheticDiagnosticScope'] = diagnostic_scope
    SYNTHETIC_SCOPE_CONFIRMED = diagnostic_scope['confirmed']
    click('General health. Build a balanced, sustainable routine.')
    snapshot('goal-after-accessibility-tap')
    enabled = command('GET', f'/element/{find("Continue", scroll=False)}/attribute/enabled')
    if str(enabled).lower() != 'true':
        tree = source()
        matching = [n for n in ET.fromstring(tree).iter() if n.get('name') == 'General health. Build a balanced, sustainable routine.' and n.get('visible') == 'true']
        if len(matching) != 1:
            raise AssertionError('Expected one visible goal card for coordinate verification')
        node = matching[0]
        x = float(node.get('x')) + float(node.get('width')) / 2
        y = float(node.get('y')) + float(node.get('height')) / 2
        command('POST', '/execute/sync', {'script': 'mobile: tap', 'args': [{'x': x, 'y': y}]})
        time.sleep(1)
        snapshot('goal-after-coordinate-tap')
        enabled = command('GET', f'/element/{find("Continue", scroll=False)}/attribute/enabled')
        if str(enabled).lower() != 'true':
            raise AssertionError('Goal selection did not enable Continue after accessibility and coordinate taps')
    click('Continue')
    expect('SETUP · 2 OF 6')
    snapshot('setup-experience')
    click('Beginner. I am new to structured training.')
    click('Continue')
    expect('SETUP · 3 OF 6')
    snapshot('setup-equipment')
    click('Bodyweight. no equipment')
    click('Continue')
    expect('SETUP · 4 OF 6')
    snapshot('setup-rhythm')
    click('2 days')
    click('30 min')
    click('Morning. Start the day with a clear training window.')
    snapshot('setup-rhythm-all-required-choices')
    click('Continue')
    expect('SETUP · 5 OF 6')
    snapshot('setup-units')
    click('Imperial. Pounds, miles, and feet.')
    click('Continue')
    expect('SETUP · 6 OF 6')
    snapshot('setup-review')
    restart()
    expect('SETUP')
    snapshot('setup-recovered-after-force-close')
    click('Save setup')
    expect('Build from blank')
    snapshot('programs-public-content-gated')
    click('Build from blank')
    snapshot('private-builder-entry')
    fill('Required workout name', 'QA Session')
    snapshot('private-builder-workout-name-entered')
    click('Add required workout')
    expect('1 workouts · six-week model retained')
    snapshot('private-builder-required-workout-added')
    fill('Custom exercise name', 'QA Hold')
    click('Add custom movement')
    snapshot('private-builder-custom-movement')
    click('Save draft program')
    expect('Program saved')
    snapshot('private-draft-saved-copy')
    click('Start this six-week cycle')
    confirm_private_cycle_start()
    expect('Start workout')
    snapshot('home-active-private-cycle')
    click('Personal goal')
    snapshot('goal-form-default')
    click('Load for a fixed rep count (lb)')
    snapshot('goal-imperial-preference-pound-input')
    click('Hold in seconds')
    fill('What do you want to track?', 'QA hold goal')
    fill('Target (seconds)', '30')
    fill('Equipment and setup (write “none” if none)', 'Bodyweight floor')
    fill('Assistance (write “none” if none)', 'none')
    snapshot('goal-form-filled')
    click('Save personal goal')
    expect('Record a measurement')
    snapshot('goal-saved-without-invented-baseline')
    fill('Actual value (seconds)', '0')
    click('Save as baseline')
    fill('Actual value (seconds)', '20')
    click('Save measurement')
    snapshot('goal-measurements')
    click('Correct this entry', last=True)
    fill('Actual value (seconds)', '25')
    click('Save correction')
    expect('Original retained; see its correction.')
    to_top()
    expect('Latest: 25')
    snapshot('goal-corrected-progress')
    fill('New target (seconds)', '40')
    fill('Reason for changing target', 'QA revised target')
    click('Save target revision')
    click('Postpone review')
    snapshot('goal-target-and-postponed-review')
    to_top()
    click('Back')
    click('Start workout')
    snapshot('workout-initial')
    fill('QA Hold set 1 duration in seconds', '20')
    click('Complete QA Hold set 1')
    fill('QA Hold set 2 duration in seconds', '12')
    snapshot('workout-saved-set-and-unsaved-draft')
    time.sleep(1)
    restart()
    expect('Resume workout')
    snapshot('home-resume-after-force-close')
    click('Resume workout')
    verify_recovered_workout()
    click('Save partial workout')
    click('I ran out of time')
    snapshot('partial-workout-summary')
    click('Continue to Home')
    click('Open profile')
    expect('Saved on this device.')
    snapshot('guest-profile-local-storage')
    click('Export local data')
    snapshot('native-json-export-share-sheet')
    RESULT['status'] = 'pass'
    RESULT['limits'] = ['No physical-device, VoiceOver/TalkBack, stock-device performance or human-study validation.',
                        'Share-sheet capture is not proof of receipt in a separate app.',
                        'Health/notification permissions, deletion and six-week efficacy remain unverified.']


try:
    devices = json.loads(subprocess.check_output(['xcrun', 'simctl', 'list', 'devices', 'available', '--json']))['devices']
    phones = [d for runtime, rows in devices.items() if 'iOS' in runtime for d in rows if d['name'].startswith('iPhone')]
    if not phones:
        raise RuntimeError('No iPhone simulator available')
    device = phones[0]
    RESULT['device'] = device
    subprocess.run(['xcrun', 'simctl', 'boot', device['udid']], check=True)
    subprocess.run(['xcrun', 'simctl', 'bootstatus', device['udid'], '-b'], check=True)
    bundles = []
    for info in Path('native-qa/SHIFT6.app').rglob('Info.plist'):
        try:
            properties = plistlib.loads(info.read_bytes())
            if properties.get('CFBundleIdentifier') == 'com.shift6.app':
                bundles.append((info.parent, properties))
        except (ValueError, plistlib.InvalidFileException):
            continue
    if len(bundles) != 1:
        raise RuntimeError(f'Expected one SHIFT6 app bundle, found {len(bundles)}')
    app, properties = bundles[0]
    # GitHub artifact ZIPs do not retain executable permissions.
    for path in app.rglob('*'):
        if path.is_file():
            with path.open('rb') as file:
                magic = file.read(4)
            if magic in [b'\xcf\xfa\xed\xfe', b'\xce\xfa\xed\xfe', b'\xca\xfe\xba\xbe']:
                path.chmod(path.stat().st_mode | 0o111)
    RESULT['architecture'] = subprocess.check_output(['lipo', '-archs', str(app / properties['CFBundleExecutable'])]).decode().strip()
    for _ in range(60):
        try:
            request('GET', '/status')
            break
        except (URLError, RuntimeError):
            time.sleep(1)
    else:
        raise RuntimeError('Appium did not become ready')
    subprocess.run(['xcrun', 'simctl', 'install', device['udid'], str(app.resolve())], check=True)
    subprocess.run(['xcrun', 'simctl', 'launch', device['udid'], 'com.shift6.app'], check=True)
    time.sleep(10)
    subprocess.run(['xcrun', 'simctl', 'io', device['udid'], 'screenshot', str(OUT / '00-cold-launch.png')], check=True)
    session = request('POST', '/session', {'capabilities': {'alwaysMatch': {
        'platformName': 'iOS', 'appium:automationName': 'XCUITest',
        'appium:udid': device['udid'], 'appium:deviceName': device['name'],
        'appium:bundleId': 'com.shift6.app', 'appium:isHeadless': True,
        'appium:noReset': True, 'appium:useNewWDA': True,
        'appium:wdaLaunchTimeout': 300000, 'appium:wdaConnectionTimeout': 180000,
        'appium:newCommandTimeout': 300, 'appium:showXcodeLog': True,
    }}}, timeout=900)
    SESSION = session['sessionId']
    journey()
except Exception as error:
    RESULT['status'] = 'failed-or-blocked'
    RESULT['error'] = str(error)
    RESULT['traceback'] = traceback.format_exc()
    if SESSION:
        try:
            snapshot('failure-state')
        except Exception as capture_error:
            RESULT['captureError'] = str(capture_error)
    raise
finally:
    try:
        def locate_databases():
            container = subprocess.check_output(['xcrun', 'simctl', 'get_app_container', device['udid'], 'com.shift6.app', 'data'], timeout=30).decode().strip()
            return Path(container).rglob('shift6.db')
        RESULT['syntheticStorageDiagnostic'] = capture_confirmed_synthetic_diagnostics(SYNTHETIC_SCOPE_CONFIRMED, locate_databases)
    except Exception as diagnostic_error:
        RESULT['diagnosticError'] = str(diagnostic_error)
    try:
        with (OUT / 'app-runtime.log').open('w') as log:
            subprocess.run(['xcrun', 'simctl', 'spawn', device['udid'], 'log', 'show', '--last', '2m', '--predicate', 'process == "SHIFT6"', '--style', 'compact'], stdout=log, stderr=subprocess.DEVNULL, timeout=15)
    except Exception as log_error:
        RESULT['logDiagnosticError'] = str(log_error)
    RESULT['finishedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    (OUT / 'results.json').write_text(json.dumps(RESULT, indent=2) + '\n')
    if SESSION:
        try:
            command('DELETE', '')
        except Exception:
            pass
