import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const execFileAsync = promisify(execFile);
const repositoryRoot = process.cwd();

const highConfidencePatterns = [
  { name: 'private key', pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/ },
  { name: 'OpenAI-style key', pattern: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'Stripe-style key', pattern: /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { name: 'GitHub token', pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/ },
  { name: 'GitHub fine-grained token', pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'Google API key', pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  { name: 'Slack token', pattern: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/ },
];

const ignoredBasenames = new Set(['package-lock.json']);

async function trackedFiles() {
  const { stdout } = await execFileAsync('git', ['ls-files', '-z'], { cwd: repositoryRoot });
  return stdout.split('\0').filter(Boolean);
}

async function scan() {
  const findings = [];
  for (const relativePath of await trackedFiles()) {
    if (ignoredBasenames.has(path.basename(relativePath))) continue;

    const absolutePath = path.join(repositoryRoot, relativePath);
    const contents = await readFile(absolutePath, 'utf8');
    if (contents.includes('\0')) continue;

    for (const { name, pattern } of highConfidencePatterns) {
      const match = contents.match(pattern);
      if (!match) continue;

      const line = contents.slice(0, match.index ?? 0).split('\n').length;
      findings.push(`${relativePath}:${line} looks like a ${name}.`);
    }
  }

  if (findings.length > 0) {
    throw new Error(`Potential tracked credentials found:\n${findings.join('\n')}`);
  }

  console.log(
    `Scanned ${await trackedFiles().then((files) => files.length)} tracked files for high-confidence credential formats.`,
  );
}

scan().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
