export const AssignmentStatus = {
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type AssignmentStatusType = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];
