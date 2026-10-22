import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ACTIVE = ['docs', 'releases', 'v2', 'v2.13', 'development', 'embedding-eval-contract.json'].join('/');
const ARCHIVED = ['docs', 'archives', 'v2', 'v2.13', 'development', 'embedding-eval-contract.json'].join('/');
const HEAD = 'a'.repeat(40);

for (const workflow of ['ci.yml', 'release.yml']) {
  describe(`${workflow} embedding baseline contract location`, () => {
    const source = readFileSync(join(process.cwd(), '.github', 'workflows', workflow), 'utf8');
    const assignments = source.split(/\r?\n/).filter((line) => /^\s*baseline=/.test(line));
    expect(assignments).toHaveLength(1);
    // Execute the expression shipped by the workflow, including the old form
    // so archive-only fixtures demonstrate the original failure.
    const command = assignments[0].match(/^\s*baseline="\$\(node -(p|e) (["'])(.*)\2\)"\s*$/);
    expect(command, 'expected one literal Node baseline assignment').not.toBeNull();
    let fixture: string;
    beforeEach(() => { fixture = mkdtempSync(join(tmpdir(), 'nexus-embedding-contract-')); });
    afterEach(() => { rmSync(fixture, { recursive: true, force: true }); });

    function contract(path: string, value: unknown): void {
      const file = join(fixture, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
    }
    function run() {
      return spawnSync(process.execPath, [`-${command![1]}`, command![3]], {
        cwd: fixture, encoding: 'utf8', timeout: 3000, windowsHide: true,
      });
    }
    function refuses(): void {
      const result = run();
      expect(result.error).toBeUndefined();
      expect(result.status).not.toBe(0);
      expect(result.stdout.trim()).toBe('');
    }

    it('loads the active contract baseline', () => {
      contract(ACTIVE, { baselineHead: HEAD });
      const result = run();
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout.trim()).toBe(HEAD);
    });
    it('loads the same baseline after the contract is archived', () => {
      contract(ARCHIVED, { baselineHead: HEAD });
      const result = run();
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout.trim()).toBe(HEAD);
    });
    it('refuses a missing contract', () => { refuses(); });
    it('refuses both locations even when their baselines match', () => {
      contract(ACTIVE, { baselineHead: HEAD });
      contract(ARCHIVED, { baselineHead: HEAD });
      refuses();
    });
    it('refuses conflicting active and archived contracts', () => {
      contract(ACTIVE, { baselineHead: HEAD });
      contract(ARCHIVED, { baselineHead: 'b'.repeat(40) });
      refuses();
    });
    it('refuses malformed contract JSON', () => { contract(ACTIVE, '{'); refuses(); });
    it('refuses a missing baselineHead', () => { contract(ACTIVE, {}); refuses(); });
    it('refuses a baselineHead that is not a 40-hex commit', () => {
      contract(ACTIVE, { baselineHead: 'main' });
      refuses();
    });
  });
}
