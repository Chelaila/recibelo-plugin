// Utility functions for managing Shopify Carrier Services
import { CarrierService, CarrierServiceData } from '../interfaces';

export async function createCarrierService(shop: string, accessToken: string, data: CarrierServiceData) {
  const mutation = `
    mutation carrierServiceCreate($input: DeliveryCarrierServiceCreateInput!) {
      carrierServiceCreate(input: $input) {
        carrierService {
          id
          name
          callbackUrl
          active
          supportsServiceDiscovery
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      name: data.name,
      callbackUrl: data.callbackUrl,
      active: true,
      supportsServiceDiscovery: data.serviceDiscovery
    }
  };

  try {
    const response = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: mutation,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    if (result.data?.carrierServiceCreate?.userErrors?.length > 0) {
      const userErrors = result.data.carrierServiceCreate.userErrors;
      
      // Manejar error específico de Carrier Service ya configurado
      const alreadyConfiguredError = userErrors.find((error: { message: string | undefined; }) => 
        error.message?.includes('is already configured')
      );
      
      if (alreadyConfiguredError) {
        throw new Error('Recibelo - Servicio de Envío is already configured');
      }
      
      throw new Error(`User errors: ${JSON.stringify(userErrors)}`);
    }

    return result.data?.carrierServiceCreate?.carrierService;
  } catch (error) {
    console.error('Error creating carrier service:', error);
    throw error;
  }
}

export async function getCarrierServices(shop: string, accessToken: string) {
  console.log('getCarrierServices', shop, accessToken);
  const query = `
    query {
      carrierServices(first: 10) {
        edges {
          node {
            id
            name
            callbackUrl
            active
            supportsServiceDiscovery
            formattedName
          }
        }
      }
    }
  `;

  try {
    const url = `https://${shop}/admin/api/2024-10/graphql.json`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error getting carrier services: HTTP error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();

    const carrierServices = result.data?.carrierServices?.edges?.map((edge: { node: CarrierService }) => edge.node) || [];
    return carrierServices;
  } catch (error) {
    console.error('❌ getCarrierServices: Error fetching carrier services:', error);
    console.error('❌ getCarrierServices: Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    throw error;
  }
}

export async function updateCarrierService(shop: string, accessToken: string, id: string, data: Partial<CarrierServiceData>) {
  const mutation = `
    mutation carrierServiceUpdate($input: DeliveryCarrierServiceUpdateInput!) {
      carrierServiceUpdate(input: $input) {
        carrierService {
          id
          name
          callbackUrl
          active
          supportsServiceDiscovery
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      id,
      ...(data.name && { name: data.name }),
      ...(data.callbackUrl && { callbackUrl: data.callbackUrl }),
      active: true,
      ...(data.serviceDiscovery !== undefined && { supportsServiceDiscovery: data.serviceDiscovery })
    }
  };

  try {
    const response = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query: mutation,
        variables
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    if (result.data?.carrierServiceUpdate?.userErrors?.length > 0) {
      throw new Error(`User errors: ${JSON.stringify(result.data.carrierServiceUpdate.userErrors)}`);
    }

    return result.data?.carrierServiceUpdate?.carrierService;
  } catch (error) {
    console.error('Error updating carrier service:', error);
    throw error;
  }
}
