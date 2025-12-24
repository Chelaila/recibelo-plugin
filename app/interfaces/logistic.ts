// Interfaces relacionadas con centros logísticos y configuración

export interface LogisticCenter {
  id: number;
  externalId: number;
  name: string;
  address: string;
  detail: string | null;
  responsable: string;
  email: string;
  phone: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  commune_id: number;
  accessToken?: string | null;
  baseUrl?: string | null;
}

export interface BackendUrlOption {
  value: string;
  label: string;
}

export interface ApiResponse {
  logistic_centers: LogisticCenter[];
}
