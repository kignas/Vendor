/** Vendor application submission payload (POST /vendor-applications). */
export interface ApplicationPayload {
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  restaurantName: string;
  cuisine: string;
  description?: string;
  address: string;
  fssaiLicenseNumber: string;
  deliveryMode: 'self_delivery' | 'eatswada_rider';
  openingHours: Record<string, { closed: boolean; opensAt: string; closesAt: string }>;
  location: { type: 'Point'; coordinates: [number, number] };
}

export interface ApplicationResult {
  id?: string;
  statusToken?: string;
}

/** GET /vendor-applications/:id/status response `data`. */
export interface ApplicationStatus {
  status?: string;
  restaurantName?: string;
  changeRequest?: string;
  rejectionReason?: string;
  [key: string]: unknown;
}

/** Saved non-password correction draft (localStorage, never the password). */
export interface ApplicationDraft {
  ownerName?: string;
  phone?: string;
  email?: string;
  restaurantName?: string;
  cuisine?: string;
  description?: string;
  address?: string;
  longitude?: string;
  latitude?: string;
  fssai?: string;
  businessType?: string;
  deliveryMode?: string;
  hours?: Record<string, { closed?: boolean; opensAt?: string; closesAt?: string }>;
}
