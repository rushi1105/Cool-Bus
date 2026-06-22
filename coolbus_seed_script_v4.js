/**
 * CoolBus Firestore Seed Script (ARCHITECTURE_v4)
 *
 * Lightweight compatibility seed aligned with the frozen database contract.
 * Corrects status vocabulary, adds missing collections, and normalizes schema.
 *
 * Design:
 *  - Reuses v3 data for bulk records, applying status corrections at write time
 *  - Adds alerts and notifications collections
 *  - Adds coupons and requests collections
 *  - Structured to consume external JSON data in the future (Import System)
 *    Usage: DATA_DIR=./seed-data node coolbus_seed_script_v4.js
 *
 * Status vocabulary (matches types.ts):
 *  Assignment: SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
 *  Trip:       ACTIVE | COMPLETED | CANCELLED
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, writeBatch, serverTimestamp, Timestamp } = require('firebase/firestore');
const path = require('path');
const fs = require('fs');

// ── Shared constant (single source of truth) ──────────────────────────
const SCHEMA_VERSION = 3;

// ── Firebase config ────────────────────────────────────────────────────
// Override via FIREBASE_PROJECT_ID env var, or replace inline below.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyC0S9-Qm_lbhcDZrvalUMDxraM44ksSU9E",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "coolbus-1db23.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "coolbus-1db23",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "coolbus-1db23.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "216763252688",
  appId: process.env.FIREBASE_APP_ID || "1:216763252688:web:ccbfce5773732f982043d5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function toTimestamp(date) {
  return Timestamp.fromDate(date);
}

// ── Load seed data ────────────────────────────────────────────────────
// Priority: external JSON files in DATA_DIR → v3 inline data → fallback

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'seed-data');

function tryLoad(filename) {
  const filePath = path.join(DATA_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      console.log(`[v4] Loaded external data: ${filename}`);
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn(`[v4] Failed to load ${filename}: ${e.message}`);
  }
  return null;
}

// Try loading v4 JSON data from external files first
const externalRoutes = tryLoad('routes.json') || {};
const externalBuses = tryLoad('buses.json') || {};
const externalDrivers = tryLoad('drivers.json') || {};
const externalOperators = tryLoad('operators.json') || {};
const externalAssignments = tryLoad('assignments.json') || {};
const externalStudents = tryLoad('students.json') || {};
const externalParentUsers = tryLoad('parents.json') || {};
const externalFees = tryLoad('fees.json') || {};
const externalTrips = tryLoad('trips.json') || {};

// ── Status vocabulary corrections ─────────────────────────────────────
// The v3 seed uses "assigned"/"accepted"/"started" for assignments.
// The codebase expects "SCHEDULED"/"IN_PROGRESS"/"COMPLETED"/"CANCELLED".
const ASSIGNMENT_STATUS_MAP = {
  assigned: 'SCHEDULED',
  accepted: 'SCHEDULED',
  started: 'IN_PROGRESS',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

const TRIP_STATUS_MAP = {
  active: 'ACTIVE',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
};

function correctAssignmentStatus(data) {
  if (data.status) data.status = ASSIGNMENT_STATUS_MAP[data.status.toLowerCase()] || data.status;
  return data;
}

function correctTripStatus(data) {
  if (data.status) data.status = TRIP_STATUS_MAP[data.status.toLowerCase()] || data.status;
  return data;
}

// ── Inline data (fallback if no external JSON files) ──────────────────
// Routes, buses, drivers, operators, students, fees, trips, assignments
// are reused from v3 inline definitions below, with status corrections.

const routes = Object.keys(externalRoutes).length > 0 ? externalRoutes : {
  "route-ambernath-carmel": {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    operatorId: "operator-akhilesh",
    name: "Ambernath → Carmel",
    description: "From Ambernath Railway Station area to Carmel Convent High School via Badlapur",
    stops: [
      { id: "stop-amb-001", order: 1, name: "Oyo Hotel Amber", landmark: "Oyo Hotel Amber", latitude: 19.2143126, longitude: 73.18386373 },
      { id: "stop-amb-002", order: 2, name: "Frozen Bottle", landmark: "Frozen Bottle", latitude: 19.21312472, longitude: 73.18420705 },
      { id: "stop-amb-003", order: 3, name: "Hutatma Chowk", landmark: "Hutatma Chowk", latitude: 19.20917981, longitude: 73.18236705 },
      { id: "stop-amb-004", order: 4, name: "Fitness House", landmark: "Fitness House", latitude: 19.20610104, longitude: 73.18280841 },
      { id: "stop-amb-005", order: 5, name: "Swami Samarth Chowk", landmark: "Swami Samarth Chowk", latitude: 19.20429584, longitude: 73.18180559 },
      { id: "stop-amb-006", order: 6, name: "Shipra's Restaurant", landmark: "Shipra's Restaurant", latitude: 19.20391125, longitude: 73.18255385 },
      { id: "stop-amb-007", order: 7, name: "Jagrut Galli", landmark: "Jagrut Galli", latitude: 19.20176074, longitude: 73.18419462 },
      { id: "stop-amb-008", order: 8, name: "Dominos Kansai Section", landmark: "Dominos Kansai Section", latitude: 19.20268402, longitude: 73.18659788 },
      { id: "stop-amb-009", order: 9, name: "Ambernath Marine Drive", landmark: "Ambernath Marine Drive", latitude: 19.19820855, longitude: 73.18584271 },
      { id: "stop-amb-010", order: 10, name: "Lok Nagri School", landmark: "Lok Nagri School", latitude: 19.19398791, longitude: 73.18494102 },
      { id: "stop-amb-011", order: 11, name: "Lok Nagri Ground", landmark: "Lok Nagri Ground", latitude: 19.19090319, longitude: 73.18597635 },
      { id: "stop-amb-012", order: 12, name: "Hindustan Petroleum", landmark: "Hindustan Petroleum", latitude: 19.18845938, longitude: 73.18747972 },
      { id: "stop-amb-013", order: 13, name: "Mahanagar CNG Station", landmark: "Mahanagar CNG Station", latitude: 19.19022686, longitude: 73.19647156 },
      { id: "stop-amb-014", order: 14, name: "Pipeline Road", landmark: "Pipeline Road", latitude: 19.18883014, longitude: 73.20200456 },
      { id: "stop-amb-015", order: 15, name: "Badlapur Katai Road", landmark: "Maitri Katta", latitude: 19.18767606, longitude: 73.20494384 },
      { id: "stop-amb-016", order: 16, name: "House of Fusion", landmark: "House of Fusion", latitude: 19.18562933, longitude: 73.20999273 },
      { id: "stop-amb-017", order: 17, name: "Dmart", landmark: "Dmart", latitude: 19.18367791, longitude: 73.21460328 },
      { id: "stop-amb-018", order: 18, name: "Indian Oil Petrol Pump", landmark: "Indian Oil Petrol Pump", latitude: 19.18151924, longitude: 73.21797031 },
      { id: "stop-amb-019", order: 19, name: "Carmel Convent High School", landmark: "Carmel Convent High School", latitude: 19.1801893, longitude: 73.218766 }
    ],
    estimatedDuration: 45,
  },
  "route-shivaji-carmel": {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    operatorId: "operator-akhilesh",
    name: "Shivaji Chowk → Carmel",
    description: "From Shivaji Chowk area to Carmel Convent High School via Katrap",
    stops: [
      { id: "stop-shv-001", order: 1, name: "Shivaji Chowk", landmark: "Shivaji Chowk", latitude: 19.15996757, longitude: 73.23913262 },
      { id: "stop-shv-002", order: 2, name: "Herambh Medical", landmark: "Sanjeevni Hospital", latitude: 19.15989875, longitude: 73.23814218 },
      { id: "stop-shv-003", order: 3, name: "12 O'Clock Cake Shop", landmark: "12 O'Clock Cake Shop", latitude: 19.15903664, longitude: 73.23634973 },
      { id: "stop-shv-004", order: 4, name: "Shabri Hotel", landmark: "Shabri Hotel", latitude: 19.15824957, longitude: 73.23563648 },
      { id: "stop-shv-005", order: 5, name: "Aptewadi Naka", landmark: "Aptewadi Naka", latitude: 19.15868631, longitude: 73.23503389 },
      { id: "stop-shv-006", order: 6, name: "Aptewadi Shirgaon Road", landmark: "HBD Cakes", latitude: 19.15839138, longitude: 73.23392846 },
      { id: "stop-shv-007", order: 7, name: "Pendulkar Udyan", landmark: "Pendulkar Udyan", latitude: 19.15949988, longitude: 73.23317626 },
      { id: "stop-shv-008", order: 8, name: "Sai Akshata Apartment", landmark: "Sai Akshata Apartment", latitude: 19.16012569, longitude: 73.23283026 },
      { id: "stop-shv-009", order: 9, name: "Maratha Cafe", landmark: "Maratha Cafe", latitude: 19.16119139, longitude: 73.23182912 },
      { id: "stop-shv-010", order: 10, name: "Alpha Fitness", landmark: "More Mangal Karyalaya", latitude: 19.16016179, longitude: 73.22950365 },
      { id: "stop-shv-011", order: 11, name: "Mohan Palms", landmark: "Wellness Forever", latitude: 19.15931719, longitude: 73.22713299 },
      { id: "stop-shv-012", order: 12, name: "Raut Chowk", landmark: "Balaji Multispeciality Hospital", latitude: 19.15991766, longitude: 73.22885765 },
      { id: "stop-shv-013", order: 13, name: "Ambedkar Kaman", landmark: "Ambedkar Colony", latitude: 19.1618179, longitude: 73.23320718 },
      { id: "stop-shv-014", order: 14, name: "Maharana Pratap Chowk", landmark: "Digi One", latitude: 19.16146066, longitude: 73.23379727 },
      { id: "stop-shv-015", order: 15, name: "Siddhanath Apla Bazar", landmark: "Siddhanath Apla Bazar", latitude: 19.16175709, longitude: 73.2353905 },
      { id: "stop-shv-016", order: 16, name: "Talathi Office", landmark: "Amdar Misal", latitude: 19.1621954, longitude: 73.23693009 },
      { id: "stop-shv-017", order: 17, name: "KSJB Bank", landmark: "Adarsh School Back Gate", latitude: 19.16465741, longitude: 73.2355863 },
      { id: "stop-shv-018", order: 18, name: "East West Bridge", landmark: "Dubey Hospital", latitude: 19.16603249, longitude: 73.23557691 },
      { id: "stop-shv-019", order: 19, name: "Vijay Sales", landmark: "Vijay Sales", latitude: 19.16678432, longitude: 73.23470654 },
      { id: "stop-shv-020", order: 20, name: "Old DP Road", landmark: "Saraswat Bank", latitude: 19.1678598, longitude: 73.2330087 },
      { id: "stop-shv-021", order: 21, name: "Garva Old DP Road", landmark: "Garva Old DP Road", latitude: 19.16813848, longitude: 73.23119821 },
      { id: "stop-shv-022", order: 22, name: "Unity Small Finance Bank", landmark: "Tarangan Pan Shop", latitude: 19.16906288, longitude: 73.22941026 },
      { id: "stop-shv-023", order: 23, name: "Sweets Junction", landmark: "Sweets Junction", latitude: 19.17115617, longitude: 73.22815767 },
      { id: "stop-shv-024", order: 24, name: "Burger King", landmark: "Burger King", latitude: 19.17378651, longitude: 73.2261715 },
      { id: "stop-shv-025", order: 25, name: "MR DIY", landmark: "CROMA", latitude: 19.17485371, longitude: 73.2253038 },
      { id: "stop-shv-026", order: 26, name: "NEXA", landmark: "NEXA", latitude: 19.17703803, longitude: 73.22369161 },
      { id: "stop-shv-027", order: 27, name: "Ashta Vinayak Vastu Prakalpa", landmark: "Ashta Vinayak Vastu Prakalpa", latitude: 19.17888801, longitude: 73.22172823 },
      { id: "stop-shv-028", order: 28, name: "Carmel Convent High School", landmark: "Carmel Convent High School", latitude: 19.1801893, longitude: 73.218766 }
    ],
    estimatedDuration: 55,
  },
  "route-mohan-carmel": {
    schemaVersion: SCHEMA_VERSION,
    version: 1,
    operatorId: "operator-akhilesh",
    name: "Mohan Palms → Carmel",
    description: "From Mohan Palms area to Carmel Convent High School via Katrap Road",
    stops: [
      { id: "stop-moh-001", order: 1, name: "Mohan Palms", landmark: "Opposite Wellness Forever", latitude: 19.15932987, longitude: 73.22709341 },
      { id: "stop-moh-002", order: 2, name: "Raut Chowk", landmark: "Opposite Raut Arcade", latitude: 19.15992645, longitude: 73.22887007 },
      { id: "stop-moh-003", order: 3, name: "More Mangal Karyalaya", landmark: "Opposite Alpha Fitness", latitude: 19.16060438, longitude: 73.22999284 },
      { id: "stop-moh-004", order: 4, name: "Chaitanya Sankul", landmark: "Chaitanya Sankul", latitude: 19.16138276, longitude: 73.23058497 },
      { id: "stop-moh-005", order: 5, name: "Parth Complex Road", landmark: "Alok Apartment", latitude: 19.1618584, longitude: 73.23055637 },
      { id: "stop-moh-006", order: 6, name: "TV Tower", landmark: "MaxCare Multispeciality", latitude: 19.16287472, longitude: 73.22953876 },
      { id: "stop-moh-007", order: 7, name: "TV Tower Road", landmark: "Moment Maker Studio", latitude: 19.16335249, longitude: 73.23048412 },
      { id: "stop-moh-008", order: 8, name: "Cafe Golden Hour", landmark: "Cafe Golden Hour", latitude: 19.16376911, longitude: 73.23082282 },
      { id: "stop-moh-009", order: 9, name: "Registrar Office Badlapur", landmark: "Registrar Office Badlapur", latitude: 19.16351601, longitude: 73.23000993 },
      { id: "stop-moh-010", order: 10, name: "Sai Shraddha Complex", landmark: "Sai Shraddha Complex", latitude: 19.16356578, longitude: 73.22942887 },
      { id: "stop-moh-011", order: 11, name: "Mandar Arts", landmark: "Mandar Arts", latitude: 19.16455259, longitude: 73.22925124 },
      { id: "stop-moh-012", order: 12, name: "Jay Ambe Apartment", landmark: "Jay Ambe Apartment", latitude: 19.16506304, longitude: 73.22964433 },
      { id: "stop-moh-013", order: 13, name: "Vatsalya Maternity Hospital", landmark: "Vatsalya Maternity Hospital", latitude: 19.16544814, longitude: 73.23081646 },
      { id: "stop-moh-014", order: 14, name: "Vivek Vines Signal", landmark: "Dominos", latitude: 19.16619553, longitude: 73.23064748 },
      { id: "stop-moh-015", order: 15, name: "Old Katrap Turn", landmark: "Aarti Chinese Corner", latitude: 19.16791918, longitude: 73.22997508 },
      { id: "stop-moh-016", order: 16, name: "Katrap School Road", landmark: "Food Garage", latitude: 19.16861194, longitude: 73.22939526 },
      { id: "stop-moh-017", order: 17, name: "SBI Bank", landmark: "Vicky Vines", latitude: 19.16905252, longitude: 73.2293692 },
      { id: "stop-moh-018", order: 18, name: "Ganesh Ghat", landmark: "Baskin Robbins", latitude: 19.17130404, longitude: 73.22809494 },
      { id: "stop-moh-019", order: 19, name: "HP Petrol Pump", landmark: "HP Petrol Pump", latitude: 19.17339859, longitude: 73.22641442 },
      { id: "stop-moh-020", order: 20, name: "KFC Signal", landmark: "Croma", latitude: 19.17491338, longitude: 73.22528096 },
      { id: "stop-moh-021", order: 21, name: "MCD", landmark: "Jhanvi Lawns", latitude: 19.1763926, longitude: 73.22420735 },
      { id: "stop-moh-022", order: 22, name: "Sawali Dhaba", landmark: "Sawali Dhaba", latitude: 19.1778792, longitude: 73.22297478 },
      { id: "stop-moh-023", order: 23, name: "Carmel Convent High School", landmark: "Carmel Convent High School", latitude: 19.18017127, longitude: 73.21874128 }
    ],
    estimatedDuration: 40,
  },
};

// Duplicate routes for SANSKRUTI operator
Object.keys(routes).forEach((key) => {
  const sanskrutiKey = key + "-sanskruti";
  if (!routes[sanskrutiKey]) {
    routes[sanskrutiKey] = { ...routes[key], operatorId: "operator-sanskruti" };
  }
});

const buses = Object.keys(externalBuses).length > 0 ? externalBuses : {
  "bus-001": { schemaVersion: SCHEMA_VERSION, busNumber: "MH05BL1234", operatorId: "operator-akhilesh", defaultRouteId: "route-ambernath-carmel", activeAssignmentId: "asgn-001-afternoon", capacity: 40, isActive: false, status: "available", currentLocation: { latitude: 19.2143126, longitude: 73.18386373 } },
  "bus-002": { schemaVersion: SCHEMA_VERSION, busNumber: "MH05BL2345", operatorId: "operator-akhilesh", defaultRouteId: "route-shivaji-carmel", activeAssignmentId: "asgn-002-afternoon", capacity: 40, isActive: false, status: "available", currentLocation: { latitude: 19.15996757, longitude: 73.23913262 } },
  "bus-003": { schemaVersion: SCHEMA_VERSION, busNumber: "MH05BL3456", operatorId: "operator-akhilesh", defaultRouteId: "route-mohan-carmel", activeAssignmentId: "asgn-003-afternoon", capacity: 40, isActive: false, status: "available", currentLocation: { latitude: 19.15932987, longitude: 73.22709341 } },
  "bus-004": { schemaVersion: SCHEMA_VERSION, busNumber: "MH05BL4567", operatorId: "operator-sanskruti", defaultRouteId: "route-shivaji-carmel", activeAssignmentId: "asgn-004-morning", capacity: 45, isActive: true, status: "available", currentLocation: { latitude: 19.15996757, longitude: 73.23913262 } },
  "bus-005": { schemaVersion: SCHEMA_VERSION, busNumber: "MH05BL5678", operatorId: "operator-sanskruti", defaultRouteId: "route-ambernath-carmel", activeAssignmentId: "asgn-005-morning", capacity: 45, isActive: true, status: "available", currentLocation: { latitude: 19.2143126, longitude: 73.18386373 } },
  "bus-006": { schemaVersion: SCHEMA_VERSION, busNumber: "MH05BL6789", operatorId: "operator-sanskruti", defaultRouteId: "route-mohan-carmel", activeAssignmentId: "asgn-006-morning", capacity: 45, isActive: true, status: "available", currentLocation: { latitude: 19.15932987, longitude: 73.22709341 } },
  "bus-007": { schemaVersion: SCHEMA_VERSION, busNumber: "MH05BL7890", operatorId: "operator-akhilesh", capacity: 40, isActive: false, status: "maintenance", currentLocation: { latitude: 19.18, longitude: 73.22 } },
};

const driverUsers = Object.keys(externalDrivers).length > 0 ? externalDrivers : {
  "v2hL6xKap6V0MdhoPdqSG7vTfXy2": { schemaVersion: SCHEMA_VERSION, uid: "v2hL6xKap6V0MdhoPdqSG7vTfXy2", role: "driver", name: "Lucky", phone: "+919876543210", operatorId: "operator-akhilesh", isActive: true, availability: "available", activeAssignmentId: "asgn-001-afternoon" },
  "driver-rajesh-001": { schemaVersion: SCHEMA_VERSION, uid: "driver-rajesh-001", role: "driver", name: "Rajesh", phone: "+919876543211", operatorId: "operator-akhilesh", isActive: true, availability: "available", activeAssignmentId: "asgn-002-afternoon" },
  "driver-suresh-001": { schemaVersion: SCHEMA_VERSION, uid: "driver-suresh-001", role: "driver", name: "Suresh", phone: "+919876543212", operatorId: "operator-sanskruti", isActive: true, availability: "available", activeAssignmentId: "asgn-004-morning" },
  "driver-mahesh-001": { schemaVersion: SCHEMA_VERSION, uid: "driver-mahesh-001", role: "driver", name: "Mahesh", phone: "+919876543213", operatorId: "operator-sanskruti", isActive: true, availability: "available", activeAssignmentId: "asgn-005-morning" },
  "driver-vinod-001": { schemaVersion: SCHEMA_VERSION, uid: "driver-vinod-001", role: "driver", name: "Vinod", phone: "+919876543214", operatorId: "operator-akhilesh", isActive: true, availability: "on_leave" },
};

const operators = Object.keys(externalOperators).length > 0 ? externalOperators : {
  "operator-akhilesh": { schemaVersion: SCHEMA_VERSION, name: "Akhilesh Travels", code: "AKHILESH", phone: "+919876543210", email: "akhilesh@coolbus.demo", address: "Badlapur, Maharashtra", serviceRadius: 15, subscriptionTier: "free", isActive: true },
  "operator-sanskruti": { schemaVersion: SCHEMA_VERSION, name: "Sanskruti Transport", code: "SANSKRUTI", phone: "+919876543211", email: "sanskruti@coolbus.demo", address: "Badlapur, Maharashtra", serviceRadius: 15, subscriptionTier: "free", isActive: true },
};

function getTodayTimestamp() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

function getFutureTimestamp(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(d);
}

const todayTs = getTodayTimestamp();

const assignments = Object.keys(externalAssignments).length > 0
  ? Object.fromEntries(Object.entries(externalAssignments).map(([id, a]) => [id, correctAssignmentStatus(a)]))
  : {
      "asgn-001-afternoon": correctAssignmentStatus({ schemaVersion: SCHEMA_VERSION, operatorId: "operator-akhilesh", driverId: "v2hL6xKap6V0MdhoPdqSG7vTfXy2", busId: "bus-001", routeId: "route-ambernath-carmel", date: todayTs, shift: "afternoon", direction: "drop", status: "SCHEDULED", assignedBy: "operator-akhilesh" }),
      "asgn-002-afternoon": correctAssignmentStatus({ schemaVersion: SCHEMA_VERSION, operatorId: "operator-akhilesh", driverId: "driver-rajesh-001", busId: "bus-002", routeId: "route-shivaji-carmel", date: todayTs, shift: "afternoon", direction: "drop", status: "SCHEDULED", assignedBy: "operator-akhilesh" }),
      "asgn-003-afternoon": correctAssignmentStatus({ schemaVersion: SCHEMA_VERSION, operatorId: "operator-akhilesh", driverId: "driver-rajesh-001", busId: "bus-003", routeId: "route-mohan-carmel", date: todayTs, shift: "afternoon", direction: "drop", status: "SCHEDULED", assignedBy: "operator-akhilesh" }),
      "asgn-004-morning": correctAssignmentStatus({ schemaVersion: SCHEMA_VERSION, operatorId: "operator-sanskruti", driverId: "driver-suresh-001", busId: "bus-004", routeId: "route-shivaji-carmel", date: todayTs, shift: "morning", direction: "pickup", status: "SCHEDULED", assignedBy: "operator-sanskruti" }),
      "asgn-005-morning": correctAssignmentStatus({ schemaVersion: SCHEMA_VERSION, operatorId: "operator-sanskruti", driverId: "driver-mahesh-001", busId: "bus-005", routeId: "route-ambernath-carmel", date: todayTs, shift: "morning", direction: "pickup", status: "SCHEDULED", assignedBy: "operator-sanskruti" }),
      "asgn-006-morning": correctAssignmentStatus({ schemaVersion: SCHEMA_VERSION, operatorId: "operator-sanskruti", driverId: "driver-suresh-001", busId: "bus-006", routeId: "route-mohan-carmel", date: todayTs, shift: "morning", direction: "pickup", status: "SCHEDULED", assignedBy: "operator-sanskruti" }),
    };

const students = Object.keys(externalStudents).length > 0 ? externalStudents : {
  "student-001": { schemaVersion: SCHEMA_VERSION, parentId: "parent-sanskruti-test", operatorId: "operator-sanskruti", busId: "bus-004", routeId: "route-shivaji-carmel", stopId: "stop-shv-005", stopOrder: 5, stopLocation: { latitude: 19.15868631, longitude: 73.23503389, label: "Aptewadi Naka" }, name: "Rohan Sharma", grade: "5th", gender: "male" },
  "student-002": { schemaVersion: SCHEMA_VERSION, parentId: "parent-sanskruti-test", operatorId: "operator-sanskruti", busId: "bus-005", routeId: "route-ambernath-carmel", stopId: "stop-amb-010", stopOrder: 10, stopLocation: { latitude: 19.19398791, longitude: 73.18494102, label: "Lok Nagri School" }, name: "Priya Patel", grade: "7th", gender: "female" },
};

const fees = Object.keys(externalFees).length > 0 ? externalFees : {
  "fee-operator-akhilesh-2026-06": { schemaVersion: SCHEMA_VERSION, operatorId: "operator-akhilesh", type: "platform", status: "TRIAL", amount: 0, month: "2026-06", trialExpiry: toTimestamp(new Date("2026-07-01")) },
};

const parentUsers = Object.keys(externalParentUsers).length > 0 ? externalParentUsers : {
  "parent-sanskruti-test": { schemaVersion: SCHEMA_VERSION, uid: "parent-sanskruti-test", role: "parent", name: "Test Parent (Sanskruti)", phone: "+919876543999", email: "testparent@sanskruti.demo", operatorId: "operator-sanskruti", isActive: true },
};

const trips = Object.keys(externalTrips).length > 0
  ? Object.fromEntries(Object.entries(externalTrips).map(([id, t]) => [id, correctTripStatus(t)]))
  : {};

// ── v4 additions: alerts, notifications, coupons, requests ────────────

const alerts = {};

const notifications = {};

const coupons = {};

const requests = {};

// ── Seed function ─────────────────────────────────────────────────────

async function seedDatabase() {
  console.log("[v4] Starting CoolBus v4 seed...");

  const now = serverTimestamp();

  function ts(data) {
    return { ...data, createdAt: now, updatedAt: now };
  }

  const batch = writeBatch(db);
  const logs = [];

  // Operators
  Object.entries(operators).forEach(([id, data]) => {
    batch.set(doc(db, "operators", id), ts(data));
    logs.push(`[v4/operators] ${id} → ${data.name}`);
  });

  // Routes
  Object.entries(routes).forEach(([id, data]) => {
    batch.set(doc(db, "routes", id), ts(data));
    logs.push(`[v4/routes] ${id} → ${data.name}`);
  });

  // Buses
  Object.entries(buses).forEach(([id, data]) => {
    batch.set(doc(db, "buses", id), ts(data));
    logs.push(`[v4/buses] ${id} → ${data.busNumber}`);
  });

  // Drivers
  Object.entries(driverUsers).forEach(([id, data]) => {
    batch.set(doc(db, "users", id), ts(data));
    logs.push(`[v4/users/drivers] ${id} → ${data.name}`);
  });

  // Parents
  Object.entries(parentUsers).forEach(([id, data]) => {
    batch.set(doc(db, "users", id), ts(data));
    logs.push(`[v4/users/parents] ${id} → ${data.name}`);
  });

  // Assignments (status already corrected to SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED)
  Object.entries(assignments).forEach(([id, data]) => {
    batch.set(doc(db, "assignments", id), ts(data));
    logs.push(`[v4/assignments] ${id} → ${data.driverId} × ${data.busId} [${data.status}]`);
  });

  // Students
  Object.entries(students).forEach(([id, data]) => {
    batch.set(doc(db, "students", id), ts(data));
    logs.push(`[v4/students] ${id} → ${data.name}`);
  });

  // Fees
  Object.entries(fees).forEach(([id, data]) => {
    batch.set(doc(db, "fees", id), ts(data));
    logs.push(`[v4/fees] ${id} → ${data.status}`);
  });

  // Trips (status already corrected)
  Object.entries(trips).forEach(([id, data]) => {
    batch.set(doc(db, "trips", id), ts(data));
    logs.push(`[v4/trips] ${id} → ${data.status}`);
  });

  // Alerts (new collection — matches firestore.rules)
  Object.entries(alerts).forEach(([id, data]) => {
    batch.set(doc(db, "alerts", id), ts(data));
    logs.push(`[v4/alerts] ${id}`);
  });

  // Notifications (new collection — matches firestore.rules)
  Object.entries(notifications).forEach(([id, data]) => {
    batch.set(doc(db, "notifications", id), ts(data));
    logs.push(`[v4/notifications] ${id}`);
  });

  // Coupons (matches firestore.rules)
  Object.entries(coupons).forEach(([id, data]) => {
    batch.set(doc(db, "coupons", id), ts(data));
    logs.push(`[v4/coupons] ${id}`);
  });

  // Requests (matches firestore.rules)
  Object.entries(requests).forEach(([id, data]) => {
    batch.set(doc(db, "requests", id), ts(data));
    logs.push(`[v4/requests] ${id}`);
  });

  await batch.commit();

  console.log("\n✅ [v4] Seed complete!\n");
  console.log("Collections seeded:");
  console.log(`  Operators      : ${Object.keys(operators).length}`);
  console.log(`  Routes         : ${Object.keys(routes).length}`);
  console.log(`  Buses          : ${Object.keys(buses).length}`);
  console.log(`  Drivers        : ${Object.keys(driverUsers).length}`);
  console.log(`  Parents        : ${Object.keys(parentUsers).length}`);
  console.log(`  Assignments    : ${Object.keys(assignments).length}`);
  console.log(`  Students       : ${Object.keys(students).length}`);
  console.log(`  Fees           : ${Object.keys(fees).length}`);
  console.log(`  Trips          : ${Object.keys(trips).length}`);
  console.log(`  Alerts         : ${Object.keys(alerts).length}`);
  console.log(`  Notifications  : ${Object.keys(notifications).length}`);
  console.log(`  Coupons        : ${Object.keys(coupons).length}`);
  console.log(`  Requests       : ${Object.keys(requests).length}`);

  return logs;
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("❌ [v4] Seed failed:", err);
      process.exit(1);
    });
}

module.exports = { seedDatabase, SCHEMA_VERSION };
