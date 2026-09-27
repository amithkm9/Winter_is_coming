import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

for (const [url, expected] of [
  ['https://demo.ngrok-free.app', true],
  ['https://demo.ngrok-free.dev', true],
  ['https://api.example.com', false],
  ['https://demo.ngrok-free.app.attacker.example', false],
  ['', false],
]) {
  test(`API header is scoped correctly for ${url || 'local proxy'}`, async () => {
    const output = await build({
      entryPoints: ['src/services/api.ts'],
      bundle: true,
      format: 'esm',
      platform: 'node',
      write: false,
      define: { 'import.meta.env.VITE_API_URL': JSON.stringify(url) },
    });
    const api = await import(
      'data:text/javascript;base64,' + Buffer.from(output.outputFiles[0].text).toString('base64')
    );
    assert.equal(api.API_BASE, url);
    assert.deepEqual(api.API_HEADERS, expected ? { 'ngrok-skip-browser-warning': '1' } : {});
  });
}
