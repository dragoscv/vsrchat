#!/usr/bin/env node
/**
 * Release gate (used by Husky pre-commit and CI).
 *
 * When shipping code under a versioned workspace changes, require BOTH:
 *   1. a version bump in that workspace's package.json, and
 *   2. a CHANGELOG.md entry (root or workspace-local).
 *
 * Dependency-only changes (package.json deps, lockfile) and docs are exempt.
 * Produces human-readable, copy-pasteable guidance on failure.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const VERSIONED = ['apps/extension', 'apps/relay', 'apps/pwa'];

// Pretty output helpers (no deps).
const c = {
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function stagedFiles() {
  try {
    return sh('git diff --cached --name-only').split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function isStaged(path) {
  return staged.some((f) => f === path || f.startsWith(path + '/'));
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

function headVersion(pkgPath) {
  try {
    return JSON.parse(sh(`git show HEAD:${pkgPath}/package.json`)).version;
  } catch {
    return undefined; // new package or no HEAD
  }
}

function currentVersion(pkgPath) {
  return readJson(join(pkgPath, 'package.json'))?.version;
}

function versionChanged(pkgPath) {
  const head = headVersion(pkgPath);
  if (head === undefined) return true; // new package counts as a bump
  return head !== currentVersion(pkgPath);
}

function changelogTouched(pkgPath) {
  if (isStaged('CHANGELOG.md')) return true;
  if (existsSync(join(pkgPath, 'CHANGELOG.md')) && isStaged(`${pkgPath}/CHANGELOG.md`)) return true;
  return false;
}

/** Suggest the next patch version from a semver string. */
function suggestNext(version) {
  if (!version) return '0.1.1';
  const m = /^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(version);
  if (!m) return version;
  const [, maj, min, patch] = m;
  return `${maj}.${min}.${Number(patch) + 1}`;
}

/** Files under a package that count as "shipping code" (require a release bump). */
function shippingChanges(pkg) {
  return staged.filter(
    (f) =>
      f.startsWith(pkg + '/') &&
      !f.endsWith('.md') &&
      !f.endsWith('/package.json') &&
      !f.endsWith('/pnpm-lock.yaml'),
  );
}

const staged = stagedFiles();
const problems = [];

for (const pkg of VERSIONED) {
  const changes = shippingChanges(pkg);
  if (changes.length === 0) continue;

  const needsBump = !versionChanged(pkg);
  const needsChangelog = !changelogTouched(pkg);
  if (!needsBump && !needsChangelog) continue;

  problems.push({ pkg, changes, needsBump, needsChangelog });
}

if (problems.length === 0) {
  console.log(c.green('✓ Release gate passed.'));
  process.exit(0);
}

// ── Human-readable failure report ──────────────────────────────────────
const lines = [];
lines.push('');
lines.push(c.red(c.bold('✖ Release gate failed')));
lines.push(
  c.dim('  You changed shipping code in a published package but didn’t record a release.'),
);
lines.push('');

for (const { pkg, changes, needsBump, needsChangelog } of problems) {
  const name = readJson(join(pkg, 'package.json'))?.name ?? pkg;
  const cur = currentVersion(pkg) ?? '0.0.0';
  const next = suggestNext(cur);
  const changelogPath = existsSync(join(pkg, 'CHANGELOG.md'))
    ? `${pkg}/CHANGELOG.md`
    : 'CHANGELOG.md';

  lines.push(c.yellow(c.bold(`  ${name}  ${c.dim('(' + pkg + ')')}`)));
  lines.push(c.dim(`    current version: ${cur}`));

  const sample = changes.slice(0, 3).map((f) => '      - ' + f);
  lines.push(c.dim('    changed files:'));
  lines.push(c.dim(sample.join('\n')));
  if (changes.length > 3) lines.push(c.dim(`      … and ${changes.length - 3} more`));
  lines.push('');

  if (needsBump) {
    lines.push(`    ${c.red('✗')} version not bumped`);
    lines.push(`      ${c.cyan(`pnpm --filter ${name} version ${next} --no-git-tag-version`)}`);
    lines.push(c.dim(`      (or hand-edit "version" in ${pkg}/package.json)`));
  } else {
    lines.push(`    ${c.green('✓')} version bumped`);
  }

  if (needsChangelog) {
    lines.push(`    ${c.red('✗')} no CHANGELOG entry staged`);
    lines.push(c.dim(`      Add an entry under "## [Unreleased]" in ${changelogPath}, e.g.:`));
    lines.push(c.dim('        ### Changed'));
    lines.push(c.dim('        - Describe what you changed.'));
    lines.push(`      ${c.cyan(`git add ${changelogPath}`)}`);
  } else {
    lines.push(`    ${c.green('✓')} CHANGELOG entry staged`);
  }
  lines.push('');
}

lines.push(c.dim('  Then re-commit. To bypass in an emergency: ') + c.cyan('git commit --no-verify'));
lines.push('');

console.error(lines.join('\n'));
process.exit(1);
