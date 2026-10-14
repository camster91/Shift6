"""Offline contract checks; these are not native iOS runtime evidence."""
import ast
from contextlib import closing
import datetime
import hashlib
import json
from pathlib import Path
import re
import sqlite3
import tempfile
import unittest
from unittest.mock import Mock
import xml.etree.ElementTree as ET

SCRIPT = Path(__file__).with_name('mobile-runtime-qa.py')
TREE = ast.parse(SCRIPT.read_text(encoding='utf-8'))
MESSAGE = ('Start date 2026-10-13 · America/Toronto. '
           'This saves the six-week calendar for your current private plan. '
           'Any current active cycle will be paused; its history stays unchanged.')


def hierarchy(title='Start this six-week cycle?', message=MESSAGE, confirm='Start cycle', alert=True):
    root = ET.Element('AppiumAUT')
    dialog = ET.SubElement(root, 'XCUIElementTypeAlert' if alert else 'XCUIElementTypeOther')
    for label in (title, message, 'Cancel', confirm):
        ET.SubElement(dialog, 'XCUIElementTypeStaticText', {'label': label})
    return ET.tostring(root, encoding='unicode')


class PrivateStartConfirmationTests(unittest.TestCase):
    def setUp(self):
        self.env = {'datetime': datetime, 're': re, 'ET': ET, 'RESULT': {},
                    'expect': Mock(), 'snapshot': Mock(return_value=hierarchy()), 'click': Mock()}
        definition = next(node for node in TREE.body
                          if isinstance(node, ast.FunctionDef) and node.name == 'confirm_private_cycle_start')
        exec(compile(ast.Module(body=[definition], type_ignores=[]), str(SCRIPT), 'exec'), self.env)

    def confirm(self):
        self.env['confirm_private_cycle_start']()

    def test_known_native_alert_records_reviewed_binding_before_exact_confirmation(self):
        self.confirm()
        self.env['click'].assert_called_once_with('Start cycle')
        self.assertEqual(self.env['RESULT']['privateCycleStartPreview'],
                         {'date': '2026-10-13', 'timeZone': 'America/Toronto'})
        self.env['snapshot'].assert_called_once_with('private-cycle-date-timezone-confirmation')

    def test_unknown_or_incomplete_dialog_never_clicked(self):
        for tree in (hierarchy(title='Delete local data?'), hierarchy(confirm='Continue'),
                     hierarchy(message='Start immediately'), hierarchy(alert=False),
                     hierarchy(message=MESSAGE.replace('2026-10-13', '2026-02-30'))):
            with self.subTest(tree=tree):
                self.env['snapshot'].return_value = tree
                with self.assertRaises((AssertionError, ValueError)):
                    self.confirm()
                self.env['click'].assert_not_called()

    def test_unexpected_second_alert_never_clicked(self):
        root = ET.fromstring(hierarchy())
        root.append(ET.fromstring(hierarchy())[0])
        self.env['snapshot'].return_value = ET.tostring(root, encoding='unicode')
        with self.assertRaises(AssertionError):
            self.confirm()
        self.env['click'].assert_not_called()

    def test_journey_requires_private_confirmation_before_home_and_uses_imperial_label(self):
        journey = next(node for node in TREE.body
                       if isinstance(node, ast.FunctionDef) and node.name == 'journey')
        calls = [(statement.value.func.id,
                  statement.value.args[0].value if statement.value.args else None)
                 for statement in journey.body if isinstance(statement, ast.Expr)
                 and isinstance(statement.value, ast.Call)
                 and isinstance(statement.value.func, ast.Name)
                 and (not statement.value.args or isinstance(statement.value.args[0], ast.Constant))]
        index = calls.index(('click', 'Start this six-week cycle'))
        self.assertEqual(calls[index:index + 3], [('click', 'Start this six-week cycle'),
                         ('confirm_private_cycle_start', None), ('expect', 'Start workout')])
        self.assertIn(('click', 'Load for a fixed rep count (lb)'), calls)
        self.assertNotIn(('click', 'Load for a fixed rep count (kg)'), calls)


