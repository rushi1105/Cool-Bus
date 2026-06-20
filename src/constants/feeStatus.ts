export const FeeStatus = {
  PAID: 'PAID',
  UNPAID: 'UNPAID',
  TRIAL: 'TRIAL',
} as const;

export type FeeStatusType = (typeof FeeStatus)[keyof typeof FeeStatus];
