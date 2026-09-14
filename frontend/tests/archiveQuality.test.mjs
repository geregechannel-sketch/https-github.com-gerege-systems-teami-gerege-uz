import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeIntervals, calendarRange, dateInUTC8 } from '../.test-build/archiveQuality.js';
const row = (a, b, s = 'unknown') => ({ BT: new Date(a).toISOString(), ET: new Date(b).toISOString(), SOURCE_STATUS: s });
test('empty past period is a gap, not good data', () => {
 const q = summarizeIntervals([], 0, 100, 200);
 assert.equal(q.covered, 0); assert.deepEqual(q.segments, [{ from: 0, to: 100, kind: 'gap' }]);
});
test('future period is not missing', () => {
 const q = summarizeIntervals([], 100, 200, 50);
 assert.equal(q.elapsed, 0); assert.equal(q.future, 100); assert.equal(q.segments[0].kind, 'future');
});
test('cross-boundary and overlapping intervals count coverage once', () => {
 const q = summarizeIntervals([row(-50, 30), row(20, 70), row(90, 150)], 0, 100, 200);
 assert.equal(q.covered, 80); assert.equal(q.overlaps, 1);
 assert.deepEqual(q.segments.filter(s => s.kind === 'gap'), [{ from: 70, to: 90, kind: 'gap' }]);
});
test('nested interval does not create false gap or reduce coverage', () => {
 const q = summarizeIntervals([row(0, 100), row(10, 20)], 0, 100, 200);
 assert.equal(q.covered, 100); assert.equal(q.overlaps, 1);
});
test('elapsed coverage excludes future part, statuses stay uninterpreted', () => {
 const q = summarizeIntervals([row(0, 100, 'GENERATED')], 0, 100, 50);
 assert.equal(q.covered, 50); assert.equal(q.future, 50); assert.equal(q.statuses.GENERATED, 1);
});
test('invalid and reversed dates do not count as coverage', () => {
 const q = summarizeIntervals([{ BT:'bad', ET:'bad' }, row(40, 30)], 0, 100, 200);
 assert.equal(q.invalid, 2); assert.equal(q.covered, 0);
});
test('arbitrary status cannot interfere with counting', () => {
 const q = summarizeIntervals([row(0, 10, '__proto__')], 0, 100, 200);
 assert.equal(q.statuses.__proto__, 1);
});
test('Mongolia calendar rolls over before UTC midnight', () => {
 assert.equal(dateInUTC8(Date.parse('2026-09-01T17:00:00Z')), '2026-09-02');
 assert.deepEqual(calendarRange('2026-09-01','2026-09-01'), {begin:'2026-09-01T00:00:00+08:00',end:'2026-09-02T00:00:00+08:00'});
});
test('invalid or excessive calendar ranges are rejected', () => {
 for (const [a,b] of [['2026-02-30','2026-03-01'],['2026-09-02','2026-09-01'],['2024-01-01','2026-01-01'],['','']]) assert.throws(() => calendarRange(a,b));
});