class FocusRecoveryTests(unittest.TestCase):
    def setUp(self):
        self.reviewing = False
        self.values = {'QA Hold set 1 duration in seconds': '20', 'QA Hold set 2 duration in seconds': '12'}
        def find(label, editable=False):
            self.assertTrue(editable)
            if 'set 1' in label and not self.reviewing:
                raise AssertionError('Saved sets are hidden until review is opened')
            return label
        def click(label):
            self.assertEqual(label, 'Review all sets and adjustments')
            self.reviewing = True
        def command(method, path):
            self.assertEqual(method, 'GET')
            return self.values[path.removeprefix('/element/').removesuffix('/attribute/value')]
        self.env = {'find': Mock(side_effect=find), 'command': Mock(side_effect=command),
                    'click': Mock(side_effect=click), 'expect': Mock(), 'snapshot': Mock()}
        definition = next(node for node in TREE.body if isinstance(node, ast.FunctionDef) and node.name == 'verify_recovered_workout')
        exec(compile(ast.Module(body=[definition], type_ignores=[]), str(SCRIPT), 'exec'), self.env)
        self.calls = Mock()
        for name in ('find', 'command', 'click', 'expect', 'snapshot'):
            self.calls.attach_mock(self.env[name], name)

    def test_current_draft_precedes_explicit_review_then_saved_actual_and_unchanged_draft(self):
        self.env['verify_recovered_workout']()
        names = [call[0] for call in self.calls.mock_calls]
        self.assertEqual(names, ['find', 'command', 'snapshot', 'click', 'expect', 'find', 'command', 'find', 'command', 'snapshot'])
        self.env['click'].assert_called_once_with('Review all sets and adjustments')
        self.env['expect'].assert_called_once_with('Edit QA Hold set 1')
        self.assertEqual(self.env['find'].call_args_list[0].args[0], 'QA Hold set 2 duration in seconds')
        self.env['snapshot'].assert_any_call('workout-recovered-values')

    def test_missing_review_control_fails_without_claiming_completed_set_recovery(self):
        self.env['click'].side_effect = RuntimeError('No visible native control: Review all sets and adjustments')
        with self.assertRaises(RuntimeError):
            self.env['verify_recovered_workout']()
        self.env['expect'].assert_not_called()
        self.assertEqual(self.env['command'].call_count, 1)
        self.assertNotIn('workout-recovered-values', [call.args[0] for call in self.env['snapshot'].call_args_list])

    def test_incorrect_draft_or_saved_actual_never_passes_or_completes_another_set(self):
        for label in self.values:
            with self.subTest(label=label):
                self.setUp()
                self.values[label] = '999'
                with self.assertRaises(AssertionError):
                    self.env['verify_recovered_workout']()
                self.assertNotIn('workout-recovered-values', [call.args[0] for call in self.env['snapshot'].call_args_list])
                self.assertTrue(all(call.args[0] == 'Review all sets and adjustments' for call in self.env['click'].call_args_list))

    def test_journey_uses_focus_recovery_helper_immediately_after_resume(self):
        journey = next(node for node in TREE.body if isinstance(node, ast.FunctionDef) and node.name == 'journey')
        calls = [node.value for node in journey.body if isinstance(node, ast.Expr) and isinstance(node.value, ast.Call)]
        index = next(i for i, node in enumerate(calls) if isinstance(node.func, ast.Name) and node.func.id == 'click' and node.args and isinstance(node.args[0], ast.Constant) and node.args[0].value == 'Resume workout')
        self.assertEqual(calls[index + 1].func.id, 'verify_recovered_workout')


