import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('cleanup previews without deleting and never follows a nested build junction', { skip: process.platform !== 'win32' }, () => {
  const testRoot = resolve('test-results');
  mkdirSync(testRoot, { recursive: true });
  const fixture = mkdtempSync(join(testRoot, 'cleanup-'));
  const project = join(fixture, 'project');
  const kept = join(fixture, 'keep');
  mkdirSync(join(project, 'scripts'), { recursive: true });
  mkdirSync(join(project, '.next'));
  mkdirSync(kept);
  copyFileSync('scripts/cleanup.ps1', join(project, 'scripts', 'cleanup.ps1'));
  writeFileSync(join(project, 'compose.yaml'), 'name: wordgarden\nservices: {}');
  writeFileSync(join(project, 'package.json'), '{}');
  writeFileSync(join(project, '.next', 'build.txt'), 'generated');
  writeFileSync(join(kept, 'important.txt'), 'keep');
  const run = (...args: string[]) => spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(project, 'scripts', 'cleanup.ps1'), ...args], { encoding: 'utf8' });
  try {
    symlinkSync(kept, join(project, '.next', 'linked'), 'junction');
    const preview = run('-Action', 'Reset', '-WhatIf');
    assert.equal(preview.status, 0, preview.stderr);
    assert.ok(existsSync(join(project, '.next', 'build.txt')));
    const rejected = run('-Action', 'Reset', '-Confirmation', 'wrong');
    assert.notEqual(rejected.status, 0);
    assert.ok(existsSync(join(project, '.next', 'build.txt')));
    const cleaned = run('-Action', 'Clean');
    assert.equal(cleaned.status, 0, cleaned.stderr);
    assert.equal(existsSync(join(project, '.next')), false);
    assert.ok(existsSync(join(kept, 'important.txt')));
    assert.ok(existsSync(join(project, 'package.json')));
  } finally {
    // fixture is generated under test-results; Node does not traverse junctions in rm.
    rmSync(fixture, { recursive: true, force: true });
  }
});
