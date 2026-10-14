"""Bind a native QA payload to the clean application checkout that produced it."""
import argparse
import hashlib
import io
import json
import os
import re
import subprocess
from pathlib import Path

FORMAT_VERSION = 2
EXCLUDED = (
    'docs', 'README.md', '.github', '.env.release.example',
    'scripts/mobile-runtime-qa.py', 'scripts/mobile-runtime-qa.test.py',
    'scripts/select-native-qa-artifact.py', 'scripts/native_artifact_source.py',
    'scripts/native_artifact_source_test.py',
)
SOURCE_PATHS = ['.', *[f':!{path}' for path in EXCLUDED]]
PAYLOADS = {'ios': ('SHIFT6.app', 'tree'), 'android': ('app-release.apk', 'file')}
FIELDS = {'format_version', 'checkout_sha', 'source_fingerprint', 'platform',
          'payload_path', 'payload_kind', 'payload_sha256', 'payload_file_count', 'build_context'}
BUILD_RECIPE = '.github/workflows/native-validation.yml'
# CNG outputs and tool directories are created by the pinned CI recipe, not input
# routes/configuration. Do not expand this to arbitrary ignored files or *.log.
GENERATED_ROOTS = {'node_modules', 'android', 'ios', '.expo', 'dist', 'coverage',
                   'native-build', 'native-qa-artifact', 'native-qa', '.turbo',
                   '.idea', '.vscode', 'scripts/__pycache__',
                   'vendor/expo-speech-recognition/android/build',
                   'vendor/expo-speech-recognition/android/.gradle'}
ENV_EXAMPLES = {'.env.example', '.env.release.example'}
COMMON_ENV = {'CI': '1', 'EXPO_PUBLIC_ENVIRONMENT': 'staging',
              'EXPO_PUBLIC_RELEASE_MODE': 'guest-only', 'EXPO_PUBLIC_API_BASE_URL': '',
              'EXPO_NO_DOTENV': '1', 'NODE_ENV': 'production'}
PLATFORM_ENV = {
    'android': {'QA_NATIVE_ARCHITECTURES': 'arm64-v8a,x86_64',
                'QA_NATIVE_CONFIGURATION': 'Release', 'QA_NATIVE_GRADLE_TASK': 'assembleRelease'},
    'ios': {'QA_NATIVE_ARCHITECTURES': 'arm64', 'QA_NATIVE_CONFIGURATION': 'Release',
            'QA_NATIVE_SDK': 'iphonesimulator', 'QA_NATIVE_ONLY_ACTIVE_ARCH': 'YES',
            'QA_NATIVE_CODE_SIGNING_ALLOWED': 'NO',
            'ENTERPRISE_REPOSITORY': 'https://repo.maven.apache.org/maven2'},
}


def excluded_source(name):
    return any(name == path or name.startswith(path + '/') for path in EXCLUDED)


def assert_source_inputs(repo):
    repo = Path(repo).resolve()
    tracked = {path.decode('utf-8') for path in git(repo, 'ls-files', '-z').split(b'\0') if path}
    for directory, folders, files in os.walk(repo, followlinks=False):
        relative = Path(directory).relative_to(repo)
        kept = []
        for folder in folders:
            path = Path(directory) / folder
            name = (relative / folder).as_posix()
            if name == '.git' or name in GENERATED_ROOTS or excluded_source(name):
                continue
            if path.is_symlink():
                raise ValueError('Unexpected application directory link; source proof refused.')
            kept.append(folder)
        folders[:] = kept
        for file in files:
            name = (relative / file).as_posix()
            if excluded_source(name) or file == '.DS_Store' or name in {'.git', 'expo-env.d.ts'}:
                continue
            if (file == '.env' or file.startswith('.env.')) and name not in ENV_EXAMPLES:
                raise ValueError('Unexpected dotenv build input; source proof refused.')
            if relative == Path('.') and file.startswith(('app.config.', 'metro.config.', 'babel.config.')):
                raise ValueError('Unexpected native build configuration override; source proof refused.')
            if (Path(directory) / file).is_symlink():
                raise ValueError('Unexpected application file link; source proof refused.')
            if name not in tracked:
                raise ValueError('Untracked application build input; source proof refused.')


