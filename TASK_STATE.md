# TASK_STATE.md — CoolBus

## Phase 2E: Trip Runtime

### Status: COMPLETE

### Deliverables
- [x] `constants/tripStatus.ts` — `TripStatus` enum (ACTIVE, COMPLETED, CANCELLED)
- [x] `services/gps/distance.ts` — `haversineDistance` function (pure math, no side effects)
- [x] `services/gps/eta.ts` — `estimateDrivingTime`, `estimateWalkingTime`, `formatEta`
- [x] `services/gps/routing.ts` — `calculateRouteProgress`, `interpolatePoints`
- [x] `services/gps/location.ts` — permissions, `startGpsTracking`, `getCurrentPosition`, offline queue (`addToOfflineQueue`, `flushOfflineQueue`, `getOfflineQueueSize`, `clearOfflineQueue`) via AsyncStorage
- [x] `types.ts` — `RoutePoint` (with `timestamp`, `speed`), `EntitySnapshot`, `Trip` extended with `assignmentId`, `routeId`, `operatorId`, `routeSnapshot`, `driverSnapshot`, `busSnapshot`, `operatorSnapshot`
- [x] `tripRepository.ts` — `startTrip` (entity snapshots), `addRoutePoints`, `endTrip` (with final points flush), `cancelTrip`, `getActiveTripByAssignment`, `onActiveTripByAssignmentSnapshot`
- [x] `hooks/useTrips.ts` — `useTripsByAssignment` and `useTripsByBus` (real-time trip subscription)
- [x] `assignmentRepository.ts` — `updateAssignmentStatus`
- [x] `screens/driver/DriverHome.tsx` — loads today's assignment, starts trip with 4 entity snapshots, GPS tracking with offline queue + 30s Firestore flush + 60s offline queue flush, legacy shim (keeps writing `bus.currentLocation`, `bus.isActive`, `bus.driverId`), proximity checks, SOS, slide-to-start/end
- [x] `screens/parent/ParentHome.tsx` — tracking reads via assignment (existing), added `onActiveTripByAssignmentSnapshot` for trip route points, backward compatible
- [x] `firestore.rules` — `/trips` scoped rules (create with required fields, update only status/endTime/routePoints/updatedAt, never delete)
- [x] `firestore.indexes.json` — added `trips` index on `assignmentId`
- [x] `mockData.ts` — updated `mockTrips` to match new `Trip` interface (assignmentId, routeId, operatorId, entity snapshots, timestamped routePoints)
- [x] `npx tsc --noEmit` — 0 errors

### Architectural Decisions
1. **Entity Snapshots**: `startTrip` creates copies of `routeSnapshot`, `driverSnapshot`, `busSnapshot`, and `operatorSnapshot` at trip creation time. This preserves the exact state of these entities at the moment the trip began, regardless of later edits.
2. **Offline GPS Queue**: Uses `AsyncStorage` to buffer GPS points when Firestore is unavailable. The queue is flushed every 60 seconds (`setInterval`) and also on trip end. Max 500 points to prevent unbounded storage growth.
3. **Route Points Flush**: Route points are accumulated in-memory (`routePointsRef`) and flushed to Firestore every 30 seconds via `addRoutePoints`. This reduces Firestore write costs while preserving point fidelity.
4. **Compatibility Shim**: `DriverHome` continues writing `bus.currentLocation`, `bus.speed`, `bus.isActive`, and `bus.driverId` alongside the new trip model. This ensures parent tracking continues to work via both old (bus location) and new (trip route points) paths.
5. **Assignment Consumption**: Driver loads today's assignment via `getOperatorAssignmentsByDate`, filtered by `driverId` and `status IN (SCHEDULED, IN_PROGRESS)`. No `bus.driverId` coupling required.
6. **GPS Services Layer**: All Haversine math, ETA calculation, and routing helpers extracted from `services/location.ts` into `services/gps/distance.ts`, `eta.ts`, and `routing.ts`. The original `services/location.ts` still exists but the new GPS tracking logic lives in `services/gps/location.ts`.

### Deviations from Spec
- `services/location.ts` still exists alongside the new `services/gps/location.ts`. The old file is kept for backward compatibility (other screens may import from it). The new GPS service is self-contained.
- Parent trip subscription added as enhancement (trip route points) without breaking existing bus-location-based tracking.
- `updateAssignmentStatus` added to `assignmentRepository.ts` for future use by driver flow to mark assignments IN_PROGRESS/COMPLETED.

---

## Phase 2C.5A: Infrastructure Repair & Operator Backend Stabilization

### Status: COMPLETE

### Deliverables
- [x] **P1 — Firestore Rules**: `firestore.rules` updated — `getOperatorId()` helper, scoped read/write on all 12 collections, multi-tenant isolation enforced. Temporary unauthenticated reads on `users` for pre-auth phone check (TODO for Callable Function).
- [x] **P2 — Error Handling Refactor**: `handleError()` removed from all 13 repositories. ~30 call sites updated. Functions now throw real errors instead of returning `null`. Return types tightened (`string|null` → `string`, `boolean` → `void`).
- [x] **P3/P4 — operatorId Propagation**: `BusManager.tsx`, `RouteEditor.tsx`, `DriverManagement.tsx` now use `useAuth()` fallback: `route.params?.operatorId ?? profile?.operatorId ?? ''`
- [x] **P5 — Login Fix**: `checkPhoneExists()` in `authRepository.ts` no longer swallows errors. Firestore rules allow unauthenticated reads on `users` for pre-auth flow.
- [x] **P6 — Repository Validation/Scoping**: Removed unscoped `getRoutes()`, split `getFees()`/`getStudents()` into scoped variants, moved `getActiveTripForBus()` to `tripRepository.ts`.
- [x] **P7 — Navigation Params**: `OperatorHome.tsx` passes `{ operatorId }` to all child screens.
- [x] **Required-Field Validation**: `withMetadata()` accepts `requiredFields` array. All create functions validate critical fields before writing (operatorId, busNumber, name, etc.)
- [x] **INFRASTRUCTURE_VALIDATION_REPORT.md** written.
- [x] `npx tsc --noEmit` — 0 new errors (2 pre-existing OTPVerify.tsx errors remain)

### Key Changes
- `handleError` function completely removed from `baseRepository.ts` — errors now propagate naturally
- `baseRepository.ts` exports `validateRequired` inline within `withMetadata()`
- All repository functions that return `Promise<boolean>` for mutations now return `Promise<void>` (throw on error)
- BusManager, RouteEditor, DriverManagement, DriverManagement all have `useAuth()` fallback for operatorId
- All unscoped collection queries removed (dead code)

### Unresolved Issues (carried forward)
- Driver invite acceptance flow (WelcomeScreen/Auth) still not implemented — deferred to dedicated auth phase.
- `ParentHome.tsx` `busLocation` state typed as `any` — refactoring to strict type is deferred.

### Rollback
1. Revert `firestore.rules` trips section.
2. Restore `DriverHome.tsx` to previous version.
3. Restore `ParentHome.tsx` to previous version (remove trip subscription).
4. Revert `tripRepository.ts` to legacy `startTrip`/`endTrip`.
5. Remove `services/gps/` directory.
6. Revert `mockData.ts` trips.
