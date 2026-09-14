import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const s=JSON.parse(await readFile('src/preview/teamiGisSnapshot.json','utf8'));
test('GIS joins source IDs without making missing or malformed coordinates into markers',()=>{
 assert.equal(s.points.length,87);assert.equal(new Set(s.points.map(p=>p.id)).size,87);
 assert.equal(s.coordinateResponseCount,40);
 assert.equal(s.points.filter(p=>p.longitude!==null).length,39);
 const bad=s.points.filter(p=>p.coordinateError);assert.equal(bad.length,1);assert.equal(bad[0].rawLatitude,'48.115544,');assert.equal(bad[0].latitude,null);
 for(const p of s.points.filter(p=>p.longitude!==null)){assert.ok(Number.isFinite(p.latitude)&&Math.abs(p.latitude)<85);assert.ok(Math.abs(p.longitude)<=180);assert.equal(p.longitude,Number(p.rawLongitude));assert.equal(p.latitude,Number(p.rawLatitude));}
});
test('GIS status and aggregate freshness remain different source fields',()=>{
 assert.ok(s.points.every(p=>p.status===2));
 assert.ok(s.summary.some(p=>p.value==='85'));
 assert.ok(s.points.every(p=>!('online' in p)));
});
