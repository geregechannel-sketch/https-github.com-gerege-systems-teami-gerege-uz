import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const snapshot = JSON.parse(await readFile('src/preview/teamiArchiveSnapshot.json', 'utf8'));
test('recorded fixture preserves missing intervals and the independently reconciled energy total', () => {
  assert.equal(snapshot.rows.length, 96);
  const numeric = snapshot.rows.filter(r => r.VAL !== null);
  assert.equal(numeric.length, 24);
  assert.equal(snapshot.rows.filter(r => r.VAL === null).length, 72);
  const hundredths = numeric.reduce((a, r) => a + Math.round(Number(r.VAL) * 100), 0);
  assert.equal(hundredths, 28908);
  assert.equal(hundredths * Number(snapshot.conversionCoefficient) / 100, 72.27);
  assert.equal(snapshot.timezoneConfirmed, false);
  for (let i = 1; i < snapshot.rows.length; i++) assert.equal(snapshot.rows[i-1].ET, snapshot.rows[i].BT);
});
test('source fixture uses an explicit data-only schema without session or point identifiers', () => {
  const allowed = ['BT','ET','VAL','READ_TIME','HSS','DSS','SFS','HAS_ACT','TFF_ID','BYP_EXISTS'].sort();
  for (const row of snapshot.rows) {
    assert.deepEqual(Object.keys(row).sort(), allowed);
    assert.ok(row.VAL === null || /^\d+(\.\d{1,2})?$/.test(row.VAL));
  }
  assert.deepEqual(Object.keys(snapshot).sort(), ['kind','date','source','timezoneConfirmed','unit','outputUnit','conversionCoefficient','ML_ID','MD_ID','AGGS_ID','rows'].sort());
});
await build({ configFile: false, plugins: [react()], logLevel: 'error', build: {
  outDir: '.test-comparison', lib: { entry: 'src/components/ArchiveTable.tsx', formats: ['es'], fileName: () => 'table.mjs' },
  rollupOptions: { external: ['react', 'react/jsx-runtime'] },
}});
const { default: ArchiveTable } = await import(pathToFileURL(resolve('.test-comparison/table.mjs')));
test('archive table distinguishes zero from missing, labels columns and escapes source text', () => {
  const html = renderToStaticMarkup(createElement(ArchiveTable, { rows: [
    { BT:'start', ET:'end', VAL:'0', UNIT:'kW', SOURCE_STATUS:'<script>bad()</script>' },
    { BT:'start', ET:'end', VAL:null, UNIT:'kW' },
  ] }));
  assert.match(html, />0<\/td>/);
  assert.match(html, /Өгөгдөлгүй/);
  assert.match(html, /Интервалын эхлэл/);
  assert.match(html, /&lt;script&gt;/);
  assert.ok(!html.includes('<script>'));
});
