import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.resolve('templates');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

const TEMPLATE_VERSION = '1.0';
const TEMPLATE_DATE = '2026-06';

// ─── Helpers ──────────────────────────────────────────────────────────────

function addHeaderRow(ws, columns, options = {}) {
  const headerRow = ws.addRow(columns.map(c => c.header));
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  headerRow.border = {
    top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
  };
  headerRow.height = 30;

  columns.forEach((col, i) => {
    const colLetter = String.fromCharCode(65 + i);
    ws.getColumn(colLetter).width = col.width || 18;
    ws.getColumn(colLetter).alignment = { vertical: 'middle', wrapText: true };
  });
}

function addRow(ws, data, rowIdx) {
  const row = ws.addRow(data);
  row.font = { size: 10 };
  row.alignment = { vertical: 'middle' };
  if (rowIdx % 2 === 0) {
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
  }
  row.height = 22;
  return row;
}

function addNoteRow(ws, text, mergeStart, mergeEnd) {
  const row = ws.addRow([text]);
  row.font = { italic: true, size: 9, color: { argb: 'FF666666' } };
  row.height = 18;
  if (mergeStart && mergeEnd) {
    ws.mergeCells(`${mergeStart}${row.number}:${mergeEnd}${row.number}`);
  }
}

function addDataValidation(ws, colLetter, startRow, endRow, values) {
  ws.dataValidations.add(`${colLetter}${startRow}:${colLetter}${endRow}`, {
    type: 'list',
    formulae: [`"${values.join(',')}"`],
    showErrorMessage: true,
    errorStyle: 'error',
    errorTitle: 'Invalid value',
    error: `Must be one of: ${values.join(', ')}`,
  });
}

// ─── 1. Buses.xlsx ───────────────────────────────────────────────────────

async function generateBusesTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CoolBus Import System';
  wb.created = new Date();
  const ws = wb.addWorksheet('Buses');

  // Info section
  ws.addRow(['TEMPLATE VERSION:', TEMPLATE_VERSION, '', 'DATE:', TEMPLATE_DATE]);
  ws.addRow(['INSTRUCTIONS:', 'Fill one row per bus. Required columns are marked with *.']);
  ws.addRow(['', 'Bus numbers must be unique. Download the latest template before each import.']);
  ws.addRow([]);

  const columns = [
    { header: 'busNumber *', key: 'busNumber', width: 22, desc: 'Vehicle registration number. Unique per operator. Example: MH05BL1234' },
    { header: 'capacity', key: 'capacity', width: 12, desc: 'Seating capacity (1-999). Optional.' },
    { header: 'type', key: 'type', width: 14, desc: 'Vehicle type: minibus, bus, or van. Default: bus.' },
    { header: 'isActive', key: 'isActive', width: 14, desc: 'TRUE or FALSE. Default: TRUE.' },
  ];

  addHeaderRow(ws, columns);

  // Data rows start at row 7 (header is row 6)
  const dataStartRow = 7;

  // Add dropdown for type column (C)
  addDataValidation(ws, 'C', dataStartRow, dataStartRow + 500, ['minibus', 'bus', 'van']);
  // Add dropdown for isActive column (D)
  addDataValidation(ws, 'D', dataStartRow, dataStartRow + 500, ['TRUE', 'FALSE']);

  // Example row
  const exRow = addRow(ws, ['MH05BL1234', 40, 'bus', 'TRUE'], 1);
  exRow.font = { italic: true, size: 10, color: { argb: 'FF999999' } };

  addNoteRow(ws, '↑ Example row (delete before import). Fill your data starting below.', 'A', 'D');
  addNoteRow(ws, `busNumber: Alphanumeric, hyphens, spaces allowed. Max 20 characters. Case-insensitive matching.`, 'A', 'D');
  addNoteRow(ws, `capacity: Positive integer. Leave blank if unknown.`, 'A', 'D');
  addNoteRow(ws, `type: Choose from dropdown. Defaults to 'bus' if blank.`, 'A', 'D');
  addNoteRow(ws, `isActive: Choose from dropdown. Defaults to TRUE if blank.`, 'A', 'D');

  // Remove plateNumber and defaultRouteName per architecture review R1

  ws.addRow([]);
  const footerRow = ws.addRow(['Template v' + TEMPLATE_VERSION + ' | CoolBus Import System | ' + TEMPLATE_DATE]);
  footerRow.font = { size: 8, color: { argb: 'FFAAAAAA' } };

  await wb.xlsx.writeFile(path.join(OUTPUT_DIR, 'Buses.xlsx'));
  console.log('✓ Buses.xlsx created');
}

