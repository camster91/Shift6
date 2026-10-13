"""Exercise source and native payload proof rejection with actual Git repositories."""
import copy
import contextlib
import io
import json
import os
import runpy
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

from native_artifact_source import create_manifest, verify_manifest, source_fingerprint


class NativeProofTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        self.git('init', '-q')
        self.git('config', 'user.name', 'Synthetic QA')
        self.git('config', 'user.email', 'synthetic@example.invalid')
        self.git('config', 'core.autocrlf', 'false')
        (self.repo / 'app').mkdir()
        (self.repo / 'app' / 'index.tsx').write_text('export const actual = 1;\n', encoding='utf-8')
        (self.repo / 'package-lock.json').write_text('{"lockfileVersion":3}\n', encoding='utf-8')
        (self.repo / 'scripts').mkdir()
        (self.repo / 'scripts' / 'native_artifact_source.py').write_text('synthetic proof marker', encoding='utf-8')
        self.commit()
        self.sha = self.git('rev-parse', 'HEAD').decode().strip()
        self.artifact = self.root / 'artifact'
        self.artifact.mkdir()
        self.bundle = self.artifact / 'SHIFT6.app'
        self.bundle.mkdir()
        (self.bundle / 'SHIFT6').write_bytes(b'synthetic executable bytes')
        (self.bundle / 'main.jsbundle').write_bytes(b'synthetic bundled application')
        self.manifest = self.artifact / 'native-source.json'
        self.proof = create_manifest(self.repo, 'ios', self.bundle, self.manifest)

    def git(self, *args):
        return subprocess.check_output(['git', '-C', str(self.repo), *args], stderr=subprocess.DEVNULL)

    def commit(self):
        self.git('add', '.')
        self.git('commit', '-qm', 'Synthetic source snapshot')

    def verify(self):
        return verify_manifest(self.repo, 'ios', self.manifest, self.sha)

    def write(self, proof):
        self.manifest.write_text(json.dumps(proof), encoding='utf-8')

    def test_valid_proof_checks_actual_checkout_and_all_bundle_files(self):
        self.assertEqual(self.verify(), self.proof)
        self.assertEqual(self.proof['payload_file_count'], 2)
        self.assertEqual(self.proof['checkout_sha'], self.sha)

    def test_android_file_proof_rejects_changed_apk(self):
        apk = self.artifact / 'app-release.apk'
        apk.write_bytes(b'synthetic APK')
        create_manifest(self.repo, 'android', apk, self.manifest)
        verify_manifest(self.repo, 'android', self.manifest, self.sha)
        apk.write_bytes(b'changed APK')
        with self.assertRaisesRegex(ValueError, 'binary payload'):
            verify_manifest(self.repo, 'android', self.manifest, self.sha)

    def test_missing_proof_never_reuses_an_unproven_artifact(self):
        self.manifest.unlink()
        with self.assertRaisesRegex(ValueError, 'manifest is missing'):
            self.verify()

    def test_wrong_manifest_fields_version_identity_and_sha_reject(self):
        faults = [
            ('format_version', 2), ('format_version', True),
            ('checkout_sha', '0' * 40), ('platform', 'android'),
            ('payload_path', '../SHIFT6.app'), ('payload_kind', 'file'),
            ('source_fingerprint', 'bad'), ('payload_sha256', 'bad'),
            ('payload_file_count', True), ('payload_file_count', 0),
        ]
        for field, value in faults:
            with self.subTest(field=field, value=value):
                proof = copy.deepcopy(self.proof)
                proof[field] = value
                self.write(proof)
                with self.assertRaises(ValueError):
                    self.verify()
        proof = copy.deepcopy(self.proof)
        proof['unrecognized'] = 'ignored proof is unsafe'
        self.write(proof)
        with self.assertRaisesRegex(ValueError, 'fields are invalid'):
            self.verify()

    def test_matching_metadata_cannot_hide_committed_app_source_change(self):
        (self.repo / 'app' / 'index.tsx').write_text('export const actual = 2;\n', encoding='utf-8')
        self.commit()
        with self.assertRaisesRegex(ValueError, 'source does not match'):
            self.verify()

    def test_dirty_checkout_cannot_claim_the_head_commit_source(self):
        (self.repo / 'app' / 'index.tsx').write_text('uncommitted app change', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'checkout is dirty'):
            self.verify()
        with self.assertRaisesRegex(ValueError, 'checkout is dirty'):
            create_manifest(self.repo, 'ios', self.bundle, self.manifest)

    def test_docs_and_qa_only_changes_allow_same_source_reuse(self):
        before = source_fingerprint(self.repo)
        (self.repo / 'docs').mkdir()
        (self.repo / 'docs' / 'report.md').write_text('Synthetic new evidence', encoding='utf-8')
        (self.repo / 'scripts' / 'native_artifact_source_test.py').write_text('test-only change', encoding='utf-8')
        self.commit()
        self.assertNotEqual(self.git('rev-parse', 'HEAD').decode().strip(), self.sha)
        self.assertEqual(source_fingerprint(self.repo), before)
        self.verify()

    def test_changed_deleted_added_or_renamed_binary_file_rejects(self):
        executable = self.bundle / 'SHIFT6'
        for fault in ('changed', 'deleted', 'added', 'renamed'):
            with self.subTest(fault=fault):
                if fault == 'changed':
                    executable.write_bytes(b'changed executable')
                elif fault == 'deleted':
                    executable.unlink()
                elif fault == 'added':
                    (self.bundle / 'extra').write_bytes(b'unmanifested executable')
                else:
                    executable.rename(self.bundle / 'renamed')
                with self.assertRaisesRegex(ValueError, 'binary payload'):
                    self.verify()
                if fault == 'added':
                    (self.bundle / 'extra').unlink()
                if fault == 'renamed':
                    (self.bundle / 'renamed').unlink()
                executable.write_bytes(b'synthetic executable bytes')

    def test_different_binary_file_count_rejects_even_with_matching_hash(self):
        proof = copy.deepcopy(self.proof)
        proof['payload_file_count'] += 1
        self.write(proof)
        with self.assertRaisesRegex(ValueError, 'binary payload'):
            self.verify()

    def select_run(self, run, artifacts, exact='50'):
        script = Path(__file__).with_name('select-native-qa-artifact.py')
        output = self.root / 'outputs.txt'
        api_routes = []
        check_output = subprocess.check_output

        def call(command, *args, **kwargs):
            if command[0] != 'gh':
                return check_output(command, *args, **kwargs)
            route = command[2]
            api_routes.append(route)
            if route.endswith('/artifacts'):
                return json.dumps({'artifacts': artifacts}).encode()
            return json.dumps(run if exact else {'workflow_runs': [run]}).encode()

        with patch.dict(os.environ, {
            'GITHUB_REPOSITORY': 'synthetic/shift6', 'QA_BRANCH': 'qa-proof',
            'QA_NATIVE_BUILD_RUN': exact, 'GITHUB_OUTPUT': str(output),
        }), patch('subprocess.check_output', side_effect=call), contextlib.chdir(self.repo), contextlib.redirect_stdout(io.StringIO()):
            runpy.run_path(str(script), run_name='__main__')
        return output.read_text(), api_routes

    def successful_run(self):
        return {'id': 50, 'head_sha': self.sha, 'status': 'completed',
                'conclusion': 'success', 'head_branch': 'qa-proof',
                'head_repository': {'full_name': 'synthetic/shift6'},
                'path': '.github/workflows/native-validation.yml'}

    def test_completion_selector_uses_exact_run_without_fallback_query(self):
        output, routes = self.select_run(self.successful_run(), [
            {'name': 'ios-unsigned-simulator-release', 'expired': False},
        ])
        self.assertEqual(output, f'run_id=50\nsource_sha={self.sha}\n')
        self.assertEqual(routes, ['repos/synthetic/shift6/actions/runs/50',
                                  'repos/synthetic/shift6/actions/runs/50/artifacts'])

    def test_selector_rejects_failed_wrong_branch_workflow_and_expired_payload(self):
        for field, value in [('conclusion', 'failure'), ('status', 'in_progress'),
                             ('head_branch', 'other'), ('path', '.github/workflows/other.yml'),
                             ('id', 51), ('head_repository', {'full_name': 'foreign/fork'})]:
            with self.subTest(field=field):
                run = self.successful_run()
                run[field] = value
                with self.assertRaises(SystemExit):
                    self.select_run(run, [{'name': 'ios-unsigned-simulator-release', 'expired': False}])
        with self.assertRaises(SystemExit):
            self.select_run(self.successful_run(), [{'name': 'ios-unsigned-simulator-release', 'expired': True}])

    def test_selector_keeps_application_source_comparison(self):
        (self.repo / 'app' / 'index.tsx').write_text('new app source', encoding='utf-8')
        self.commit()
        with self.assertRaises(SystemExit):
            self.select_run(self.successful_run(), [{'name': 'ios-unsigned-simulator-release', 'expired': False}])

    def test_manual_selector_still_uses_successful_branch_candidates(self):
        output, routes = self.select_run(self.successful_run(), [
            {'name': 'ios-unsigned-simulator-release', 'expired': False},
        ], exact='')
        self.assertIn('run_id=50', output)
        self.assertIn('status=success&branch=qa-proof', routes[0])

    def test_selector_rejects_preproof_commit_even_when_application_source_matches(self):
        (self.repo / 'scripts' / 'native_artifact_source.py').unlink()
        self.commit()
        run = self.successful_run()
        run['head_sha'] = self.git('rev-parse', 'HEAD').decode().strip()
        with self.assertRaises(SystemExit):
            self.select_run(run, [{'name': 'ios-unsigned-simulator-release', 'expired': False}])


if __name__ == '__main__':
    unittest.main()