class SyntheticDiagnosticTests(unittest.TestCase):
    def setUp(self):
        self.env = {'sqlite3': sqlite3, 'Path': Path, 'closing': closing}
        selected = [node for node in TREE.body if
                    (isinstance(node, ast.Assign) and any(isinstance(target, ast.Name) and target.id.startswith('SYNTHETIC_') for target in node.targets)) or
                    (isinstance(node, ast.FunctionDef) and node.name in {'read_synthetic_diagnostic_table', 'collect_synthetic_diagnostics'})]
        exec(compile(ast.Module(body=selected, type_ignores=[]), str(SCRIPT), 'exec'), self.env)
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / 'synthetic data.db'
        self.db = sqlite3.connect(self.path)
        self.db.row_factory = sqlite3.Row
        self.addCleanup(self.db.close)
        migrations = SCRIPT.parent.parent / 'src/db/migrations.ts'
        schema = migrations.read_text(encoding='utf-8')
        tables = set(self.env['SYNTHETIC_DIAGNOSTIC_QUERIES']) | {'training_cycles', 'user_program_versions'}
        for table in sorted(tables):
            match = re.search(r'`(CREATE TABLE (?:IF NOT EXISTS )?' + table + r' \(.*?\);)`', schema, re.S)
            self.assertIsNotNone(match, table)
            self.db.execute(match.group(1))
        self.db.execute('CREATE TABLE private_unknown(secret TEXT)')
        self.db.execute("INSERT INTO private_unknown VALUES ('not diagnostic data')")
        self.insert('training_cycles', id='cycle', user_id='guest-user', program_version_id='version', weeks_json='[]')
        self.insert('user_program_versions', id='version', version_json=json.dumps({'workouts': [{'id': 'workout', 'title': 'QA Session'}]}))
        self.insert('workout_sessions', id='session', cycle_id='cycle', workout_id='workout', program_version_id='version', status='in-progress')
        self.insert('completed_sets', id='actual', session_id='session', duration_seconds=20, set_number=1)
        self.insert('workout_drafts', session_id='session', values_json=json.dumps({'set2': {'duration': '12'}}))
        self.insert('workout_check_ins', session_id='session', energy=3, soreness=2, perceived_exertion=4, discomfort_reported=0, note='Excluded synthetic free text')
        self.insert('shifts', id='goal', user_id='guest-user', cycle_id='cycle', block_objective='QA hold goal', baseline_state='measured', baseline_observation_id='zero', review_state='postponed', next_choice='undecided', is_primary=1)
        self.insert('shift_observations', id='zero', shift_id='goal', user_id='guest-user', source='assessment', value_json='{"value":0}', corrects_observation_id=None, workout_session_id=None)
        self.insert('shift_observations', id='corrected', shift_id='goal', user_id='guest-user', source='assessment', value_json='{"value":25}', corrects_observation_id='zero', workout_session_id=None)
        self.insert('shift_goal_revisions', id='revision', shift_id='goal', user_id='guest-user', target_json='{"value":40}', previous_revision_id=None)
        self.db.commit()

    def insert(self, table, **values):
        # Fixture writes only, using the repository's actual CREATE schema.
        columns = self.db.execute(f'PRAGMA table_info({table})').fetchall()
        data = {column['name']: (1 if 'INT' in column['type'] else 'fixture') for column in columns if column['notnull'] and column['dflt_value'] is None}
        data.update(values)
        self.db.execute(f'INSERT INTO {table} ({",".join(data)}) VALUES ({",".join("?" for _ in data)})', tuple(data.values()))

    def test_real_readonly_fixture_preserves_numeric_actual_draft_zero_correction_and_revision(self):
        before = hashlib.sha256(self.path.read_bytes()).hexdigest()
        result = self.env['collect_synthetic_diagnostics'](self.path, synthetic_only=True)
        tables = result['tables']
        self.assertEqual(tables['completed_sets']['rows'][0]['duration_seconds'], 20)
        self.assertEqual(json.loads(tables['workout_drafts']['rows'][0]['values_json'])['set2']['duration'], '12')
        self.assertEqual(tables['shift_observations']['selectedCount'], 2)
        observations = {row['id']: row for row in tables['shift_observations']['rows']}
        self.assertEqual(json.loads(observations['zero']['value_json'])['value'], 0)
        self.assertEqual(json.loads(observations['corrected']['value_json'])['value'], 25)
        self.assertEqual(observations['corrected']['corrects_observation_id'], 'zero')
        self.assertEqual(tables['shifts']['rows'][0]['baseline_observation_id'], 'zero')
        self.assertEqual(tables['workout_sessions']['rows'][0]['status'], 'in-progress')
        self.assertEqual(tables['workout_check_ins']['rows'][0]['energy'], 3)
        self.assertNotIn('note', tables['workout_check_ins']['rows'][0])
        self.assertEqual(tables['shift_goal_revisions']['rows'][0]['target_json'], '{"value":40}')
        self.assertEqual(before, hashlib.sha256(self.path.read_bytes()).hexdigest())
        self.assertNotIn('private_unknown', tables)

    def test_limits_rows_and_text_reports_counts_and_excludes_foreign_goal(self):
        for index in range(15):
            self.insert('completed_sets', id=f'actual-{index}', session_id='session', set_number=index + 2, idempotency_key=f'key-{index}')
        self.db.execute('UPDATE workout_drafts SET values_json=?', ('x' * 20000,))
        self.insert('shifts', id='foreign', user_id='another-owner', cycle_id='other-cycle', block_objective='QA hold goal', baseline_state='deferred', baseline_observation_id=None, review_state='missing', next_choice='undecided', is_primary=1)
        self.db.commit()
        result = self.env['collect_synthetic_diagnostics'](self.path, synthetic_only=True, row_limit=3)['tables']
        self.assertEqual(result['completed_sets']['selectedCount'], 16)
        self.assertEqual(len(result['completed_sets']['rows']), 3)
        self.assertTrue(result['completed_sets']['rowsTruncated'])
        self.assertEqual(len(result['workout_drafts']['rows'][0]['values_json']), 8192)
        self.assertEqual(result['workout_drafts']['rows'][0]['_truncatedColumns'], ['values_json'])
        self.assertEqual(result['shifts']['selectedCount'], 1)

    def test_unknown_table_and_missing_synthetic_scope_never_read(self):
        connection = Mock()
        with self.assertRaises(ValueError):
            self.env['read_synthetic_diagnostic_table'](connection, 'private_unknown')
        connection.execute.assert_not_called()
        with self.assertRaises(ValueError):
            self.env['collect_synthetic_diagnostics'](self.path)
        for limit in (0, 11, True):
            with self.assertRaises(ValueError):
                self.env['read_synthetic_diagnostic_table'](connection, 'completed_sets', limit)
        connection.execute.assert_not_called()

    def test_collect_opens_readonly_and_does_not_attempt_writes(self):
        original = sqlite3.connect
        statements = []
        def connect(database_uri, **kwargs):
            self.assertIn('mode=ro', database_uri)
            self.assertTrue(kwargs['uri'])
            db = original(database_uri, **kwargs)
            with self.assertRaises(sqlite3.OperationalError):
                db.execute("DELETE FROM private_unknown")
            db.rollback()  # End the test's failed write-probe transaction.
            db.set_trace_callback(statements.append)
            return db
        with unittest.mock.patch.object(sqlite3, 'connect', side_effect=connect):
            self.env['collect_synthetic_diagnostics'](self.path, synthetic_only=True)
        diagnostic = [sql for sql in statements if not sql.startswith('DELETE')]
        self.assertTrue(all(sql.startswith(('SELECT', 'PRAGMA query_only')) for sql in diagnostic))
        self.assertTrue(all('private_unknown' not in sql for sql in diagnostic))


