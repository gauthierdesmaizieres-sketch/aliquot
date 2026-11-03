// node plan.test.mjs
import assert from 'node:assert/strict';
import { reactionPostes, posteLabel, runningByPoste, POSTES, VIEW, X } from './plan-data.js';

const at = (num) => POSTES.find((p) => p.num === num);
// Geräte - Ersatz, comme sur le plan : 060 > 061 > 062 de haut en bas, dans la colonne la plus à droite du bas.
assert.equal(at('060').x, at('061').x);
assert.ok(at('060').y < at('061').y && at('061').y < at('062').y);
assert.ok(at('060').x > at('057').x + at('057').w, 'couloir entre 057 et 060');
for (const p of POSTES) {
  assert.ok(p.x >= 0 && p.x + p.w <= VIEW.w && p.y + p.h <= VIEW.h - 40, `hotte ${p.num} dans le cadre`);
  assert.ok(p.w >= 60, `hotte ${p.num} assez large pour son nom`);
}
assert.equal(X(395), 10);
assert.equal(X(2000), 1472);

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
