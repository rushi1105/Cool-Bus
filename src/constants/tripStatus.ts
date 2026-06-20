export const TripStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type TripStatusType = (typeof TripStatus)[keyof typeof TripStatus];
