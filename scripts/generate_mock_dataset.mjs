import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.resolve('templates');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// ─── Realistic Indian Data Pools ──────────────────────────────────────────

const FIRST_NAMES_M = [
  'Aarav', 'Arjun', 'Rohan', 'Vivaan', 'Aditya', 'Vihaan', 'Sai', 'Pranav', 'Dhruv', 'Krishna',
  'Ayaan', 'Shaurya', 'Ansh', 'Kabir', 'Ishaan', 'Reyansh', 'Aryan', 'Yash', 'Aarush', 'Rudra',
  'Shivansh', 'Neil', 'Ved', 'Samar', 'Anay', 'Amit', 'Rajesh', 'Suresh', 'Manoj', 'Vijay',
  'Akshay', 'Nikhil', 'Rahul', 'Aakash', 'Kunal', 'Harsh', 'Gaurav', 'Ravi', 'Siddharth', 'Rohit',
  'Abhishek', 'Vikram', 'Prakash', 'Sunil', 'Sanjay', 'Deepak', 'Anil', 'Sachin', 'Mahesh', 'Dinesh',
];

const FIRST_NAMES_F = [
  'Aanya', 'Anaya', 'Diya', 'Ishita', 'Riya', 'Shreya', 'Paridhi', 'Siya', 'Ananya', 'Jiya',
  'Prisha', 'Sara', 'Navya', 'Aadhya', 'Myra', 'Saanvi', 'Anika', 'Aarohi', 'Kavya', 'Pari',
  'Pihu', 'Ritika', 'Neha', 'Pooja', 'Priya', 'Nisha', 'Deepika', 'Kajal', 'Sneha', 'Anjali',
  'Pallavi', 'Swati', 'Divya', 'Shweta', 'Meera', 'Shruti', 'Nandini', 'Vaishali', 'Tanya', 'Aditi',
  'Maya', 'Lakshmi', 'Kirti', 'Bhavna', 'Geeta', 'Asha', 'Radhika', 'Archana', 'Madhuri', 'Priyanka',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Gupta', 'Singh', 'Kumar', 'Shah', 'Reddy', 'Joshi', 'Deshmukh',
  'Chavan', 'Pawar', 'Jadhav', 'Kadam', 'Yadav', 'Thakur', 'Gandhi', 'Mehta', 'Mishra', 'Pandey',
  'Srivastava', 'Agarwal', 'Choudhury', 'Das', 'Bose', 'Sen', 'Nair', 'Menon', 'Nayar', 'Iyer',
  'Rao', 'Naidu', 'Murthy', 'Kulkarni', 'Patil', 'Sawant', 'More', 'Gore', 'Keni', 'Puranik',
];

const GRADES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

// ─── Helper Functions ─────────────────────────────────────────────────────

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
function randomPhone() {
  const digits = '0123456789';
  let phone = pick('6789'); // must start with 6-9
  for (let i = 0; i < 9; i++) phone += pick(digits);
  return phone;
}
function uniquePhone(existing) {
  let phone;
  do { phone = randomPhone(); } while (existing.has(phone));
  existing.add(phone);
  return phone;
}

function formatGrade(i) {
  return GRADES[i % GRADES.length];
}

function generateStudentName(gender) {
  const first = gender === 'Female' ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
  const last = pick(LAST_NAMES);
  return `${first} ${last}`;
}

function generateParentName(gender) {
  // Gender:
  //   'M' → father/male guardian
  //   'F' → mother/female guardian
  const first = gender === 'F' ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
  const last = pick(LAST_NAMES);
  return `${first} ${last}`;
}

// Students often share a last name with parents (not always, but often enough for realism)
function generateParentNameForStudent(studentName, parentGender) {
  const studentParts = studentName.split(' ');
  const studentLastName = studentParts[studentParts.length - 1];
  const first = parentGender === 'F' ? pick(FIRST_NAMES_F) : pick(FIRST_NAMES_M);
  // 70% chance they share the last name, 30% chance different
  const last = Math.random() < 0.7 ? studentLastName : pick(LAST_NAMES);
  return `${first} ${last}`;
}

// ─── Route Data ──────────────────────────────────────────────────────────