class SyntheticRuntimeScopeTests(unittest.TestCase):
    def setUp(self):
        self.sha = 'a' * 40
        self.environment = {'GITHUB_ACTIONS': 'true', 'RUNNER_ENVIRONMENT': 'github-hosted',
                            'RUNNER_OS': 'macOS', 'CI': '1', 'GITHUB_REPOSITORY': 'camster91/Shift6',
                            'GITHUB_WORKFLOW': 'Native runtime QA', 'GITHUB_JOB': 'ios-guest-journey',
                            'GITHUB_WORKFLOW_REF': 'camster91/Shift6/.github/workflows/native-runtime-qa.yml@refs/heads/qa',
                            'QA_NATIVE_SOURCE': self.sha, 'QA_NATIVE_RUN': '123'}
        self.verify = Mock(return_value={'checkout_sha': self.sha, 'platform': 'ios'})
        self.collect = Mock(return_value={'tables': {}})
        self.env = {'re': re, 'ET': ET, 'collect_synthetic_diagnostics': self.collect}
        selected = [node for node in TREE.body if isinstance(node, ast.FunctionDef) and
                    node.name in {'confirm_synthetic_diagnostic_scope', 'capture_confirmed_synthetic_diagnostics'}]
        exec(compile(ast.Module(body=selected, type_ignores=[]), str(SCRIPT), 'exec'), self.env)
        self.initial = '<AppiumAUT><XCUIElementTypeStaticText label="SETUP · 1 OF 6" visible="true"/></AppiumAUT>'

    def test_standalone_unconfirmed_selfhosted_stale_or_before_setup_never_collects(self):
        cases = [({}, self.initial), ({**self.environment, 'RUNNER_ENVIRONMENT': 'self-hosted'}, self.initial),
                 ({**self.environment, 'QA_NATIVE_SOURCE': 'stale'}, self.initial),
                 (self.environment, '<AppiumAUT><XCUIElementTypeStaticText label="YOUR TRAINING HOME" visible="true"/></AppiumAUT>'),
                 (self.environment, self.initial.replace('visible="true"', 'visible="false"'))]
        for environment, tree in cases:
            with self.subTest(environment=environment, tree=tree):
                scope = self.env['confirm_synthetic_diagnostic_scope'](environment, tree, self.verify)
                self.assertFalse(scope['confirmed'])
                locate = Mock()
                result = self.env['capture_confirmed_synthetic_diagnostics'](scope['confirmed'], locate)
                self.assertIn('skipped', result)
                locate.assert_not_called()
        self.verify.assert_not_called()
        self.collect.assert_not_called()

    def test_full_native_source_verification_and_observed_setup_allow_the_fixed_collector(self):
        scope = self.env['confirm_synthetic_diagnostic_scope'](self.environment, self.initial, self.verify)
        self.assertTrue(scope['confirmed'])
        self.verify.assert_called_once_with(self.sha)
        locate = Mock(return_value=[Path('synthetic/shift6.db')])
        self.env['capture_confirmed_synthetic_diagnostics'](scope['confirmed'], locate)
        self.collect.assert_called_once_with(Path('synthetic/shift6.db'), synthetic_only=True)

    def test_invalid_or_failed_native_proof_never_establishes_scope(self):
        self.verify.return_value = {'checkout_sha': 'b' * 40, 'platform': 'ios'}
        scope = self.env['confirm_synthetic_diagnostic_scope'](self.environment, self.initial, self.verify)
        self.assertFalse(scope['confirmed'])
        self.env['capture_confirmed_synthetic_diagnostics'](scope['confirmed'], Mock())
        self.verify.side_effect = ValueError('Native payload does not match its source proof')
        with self.assertRaises(ValueError):
            self.env['confirm_synthetic_diagnostic_scope'](self.environment, self.initial, self.verify)
        self.collect.assert_not_called()

    def test_before_setup_default_is_false_and_finally_uses_that_flag(self):
        flag = next(node for node in TREE.body if isinstance(node, ast.Assign) and
                    any(isinstance(target, ast.Name) and target.id == 'SYNTHETIC_SCOPE_CONFIRMED' for target in node.targets))
        self.assertIs(flag.value.value, False)
        runtime = next(node for node in TREE.body if isinstance(node, ast.Try))
        captures = [node for statement in runtime.finalbody for node in ast.walk(statement)
                    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == 'capture_confirmed_synthetic_diagnostics']
        self.assertEqual(len(captures), 1)
        self.assertEqual(captures[0].args[0].id, 'SYNTHETIC_SCOPE_CONFIRMED')


if __name__ == '__main__':
    unittest.main()
