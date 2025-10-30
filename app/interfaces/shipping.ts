export interface ShippingZone {
  id: string;
  name: string;
  countries: ShippingCountry[];
  provinces: ShippingProvince[];
  carrierShippingRateProviders: CarrierShippingRateProvider[];
  priceBasedShippingRates: PriceBasedShippingRate[];
  weightBasedShippingRates: WeightBasedShippingRate[];
}

export interface ShippingCountry {
  id?: string;
  name: string;
  code: string;
  provinces?: ShippingProvince[];
}

export interface ShippingProvince {
  id?: string;
  name: string;
  code: string;
  countryId?: string;
}

export interface CarrierShippingRateProvider {
  id?: string;
  carrierServiceId: string;
  active: boolean;
}

export interface PriceBasedShippingRate {
  id?: string;
  name: string;
  price: string;
  minOrderSubtotal?: string | null;
  maxOrderSubtotal?: string | null;
}

export interface WeightBasedShippingRate {
  id?: string;
  name: string;
  price: string;
  weightLow?: string;
  weightHigh?: string;
}

export interface ComunaData {
  id: number;
  name: string;
  region: string;
  province: string;
  postalCode: string;
  shippingRate: number;
  isActive: boolean;
}

export interface ShippingZoneData {
  name: string;
  countries: string[];
  provinces: string[];
  carrierServiceIds: string[];
}