const ROUTES = [
  {
    name: 'Ulhasnagar → Carmel',
    description: 'Via Ambernath railway station and old Mumbai road',
    estimatedDuration: 50,
    isActive: 'TRUE',
    stops: [
      { order: 1, name: 'Ulhasnagar Bus Stand', lat: 19.2143126, lng: 73.1838637, landmark: 'Near Ulhasnagar Railway Station', address: 'Ulhasnagar Bus Stand, Ulhasnagar - 421003' },
      { order: 2, name: 'Hill Line', lat: 19.2089123, lng: 73.1801234, landmark: 'Hill Line Temple', address: 'Hill Line Road, Ulhasnagar - 421003' },
      { order: 3, name: 'Camp 1', lat: 19.2034567, lng: 73.1776543, landmark: 'Camp 1 Signal', address: 'Camp 1, Ulhasnagar - 421003' },
      { order: 4, name: 'Ambernath Railway Station', lat: 19.1987654, lng: 73.1765432, landmark: 'Ambernath Station East', address: 'Station Road, Ambernath - 421501' },
      { order: 5, name: 'Oyo Hotel Amber', lat: 19.2143126, lng: 73.1838637, landmark: 'Oyo Hotel Amber', address: 'Ambernath Railway Station Road, Ambernath - 421501' },
      { order: 6, name: 'Aptewadi Naka', lat: 19.1954321, lng: 73.1723456, landmark: 'Aptewadi Bus Stop', address: 'Aptewadi, Ambernath - 421501' },
      { order: 7, name: 'Shivaji Chowk', lat: 19.1898765, lng: 73.1698765, landmark: 'Shivaji Maharaj Statue', address: 'Shivaji Chowk, Ambernath - 421501' },
      { order: 8, name: 'Carmel Convent School', lat: 19.1876543, lng: 73.1654321, landmark: 'Near Carmel Church', address: 'Carmel Colony, Ambernath - 421501' },
    ],
  },
  {
    name: 'Badlapur → School',
    description: 'Badlapur west via Katemanivali and Shiv Mandir road',
    estimatedDuration: 55,
    isActive: 'TRUE',
    stops: [
      { order: 1, name: 'Badlapur Railway Station', lat: 19.1523456, lng: 73.1434567, landmark: 'Badlapur Station East', address: 'Station Road, Badlapur - 421503' },
      { order: 2, name: 'Katemanivali', lat: 19.1634567, lng: 73.1554321, landmark: 'Katemanivali Phata', address: 'Katemanivali, Badlapur - 421503' },
      { order: 3, name: 'Shiv Mandir', lat: 19.1734567, lng: 73.1587654, landmark: 'Shiv Mandir Badlapur', address: 'Shiv Mandir Road, Badlapur - 421503' },
      { order: 4, name: 'Shelar Phata', lat: 19.1834567, lng: 73.1623456, landmark: 'Shelar Farm', address: 'Shelar Phata, Badlapur - 421503' },
      { order: 5, name: 'Manjarli Phata', lat: 19.1901234, lng: 73.1645678, landmark: 'Manjarli Village', address: 'Manjarli, Ambernath - 421501' },
      { order: 6, name: 'Ambernath MIDC', lat: 19.1923456, lng: 73.1678901, landmark: 'MIDC Gate 2', address: 'MIDC, Ambernath - 421501' },
      { order: 7, name: 'Carmel Convent School', lat: 19.1876543, lng: 73.1654321, landmark: 'Near Carmel Church', address: 'Carmel Colony, Ambernath - 421501' },
    ],
  },
  {
    name: 'Kalyan → School',
    description: 'Kalyan west via Vithalwadi and Mohne',
    estimatedDuration: 60,
    isActive: 'TRUE',
    stops: [
      { order: 1, name: 'Kalyan Railway Station', lat: 19.2345678, lng: 73.1287654, landmark: 'Kalyan Station West', address: 'Station Road, Kalyan - 421301' },
      { order: 2, name: 'Vithalwadi', lat: 19.2212345, lng: 73.1398765, landmark: 'Vithalwadi Phata', address: 'Vithalwadi, Kalyan - 421301' },
      { order: 3, name: 'Mohne', lat: 19.2123456, lng: 73.1498765, landmark: 'Mohne Village Well', address: 'Mohne, Kalyan - 421301' },
      { order: 4, name: 'Kolsewadi', lat: 19.2034567, lng: 73.1567890, landmark: 'Kolsewadi Temple', address: 'Kolsewadi, Kalyan - 421301' },
      { order: 5, name: 'Barave Nagar', lat: 19.1976543, lng: 73.1612345, landmark: 'Barave Garden', address: 'Barave Nagar, Kalyan - 421301' },
      { order: 6, name: 'Ambernath Circle', lat: 19.1923456, lng: 73.1656789, landmark: 'Ambernath Circle', address: 'Ambernath Circle, Ambernath - 421501' },
      { order: 7, name: 'Carmel Convent School', lat: 19.1876543, lng: 73.1654321, landmark: 'Near Carmel Church', address: 'Carmel Colony, Ambernath - 421501' },
    ],
  },
  {
    name: 'Dombivli → School',
    description: 'Dombivli east via Manpada and Kopar',
    estimatedDuration: 65,
    isActive: 'TRUE',
    stops: [
      { order: 1, name: 'Dombivli Railway Station', lat: 19.2134567, lng: 73.0834567, landmark: 'Dombivli Station East', address: 'Station Road, Dombivli - 421201' },
      { order: 2, name: 'Manpada', lat: 19.2056789, lng: 73.0976543, landmark: 'Manpada Bus Stop', address: 'Manpada, Dombivli - 421201' },
      { order: 3, name: 'Kopar Road', lat: 19.1987654, lng: 73.1123456, landmark: 'Kopar Church', address: 'Kopar Road, Dombivli - 421201' },
      { order: 4, name: 'Nilje Gaon', lat: 19.1898765, lng: 73.1287654, landmark: 'Nilje Phata', address: 'Nilje Gaon, Ambernath - 421501' },
      { order: 5, name: 'Kulgaon', lat: 19.1856789, lng: 73.1456789, landmark: 'Kulgaon Bus Stop', address: 'Kulgaon, Ambernath - 421501' },
      { order: 6, name: 'Shivaji Nagar', lat: 19.1845678, lng: 73.1567890, landmark: 'Shivaji Nagar Water Tank', address: 'Shivaji Nagar, Ambernath - 421501' },
      { order: 7, name: 'Carmel Convent School', lat: 19.1876543, lng: 73.1654321, landmark: 'Near Carmel Church', address: 'Carmel Colony, Ambernath - 421501' },
    ],
  },
  {
    name: 'Thane → School',
    description: 'Thane via Majiwada and Bhiwandi bypass',
    estimatedDuration: 75,
    isActive: 'TRUE',
    stops: [
      { order: 1, name: 'Thane Railway Station', lat: 19.1898765, lng: 72.9765432, landmark: 'Thane Station West', address: 'Station Road, Thane - 400601' },
      { order: 2, name: 'Majiwada Phata', lat: 19.1976543, lng: 73.0012345, landmark: 'Majiwada Circle', address: 'Majiwada, Thane - 400601' },
      { order: 3, name: 'Kasarvadavali', lat: 19.2067890, lng: 73.0234567, landmark: 'Kasarvadavali Naka', address: 'Kasarvadavali, Thane - 400615' },
      { order: 4, name: 'Bhiwandi Bypass', lat: 19.2145678, lng: 73.0543210, landmark: 'Bhiwandi Bypass Junction', address: 'Bhiwandi Bypass Road - 421302' },
      { order: 5, name: 'Shahapur Phata', lat: 19.1987654, lng: 73.0898765, landmark: 'Shahapur Naka', address: 'Shahapur Phata, Kalyan - 421301' },
      { order: 6, name: 'Khadakpada', lat: 19.1934567, lng: 73.1234567, landmark: 'Khadakpada Circle', address: 'Khadakpada, Kalyan - 421301' },
      { order: 7, name: 'Ambernath Circle', lat: 19.1923456, lng: 73.1656789, landmark: 'Ambernath Circle', address: 'Ambernath Circle, Ambernath - 421501' },
      { order: 8, name: 'Carmel Convent School', lat: 19.1876543, lng: 73.1654321, landmark: 'Near Carmel Church', address: 'Carmel Colony, Ambernath - 421501' },
    ],
  },
  {
    name: 'Mumbra → School',
    description: 'Mumbra via Diva and Patil Pada',
    estimatedDuration: 70,
    isActive: 'TRUE',
    stops: [
      { order: 1, name: 'Mumbra Bus Station', lat: 19.1745678, lng: 73.0212345, landmark: 'Mumbra Bus Stand', address: 'Mumbra Bus Station, Thane - 400612' },
      { order: 2, name: 'Diva Railway Station', lat: 19.1856789, lng: 73.0345678, landmark: 'Diva Station East', address: 'Diva Railway Station, Thane - 400612' },
      { order: 3, name: 'Patil Pada', lat: 19.1923456, lng: 73.0598765, landmark: 'Patil Pada Water Tank', address: 'Patil Pada, Diva - 400612' },
      { order: 4, name: 'Kausa', lat: 19.1965432, lng: 73.0789012, landmark: 'Kausa Phata', address: 'Kausa, Mumbra - 400612' },
      { order: 5, name: 'Kalyan Naka', lat: 19.2023456, lng: 73.1098765, landmark: 'Kalyan Naka Signal', address: 'Kalyan Naka, Kalyan - 421301' },
      { order: 6, name: 'Gandharv Pada', lat: 19.1967890, lng: 73.1434567, landmark: 'Gandharv Apartments', address: 'Gandharv Pada, Kalyan - 421301' },
      { order: 7, name: 'Carmel Convent School', lat: 19.1876543, lng: 73.1654321, landmark: 'Near Carmel Church', address: 'Carmel Colony, Ambernath - 421501' },
    ],
  },
  {
    name: 'Bhiwandi → School',
    description: 'Bhiwandi via Padgha and Shil Phata',
    estimatedDuration: 80,
    isActive: 'TRUE',
    stops: [
      { order: 1, name: 'Bhiwandi Bus Station', lat: 19.2967890, lng: 73.0543210, landmark: 'Bhiwandi ST Stand', address: 'Bhiwandi Bus Station, Thane - 421302' },
      { order: 2, name: 'Padgha Gaon', lat: 19.2789012, lng: 73.0678901, landmark: 'Padgha Gram Panchayat', address: 'Padgha, Bhiwandi - 421302' },
      { order: 3, name: 'Shil Phata', lat: 19.2567890, lng: 73.0812345, landmark: 'Shil Phata Junction', address: 'Shil Phata, Bhiwandi - 421302' },
      { order: 4, name: 'Saloli', lat: 19.2345678, lng: 73.0987654, landmark: 'Saloli Village', address: 'Saloli, Kalyan - 421301' },
      { order: 5, name: 'Khadakpada', lat: 19.1934567, lng: 73.1234567, landmark: 'Khadakpada Circle', address: 'Khadakpada, Kalyan - 421301' },
      { order: 6, name: 'Ambernath Circle', lat: 19.1923456, lng: 73.1656789, landmark: 'Ambernath Circle', address: 'Ambernath Circle, Ambernath - 421501' },
      { order: 7, name: 'Carmel Convent School', lat: 19.1876543, lng: 73.1654321, landmark: 'Near Carmel Church', address: 'Carmel Colony, Ambernath - 421501' },
    ],
  },
];

