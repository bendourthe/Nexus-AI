import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
type Fixture = [string, object | string];
type Case = { name: string; fixtures: Fixture[]; status: string; exit: number };
const cases: Case[] = [
  { name: 'partial', fixtures: [['full.json', { profile: 'full', status: 'PARTIAL' }]], status: 'PARTIAL', exit: 1 },
  { name: 'unknown', fixtures: [['full.json', { profile: 'full', status: 'mystery' }]], status: 'FAIL', exit: 1 },
  { name: 'empty', fixtures: [], status: 'PARTIAL', exit: 1 },
  { name: 'self only', fixtures: [['report.json', { profile: 'report', status: 'PASS' }]], status: 'PARTIAL', exit: 1 },
  { name: 'pass', fixtures: [['full.json', { profile: 'full', status: 'PASS' }]], status: 'PASS', exit: 0 },
  { name: 'fail', fixtures: [['full.json', { profile: 'full', status: 'FAIL' }]], status: 'FAIL', exit: 1 },
  { name: 'mixed partial', fixtures: [['full.json', { profile: 'full', status: 'PASS' }], ['platform.json', { profile: 'platform', status: 'PARTIAL' }]], status: 'PARTIAL', exit: 1 },
  { name: 'mixed fail', fixtures: [['full.json', { profile: 'full', status: 'PARTIAL' }], ['platform.json', { profile: 'platform', status: 'FAIL' }]], status: 'FAIL', exit: 1 },
  { name: 'missing status', fixtures: [['full.json', { profile: 'full' }]], status: 'PARTIAL', exit: 1 },
  { name: 'malformed', fixtures: [['full.json', '{']], status: 'FAIL', exit: 1 },
  { name: 'null', fixtures: [['full.json', 'null']], status: 'FAIL', exit: 1 },
  { name: 'summary only', fixtures: [['summary.json', { profile: 'full', status: 'PASS' }]], status: 'PARTIAL', exit: 1 },
  { name: 'prior aggregate', fixtures: [['full.json', { profile: 'full', status: 'FAIL' }], ['report.json', { profile: 'report', status: 'PASS' }]], status: 'FAIL', exit: 1 },
];

describe('CI report CLI fail-closed aggregation', () => {
  it.each(cases)('$name survives repeat aggregation', ({ fixtures, status, exit }) => {
    const reports = mkdtempSync(join(tmpdir(), 'nexus-ci-report-test-'));
    try {
      for (const [name, value] of fixtures) {
        writeFileSync(join(reports, name), typeof value === 'string' ? value : JSON.stringify(value));
      }
      for (let repeat = 0; repeat < 2; repeat += 1) {
        const child = spawnSync(process.execPath, [join(root, 'scripts/ci-profile.mjs'), '--profile', 'report', '--reports-dir', reports, '--json'], { cwd: root, encoding: 'utf8', timeout: 10_000 });
        expect(child.error).toBeUndefined();
        expect(child.status).toBe(exit);
        expect(JSON.parse(readFileSync(join(reports, 'summary.json'), 'utf8')).status).toBe(status);
        expect(JSON.parse(child.stdout).status).toBe(status);
      }
    } finally {
      rmSync(reports, { recursive: true, force: true });
    }
  });
});
