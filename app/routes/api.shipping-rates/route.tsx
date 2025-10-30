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
    if (destination.country !== 'CL') {
      return new Response(JSON.stringify({ rates: [] }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    if(destination.province !== 'RM') {
      return new Response(JSON.stringify({ rates: [] }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }

    const comunaTarifa = await getComunaTarifaByCity(destination.city || '');

    if (!comunaTarifa || !comunaTarifa.isActive) {
      return new Response(JSON.stringify({ rates: [] }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    // Obtener tarifa para la comuna específica
    const tarifaComuna = comunaTarifa.tax?.value || 0;
    

    // Crear respuesta
    const rates = [
      {
        service_name: "Recibelo",
        service_code: "recibelo",
        total_price: (tarifaComuna * 100).toString(),
        description: comunaTarifa.tax?.name || '',
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