// ─── Buses ────────────────────────────────────────────────────────────────

const BUSES = [
  { busNumber: 'MH05BL1234', capacity: 40, type: 'bus', isActive: 'TRUE' },
  { busNumber: 'MH05BL5678', capacity: 30, type: 'minibus', isActive: 'TRUE' },
  { busNumber: 'MH05BL9012', capacity: 20, type: 'van', isActive: 'TRUE' },
];

// ─── Drivers ──────────────────────────────────────────────────────────────

const DRIVERS = [
  { name: 'Lucky Singh', phone: '9876543210', shift: 'Morning', email: 'lucky.singh@coolbus.in' },
  { name: 'Rajesh Patil', phone: '9876543211', shift: 'Morning', email: 'rajesh.patil@coolbus.in' },
  { name: 'Sunil Verma', phone: '9876543212', shift: 'Evening', email: 'sunil.verma@coolbus.in' },
  { name: 'Prakash Joshi', phone: '9876543213', shift: 'Morning', email: 'prakash.joshi@coolbus.in' },
  { name: 'Vikram Yadav', phone: '9876543214', shift: 'Evening', email: 'vikram.yadav@coolbus.in' },
];

// ─── Students ─────────────────────────────────────────────────────────────

function generateStudents() {
  const usedPhones = new Set();
  // Pre-seed driver phones so student parents don't collide
  DRIVERS.forEach(d => usedPhones.add(d.phone));

  const students = [];
  const guardianPhoneToId = {}; // Track reused phones

  for (let i = 0; i < 150; i++) {
    const gender = Math.random() < 0.5 ? 'Male' : 'Female';
    const name = generateStudentName(gender);
    const grade = formatGrade(i);
    const route = ROUTES[i % ROUTES.length];
    const stop = route.stops[Math.floor(Math.random() * route.stops.length)];
    const bus = BUSES[i % BUSES.length];
    const busNumber = Math.random() < 0.95 ? bus.busNumber : ''; // 5% have no bus

    // Assign guardians — target ~300 parents for 150 students
    const r = Math.random();
    let motherName = '', motherPhone = '', fatherName = '', fatherPhone = '', guardianName = '', guardianPhone = '';

    if (r < 0.85) {
      // Both mother and father (most common Indian household)
      motherPhone = uniquePhone(usedPhones);
      motherName = generateParentNameForStudent(name, 'F');
      fatherPhone = uniquePhone(usedPhones);
      fatherName = generateParentNameForStudent(name, 'M');
    } else if (r < 0.92) {
      // Mother only
      motherPhone = uniquePhone(usedPhones);
      motherName = generateParentNameForStudent(name, 'F');
    } else if (r < 0.97) {
      // Father only
      fatherPhone = uniquePhone(usedPhones);
      fatherName = generateParentNameForStudent(name, 'M');
    } else {
      // Guardian only
      guardianPhone = uniquePhone(usedPhones);
      guardianName = generateParentNameForStudent(name, Math.random() < 0.5 ? 'M' : 'F');
    }

    students.push({
      name,
      grade,
      gender,
      routeName: route.name,
      stopName: stop.name,
      busNumber,
      motherName,
      motherPhone,
      fatherName,
      fatherPhone,
      guardianName,
      guardianPhone,
      joinDate: '2026-04-01',
    });
  }

  return students;
}

