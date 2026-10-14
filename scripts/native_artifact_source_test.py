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

from native_artifact_source import create_manifest, verify_manifest, source_fingerprint, COMMON_ENV, PLATFORM_ENV, FORMAT_VERSION


class NativeProofTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / 'repo'
        self.repo.mkdir()
        environment = patch.dict(os.environ, {**COMMON_ENV, **PLATFORM_ENV['ios']})
        environment.start()
        self.addCleanup(environment.stop)
        self.git('init', '-q')
        self.git('config', 'user.name', 'Synthetic QA')
        self.git('config', 'user.email', 'synthetic@example.invalid')
        self.git('config', 'core.autocrlf', 'false')
        (self.repo / 'app').mkdir()
        (self.repo / 'app' / 'index.tsx').write_text('export const actual = 1;\n', encoding='utf-8')
        (self.repo / 'package-lock.json').write_text('{"lockfileVersion":3}\n', encoding='utf-8')
        (self.repo / 'scripts').mkdir()
        (self.repo / 'scripts' / 'native_artifact_source.py').write_text(f'FORMAT_VERSION = {FORMAT_VERSION}\n', encoding='utf-8')
        (self.repo / '.github' / 'workflows').mkdir(parents=True)
        (self.repo / '.github' / 'workflows' / 'native-validation.yml').write_text('name: Synthetic native recipe\n', encoding='utf-8')
        (self.repo / '.gitignore').write_text('.env\n.env.*\nnode_modules/\nandroid/\nios/\n*.log\n', encoding='utf-8')
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
        with patch.dict(os.environ, PLATFORM_ENV['android']):
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
            ('format_version', FORMAT_VERSION + 1), ('format_version', True),
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

    def test_untracked_expo_route_cannot_reuse_the_tracked_source_proof(self):
        (self.repo / 'app' / 'new-route.tsx').write_text('untracked bundled route', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'Untracked application'):
            self.verify()

    def test_untracked_source_assets_and_configuration_fail_closed(self):
        for name in ['src/new.ts', 'assets/new.png', 'config/build.json']:
            with self.subTest(name=name):
                path = self.repo / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(b'synthetic untracked build input')
                with self.assertRaisesRegex(ValueError, 'Untracked application'):
                    self.verify()
                path.unlink()

    def test_unexpected_public_api_build_context_cannot_create_a_guest_proof(self):
        for value in ['https://synthetic.invalid', ' ', '\n']:
            with self.subTest(value=value), patch.dict(os.environ, {'EXPO_PUBLIC_API_BASE_URL': value}):
                with self.assertRaisesRegex(ValueError, 'build context'):
                    create_manifest(self.repo, 'ios', self.bundle, self.manifest)

    def test_ignored_route_and_dotenv_inputs_fail_before_reading_secret_contents(self):
        ignore = self.repo / '.gitignore'
        ignore.write_text(ignore.read_text() + 'app/ignored-route.tsx\n', encoding='utf-8')
        self.commit()
        self.sha = self.git('rev-parse', 'HEAD').decode().strip()
        self.proof = create_manifest(self.repo, 'ios', self.bundle, self.manifest)
        route = self.repo / 'app' / 'ignored-route.tsx'
        route.write_text('ignored but bundled route', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'Untracked application'):
            self.verify()
        route.unlink()
        (self.repo / '.env.local').write_text('SYNTHETIC_SECRET=not-a-real-secret', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'dotenv') as error:
            self.verify()
        self.assertNotIn('not-a-real-secret', str(error.exception))

    def test_known_scoped_cng_and_dependency_outputs_are_allowed(self):
        for name in ['node_modules/package/file.js', 'android/app/build/classes.bin',
                     'ios/Pods/library/file.m', '.expo/types/router.d.ts',
                     'native-build/output.bin', 'native-qa-artifact/file.apk',
                     'vendor/expo-speech-recognition/android/build/classes.bin']:
            path = self.repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b'synthetic generated output')
        self.verify()

    def test_known_native_module_output_scope_does_not_allow_untracked_module_source(self):
        path = self.repo / 'vendor/expo-speech-recognition/android/src/new.kt'
        path.parent.mkdir(parents=True)
        path.write_text('untracked native build input', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'Untracked application'):
            self.verify()

    def test_untracked_or_tracked_build_configuration_overrides_fail_closed(self):
        config = self.repo / 'app.config.js'
        config.write_text('synthetic override', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'configuration override'):
            create_manifest(self.repo, 'ios', self.bundle, self.manifest)
        self.commit()
        with self.assertRaisesRegex(ValueError, 'configuration override'):
            create_manifest(self.repo, 'ios', self.bundle, self.manifest)

    def test_missing_and_unknown_public_environment_values_fail_without_disclosure(self):
        with patch.dict(os.environ):
            os.environ.pop('EXPO_PUBLIC_API_BASE_URL')
            with self.assertRaisesRegex(ValueError, 'build context'):
                self.verify()
        with patch.dict(os.environ, {'EXPO_PUBLIC_UNEXPECTED': 'synthetic-private-value'}):
            with self.assertRaisesRegex(ValueError, 'build context') as error:
                self.verify()
            self.assertNotIn('synthetic-private-value', str(error.exception))

    def test_wrong_release_architecture_sdk_or_signing_context_rejects(self):
        for key, value in [('EXPO_PUBLIC_ENVIRONMENT', 'production'),
                           ('EXPO_PUBLIC_RELEASE_MODE', 'connected'),
                           ('QA_NATIVE_ARCHITECTURES', 'x86_64'),
                           ('QA_NATIVE_CONFIGURATION', 'Debug'),
                           ('QA_NATIVE_SDK', 'iphoneos'),
                           ('QA_NATIVE_CODE_SIGNING_ALLOWED', 'YES')]:
            with self.subTest(key=key), patch.dict(os.environ, {key: value}):
                with self.assertRaisesRegex(ValueError, 'build context'):
                    self.verify()

    def test_manifest_context_cannot_claim_other_flags_or_extra_private_settings(self):
        for change in ('architecture', 'extra-setting'):
            with self.subTest(change=change):
                proof = copy.deepcopy(self.proof)
                if change == 'architecture':
                    proof['build_context']['native_flags']['QA_NATIVE_ARCHITECTURES'] = 'x86_64'
                else:
                    proof['build_context']['environment']['PRIVATE_SETTING'] = 'synthetic-private-value'
                self.write(proof)
                with self.assertRaisesRegex(ValueError, 'build context does not match') as error:
                    self.verify()
                self.assertNotIn('synthetic-private-value', str(error.exception))

    def test_recipe_change_rejects_reuse_even_when_application_fingerprint_matches(self):
        before = source_fingerprint(self.repo)
        recipe = self.repo / '.github' / 'workflows' / 'native-validation.yml'
        recipe.write_text('name: Synthetic altered build flags\n', encoding='utf-8')
        self.commit()
        self.assertEqual(source_fingerprint(self.repo), before)
        with self.assertRaisesRegex(ValueError, 'build context does not match'):
            self.verify()
        with self.assertRaises(SystemExit):
            self.select_run(self.successful_run(), [{'name': 'ios-unsigned-simulator-release', 'expired': False}])

    def test_dirty_recipe_cannot_claim_the_tracked_recipe_hash(self):
        recipe = self.repo / '.github' / 'workflows' / 'native-validation.yml'
        recipe.write_text('name: Uncommitted different recipe\n', encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'recipe is dirty'):
            self.verify()
        with self.assertRaisesRegex(ValueError, 'recipe is dirty'):
            create_manifest(self.repo, 'ios', self.bundle, self.manifest)


if __name__ == '__main__':
    unittest.main()