// ─── 2. Routes.xlsx (merged with Stops) ──────────────────────────────────

async function generateRoutesTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CoolBus Import System';
  wb.created = new Date();
  const ws = wb.addWorksheet('Routes');

  ws.addRow(['TEMPLATE VERSION:', TEMPLATE_VERSION, '', 'DATE:', TEMPLATE_DATE]);
  ws.addRow(['INSTRUCTIONS:', 'Each row = one stop along a route. Route info (name, description) repeats for each stop.']);
  ws.addRow(['', 'The importer groups stops by routeName to create one route document with all stops.']);
  ws.addRow([]);

  const columns = [
    { header: 'routeName *', key: 'routeName', width: 28, desc: 'Route name. Repeats for each stop on this route. Unique per operator.' },
    { header: 'description', key: 'description', width: 30, desc: 'Route description (optional). Same value for all stops of this route.' },
    { header: 'estimatedDuration', key: 'estimatedDuration', width: 20, desc: 'Total route duration in minutes (optional).' },
    { header: 'isActive', key: 'isActive', width: 12, desc: 'TRUE or FALSE. Default: TRUE.' },
    { header: 'stopOrder *', key: 'stopOrder', width: 12, desc: 'Stop position along the route (1, 2, 3...). Must be unique per route.' },
    { header: 'stopName *', key: 'stopName', width: 24, desc: 'Stop display name. Should be unique per route.' },
    { header: 'latitude', key: 'latitude', width: 16, desc: 'GPS latitude (-90 to 90). Provide lat/lng OR address+landmark for geocoding.' },
    { header: 'longitude', key: 'longitude', width: 16, desc: 'GPS longitude (-180 to 180). Provide lat/lng OR address+landmark for geocoding.' },
    { header: 'landmark', key: 'landmark', width: 22, desc: 'Nearby landmark. Used as geocoding fallback if lat/lng missing.' },
    { header: 'address', key: 'address', width: 30, desc: 'Street address. Used as geocoding fallback if lat/lng missing.' },
  ];

  addHeaderRow(ws, columns);

  const dataStartRow = 7;

  // Dropdown for isActive
  addDataValidation(ws, 'D', dataStartRow, dataStartRow + 500, ['TRUE', 'FALSE']);

  // Example rows (3 stops on one route)
  const exRows = [
    ['Ambernath → Carmel', 'From Ambernath Railway Station to Carmel Convent High School', 45, 'TRUE', 1, 'Oyo Hotel Amber', 19.2143126, 73.18386373, 'Oyo Hotel Amber', 'Ambernath Railway Station Rd, Ambernath'],
    ['Ambernath → Carmel', 'From Ambernath Railway Station to Carmel Convent High School', 45, 'TRUE', 2, 'Aptewadi Naka', 19.1987654, 73.1765432, 'Aptewadi Bus Stop', 'Aptewadi, Ambernath'],
    ['Ambernath → Carmel', 'From Ambernath Railway Station to Carmel Convent High School', 45, 'TRUE', 3, 'Carmel Convent School', 19.1876543, 73.1654321, 'Near Carmel Church', 'Carmel Colony, Ambernath'],
  ];
  exRows.forEach((data, i) => {
    const r = addRow(ws, data, i + 1);
    r.font = { italic: true, size: 10, color: { argb: 'FF999999' } };
  });

  addNoteRow(ws, '↑ Example rows (delete before import). Each route needs at least 1 stop, at most 200 stops.', 'A', 'J');
  addNoteRow(ws, 'routeName: Same value for all stops of the same route. Case-insensitive matching.', 'A', 'J');
  addNoteRow(ws, 'description/estimatedDuration/isActive: Set these once per route (repeating same value for all stops is fine).', 'A', 'J');
  addNoteRow(ws, 'stopOrder: Positive integer. Order numbers can have gaps (e.g., 1, 3, 5) — gaps are accepted with a warning.', 'A', 'J');
  addNoteRow(ws, 'latitude/longitude: Provide if known. If blank, the system will attempt to geocode from address + landmark.', 'A', 'J');
  addNoteRow(ws, 'address/landmark: Highly recommended as geocoding fallback for any stop missing coordinates.', 'A', 'J');

  ws.addRow([]);
  const footerRow = ws.addRow(['Template v' + TEMPLATE_VERSION + ' | CoolBus Import System | ' + TEMPLATE_DATE]);
  footerRow.font = { size: 8, color: { argb: 'FFAAAAAA' } };

  await wb.xlsx.writeFile(path.join(OUTPUT_DIR, 'Routes.xlsx'));
  console.log('✓ Routes.xlsx created (merged with Stops)');
}