// ─── Generate Templates with Mock Data ────────────────────────────────────

async function addHeaderRow(ws, columns) {
  const headerRow = ws.addRow(columns.map(c => c.header));
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.height = 30;

  columns.forEach((col, i) => {
    const colLetter = String.fromCharCode(65 + i);
    ws.getColumn(colLetter).width = col.width || 18;
    ws.getColumn(colLetter).alignment = { vertical: 'middle', wrapText: true };
  });
}

function addDataRow(ws, data, rowIdx) {
  const row = ws.addRow(data);
  row.font = { size: 10 };
  row.alignment = { vertical: 'middle' };
  if (rowIdx % 2 === 0) {
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
  }
  row.height = 22;
  return row;
}

async function generateMockBuses() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Buses');
  ws.addRow(['MOCK DATASET — CoolBus Import System']);
  ws.addRow(['Operator: Carmel Convent School, Ambernath | Created: ' + new Date().toISOString().split('T')[0]]);
  ws.addRow([]);

  const cols = [
    { header: 'busNumber', width: 20 },
    { header: 'capacity', width: 12 },
    { header: 'type', width: 14 },
    { header: 'isActive', width: 12 },
  ];
  await addHeaderRow(ws, cols);

  BUSES.forEach((b, i) => addDataRow(ws, [b.busNumber, b.capacity, b.type, b.isActive], i + 1));

  await wb.xlsx.writeFile(path.join(OUTPUT_DIR, 'mock_Buses.xlsx'));
  console.log(`  ✓ mock_Buses.xlsx (${BUSES.length} buses)`);
}

