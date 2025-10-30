// Interfaces relacionadas con servicios de transporte (Carrier Services)

export interface CarrierService {
  id: string;
  name: string;
  callbackUrl: string;
  active: boolean;
  supportsServiceDiscovery: boolean;
  formattedName?: string;
}

export interface CarrierServiceData {
  name: string;
  callbackUrl: string;
  serviceDiscovery: boolean;
}
