export interface User {
  id: string;
  role: 'driver' | 'parent' | 'operator';
  /** Extended roles array for multi-role support (e.g., operator + driver) */
  roles?: string[];
  /** True when the operator has enabled driver mode */
  isOperatorDriver?: boolean;
  name: string;
  phone: string;
  email: string;
  operatorId?: string;
  operatorCode?: string;
  busNumber?: string;
  busId?: string;
  shift?: string;
  avatarUrl?: string;
  createdAt?: any;
  schemaVersion?: number;
  isActive?: boolean;
  availability?: string;
  updatedAt?: any;
}

export interface Bus {
  id: string;
  operatorId: string;
  driverId?: string;
  busNumber: string;
  plateNumber?: string;
  defaultRouteId?: string;
  capacity?: number;
  type?: 'minibus' | 'bus' | 'van';
  currentLocation?: { latitude: number; longitude: number };
  isActive: boolean;
  speed?: number;
  lastUpdated?: any;
  schemaVersion?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface RoutePoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed?: number;
}

export interface EntitySnapshot {
  id: string;
  data: Record<string, unknown>;
}

export interface Trip {
  id: string;
  assignmentId: string;
  busId: string;
  driverId: string;
  operatorId: string;
  routeId: string;
  startTime: any;
  endTime?: any;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  routePoints: RoutePoint[];
  routeSnapshot: EntitySnapshot;
  driverSnapshot: EntitySnapshot;
  busSnapshot: EntitySnapshot;
  operatorSnapshot: EntitySnapshot;
  schemaVersion?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Student {
  id: string;
  name: string;
  parentId: string;
  busId: string;
  operatorId: string;
  grade: string;
  gender: 'Male' | 'Female' | 'Other';
  stopLocation?: { latitude: number; longitude: number; label: string } | null;
  stopOrder?: number;
  routeId?: string;
  stopId?: string;
  isActive?: boolean;
  schemaVersion?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Fee {
  id: string;
  parentId: string;
  operatorId: string;
  studentId: string;
  status: 'PAID' | 'UNPAID' | 'TRIAL';
  month: string;
  total: number;
  trialUsed: boolean;
  trialExpiry?: any;
  paidAt?: any;
  schemaVersion?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface Coupon {
  id: string;
  code: string;
  operatorId: string;
  isUsed: boolean;
  usedBy?: string;
  usedAt?: any;
  schemaVersion?: number;
  createdAt: Date;
  updatedAt?: any;
  expiresAt: Date;
}

export interface Operator {
  id: string;
  name: string;
  code: string;
  busIds: string[];
  driverIds: string[];
  studentCount?: number;
  parentCount?: number;
  /** Operator's office/base location for map centering */
  officeLocation?: OfficeLocation;
  schemaVersion?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface OfficeLocation {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface Route {
  id: string;
  operatorId: string;
  name: string;
  stops: RouteStop[];
  version: number;
  isActive: boolean;
  schemaVersion?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface RouteStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  landmark?: string;
  address?: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  message?: string;
  read: boolean;
  timestamp: any;
  schemaVersion?: number;
  createdAt?: any;
  updatedAt?: any;
  metadata?: Record<string, unknown>;
}

export interface Assignment {
  id: string;
  operatorId: string;
  routeId: string;
  busId: string;
  driverId: string;
  date: string;
  shift: 'Morning' | 'Evening' | 'Both';
  direction?: 'pickup' | 'drop';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  schemaVersion?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface StopChangeRequest {
  id: string;
  operatorId: string;
  parentId: string;
  studentId: string;
  routeId: string;
  currentStopId: string;
  requestedStopId: string;
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  schemaVersion?: number;
  createdAt: any;
  updatedAt: any;
}

export { SCHEMA_VERSION } from '../constants/schema';

// ─── Invite System ──────────────────────────────────────────────────

export type InviteRole = 'driver' | 'parent';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked' | 'active';

export interface Invite {
  id: string;
  operatorId: string;
  operatorName: string;
  role: InviteRole;
  status: InviteStatus;
  code: string;
  isPermanent?: boolean;
  createdAt: any;
  expiresAt?: any;
  acceptedBy?: string;
  acceptedAt?: any;
}

export interface InviteAcceptance {
  id: string;
  inviteId: string;
  operatorId: string;
  role: InviteRole;
  userId: string;
  userName?: string;
  schemaVersion?: number;
  acceptedAt: any;
  createdAt?: any;
}

// ─── Geocoding ──────────────────────────────────────────────────────

export interface PlaceResult {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

// ─── Job State Model ────────────────────────────────────────────────

export type JobType = 'import' | 'export' | 'bulk_invite' | 'bulk_update';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobProgress {
  current: number;
  total: number;
  batchIndex: number;
  totalBatches: number;
}

export interface JobError {
  message: string;
  failedItems: { index: number; reason: string }[];
}

export interface JobState<T = unknown> {
  jobId: string;
  type: JobType;
  status: JobStatus;
  progress: JobProgress;
  result: T | null;
  error: JobError | null;
  createdAt: Date;
  updatedAt: Date;
}
