#!/usr/bin/env node
/**
 * Release gate (used by Husky pre-commit and CI).
 *
 * When code under a versioned workspace changes, require BOTH:
 *   1. a version bump in that workspace's package.json, and
 *   2. a CHANGELOG.md entry (root or workspace-local).
 *
 * Skipped when only docs/config/non-shipping files changed.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const VERSIONED = ['apps/extension', 'apps/relay', 'apps/pwa'];

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

function versionChanged(pkgPath) {
  try {
    const head = sh(`git show HEAD:${pkgPath}/package.json`);
    const headVer = JSON.parse(head).version;
    const curr = JSON.parse(readFileSync(join(pkgPath, 'package.json'), 'utf8')).version;
    return headVer !== curr;
  } catch {
    // No HEAD version (new package) counts as a bump.
    return true;
  }
}

function changelogTouched(pkgPath) {
  if (isStaged('CHANGELOG.md')) return true;
  if (existsSync(join(pkgPath, 'CHANGELOG.md')) && isStaged(`${pkgPath}/CHANGELOG.md`)) return true;
  return false;
}

const staged = stagedFiles();
const errors = [];

for (const pkg of VERSIONED) {
  const codeChanged = staged.some(
    (f) =>
      f.startsWith(pkg + '/') &&
      !f.endsWith('CHANGELOG.md') &&
      !f.endsWith('.md') &&
      // Dependency-only changes (e.g. Dependabot) don't require a version bump.
      !f.endsWith('/package.json') &&
      !f.endsWith('/pnpm-lock.yaml'),
  );
  if (!codeChanged) continue;
  if (!versionChanged(pkg)) {
    errors.push(`• ${pkg}: code changed but version in package.json was not bumped.`);
  }
  if (!changelogTouched(pkg)) {
    errors.push(`• ${pkg}: code changed but no CHANGELOG.md entry was added.`);
  }
}

if (errors.length) {
  console.error('\n✖ Release gate failed:\n' + errors.join('\n'));
  console.error('\nBump the package version and add a CHANGELOG.md entry, then re-commit.\n');
  process.exit(1);
}

console.log('✓ Release gate passed.');
