// Run with: npm run test:rules  (starts the Database emulator and runs this file)
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { ref, get, set, update, push, runTransaction } from 'firebase/database';

const env = await initializeTestEnvironment({
  projectId: 'toroz-kiosk',
  database: { host: '127.0.0.1', port: 9000, rules: readFileSync('database.rules.json', 'utf8') },
});

const results = [];
async function check(name, p) {
  try { await p; results.push(['✓', name]); } catch (e) { results.push(['✗', name, e.message]); }
}

const anonDb = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'anonymous' }, provider_id: 'anonymous' }).database();
const phoneOf = uid => '+97250' + String(1000000 + uid.length * 1111).slice(0, 7);
const phoneDb = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'phone' }, phone_number: phoneOf(uid) }).database();
const pwDb = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: 'password' }, email: uid + '@x.test' }).database();
const guest = env.unauthenticatedContext().database();
const order = (uid, extra = {}) => ({ num: 201, status: 'new', type: 'delivery', total: 80, createdAt: Date.now(), customerUid: uid,
  customerPhone: '0501234567', address: { city: 'טייבה', street: '', location: { lat: 32.26, lng: 35.01 } }, ...extra });

await env.clearDatabase();
const A = phoneDb('custA'), B = phoneDb('custBB'), Anon = anonDb('anon1');

// ── public data ──
await check('guest can read menu', assertSucceeds(get(ref(guest, 'menu'))));
await check('guest can read settings', assertSucceeds(get(ref(guest, 'settings'))));
await check('customer cannot change menu', assertFails(set(ref(A, 'menu/x'), { title: 'hack' })));
await check('customer cannot change settings', assertFails(set(ref(A, 'settings/deliveryFee'), 0)));

// ── customer orders ──
await check('guest cannot read order list', assertFails(get(ref(guest, 'todayOrders'))));
await check('customer cannot read order list', assertFails(get(ref(A, 'todayOrders'))));
await check('customer places own order', assertSucceeds(set(ref(A, 'todayOrders/o1'), order('custA'))));
await check('customer reads own order', assertSucceeds(get(ref(A, 'todayOrders/o1'))));
await check('other customer cannot read it', assertFails(get(ref(B, 'todayOrders/o1'))));
await check('unverified (no phone) visitor cannot place order', assertFails(set(ref(Anon, 'todayOrders/o6'), order('anon1'))));
await check('guest cannot read it', assertFails(get(ref(guest, 'todayOrders/o1'))));
await check('customer cannot edit order after placing', assertFails(update(ref(A, 'todayOrders/o1'), { status: 'done', total: 1 })));
await check('customer cannot place order for someone else', assertFails(set(ref(A, 'todayOrders/o2'), order('custBB'))));
await check('customer cannot place order already "done"', assertFails(set(ref(A, 'todayOrders/o3'), order('custA', { status: 'done' }))));
await check('guest cannot place order', assertFails(set(ref(guest, 'todayOrders/o4'), order(''))));
await check('order missing fields rejected', assertFails(set(ref(A, 'todayOrders/o5'), { status: 'new', customerUid: 'custA' })));

// ── order numbers ──
await check('order number starts', assertSucceeds(set(ref(A, 'meta/lastOrderNum'), 201)));
await check('order number +1 via transaction', assertSucceeds(runTransaction(ref(B, 'meta/lastOrderNum'), c => (c ?? 200) + 1)));
await check('order number cannot jump', assertFails(set(ref(A, 'meta/lastOrderNum'), 999)));

// ── staff ──
const owner = pwDb('owner'), other = pwDb('stranger');
await check('anonymous cannot claim staff', assertFails(set(ref(A, 'staff/custA'), true)));
await check('first email account claims owner', assertSucceeds(set(ref(owner, 'staff/owner'), true)));
await check('second email account cannot claim', assertFails(set(ref(other, 'staff/stranger'), true)));
await check('non-staff email account cannot read orders', assertFails(get(ref(other, 'todayOrders'))));
await check('staff reads all orders', assertSucceeds(get(ref(owner, 'todayOrders'))));
await check('staff updates status', assertSucceeds(update(ref(owner, 'todayOrders/o1'), { status: 'on_the_way', updatedAt: Date.now() })));
await check('staff edits menu', assertSucceeds(set(ref(owner, 'menu/x'), { title: 'ok' })));
await check('staff can add another staff member', assertSucceeds(set(ref(owner, 'staff/stranger'), true)));
await check('customer cannot list staff', assertFails(get(ref(A, 'staff'))));

