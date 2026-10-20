/* Demo data for local development and demos. Run with:  npm run seed
   Every row is flagged is_demo = 1 and shows a "Demo" badge in the app.
   Re-running is safe: existing demo accounts are skipped. Use `npm run seed:reset` to wipe and recreate them.
   Coordinates are approximate town centres. Prices are illustrative demo values, not market data. */

const DEMO_PASSWORD = 'Mkulima@2026';

const USERS = [
  { key: 'buyer', fullName: 'Amina Wanjiru', email: 'buyer@demo.mkulima.test', phone: '+254700100001', role: 'buyer',
    location: 'Nairobi', lat: -1.2864, lng: 36.8172, businessType: 'Wholesale buyer (demo)', speciality: 'Vegetables for hotels and schools' },
  { key: 'seller1', fullName: 'John Kamau', email: 'seller@demo.mkulima.test', phone: '+254700100002', role: 'seller',
    location: 'Ol Kalou, Nyandarua', lat: -0.2700, lng: 36.3800, businessType: 'Smallholder farmer (demo)', speciality: 'Potatoes, cabbages, carrots' },
  { key: 'seller2', fullName: 'Grace Wambui', email: 'seller2@demo.mkulima.test', phone: '+254700100003', role: 'seller',
    location: 'Mwea, Kirinyaga', lat: -0.6900, lng: 37.3500, businessType: 'Horticulture farmer (demo)', speciality: 'Tomatoes, onions, rice' },
  { key: 'seller3', fullName: 'Peter Mutua', email: 'seller3@demo.mkulima.test', phone: '+254700100004', role: 'seller',
    location: 'Makueni', lat: -1.8040, lng: 37.6200, businessType: 'Fruit farmer (demo)', speciality: 'Mangoes, green grams' },
  { key: 'transporter1', fullName: 'Otieno Haulage', email: 'transporter@demo.mkulima.test', phone: '+254700100005', role: 'transporter',
    location: 'Nakuru', lat: -0.3031, lng: 36.0800, businessType: 'Farm-to-market transport (demo)', speciality: '10-tonne lorry, Rift Valley to Nairobi' },
  { key: 'transporter2', fullName: 'Njeri Pickups', email: 'transporter2@demo.mkulima.test', phone: '+254700100006', role: 'transporter',
    location: 'Kiambu', lat: -1.1714, lng: 36.8356, businessType: 'Light transport (demo)', speciality: 'Pickups for short trips around Nairobi' }
];

const LISTINGS = [
  { owner: 'seller1', title: 'Shangi potatoes, Grade A', commodity: 'Potatoes', grade: 'A', quantity_kg: 4500, price_per_kg: 38, unit: 'bag', location: 'Ol Kalou',
    description: 'Freshly harvested Shangi potatoes, sorted and packed. About 50 bags of 90 kg. Collection at Ol Kalou or arrange transport.' },
  { owner: 'seller1', title: 'Cabbages, large heads', commodity: 'Cabbages', grade: 'A', quantity_kg: 2000, price_per_kg: 20, unit: 'kg', location: 'Ol Kalou',
    description: 'Firm, large cabbage heads harvested this week. Wholesale buyers welcome.' },
  { owner: 'seller1', title: 'Carrots, washed', commodity: 'Carrots', grade: 'B', quantity_kg: 800, price_per_kg: 45, unit: 'kg', location: 'Ol Kalou', status: 'almost_out',
    description: 'Washed carrots in 50 kg bags. Limited stock left.' },
  { owner: 'seller2', title: 'Ripe tomatoes in crates', commodity: 'Tomatoes', grade: 'A', quantity_kg: 1280, price_per_kg: 70, unit: 'crate', location: 'Mwea',
    description: 'Red, firm tomatoes packed in crates of about 64 kg. Best sold within 3 days.' },
  { owner: 'seller2', title: 'Red onions', commodity: 'Onions', grade: 'A', quantity_kg: 1500, price_per_kg: 85, unit: 'bag', location: 'Mwea',
    description: 'Dry, well-cured red onions in net bags. Store well for several weeks.' },
  { owner: 'seller2', title: 'Pishori rice (paddy)', commodity: 'Rice', grade: 'Standard', quantity_kg: 3000, price_per_kg: 95, unit: 'bag', location: 'Mwea', status: 'paused',
    description: 'Pishori paddy rice. Listing paused while milling is arranged.' },
  { owner: 'seller3', title: 'Apple mangoes', commodity: 'Mangoes', grade: 'A', quantity_kg: 2500, price_per_kg: 40, unit: 'crate', location: 'Makueni',
    description: 'Apple mangoes picked mature-green, ripening well. Good for retail and juice makers.' },
  { owner: 'seller3', title: 'Green grams (ndengu)', commodity: 'Green grams', grade: 'A', quantity_kg: 900, price_per_kg: 130, unit: 'bag', location: 'Makueni',
    description: 'Clean, dry green grams, sorted. 90 kg bags.' }
];

