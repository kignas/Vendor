/** Restaurant document. Read defensively; only known fields are typed. */
export interface OpeningDay {
  closed?: boolean;
  opensAt?: string;
  closesAt?: string;
}

export interface Restaurant {
  _id?: string;
  name?: string;
  availability?: string;
  isOpen?: boolean;
  openingHours?: Record<string, OpeningDay>;
  fssaiLicenseNumber?: string;
  fssai?: string;
  isVerified?: boolean;
  applicationStatus?: string;
  deliveryMode?: 'self_delivery' | 'eatswada_rider' | string;
  address?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface RestaurantResponse {
  data?: Restaurant;
  success?: boolean;
}
