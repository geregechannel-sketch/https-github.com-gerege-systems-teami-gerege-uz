import { test } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'vite';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

await build({ configFile: false, logLevel: 'error', build: {
  outDir: '.test-preview', lib: { entry: 'src/preview/api.ts', formats: ['es'], fileName: () => 'adapter.mjs' },
}});
const { previewRequest, previewRows, previewDay } = await import(pathToFileURL(resolve('.test-preview/adapter.mjs')));
const originalFetch = globalThis.fetch;
globalThis.fetch = () => { throw new Error('Preview attempted network access'); };
test('preview returns bounded synthetic rows including a real zero and an empty period', async () => {
  const query = { POINT_ID: 1, ML_ID: 1044, MD_ID: 12, AGGS_ID: 13, FROM: previewDay + 'T00:00:00+08:00', TO: previewDay + 'T06:00:00+08:00' };
  const result = await previewRequest('POST', 'archives/point', query);
  assert.equal(result.success, true);
  assert.equal(result.data.length, 24);
  assert.equal(result.data[0].VAL, '0');
  assert.equal(result.data.at(-1).ET, new Date(query.TO).toISOString());
  const empty = await previewRequest('POST', 'archives/point', { ...query, FROM: previewDay + 'T12:00:00+08:00', TO: previewDay + 'T13:00:00+08:00' });
  assert.deepEqual(empty.data, []);
  assert.equal(previewRows.length, 24);
});
test('preview rejects mutations, login, commands, tariff calculations and unknown reads without IO', async () => {
  for (const [method, path] of [['POST','user/login'], ['POST','points'], ['PUT','points/1'], ['DELETE','points/1'], ['POST','relay'], ['POST','tariffplans/verify'], ['GET','audit'], ['GET','unknown']]) {
    const result = await previewRequest(method, path, {});
    assert.equal(result.success, false, method + ' ' + path);
    assert.equal(result.code, 501);
  }
});
test('preview does not claim parameters for a different point or accept a different series', async () => {
  assert.deepEqual((await previewRequest('GET', 'measurementsarchives?POINT_ID=999')).data, []);
  assert.equal((await previewRequest('POST','archives/point',{ POINT_ID:999 })).success, false);
});
process.on('exit', () => { globalThis.fetch = originalFetch; });
