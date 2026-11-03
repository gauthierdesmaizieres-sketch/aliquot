// node plan.test.mjs
import assert from 'node:assert/strict';
import { reactionPostes, posteLabel, runningByPoste } from './plan-data.js';

assert.deepEqual(reactionPostes().map((p) => p.id), [
  'crm-028', 'crm-029', 'crm-030', 'crm-031', 'crm-032', 'crm-033', 'mel-035', 'mel-036',
  'lehrlinge', 'mya', 'nal', 'deg', 'bafm', 'wej', 'alle',
]);
assert.equal(posteLabel('mya'), 'Mya');
assert.equal(posteLabel('mel-035'), 'MEL 035');
assert.equal(posteLabel('hotte-037'), '', 'hotte sans nom : pas de libellé');
assert.equal(posteLabel(''), '');

const r = (id, poste, status) => ({ id, poste, status });
assert.deepEqual(
  runningByPoste([r(1, 'alle', 'running'), r(2, 'alle', 'done'), r(3, 'mya', 'running'), r(4, '', 'running'), r(5, 'mya', 'running')]),
  { alle: [r(1, 'alle', 'running')], mya: [r(3, 'mya', 'running'), r(5, 'mya', 'running')] },
);
assert.deepEqual(runningByPoste([]), {});
console.log('plan ok');
