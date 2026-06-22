import ExcelJS from 'exceljs';
import path from 'path';

const T = f => path.resolve('templates', f);
const errors = [];

async function readSheet(file) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.getWorksheet(1);
  const rows = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber <= 3) return;
    const vals = row.values;
    if (vals && vals.length > 1 && vals[1]) rows.push(vals);
  });
  return rows;
}

const [buses, routes, drivers, students] = await Promise.all([
  readSheet(T('mock_Buses.xlsx')),
  readSheet(T('mock_Routes.xlsx')),
  readSheet(T('mock_Drivers.xlsx')),
  readSheet(T('mock_Students.xlsx')),
]);

// Validate buses
const busNumbers = new Set();
for (let i = 0; i < buses.length - 1; i++) {
  const idx = i + 2; // 1-indexed + 1 for header
  const b = buses[i + 1];
  const num = String(b[1] || '').trim();
  if (!num) errors.push(`Buses row ${idx}: missing busNumber`);
  else if (busNumbers.has(num)) errors.push(`Buses row ${idx}: duplicate busNumber '${num}'`);
  else busNumbers.add(num);
  const cap = Number(b[2]);
  if (b[2] !== undefined && b[2] !== null && b[2] !== '' && (!Number.isInteger(cap) || cap < 1 || cap > 999))
    errors.push(`Buses row ${idx}: invalid capacity '${b[2]}'`);
  const type = String(b[3] || '').toLowerCase();
  if (type && !['minibus','bus','van'].includes(type))
    errors.push(`Buses row ${idx}: invalid type '${b[3]}'`);
}

// Validate routes
const routeNames = new Set();
const routeStops = {};
for (let i = 0; i < routes.length - 1; i++) {
  const idx = i + 2;
  const r = routes[i + 1];
  const rn = String(r[1] || '').trim();
  if (!rn) errors.push(`Routes row ${idx}: missing routeName`);
  else routeNames.add(rn);
  if (!routeStops[rn]) routeStops[rn] = [];
  const order = Number(r[5]);
  if (!Number.isInteger(order) || order < 1) errors.push(`Routes row ${idx}: invalid stopOrder '${r[5]}' for route '${rn}'`);
  const sn = String(r[6] || '').trim();
  if (!sn) errors.push(`Routes row ${idx}: missing stopName`);
  routeStops[rn].push({ order, name: sn, routeRow: idx });
  const lat = Number(r[7]);
  const lng = Number(r[8]);
  if (r[7] && r[7] !== '' && (lat < -90 || lat > 90))
    errors.push(`Routes row ${idx}: latitude out of range`);
  if (r[8] && r[8] !== '' && (lng < -180 || lng > 180))
    errors.push(`Routes row ${idx}: longitude out of range`);
}

for (const [rn, stops] of Object.entries(routeStops)) {
  const orders = stops.map(s => s.order);
  const dupes = orders.filter((o, i) => orders.indexOf(o) !== i);
  if (dupes.length > 0)
    errors.push(`Route '${rn}': duplicate stop orders: ${[...new Set(dupes)].join(', ')}`);
}

// Validate drivers
const driverPhones = new Set();
for (let i = 0; i < drivers.length - 1; i++) {
  const idx = i + 2;
  const d = drivers[i + 1];
  const name = String(d[1] || '').trim();
  if (!name) errors.push(`Drivers row ${idx}: missing name`);
  const phone = String(d[2] || '').trim();
  if (!phone) errors.push(`Drivers row ${idx}: missing phone`);
  else {
    if (!/^[6-9]\d{9}$/.test(phone)) errors.push(`Drivers row ${idx}: invalid phone '${phone}'`);
    if (driverPhones.has(phone)) errors.push(`Drivers row ${idx}: duplicate phone '${phone}'`);
    driverPhones.add(phone);
  }
  const shift = String(d[3] || '').toLowerCase();
  if (shift && !['morning','evening','both'].includes(shift))
    errors.push(`Drivers row ${idx}: invalid shift '${d[3]}'`);
}

// Validate students
const studentPhones = new Set();
const duplicatedPhoneStudents = [];
for (let i = 0; i < students.length - 1; i++) {
  const idx = i + 2;
  const s = students[i + 1];
  const name = String(s[1] || '').trim();
  if (!name) errors.push(`Students row ${idx}: missing name`);
  const grade = String(s[2] || '').trim();
  if (!grade) errors.push(`Students row ${idx}: missing grade`);
  const gender = String(s[3] || '').trim();
  if (!['Male','Female','Other'].includes(gender)) errors.push(`Students row ${idx}: invalid gender '${gender}'`);
  const rn = String(s[4] || '').trim();
  if (!rn) errors.push(`Students row ${idx}: missing routeName`);
  else if (!routeNames.has(rn)) errors.push(`Students row ${idx}: route '${rn}' not found`);
  const sn = String(s[5] || '').trim();
  if (!sn) errors.push(`Students row ${idx}: missing stopName`);
  else if (rn && routeStops[rn]) {
    const stopExists = routeStops[rn].some(st => st.name.toLowerCase() === sn.toLowerCase());
    if (!stopExists) errors.push(`Students row ${idx}: stop '${sn}' not found in route '${rn}'`);
  }
  const bn = String(s[6] || '').trim();
  if (bn && !busNumbers.has(bn)) errors.push(`Students row ${idx}: bus '${bn}' not found`);

  const mName = String(s[7] || '').trim();
  const mPhone = String(s[8] || '').trim();
  const fName = String(s[9] || '').trim();
  const fPhone = String(s[10] || '').trim();
  const gName = String(s[11] || '').trim();
  const gPhone = String(s[12] || '').trim();

  const hasMother = mPhone.length > 0;
  const hasFather = fPhone.length > 0;
  const hasGuardian = gPhone.length > 0;

  if (!hasMother && !hasFather && !hasGuardian)
    errors.push(`Students row ${idx}: no guardian phone provided`);
  if (hasMother && !mName) errors.push(`Students row ${idx}: motherPhone provided but motherName missing`);
  if (hasFather && !fName) errors.push(`Students row ${idx}: fatherPhone provided but fatherName missing`);
  if (!hasMother && !hasFather && hasGuardian && !gName)
    errors.push(`Students row ${idx}: guardianPhone provided but guardianName missing`);

  [mPhone, fPhone, gPhone].filter(Boolean).forEach(p => {
    if (!/^[6-9]\d{9}$/.test(p)) errors.push(`Students row ${idx}: invalid phone '${p}'`);
    if (studentPhones.has(p)) duplicatedPhoneStudents.push({ row: idx, phone: p });
    studentPhones.add(p);
  });

  const jd = String(s[13] || '').trim();
  if (jd && !/^\d{4}-\d{2}-\d{2}$/.test(jd))
    errors.push(`Students row ${idx}: invalid joinDate format '${jd}' (expected YYYY-MM-DD)`);
}

console.log('=== VALIDATION RESULTS ===');
console.log(`Buses: ${buses.length - 1} rows`);
console.log(`Routes: ${Object.keys(routeStops).length} unique routes / ${routes.length - 1} stop rows`);
console.log(`Drivers: ${drivers.length - 1} rows`);
console.log(`Students: ${students.length - 1} rows`);
console.log(`Parent accounts needed: ${studentPhones.size}`);
console.log(`Phone reuse cases: ${duplicatedPhoneStudents.length}`);
console.log('');
if (errors.length === 0) {
  console.log('ALL VALIDATIONS PASSED — 0 errors');
} else {
  console.log(`${errors.length} validation error(s):`);
  errors.forEach(e => console.log('   - ' + e));
}