async function generateMockRoutes() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Routes');
  ws.addRow(['MOCK DATASET — CoolBus Import System']);
  ws.addRow(['Operator: Carmel Convent School, Ambernath | Created: ' + new Date().toISOString().split('T')[0]]);
  ws.addRow([]);

  const cols = [
    { header: 'routeName', width: 28 },
    { header: 'description', width: 36 },
    { header: 'estimatedDuration', width: 20 },
    { header: 'isActive', width: 12 },
    { header: 'stopOrder', width: 12 },
    { header: 'stopName', width: 26 },
    { header: 'latitude', width: 16 },
    { header: 'longitude', width: 16 },
    { header: 'landmark', width: 28 },
    { header: 'address', width: 34 },
  ];
  await addHeaderRow(ws, cols);

  let rowIdx = 0;
  let totalStops = 0;
  for (const route of ROUTES) {
    for (const stop of route.stops) {
      rowIdx++;
      totalStops++;
      addDataRow(ws, [
        route.name,
        route.description,
        route.estimatedDuration,
        route.isActive,
        stop.order,
        stop.name,
        stop.lat,
        stop.lng,
        stop.landmark,
        stop.address,
      ], rowIdx);
    }
  }

  await wb.xlsx.writeFile(path.join(OUTPUT_DIR, 'mock_Routes.xlsx'));
  console.log(`  ✓ mock_Routes.xlsx (${ROUTES.length} routes, ${totalStops} stops)`);
}