// ─── 3. Drivers.xlsx ────────────────────────────────────────────────────

async function generateDriversTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CoolBus Import System';
  wb.created = new Date();
  const ws = wb.addWorksheet('Drivers');

  ws.addRow(['TEMPLATE VERSION:', TEMPLATE_VERSION, '', 'DATE:', TEMPLATE_DATE]);
  ws.addRow(['INSTRUCTIONS:', 'Fill one row per driver. Drivers are imported as business records only.']);
  ws.addRow(['', 'No login credentials are created. Drivers will receive invites separately.']);
  ws.addRow([]);

  const columns = [
    { header: 'name *', key: 'name', width: 26, desc: "Driver's full name." },
    { header: 'phone *', key: 'phone', width: 18, desc: '10-digit Indian mobile number. Unique across the system. Starts with 6-9.' },
    { header: 'shift', key: 'shift', width: 14, desc: 'Preferred shift: Morning, Evening, or Both.' },
    { header: 'email', key: 'email', width: 28, desc: 'Email address (optional).' },
  ];

  addHeaderRow(ws, columns);

  const dataStartRow = 7;

  // Dropdown for shift
  addDataValidation(ws, 'C', dataStartRow, dataStartRow + 500, ['Morning', 'Evening', 'Both']);

  // Example row
  addRow(ws, ['Lucky Singh', '9876543210', 'Morning', 'lucky.singh@example.com'], 1).font = { italic: true, size: 10, color: { argb: 'FF999999' } };

  addNoteRow(ws, '↑ Example row (delete before import). Fill your driver data starting below.', 'A', 'D');
  addNoteRow(ws, 'name: Full name. Max 100 characters.', 'A', 'D');
  addNoteRow(ws, 'phone: Exactly 10 digits starting with 6, 7, 8, or 9. No +91 prefix, no spaces, no dashes.', 'A', 'D');
  addNoteRow(ws, 'shift: Choose from dropdown. Leave blank if not yet assigned.', 'A', 'D');
  addNoteRow(ws, 'email: Optional but recommended for sending invite links.', 'A', 'D');
  addNoteRow(ws, 'Bus assignment is done through the Assignment Manager after import (not in this template).', 'A', 'D');

  ws.addRow([]);
  const footerRow = ws.addRow(['Template v' + TEMPLATE_VERSION + ' | CoolBus Import System | ' + TEMPLATE_DATE]);
  footerRow.font = { size: 8, color: { argb: 'FFAAAAAA' } };

  await wb.xlsx.writeFile(path.join(OUTPUT_DIR, 'Drivers.xlsx'));
  console.log('✓ Drivers.xlsx created');
}

// ─── 4. Students.xlsx ────────────────────────────────────────────────────

