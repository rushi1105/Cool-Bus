export const Roles = {
  Driver: 'driver',
  Operator: 'operator',
  Parent: 'parent',
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];
