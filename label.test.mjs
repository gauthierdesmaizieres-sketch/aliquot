// node labphoto/label.test.mjs
import assert from 'node:assert/strict';
import { parseGs1, parseText, parseDate, learnKey, findSupplier, expiryState, coaName, DEFAULT_SUPPLIERS as S } from './label.js';

const GS = '\x1d';
assert.deepEqual(parseGs1(`]d2010401234567890917280131${''}10MKCD1234${GS}240216666`),
  { gtin: '04012345678909', lot: 'MKCD1234', ref: '216666', expiry: '2028-01-31' });
assert.equal(parseGs1(`010401234567890910AB12${GS}17280200`).expiry, '2028-02-29', 'jour 00 = fin de mois');
assert.equal(parseGs1(`010401234567890910AB12${GS}17280200`).lot, 'AB12', 'lot variable coupé au séparateur');
assert.equal(parseGs1('(01)04012345678909(10)X99(17)270630').lot, 'X99');
assert.equal(parseGs1('https://example.com/abc'), null);
assert.equal(parseGs1('hello'), null);

assert.equal(parseDate('2027-03'), '2027-03-31');
assert.equal(parseDate('2027/03/15'), '2027-03-15');
assert.equal(parseDate('15.03.2027'), '2027-03-15');
assert.equal(parseDate('03/2027'), '2027-03-31');
assert.equal(parseDate('Mar 2027'), '2027-03-31');
assert.equal(parseDate('rien'), '');

const a = parseText('Ambeed, Inc.\n4-Bromoanisole\nCat. No.: A123456\nLot: BD12X34\nRetest Date: 2027-06', S);
assert.deepEqual(a, { supplier: 'Ambeed', lot: 'BD12X34', ref: 'A123456', expiry: '2027-06-30', cas: '' });

const b = parseText('Sigma-Aldrich\nProduct Number: 216666\nBatch Number: MKCD1234\nProduct Name: Toluene', S);
assert.equal(b.supplier, 'Sigma-Aldrich');
assert.equal(b.ref, '216666');
assert.equal(b.lot, 'MKCD1234');

const custom = [{ name: 'Acme', match: 'acme', lot_keys: 'charge', ref_keys: '', expiry_keys: '' }];
assert.equal(parseText('ACME GmbH Charge: 77A1 Lot: FAUX1', custom).lot, '77A1', 'le profil passe avant le générique');

assert.equal(parseText('Product Name: Toluene', S).ref, '', 'une référence sans chiffre est ignorée');
assert.equal(parseText('AB 128995 25 g\nlot 1249681\nCAS 29420-49-3', S).cas, '29420-49-3', 'CAS lu par son format');
assert.equal(parseText('lot 1249681 FW 338.19', S).cas, '', 'pas de CAS sans tiret au bon format');
assert.equal(findSupplier('Fatci reagent', S), null, 'tci seulement en mot entier');
assert.equal(findSupplier('TCI Europe', S).name, 'TCI');

assert.equal(learnKey('Charge: 77A1', '77A1'), 'charge');
assert.equal(learnKey('Introuvable', '77A1'), '');

const now = new Date('2026-10-30');
assert.equal(expiryState('2026-10-01', now), 'expired');
assert.equal(expiryState('2026-11-15', now), 'soon');
assert.equal(expiryState('2028-01-01', now), '');
assert.equal(expiryState('', now), '');

assert.equal(coaName({ ref: '216 666', lot: 'A/1' }), '216-666_A-1_CoA.pdf');
console.log('label ok');
