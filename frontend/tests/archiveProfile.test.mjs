import {test} from 'node:test';
import assert from 'node:assert/strict';
import {archiveProfileRows, archiveSeriesKey, archiveTime, selectArchiveSeries} from '../.test-build/archiveProfile.js';

test('empty archives do not generate demonstration readings',()=>{
  assert.deepEqual(archiveProfileRows([]),[]);
});
test('profile preserves original intervals, exact decimals, zero and provenance',()=>{
  const rows=archiveProfileRows([
    {BT:'2026-09-13T16:30:00Z',ET:'2026-09-13T16:45:00Z',VALUE:'0',UNIT:'kW'},
    {BT:'2026-09-13T16:00:00Z',ET:'2026-09-13T16:15:00Z',VALUE:'8.460000000000001',SOURCE_READ_TIME:'2026-09-14T03:58:10Z',TARIFF_ID:0,SOURCE_STATUS:'original'},
  ]);
  assert.equal(rows.length,2);
  assert.equal(rows[0].valueText,'8.460000000000001');
  assert.equal(rows[0].interval,'14-09-2026 00:00:00 - 14-09-2026 00:15:00');
  assert.equal(rows[0].readAt,'14-09-2026 11:58:10');
  assert.equal(rows[0].tariff,'0');
  assert.equal(rows[0].status,'original');
  assert.equal(rows[1].value,0);
  assert.equal(rows[1].readAt,'');
  assert.equal(rows[1].tariff,'');
});
test('missing and invalid values stay missing rather than becoming zero',()=>{
  for(const VALUE of [null,undefined,'','bad'])assert.equal(archiveProfileRows([{VALUE}])[0].value,null);
  assert.equal(archiveTime('bad'),'');
});

test('profile retains the requested series and never substitutes a different measurement',()=>{
  const parameters=[{ML_ID:49,MD_ID:1044,AGGS_ID:0},{ML_ID:50,MD_ID:1045,AGGS_ID:1}];
  assert.equal(selectArchiveSeries(parameters,'50/1045/1'),'50/1045/1');
  assert.equal(selectArchiveSeries(parameters,'51/1045/1'),'');
  assert.equal(selectArchiveSeries(parameters),'49/1044/0');
  assert.equal(selectArchiveSeries([{ML_ID:49}]),'');
  assert.equal(archiveSeriesKey(parameters[0]),'49/1044/0');
});