def build_context(repo, platform):
    expected = {**COMMON_ENV, **PLATFORM_ENV[platform]}
    if any(key.startswith('EXPO_PUBLIC_') and key not in COMMON_ENV for key in os.environ):
        raise ValueError('Unexpected public build context; source proof refused.')
    if any(key not in os.environ or os.environ[key] != value for key, value in expected.items()):
        # Never include unexpected values, URLs, credentials or secret hashes.
        raise ValueError('Missing or unexpected native build context; source proof refused.')
    if subprocess.run(['git', '-C', str(repo), 'diff', '--quiet', 'HEAD', '--', BUILD_RECIPE]).returncode:
        raise ValueError('Native build recipe is dirty; source proof refused.')
    recipe = git(repo, 'show', f'HEAD:{BUILD_RECIPE}')
    return {'environment': {key: os.environ[key] for key in COMMON_ENV},
            'native_flags': {key: os.environ[key] for key in PLATFORM_ENV[platform]},
            'platform': platform, 'prebuild_install': False,
            'recipe_sha256': digest(recipe)}


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args])


def digest(value):
    return hashlib.sha256(value).hexdigest()


def source_fingerprint(repo):
    assert_source_inputs(repo)
    # Git filters normalize platform line endings. Reject dirty build source rather
    # than attributing uncommitted contents to HEAD; hash canonical blob contents.
    result = subprocess.run(['git', '-C', str(repo), 'diff', '--quiet', 'HEAD', '--', *SOURCE_PATHS])
    if result.returncode:
        raise ValueError('Application checkout is dirty or unavailable; source proof refused.')
    entries = []
    for entry in git(repo, 'ls-tree', '-rz', '--full-tree', 'HEAD').split(b'\0'):
        if not entry:
            continue
        metadata, path = entry.split(b'\t', 1)
        name = path.decode('utf-8')
        if excluded_source(name):
            continue
        mode, kind, object_id = metadata.decode('ascii').split()
        if kind != 'blob':
            raise ValueError('Submodule source proof is unsupported.')
        entries.append((name, mode, object_id))
    if not entries:
        raise ValueError('No application source files found.')
    objects = subprocess.check_output(
        ['git', '-C', str(repo), 'cat-file', '--batch'],
        input=''.join(f'{entry[2]}\n' for entry in entries).encode('ascii'),
    )
    stream = io.BytesIO(objects)
    files = []
    for path, mode, object_id in entries:
        header = stream.readline().decode('ascii').strip().split()
        if len(header) != 3 or header[:2] != [object_id, 'blob']:
            raise ValueError('Application source blob could not be read.')
        contents = stream.read(int(header[2]))
        if stream.read(1) != b'\n':
            raise ValueError('Application source blob was truncated.')
        files.append({'path': path, 'mode': mode, 'sha256': digest(contents)})
    return digest(json.dumps(sorted(files, key=lambda item: item['path']),
                             sort_keys=True, separators=(',', ':')).encode('utf-8'))


def payload_fingerprint(path, kind):
    path = Path(path)
    if kind == 'file':
        if not path.is_file() or path.is_symlink():
            raise ValueError('Native payload file is missing or unsafe.')
        return digest(path.read_bytes()), 1
    if kind != 'tree' or not path.is_dir() or path.is_symlink():
        raise ValueError('Native payload tree is missing or unsafe.')
    root = path.resolve()
    files = []

    def visit(directory, ancestors):
        resolved = directory.resolve()
        if not resolved.is_relative_to(root) or resolved in ancestors:
            raise ValueError('Native payload has an escaping or cyclic link.')
        for entry in sorted(directory.iterdir()):
            resolved_entry = entry.resolve()
            if not resolved_entry.is_relative_to(root):
                raise ValueError('Native payload has an escaping link.')
            if entry.is_dir():
                visit(entry, (*ancestors, resolved))
            elif entry.is_file():
                contents = entry.read_bytes()
                files.append({'path': entry.relative_to(path).as_posix(),
                              'size': len(contents), 'sha256': digest(contents)})
            else:
                raise ValueError('Native payload contains an unreadable entry.')
    visit(path, ())
    if not files:
        raise ValueError('Native payload tree is empty.')
    return digest(json.dumps(files, sort_keys=True, separators=(',', ':')).encode('utf-8')), len(files)