async function generateStudentsTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CoolBus Import System';
  wb.created = new Date();
  const ws = wb.addWorksheet('Students');

  ws.addRow(['TEMPLATE VERSION:', TEMPLATE_VERSION, '', 'DATE:', TEMPLATE_DATE]);
  ws.addRow(['INSTRUCTIONS:', 'Fill one row per student. Guardian info is embedded in each row (no separate Parents file).']);
  ws.addRow(['', 'Each student needs at least one guardian (mother, father, or other guardian) with a valid phone.']);
  ws.addRow([]);

  const columns = [
    { header: 'name *', key: 'name', width: 24, desc: "Student's full name." },
    { header: 'grade *', key: 'grade', width: 12, desc: 'Grade or class. Example: 5th, Class 5, Grade 5.' },
    { header: 'gender *', key: 'gender', width: 12, desc: 'Male, Female, or Other.' },
    { header: 'routeName *', key: 'routeName', width: 28, desc: 'Must match a route name from your Routes.xlsx import.' },
    { header: 'stopName *', key: 'stopName', width: 24, desc: 'Must match a stop name within the specified route.' },
    { header: 'busNumber', key: 'busNumber', width: 20, desc: 'Optional. Bus registration number. If blank, student is imported without bus assignment.' },
    { header: 'motherName', key: 'motherName', width: 24, desc: "Mother's full name. Required if motherPhone is provided." },
    { header: 'motherPhone', key: 'motherPhone', width: 18, desc: "Mother's 10-digit mobile. At least one guardian phone required per student." },
    { header: 'fatherName', key: 'fatherName', width: 24, desc: "Father's full name. Required if fatherPhone is provided." },
    { header: 'fatherPhone', key: 'fatherPhone', width: 18, desc: "Father's 10-digit mobile (optional if motherPhone already provided)." },
    { header: 'guardianName', key: 'guardianName', width: 24, desc: "Guardian's full name. Required if neither mother nor father phone provided." },
    { header: 'guardianPhone', key: 'guardianPhone', width: 18, desc: "Guardian's 10-digit mobile." },
    { header: 'joinDate', key: 'joinDate', width: 14, desc: 'Enrollment date. Format: YYYY-MM-DD. Defaults to import date if blank.' },
  ];

  addHeaderRow(ws, columns);

  const dataStartRow = 8;

  // Dropdown for gender
  addDataValidation(ws, 'C', dataStartRow, dataStartRow + 500, ['Male', 'Female', 'Other']);

  // Example row
  addRow(ws, ['Rohan Sharma', '5th', 'Male', 'Ambernath → Carmel', 'Aptewadi Naka', 'MH05BL4567', 'Priya Sharma', '9876543210', 'Rajesh Sharma', '9876543211', '', '', '2026-04-01'], 1)
    .font = { italic: true, size: 10, color: { argb: 'FF999999' } };

  addNoteRow(ws, '↑ Example row (delete before import). At least one guardian phone required.', 'A', 'M');
  addNoteRow(ws, 'name/grade/gender/routeName/stopName: Required fields. routeName must match Routes.xlsx, stopName must exist in that route.', 'A', 'M');
  addNoteRow(ws, 'busNumber: Optional. If provided, must match a bus number from your Buses.xlsx import.', 'A', 'M');
  addNoteRow(ws, 'motherPhone/fatherPhone/guardianPhone: At least one is required per student. Phones are 10 digits, starting with 6-9.', 'A', 'M');
  addNoteRow(ws, 'If motherPhone is given, motherName is required. If fatherPhone is given, fatherName is required.', 'A', 'M');
  addNoteRow(ws, 'If a phone number matches an existing parent (from a prior import), the student is linked to that existing parent.', 'A', 'M');
  addNoteRow(ws, 'joinDate: Optional. Format YYYY-MM-DD. If blank, the import date is used.', 'A', 'M');
  addNoteRow(ws, 'Fee documents are auto-generated (UNPAID status) for every imported student.', 'A', 'M');

  ws.addRow([]);
  const footerRow = ws.addRow(['Template v' + TEMPLATE_VERSION + ' | CoolBus Import System | ' + TEMPLATE_DATE]);
  footerRow.font = { size: 8, color: { argb: 'FFAAAAAA' } };

  await wb.xlsx.writeFile(path.join(OUTPUT_DIR, 'Students.xlsx'));
  console.log('✓ Students.xlsx created');
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  console.log('Generating CoolBus Import Templates...\n');
  await generateBusesTemplate();
  await generateRoutesTemplate();
  await generateDriversTemplate();
  await generateStudentsTemplate();
  console.log('\nAll templates generated in:', OUTPUT_DIR);
}

main().catch(console.error);