const ROUTES = [
  { owner: 'transporter1', route_name: 'Nakuru to Nairobi (Wakulima Market)', origin: 'Nakuru', destination: 'Nairobi', vehicle: '10-tonne lorry',
    capacity_kg: 10000, rate: 120, service_days: 'Mon, Wed, Fri', description: 'Night runs to Wakulima Market. Rate is KSh per km, demo value. Ask for a quote.' },
  { owner: 'transporter1', route_name: 'Ol Kalou to Nairobi', origin: 'Ol Kalou', destination: 'Nairobi', vehicle: '10-tonne lorry',
    capacity_kg: 10000, rate: 130, service_days: 'Tue, Sat', description: 'Potato and cabbage loads from Nyandarua. Demo rate per km.' },
  { owner: 'transporter2', route_name: 'Kiambu to Nairobi CBD', origin: 'Kiambu', destination: 'Nairobi', vehicle: 'Pickup (1 tonne)',
    capacity_kg: 1000, rate: 60, service_days: 'Daily', description: 'Small loads to city markets and hotels. Demo rate per km.' },
  { owner: 'transporter2', route_name: 'Mwea to Nairobi', origin: 'Mwea', destination: 'Nairobi', vehicle: 'Canter (3 tonnes)',
    capacity_kg: 3000, rate: 90, service_days: 'Mon - Sat', description: 'Shaded canter for tomatoes and onions. Demo rate per km.' }
];

module.exports = async function seed({ run, get, all, bcrypt }, { reset = false } = {}) {
  if (reset) {
    const demo = await all('SELECT id FROM users WHERE is_demo = 1');
    for (const u of demo) {
      await run('DELETE FROM listings WHERE user_id = ?', [u.id]);
      await run('DELETE FROM routes WHERE user_id = ?', [u.id]);
    }
    await run('DELETE FROM users WHERE is_demo = 1');
    console.log(`Removed ${demo.length} demo users and their listings/routes.`);
  }

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const ids = {};
  let created = 0;
  for (const u of USERS) {
    const existing = await get('SELECT id FROM users WHERE email = ?', [u.email]);
    if (existing) { ids[u.key] = { id: existing.id, isNew: false }; continue; }
    const r = await run(`INSERT INTO users (full_name, email, phone, password_hash, role, location, business_type, speciality, lat, lng, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [u.fullName, u.email, u.phone, hash, u.role, u.location, u.businessType, u.speciality, u.lat, u.lng]);
    ids[u.key] = { id: r.id, isNew: true };
    created++;
  }

  let listings = 0;
  for (const l of LISTINGS) {
    const owner = ids[l.owner];
    if (!owner.isNew) continue; // only add listings for freshly created demo accounts
    const u = USERS.find((x) => x.key === l.owner);
    await run(`INSERT INTO listings (user_id, title, commodity, grade, quantity_kg, price_per_kg, unit, location, description, status, lat, lng, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [owner.id, l.title, l.commodity, l.grade, l.quantity_kg, l.price_per_kg, l.unit, l.location, l.description, l.status || 'available', u.lat, u.lng]);
    listings++;
  }

  let routes = 0;
  for (const r of ROUTES) {
    const owner = ids[r.owner];
    if (!owner.isNew) continue;
    await run(`INSERT INTO routes (user_id, route_name, origin, destination, vehicle, capacity_kg, rate, service_days, description, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [owner.id, r.route_name, r.origin, r.destination, r.vehicle, r.capacity_kg, r.rate, r.service_days, r.description]);
    routes++;
  }

  console.log(`Seed done: ${created} demo users, ${listings} listings, ${routes} routes added.`);
  console.log(`Demo password for every demo account: ${DEMO_PASSWORD}`);
  USERS.forEach((u) => console.log(`  ${u.role.padEnd(11)} ${u.email}`));
};
