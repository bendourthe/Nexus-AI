import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const repository = resolve(__dirname, '../../..');
const command = join(repository, 'scripts/generate-handbooks.mjs');
let sandbox: string;
let outputRoot: string;
let output: string;

function run(check = false) {
  return spawnSync(process.execPath, [command, '--output-root', outputRoot, ...(check ? ['--check'] : [])], {
    cwd: sandbox,
    encoding: 'utf8',
    timeout: 10_000,
  });
}

describe('handbook generation CLI drift checking', () => {
  beforeEach(() => {
    sandbox = mkdtempSync(join(tmpdir(), 'nexus-handbook-drift-'));
    const handbooks = join(sandbox, 'docs/handbooks');
    mkdirSync(join(handbooks, 'markdown'), { recursive: true });
    mkdirSync(join(sandbox, 'desktop/public'), { recursive: true });
    cpSync(join(repository, 'docs/handbooks/_sources'), join(handbooks, '_sources'), { recursive: true });
    copyFileSync(join(repository, 'docs/handbooks/markdown/atlas.md'), join(handbooks, 'markdown/atlas.md'));
    copyFileSync(join(repository, 'desktop/public/nexus-mark.png'), join(sandbox, 'desktop/public/nexus-mark.png'));
    outputRoot = join(sandbox, 'generated');
    output = join(outputRoot, 'atlas.html');
    const generated = run();
    expect(generated.error).toBeUndefined();
    expect(generated.status, generated.stderr).toBe(0);
  });

  afterEach(() => rmSync(sandbox, { recursive: true, force: true }));

  it('accepts both LF and CRLF without rewriting output bytes', () => {
    const lf = readFileSync(output, 'utf8');
    expect(run(true).status).toBe(0);
    const crlf = lf.replace(/\r?\n/g, '\r\n');
    writeFileSync(output, crlf);
    const checked = run(true);
    expect(checked.error).toBeUndefined();
    expect(checked.status, checked.stderr).toBe(0);
    expect(readFileSync(output, 'utf8')).toBe(crlf);
  });

  it('rejects genuine content drift even with CRLF and preserves it', () => {
    const changed = readFileSync(output, 'utf8').replace(/\r?\n/g, '\r\n') + '<!-- unexpected content -->';
    writeFileSync(output, changed);
    const checked = run(true);
    expect(checked.status).toBe(1);
    expect(checked.stderr).toContain('atlas.html');
    expect(readFileSync(output, 'utf8')).toBe(changed);
  });

  it('rejects a missing output without recreating it', () => {
    rmSync(output);
    expect(run(true).status).toBe(1);
    expect(() => readFileSync(output)).toThrow();
  });

  it('rejects a byte-order mark as actual drift', () => {
    const changed = '\uFEFF' + readFileSync(output, 'utf8');
    writeFileSync(output, changed);
    expect(run(true).status).toBe(1);
    expect(readFileSync(output, 'utf8')).toBe(changed);
  });
});
