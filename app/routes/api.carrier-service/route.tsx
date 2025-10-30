import { authenticate } from "../../shopify.server";
import { getCarrierServices, createCarrierService, updateCarrierService } from "../../utils/carrierService";
import type { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
    try {
      const { session } = await authenticate.admin(request);
      const shop = session.shop;
      const accessToken = session.accessToken;
  
      if (!shop || !accessToken) {
        return new Response(JSON.stringify({ error: 'Shop or access token not available' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
  
      try {
        const formData = await request.formData();
        const action = formData.get('action') as string;
  
        switch (action) {
          case 'create': {
            const name = formData.get('name') as string;
            const callbackUrl = formData.get('callbackUrl') as string;
            const serviceDiscovery = formData.get('serviceDiscovery') === 'true';
  
            const carrierServiceData = {
              name,
              callbackUrl,
              serviceDiscovery
            };
  
            const result = await createCarrierService(shop, accessToken, carrierServiceData);
            return new Response(JSON.stringify({ success: true, data: result }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
  
          case 'list': {
            const carrierServices = await getCarrierServices(shop, accessToken);
            return new Response(JSON.stringify({ success: true, data: carrierServices }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
  
          case 'update': {
            const id = formData.get('id') as string;
            const name = formData.get('name') as string;
            const callbackUrl = formData.get('callbackUrl') as string;
            const serviceDiscovery = formData.get('serviceDiscovery') === 'true';
  
            const updateData: { name?: string; callbackUrl?: string; serviceDiscovery?: boolean } = {};
            if (name) updateData.name = name;
            if (callbackUrl) updateData.callbackUrl = callbackUrl;
            if (serviceDiscovery !== undefined) updateData.serviceDiscovery = serviceDiscovery;
  
            const result = await updateCarrierService(shop, accessToken, id, updateData);
            return new Response(JSON.stringify({ success: true, data: result }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
          }
  
          default:
            return new Response(JSON.stringify({ error: 'Invalid action' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            });
        }
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (authError) {
      return new Response(JSON.stringify({ 
        error: 'Authentication failed' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  