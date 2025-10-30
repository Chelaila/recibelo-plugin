// Interfaces relacionadas con centros logísticos y configuración

export interface LogisticCenter {
  id: number;
  name: string;
  address: string;
  address_geocoded: string | null;
  detail: string | null;
  responsable: string;
  email: string;
  phone: string;
  active: boolean;
  commune_id: number;
  client_id: number;
  created_at: string;
  updated_at: string;
  volume_id: number | null;
  css_mails: string | null;
}

export interface ApiResponse {
  logistic_centers: LogisticCenter[];
}
