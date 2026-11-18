const test = require('node:test'); const assert = require('node:assert');
const { sign, verify, parseCookies, checkIdToken } = require('./session');
const S = 'secret';
const idt = (c) => `x.${Buffer.from(JSON.stringify(c)).toString('base64url')}.y`;
const base = { aud: 'cid', tid: 'T', iss: 'https://login.microsoftonline.com/T/v2.0', nonce: 'n', exp: Date.now() / 1000 + 60, preferred_username: 'Info@DeliveryPilot.net' };
const opts = { tenant: 'T', clientId: 'cid', nonce: 'n', allowedEmail: 'info@deliverypilot.net' };

test('sign/verify roundtrip, tamper, expiry', () => {
  assert.equal(verify(S, sign(S, { a: 1 }, 60)).a, 1);
  assert.equal(verify('other', sign(S, { a: 1 }, 60)), null);
  const t = sign(S, { a: 1 }, 60); assert.equal(verify(S, t.slice(0, -2) + 'zz'), null);
  assert.equal(verify(S, sign(S, { a: 1 }, -5)), null);
  assert.equal(verify(S, undefined), null);
});
test('parseCookies', () => assert.deepEqual(parseCookies('a=1; b=x%20y'), { a: '1', b: 'x y' }));
test('checkIdToken accepts only the allowed account', () => {
  assert.equal(checkIdToken(idt(base), opts), 'info@deliverypilot.net');
  assert.throws(() => checkIdToken(idt({ ...base, preferred_username: 'evil@x.com' }), opts), /not allowed/);
  assert.throws(() => checkIdToken(idt({ ...base, tid: 'Z' }), opts), /tenant/);
  assert.throws(() => checkIdToken(idt({ ...base, nonce: 'q' }), opts), /nonce/);
  assert.throws(() => checkIdToken(idt({ ...base, aud: 'no' }), opts), /audience/);
  assert.throws(() => checkIdToken(idt({ ...base, exp: 1 }), opts), /expired/);
});