async function generateMockDrivers() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Drivers');
  ws.addRow(['MOCK DATASET — CoolBus Import System']);
  ws.addRow(['Operator: Carmel Convent School, Ambernath | Created: ' + new Date().toISOString().split('T')[0]]);
  ws.addRow([]);

  const cols = [
    { header: 'name', width: 26 },
    { header: 'phone', width: 18 },
    { header: 'shift', width: 14 },
    { header: 'email', width: 30 },
  ];
  await addHeaderRow(ws, cols);

  DRIVERS.forEach((d, i) => addDataRow(ws, [d.name, d.phone, d.shift, d.email], i + 1));

  await wb.xlsx.writeFile(path.join(OUTPUT_DIR, 'mock_Drivers.xlsx'));
  console.log(`  ✓ mock_Drivers.xlsx (${DRIVERS.length} drivers)`);
}

async function generateMockStudents() {
  const students = generateStudents();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Students');
  ws.addRow(['MOCK DATASET — CoolBus Import System']);
  ws.addRow(['Operator: Carmel Convent School, Ambernath | Created: ' + new Date().toISOString().split('T')[0]]);
  ws.addRow([]);

  const cols = [
    { header: 'name', width: 24 },
    { header: 'grade', width: 10 },
    { header: 'gender', width: 10 },
    { header: 'routeName', width: 28 },
    { header: 'stopName', width: 26 },
    { header: 'busNumber', width: 18 },
    { header: 'motherName', width: 22 },
    { header: 'motherPhone', width: 16 },
    { header: 'fatherName', width: 22 },
    { header: 'fatherPhone', width: 16 },
    { header: 'guardianName', width: 22 },
    { header: 'guardianPhone', width: 16 },
    { header: 'joinDate', width: 14 },
  ];
  await addHeaderRow(ws, cols);

  students.forEach((s, i) => addDataRow(ws, [
    s.name, s.grade, s.gender, s.routeName, s.stopName, s.busNumber,
    s.motherName, s.motherPhone, s.fatherName, s.fatherPhone,
    s.guardianName, s.guardianPhone, s.joinDate,
  ], i + 1));

  await wb.xlsx.writeFile(path.join(OUTPUT_DIR, 'mock_Students.xlsx'));
  console.log(`  ✓ mock_Students.xlsx (${students.length} students)`);

  // Stats
  const uniquePhones = new Set();
  let motherCount = 0, fatherCount = 0, guardianCount = 0;
  students.forEach(s => {
    if (s.motherPhone) { uniquePhones.add(s.motherPhone); motherCount++; }
    if (s.fatherPhone) { uniquePhones.add(s.fatherPhone); fatherCount++; }
    if (s.guardianPhone) { uniquePhones.add(s.guardianPhone); guardianCount++; }
  });
  console.log(`    Parent accounts generated: ${uniquePhones.size}`);
  console.log(`    Guardian relationships: Mother=${motherCount}, Father=${fatherCount}, Guardian=${guardianCount}`);
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('\nGenerating CoolBus Mock Dataset...\n');
  await generateMockBuses();
  await generateMockRoutes();
  await generateMockDrivers();
  await generateMockStudents();
  console.log('\nAll mock datasets generated in:', OUTPUT_DIR);
}

main().catch(console.error);
