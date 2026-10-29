/**
 * Operational settings. GET /vendor/settings returns the vendor's own settings;
 * PUT accepts ONLY { maxActiveOrders (1–500), settlementSchedule
 * ('weekly'|'monthly') } — delivery ownership and commission are admin-managed.
 */
export interface OperationalSettings {
  businessType?: string;
  deliveryMode?: string;
  commissionRate?: number;
  commissionPlan?: string;
  maxActiveOrders?: number;
  activeOrders?: number;
  availableSlots?: number;
  settlementSchedule?: string;
  fssai?: string;
  [key: string]: unknown;
}

export interface SettingsResponse {
  data?: OperationalSettings;
}

/** GET /vendor/onboarding/config — allowed bounds and settlement schedules. */
export interface OnboardingConfig {
  maxActiveOrders?: { min?: number; max?: number };
  settlementSchedules?: string[];
  [key: string]: unknown;
}
