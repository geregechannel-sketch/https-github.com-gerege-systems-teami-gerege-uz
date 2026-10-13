import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveGisGeometry} from '../.test-build/gisGeometry.js';

test('GIS never invents coordinates from point index or auto-read flag',()=>{
 const point={POINT_NAME:'Unmapped',POINT_AUTO_READ_ENABLED:1};
 assert.deepEqual(resolveGisGeometry(point,[point],[]),{lat:null,lng:null,origin:'unavailable'});
});
test('only unambiguous exact reference names get recorded coordinates',()=>{
 const point={POINT_NAME:'Meter A'};
 const ref=[{name:'Meter A',latitude:48.116061,longitude:114.575058}];
 assert.deepEqual(resolveGisGeometry(point,[point],ref),{lat:48.116061,lng:114.575058,origin:'recorded_snapshot'});
 assert.equal(resolveGisGeometry(point,[point,point],ref).lat,null);
 assert.equal(resolveGisGeometry(point,[point],[...ref,...ref]).lat,null);
 assert.equal(resolveGisGeometry(point,[point],[{...ref[0],latitude:null}]).lat,null);
});
test('verified stored coordinates take precedence and invalid coordinates stay absent',()=>{
 const point={POINT_NAME:'A',POINT_LATITUDE:48.1,POINT_LONGITUDE:114.5};
 assert.equal(resolveGisGeometry(point,[point],[]).origin,'stored_point');
 assert.equal(resolveGisGeometry({...point,POINT_LATITUDE:NaN},[point],[]).lat,null);
 assert.equal(resolveGisGeometry({...point,POINT_LONGITUDE:181},[point],[]).lat,null);
});
