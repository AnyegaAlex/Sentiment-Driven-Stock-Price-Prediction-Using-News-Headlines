import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Temporary no-regression guard for existing lint debt. Do not refresh the baseline
// automatically; baseline changes must be reviewed as deliberate lint cleanup.
const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baselinePath = path.join(frontendRoot, 'eslint-baseline.json');
const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));

const result = spawnSync('npx', ['eslint', '.', '--format', 'json'], {
  cwd: frontendRoot,
  encoding: 'utf8',
  maxBuffer: 20 * 1024 * 1024,
});

if (result.error) {
  console.error('Unable to execute ESLint:', result.error.message);
  process.exit(2);
}

if (result.status !== 0 && result.status !== 1) {
  console.error(result.stderr || `ESLint exited unexpectedly with status ${result.status}.`);
  process.exit(2);
}

let reports;
try {
  reports = JSON.parse(result.stdout);
} catch {
  console.error(result.stderr || 'ESLint did not return valid JSON output.');
  process.exit(2);
}

const counts = new Map();
let errors = 0;
let warnings = 0;

for (const report of reports) {
  const file = path.relative(frontendRoot, report.filePath).split(path.sep).join('/');
  for (const message of report.messages) {
    const severity = message.severity === 2 ? 'error' : 'warning';
    if (severity === 'error') errors += 1;
    else warnings += 1;

    const key = [file, severity, message.ruleId || 'null', message.message].join('::');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
}

const regressions = [];
for (const [key, count] of counts) {
  const allowed = baseline.counts[key] || 0;
  if (count > allowed) {
    regressions.push({ key, newCount: count, baselineCount: allowed });
  }
}

console.log(`ESLint baseline: ${baseline.errors} errors, ${baseline.warnings} warnings (master ${baseline.sourceCommit.slice(0, 7)}).`);
console.log(`Current result: ${errors} errors, ${warnings} warnings.`);

if (regressions.length) {
  console.error(`Found ${regressions.length} lint regression(s):`);
  for (const item of regressions) {
    console.error(`- ${item.key}: ${item.newCount} (baseline ${item.baselineCount})`);
  }
  process.exit(1);
}

console.log('No new lint violations relative to the committed baseline.');