def create_manifest(repo, platform, payload, destination):
    name, kind = PAYLOADS[platform]
    payload, destination = Path(payload), Path(destination)
    if payload.name != name or payload.parent.resolve() != destination.parent.resolve():
        raise ValueError('Native payload must be beside its manifest under the expected name.')
    source = source_fingerprint(repo)
    context = build_context(repo, platform)
    sha256, count = payload_fingerprint(payload, kind)
    proof = {'format_version': FORMAT_VERSION,
             'checkout_sha': git(repo, 'rev-parse', 'HEAD').decode('ascii').strip(),
             'source_fingerprint': source, 'platform': platform,
             'payload_path': name, 'payload_kind': kind,
             'payload_sha256': sha256, 'payload_file_count': count,
             'build_context': context}
    destination.write_text(json.dumps(proof, indent=2) + '\n', encoding='utf-8')
    return proof


def verify_manifest(repo, platform, manifest, expected_sha):
    manifest = Path(manifest)
    if not manifest.is_file() or manifest.is_symlink() or manifest.stat().st_size > 65536:
        raise ValueError('Native source manifest is missing or unsafe; rebuild Native validation.')
    proof = json.loads(manifest.read_text(encoding='utf-8'))
    if not isinstance(proof, dict) or set(proof) != FIELDS:
        raise ValueError('Native source manifest fields are invalid.')
    if type(proof['format_version']) is not int or proof['format_version'] != FORMAT_VERSION:
        raise ValueError('Native source manifest version is unsupported.')
    name, kind = PAYLOADS[platform]
    if (proof['platform'], proof['payload_path'], proof['payload_kind']) != (platform, name, kind):
        raise ValueError('Native source manifest payload identity is invalid.')
    if not re.fullmatch(r'[0-9a-f]{40}', expected_sha) or proof['checkout_sha'] != expected_sha:
        raise ValueError('Native source manifest does not identify the selected build checkout.')
    for key in ('source_fingerprint', 'payload_sha256'):
        if not isinstance(proof[key], str) or not re.fullmatch(r'[0-9a-f]{64}', proof[key]):
            raise ValueError('Native source manifest digest is invalid.')
    if type(proof['payload_file_count']) is not int or proof['payload_file_count'] < 1:
        raise ValueError('Native source manifest file count is invalid.')
    if proof['source_fingerprint'] != source_fingerprint(repo):
        raise ValueError('Native artifact application source does not match this checkout.')
    if proof['build_context'] != build_context(repo, platform):
        raise ValueError('Native artifact build context does not match this checkout.')
    actual_hash, count = payload_fingerprint(manifest.parent / name, kind)
    if (actual_hash, count) != (proof['payload_sha256'], proof['payload_file_count']):
        raise ValueError('Native artifact binary payload does not match its source manifest.')
    return proof


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['create', 'verify', 'check'])
    parser.add_argument('--repo', default='.')
    parser.add_argument('--platform', choices=PAYLOADS, required=True)
    parser.add_argument('--manifest')
    parser.add_argument('--payload')
    parser.add_argument('--expected-source-sha')
    args = parser.parse_args()
    if args.operation == 'check':
        source_fingerprint(args.repo)
        build_context(args.repo, args.platform)
        print('Native build inputs and expected guest release context verified.')
        return
    if not args.manifest:
        parser.error('create and verify require --manifest')
    if args.operation == 'create':
        if not args.payload:
            parser.error('create requires --payload')
        proof = create_manifest(args.repo, args.platform, args.payload, args.manifest)
    else:
        if not args.expected_source_sha:
            parser.error('verify requires --expected-source-sha')
        proof = verify_manifest(args.repo, args.platform, args.manifest, args.expected_source_sha)
    print(f"Native {proof['platform']} proof {args.operation} passed: "
          f"source {proof['checkout_sha']}, payload SHA-256 {proof['payload_sha256']}.")


if __name__ == '__main__':
    main()
