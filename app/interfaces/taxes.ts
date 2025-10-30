export interface Commune {
  id: number;
  name: string;
  isActive: boolean;
  region_id: number;
  tax_id?: number;
  region?: Region;
  tax?: Tax;
}

export interface Region {
  id: number;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tax {
  id: number;
  name: string;
  description: string;
  value: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}