// ── done orders + reviews ──
const snap = (await get(ref(owner, 'todayOrders/o1'))).val();
await check('staff moves order to done', assertSucceeds(set(ref(owner, 'doneOrders/o1'), { ...snap, status: 'done' })));
await check('customer reads own done order', assertSucceeds(get(ref(A, 'doneOrders/o1'))));
await check('other customer cannot read done order', assertFails(get(ref(B, 'doneOrders/o1'))));
await check('other customer cannot review it', assertFails(set(ref(B, 'reviews/o1'), { orderId: 'o1', num: 201, stars: 1, createdAt: 1 })));
await check('stars must be 1-5', assertFails(set(ref(A, 'reviews/o1'), { orderId: 'o1', num: 201, stars: 6, createdAt: 1 })));
await check('customer reviews own delivered order', assertSucceeds(set(ref(A, 'reviews/o1'), { orderId: 'o1', num: 201, stars: 5, comment: 'מעולה', createdAt: 1 })));
await check('cannot review twice', assertFails(set(ref(A, 'reviews/o1'), { orderId: 'o1', num: 201, stars: 1, createdAt: 2 })));
await check('cannot review undelivered order', assertFails(set(ref(A, 'reviews/o9'), { orderId: 'o9', num: 1, stars: 5, createdAt: 1 })));
await check('customer cannot read all reviews', assertFails(get(ref(A, 'reviews'))));
await check('staff reads all reviews', assertSucceeds(get(ref(owner, 'reviews'))));
await check('stats: first rating', assertSucceeds(runTransaction(ref(A, 'reviewStats'), c => ({ count: (c?.count ?? 0) + 1, sum: (c?.sum ?? 0) + 5 }))));
await check('stats: cannot add 50 stars at once', assertFails(set(ref(A, 'reviewStats'), { count: 2, sum: 55 })));
await check('stats: cannot reset', assertFails(set(ref(A, 'reviewStats'), { count: 1, sum: 5 })));
await check('guest reads stats', assertSucceeds(get(ref(guest, 'reviewStats'))));

// ── customer profiles + marketing consent ──
const profile = (uid, extra = {}) => ({ phone: phoneOf(uid), name: 'אחמד', marketingConsent: true, consentAt: 1, createdAt: 1, ordersCount: 1, ...extra });
await check('customer saves own profile with consent', assertSucceeds(set(ref(A, 'customers/custA'), profile('custA'))));
await check('customer reads own profile', assertSucceeds(get(ref(A, 'customers/custA'))));
await check('customer cannot read other profiles', assertFails(get(ref(B, 'customers/custA'))));
await check('customer cannot list all customers', assertFails(get(ref(A, 'customers'))));
await check('cannot save profile under someone else', assertFails(set(ref(B, 'customers/custA'), profile('custBB'))));
await check('profile phone must be the verified one', assertFails(set(ref(B, 'customers/custBB'), profile('custBB', { phone: '+972509999999' }))));
await check('unverified visitor cannot create profile', assertFails(set(ref(Anon, 'customers/anon1'), profile('anon1'))));
await check('unknown fields rejected', assertFails(set(ref(B, 'customers/custBB'), profile('custBB', { isAdmin: true }))));
await check('customer withdraws consent', assertSucceeds(update(ref(A, 'customers/custA'), { marketingConsent: false, consentAt: 2 })));
await check('staff lists customers', assertSucceeds(get(ref(owner, 'customers'))));
await check('staff turns consent off ("הסר")', assertSucceeds(update(ref(owner, 'customers/custA'), { marketingConsent: false, consentAt: 3 })));
await check('staff cannot change customer phone', assertFails(update(ref(owner, 'customers/custA'), { phone: '+972501111111' })));

await env.cleanup();
for (const r of results) console.log(r.join('  '));
const failed = results.filter(r => r[0] === '✗').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
