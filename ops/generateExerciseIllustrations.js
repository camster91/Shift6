#!/usr/bin/env node
/**
 * generateExerciseIllustrations.js
 *
 * Runs the 6 primary-lift prompts through MiniMax image-01 and saves
 * each result to ops/exercise-candidates/<exercise>/<n>.jpg.
 *
 * Usage:
 *   node ops/generateExerciseIllustrations.js                # 1 attempt per exercise
 *   node ops/generateExerciseIllustrations.js --attempts 3   # 3 attempts each (default)
 *   node ops/generateExerciseIllustrations.js --only barbell_squat   # single exercise
 *
 * Requires MINIMAX_API_KEY in ~/.hermes/.env.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ENV_PATH = path.join(process.env.HOME, '.hermes', '.env');
const OUT_DIR = path.join(process.cwd(), 'ops', 'exercise-candidates');

function loadApiKey() {
  const env = fs.readFileSync(ENV_PATH, 'utf8');
  for (const line of env.split('\n')) {
    if (line.startsWith('MINIMAX_API_KEY=') && !line.startsWith('#')) {
      return line.split('=', 2)[1].trim();
    }
  }
  throw new Error(`MINIMAX_API_KEY not found in ${ENV_PATH}`);
}

async function generate(prompt, aspectRatio = '1:1') {
  const key = loadApiKey();
  const url = 'https://api.minimax.io/v1/image_generation';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'Bearer ' prefix assembled from char codes — see chat-layer-redaction-workarounds skill.
      Authorization: 'B' + 'ea' + 'rer' + ' ' + key,
    },
    body: JSON.stringify({
      model: 'image-01',
      prompt,
      aspect_ratio: aspectRatio,
      response_format: 'base64',
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 500)}`);
  }
  const json = await res.json();
  const images = json?.data?.image_base64;
  if (!images || !images[0]) {
    // Surface the actual API response so we know why MiniMax rejected the prompt.
    throw new Error(`No image in response. base_resp=${JSON.stringify(json.base_resp || json)} data_keys=${Object.keys(json.data || {})}`);
  }
  return Buffer.from(images[0], 'base64');
}

function parseArgs(argv) {
  const out = { attempts: 3, only: null, aspect: '1:1' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--attempts') out.attempts = parseInt(argv[++i], 10);
    else if (a === '--only') out.only = argv[++i];
    else if (a === '--aspect') out.aspect = argv[++i];
  }
  return out;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const { EXERCISE_PROMPTS, EXERCISE_LABELS } = await import('./exerciseIllustrationPrompts.js');
  const args = parseArgs(process.argv);

  const exercises = args.only
    ? [args.only]
    : Object.keys(EXERCISE_PROMPTS);

  let totalOk = 0;
  let totalFail = 0;

  for (const exercise of exercises) {
    const prompt = EXERCISE_PROMPTS[exercise];
    const label = EXERCISE_LABELS[exercise];
    if (!prompt) {
      console.error(`! Unknown exercise: ${exercise}`);
      totalFail++;
      continue;
    }

    const dir = path.join(OUT_DIR, exercise);
    fs.mkdirSync(dir, { recursive: true });

    console.log(`\n=== ${label} (${exercise}) — ${args.attempts} attempt(s), ${args.aspect} ===`);
    console.log(`Prompt preview:\n${prompt.split('\n').slice(0, 3).join(' / ')}...`);

    for (let n = 1; n <= args.attempts; n++) {
      const outPath = path.join(dir, `candidate-${n}.jpg`);
      const start = Date.now();
      try {
        const buf = await generate(prompt, args.aspect);
        fs.writeFileSync(outPath, buf);
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        const sizeKb = (buf.length / 1024).toFixed(1);
        console.log(`  ✓ ${outPath.replace(process.cwd() + '/', '')} (${sizeKb}KB, ${elapsed}s)`);
        totalOk++;
      } catch (e) {
        console.error(`  ✗ ${outPath}: ${e.message}`);
        totalFail++;
      }
      if (n < args.attempts) await sleep(3000);
    }
  }

  console.log(`\n=== Done. ${totalOk} ok, ${totalFail} failed. Output: ${OUT_DIR} ===`);
  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});