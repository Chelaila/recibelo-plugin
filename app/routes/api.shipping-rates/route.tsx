import type { ActionFunctionArgs } from "react-router";
import { getComunaTarifaByCity } from '../../utils/communeService';

export async function loader() {
  return new Response(JSON.stringify({ 
    message: "Shipping rates endpoint - use POST method",
    endpoint: "/api/shipping-rates",
    method: "POST"
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const body = await request.json();
    
    // Validar estructura del request
    if (!body.rate || !body.rate.destination) {
      return new Response(JSON.stringify({ rates: [] }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const { destination } = body.rate;
    
    // Solo procesar envíos a Chile
    const country = destination.country || destination.countryCode || destination.country_code;
    if (country !== 'CL') {
      return new Response(JSON.stringify({ rates: [] }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    // Solo procesar Región Metropolitana
    const province = destination.province || destination.zoneCode || destination.zone_code;
    if (province !== 'RM') {
      return new Response(JSON.stringify({ rates: [] }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const cityName = destination.city || '';
    const comunaTarifa = await getComunaTarifaByCity(cityName);

    if (!comunaTarifa || !comunaTarifa.isActive || !comunaTarifa.tax?.isActive) {
      return new Response(JSON.stringify({ rates: [] }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Obtener tarifa para la comuna específica
    const tarifaComuna = comunaTarifa.tax?.value || 0;
    const totalPrice = (tarifaComuna * 100).toString();

    // Crear respuesta con descripción de la tarifa
    // Priorizar la descripción de la tarifa, si no existe usar el nombre de la tarifa
    const description = comunaTarifa.tax?.description || comunaTarifa.tax?.name || 'Envío Recibelo';
    
    const rates = [
      {
        service_name: "Recibelo",
        service_code: "recibelo",
        total_price: totalPrice,
        description: description,
        currency: "CLP",
        phone_required: true
      }
    ];
    
    return new Response(JSON.stringify({ rates }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ rates: [] }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
}
