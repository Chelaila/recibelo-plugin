import type { ActionFunctionArgs } from "react-router";
import prisma from "../../db.server";
import { saveAuditLog, updateAuditLog } from "../../utils/auditLog";

/**
 * Endpoint webhook para recibir notificaciones desde Recibelo (tu backend)
 * 
 * Este endpoint recibe notificaciones cuando:
 * 1. Se crea un paquete → Actualizar FulfillmentOrder a IN_PROGRESS
 * 2. Se completa un envío → Crear Fulfillment en Shopify con tracking
 * 
 * URL: POST /api/recibelo-webhook
 * 
 * Nota: Recibelo solo envía POST a la URL configurada, sin autenticación adicional.
 * La seguridad se basa en que la URL sea secreta y única.
 */
export async function action({ request }: ActionFunctionArgs) {
  try {
    // Validar método
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parsear body - formato real de Recibelo
    const body = await request.json();
    
    console.log(`📦 Webhook recibido de Recibelo:`, JSON.stringify(body, null, 2));

    // Detectar tipo de evento basado en el formato de Recibelo
    let event: string;
    let shopifyOrderId: string | null = null;
    let paqueteId: number;
    let trackingNumber: string | null = null;
    let trackingUrl: string | null = null;

    // Si viene con el formato nuevo (con package_status)
    if (body.package_status) {
      paqueteId = body.id;
      
      // Detectar evento por el estado del paquete (package_status_id)
      const packageStatusId = body.package_status_id || body.package_status?.id;
      const statusCode = body.package_status?.code;
      const statusName = body.package_status?.name;
      
      // package_status_id: 2 = Creado, 8 = Completado
      if (packageStatusId === 2 || statusCode === 'created' || statusName === 'Creado') {
        event = 'paquete_creado';
      } else if (packageStatusId === 8 || statusCode === 'completed' || statusCode === 'delivered' || statusName === 'Completado' || statusName === 'Entregado') {
        event = 'envio_completado';
        // Para envío completado, buscar tracking en el body
        trackingNumber = body.internal_id || body.id?.toString() || null;
        trackingUrl = body.tracking_url || `https://recibelo.cl/track/${trackingNumber}`;
      } else {
        // Otros estados no se procesan
        return new Response(JSON.stringify({ 
          success: true, 
          message: `Evento no procesado: ${statusName} (${statusCode})` 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Obtener shopify_order_id desde imported_id o buscar otra forma
      shopifyOrderId = body.imported_id || body.shopify_order_id || null;
      
    } else {
      // Formato antiguo (compatibilidad hacia atrás)
      event = body.event;
      shopifyOrderId = body.shopify_order_id;
      paqueteId = body.paquete_id || body.id;
      trackingNumber = body.tracking_number;
      trackingUrl = body.tracking_url;
    }

    // Validar que tenemos el ID del paquete
    if (!paqueteId) {
      return new Response(JSON.stringify({ error: 'Missing required field: paquete_id (id)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener shop desde el client_id usando LogisticCenter
    let shopParam: string | null = null;
    
    // Buscar shop desde sesiones activas
    // Si hay múltiples tiendas, necesitaríamos mapear client_id a shop
    // Por ahora, usamos la primera sesión activa si hay solo una

    // Si aún no tenemos shop, intentar obtenerlo de todas las sesiones
    if (!shopParam) {
      const allSessions = await prisma.session.findMany({
        where: { expires: { gt: new Date() } }
      });
      
      if (allSessions.length === 1) {
        shopParam = allSessions[0].shop;
        console.log(`✅ Shop encontrado (fallback): ${shopParam}`);
      } else {
        return new Response(JSON.stringify({ 
          error: 'No se pudo determinar la tienda. Asegúrate de que haya una sesión activa o incluye "shop" en el body.' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Validar shopify_order_id para eventos que lo requieren
    if (!shopifyOrderId && event === 'paquete_creado') {
      // Si no tenemos shopify_order_id, no podemos actualizar el fulfillment
      // Pero no fallamos, solo registramos el warning
      console.warn(`⚠️ Paquete ${paqueteId} creado pero no se encontró shopify_order_id`);
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Paquete ${paqueteId} recibido pero shopify_order_id no disponible. Asegúrate de que imported_id contenga el ID de Shopify.` 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Obtener sesión de la tienda
    const session = await prisma.session.findFirst({
      where: { shop: shopParam }
    });

    if (!session || !session.accessToken) {
      console.error(`❌ No session found for shop: ${shopParam}`);
      return new Response(JSON.stringify({ error: 'Shop not found or not authenticated' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Guardar log inicial del evento
    await saveAuditLog({
      shopifyOrderId: shopifyOrderId || 'unknown',
      orderName: body.internal_id || body.id?.toString() || null,
      shop: shopParam,
      eventType: event === 'paquete_creado' ? 'package_created' : event === 'envio_completado' ? 'shipment_completed' : 'error',
      status: 'pending',
      requestData: body
    });

    // Procesar según el evento
    switch (event) {
      case 'paquete_creado':
      case 'package_created':
        // Actualizar FulfillmentOrder a IN_PROGRESS
        if (!shopifyOrderId) {
          await updateAuditLog(shopifyOrderId || 'unknown', 'package_created', {
            status: 'error',
            errorMessage: 'shopify_order_id requerido para paquete_creado'
          });
          return new Response(JSON.stringify({ 
            success: false,
            error: 'shopify_order_id requerido para paquete_creado. Asegúrate de que imported_id contenga el ID de Shopify.' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        try {
          await updateFulfillmentOrderToInProgress(
            shopParam,
            session.accessToken,
            shopifyOrderId
          );
          await updateAuditLog(shopifyOrderId, 'package_created', {
            status: 'success',
            httpStatus: 200
          });
        } catch (updateError) {
          await updateAuditLog(shopifyOrderId, 'package_created', {
            status: 'error',
            errorMessage: updateError instanceof Error ? updateError.message : 'Unknown error'
          });
          throw updateError;
        }
        break;

      case 'envio_completado':
      case 'shipment_completed': {
        // Crear Fulfillment en Shopify con tracking
        if (!shopifyOrderId) {
          return new Response(JSON.stringify({ 
            success: false,
            error: 'shopify_order_id requerido para envío_completado. Asegúrate de que imported_id contenga el ID de Shopify.' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        if (!trackingNumber) {
          // Usar internal_id o id como tracking number si no viene
          trackingNumber = body.internal_id || body.id?.toString() || paqueteId.toString();
          trackingUrl = trackingUrl || `https://recibelo.cl/track/${trackingNumber}`;
        }
        
        // Asegurar que trackingNumber no sea null
        const finalTrackingNumber = trackingNumber || paqueteId.toString();
        const finalTrackingUrl = trackingUrl || `https://recibelo.cl/track/${finalTrackingNumber}`;
        
        try {
          await createFulfillmentWithTracking(
            shopParam,
            session.accessToken,
            shopifyOrderId,
            finalTrackingNumber,
            finalTrackingUrl
          );
          await updateAuditLog(shopifyOrderId, 'shipment_completed', {
            status: 'success',
            httpStatus: 200,
            responseData: { tracking_number: finalTrackingNumber, tracking_url: finalTrackingUrl }
          });
        } catch (fulfillmentError) {
          await updateAuditLog(shopifyOrderId, 'shipment_completed', {
            status: 'error',
            errorMessage: fulfillmentError instanceof Error ? fulfillmentError.message : 'Unknown error'
          });
          throw fulfillmentError;
        }
        break;
      }

      default:
        console.warn(`⚠️ Unknown event type: ${event}`);
        return new Response(JSON.stringify({ 
          success: false,
          error: `Unknown event type: ${event}` 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Event ${event} processed successfully` 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error processing Recibelo webhook:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Actualiza el FulfillmentOrder a IN_PROGRESS cuando el paquete se crea en Recibelo
 */
async function updateFulfillmentOrderToInProgress(
  shop: string,
  accessToken: string,
  shopifyOrderId: string
) {
  try {
    // 1. Obtener los FulfillmentOrders del pedido
    const query = `
      query getFulfillmentOrders($orderId: ID!) {
        order(id: $orderId) {
          id
          fulfillmentOrders(first: 10) {
            edges {
              node {
                id
                status
                requestStatus
              }
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query,
        variables: { orderId: `gid://shopify/Order/${shopifyOrderId}` }
      })
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const fulfillmentOrders = result.data?.order?.fulfillmentOrders?.edges || [];

    // 2. Para cada FulfillmentOrder con status OPEN, actualizar a IN_PROGRESS
    for (const edge of fulfillmentOrders) {
      const fulfillmentOrder = edge.node;
      
      if (fulfillmentOrder.status === 'OPEN' && fulfillmentOrder.requestStatus === 'UNSUBMITTED') {
        const mutation = `
          mutation fulfillmentOrderUpdate($id: ID!, $status: FulfillmentOrderStatus!) {
            fulfillmentOrderUpdate(id: $id, status: $status) {
              fulfillmentOrder {
                id
                status
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const updateResponse = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify({
            query: mutation,
            variables: {
              id: fulfillmentOrder.id,
              status: 'IN_PROGRESS'
            }
          })
        });

        const updateResult = await updateResponse.json();

        if (updateResult.errors) {
          console.error('Error updating fulfillment order:', updateResult.errors);
        } else if (updateResult.data?.fulfillmentOrderUpdate?.userErrors?.length > 0) {
          console.error('User errors:', updateResult.data.fulfillmentOrderUpdate.userErrors);
        } else {
          console.log(`✅ FulfillmentOrder ${fulfillmentOrder.id} actualizado a IN_PROGRESS`);
        }
      }
    }

  } catch (error) {
    console.error('Error updating fulfillment order to IN_PROGRESS:', error);
    throw error;
  }
}

/**
 * Crea un Fulfillment en Shopify con información de tracking cuando el envío se completa
 */
async function createFulfillmentWithTracking(
  shop: string,
  accessToken: string,
  shopifyOrderId: string,
  trackingNumber: string,
  trackingUrl: string
) {
  try {
    // 1. Obtener los FulfillmentOrders del pedido
    const query = `
      query getFulfillmentOrders($orderId: ID!) {
        order(id: $orderId) {
          id
          fulfillmentOrders(first: 10) {
            edges {
              node {
                id
                status
                requestStatus
                assignedLocation {
                  location {
                    id
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify({
        query,
        variables: { orderId: `gid://shopify/Order/${shopifyOrderId}` }
      })
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const fulfillmentOrders = result.data?.order?.fulfillmentOrders?.edges || [];

    // 2. Para cada FulfillmentOrder IN_PROGRESS, crear fulfillment
    for (const edge of fulfillmentOrders) {
      const fulfillmentOrder = edge.node;
      
      if (fulfillmentOrder.status === 'IN_PROGRESS' || fulfillmentOrder.status === 'OPEN') {
        const mutation = `
          mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
            fulfillmentCreateV2(fulfillment: $fulfillment) {
              fulfillment {
                id
                status
                trackingInfo {
                  number
                  url
                  company
                }
              }
              userErrors {
                field
                message
              }
            }
          }
        `;

        const createResponse = await fetch(`https://${shop}/admin/api/2024-10/graphql.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify({
            query: mutation,
            variables: {
              fulfillment: {
                fulfillmentOrderId: fulfillmentOrder.id,
                trackingInfo: {
                  number: trackingNumber,
                  url: trackingUrl,
                  company: 'Recibelo'
                },
                notifyCustomer: true
              }
            }
          })
        });

        const createResult = await createResponse.json();

        if (createResult.errors) {
          console.error('Error creating fulfillment:', createResult.errors);
        } else if (createResult.data?.fulfillmentCreateV2?.userErrors?.length > 0) {
          console.error('User errors:', createResult.data.fulfillmentCreateV2.userErrors);
        } else {
          console.log(`✅ Fulfillment creado para ${trackingNumber}`);
          // Esto automáticamente cambia el fulfillment order a FULFILLED
        }
      }
    }

  } catch (error) {
    console.error('Error creating fulfillment with tracking:', error);
    throw error;
  }
}

