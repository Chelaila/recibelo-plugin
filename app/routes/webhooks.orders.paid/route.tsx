import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import prisma from "../../db.server";
import { saveAuditLog, updateAuditLog } from "../../utils/auditLog";

interface ShopifyOrder {
  id: string;
  name?: string;
  order_number?: number;
  financial_status: string;
  line_items?: Array<{
    id: string;
    name: string;
    quantity: number;
    sku?: string;
    variant_id?: string;
    price?: string;
  }>;
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    phone?: string;
  };
  billing_address?: {
    first_name?: string;
    last_name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    phone?: string;
  };
  customer?: {
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  total_price?: string;
  subtotal_price?: string;
  total_shipping_price?: string;
  total_shipping_price_set?: {
    shop_money?: {
      amount?: string;
    };
  };
  currency?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Webhook handler para cuando una orden se paga en Shopify
 * 
 * Este webhook se activa cuando:
 * - Una orden pasa a financial_status: "paid"
 * 
 * Lo que hace:
 * 1. Recibe el pedido pagado de Shopify
 * 2. Obtiene el centro logístico configurado para la tienda
 * 3. Envía los datos al backend de Recibelo para crear el paquete
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  console.log('🔔 Webhook orders/paid called');
  console.log('🔔 Request method:', request.method);
  console.log('🔔 Request URL:', request.url);
  console.log('🔔 Request headers:', Object.fromEntries(request.headers.entries()));
  
  let payload: unknown;
  let session: unknown;
  let topic: string = '';
  let shop: string = '';
  
  try {
    console.log('🔐 Attempting webhook authentication...');
    
    try {
      const authResult = await authenticate.webhook(request);
      payload = authResult.payload;
      session = authResult.session;
      topic = authResult.topic;
      shop = authResult.shop;
      
      console.log(`✅ Webhook authenticated successfully`);
      console.log(`💰 Received ${topic} webhook for ${shop}`);
      console.log(`📦 Order ID: ${payload ? JSON.stringify((payload as ShopifyOrder).id) : 'unknown'}`);
      console.log(`📦 Order financial_status: ${payload ? JSON.stringify((payload as ShopifyOrder).financial_status) : 'unknown'}`);
      
      // Log completo del payload en bruto para debugging
      if (payload) {
        const rawOrder = payload as ShopifyOrder;
        console.log('📦 Raw payload structure:', {
          all_keys: Object.keys(rawOrder),
          payload_size: JSON.stringify(payload).length,
          has_line_items: !!rawOrder.line_items,
          line_items_length: rawOrder.line_items?.length,
          has_shipping: !!rawOrder.shipping_address,
          has_billing: !!rawOrder.billing_address,
          has_customer: !!rawOrder.customer,
        });
      }
    } catch (authError) {
      console.error('❌ Webhook authentication failed:', authError);
      console.error('❌ Auth error details:', {
        message: authError instanceof Error ? authError.message : 'Unknown error',
        stack: authError instanceof Error ? authError.stack : undefined,
        name: authError instanceof Error ? authError.name : undefined,
      });
      
      // Intentar guardar log de error de autenticación
      try {
        await saveAuditLog({
          shopifyOrderId: 'unknown',
          orderName: 'unknown',
          shop: 'unknown',
          eventType: 'error',
          status: 'error',
          errorMessage: `Webhook authentication failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`,
          requestData: {
            error_type: 'authentication_error',
            url: request.url,
            method: request.method,
          }
        });
      } catch (logError) {
        console.error('❌ Error saving auth error log:', logError);
      }
      
      // Retornar 401 para que Shopify sepa que hubo un error de autenticación
      return new Response(JSON.stringify({ 
        error: 'Webhook authentication failed',
        message: authError instanceof Error ? authError.message : 'Unknown error'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!session) {
      console.error('❌ No session found for webhook');
      
      // Intentar guardar log de error
      try {
        await saveAuditLog({
          shopifyOrderId: 'unknown',
          orderName: 'unknown',
          shop: shop || 'unknown',
          eventType: 'error',
          status: 'error',
          errorMessage: 'No session found for webhook',
          requestData: {
            topic,
            shop,
            hasPayload: !!payload,
          }
        });
      } catch (logError) {
        console.error('❌ Error saving session error log:', logError);
      }
      
      return new Response(JSON.stringify({ 
        error: 'No session found',
        shop: shop || 'unknown'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // El payload contiene el objeto order completo de Shopify
    const order = payload as ShopifyOrder;
    
    // Log completo del payload para debugging
    console.log('📦 Full order payload received:', {
      hasId: !!order?.id,
      hasName: !!order?.name,
      hasLineItems: !!order?.line_items,
      lineItemsCount: order?.line_items?.length || 0,
      hasShippingAddress: !!order?.shipping_address,
      hasBillingAddress: !!order?.billing_address,
      hasCustomer: !!order?.customer,
      hasTotalPrice: !!order?.total_price,
      financial_status: order?.financial_status,
      order_keys: order ? Object.keys(order) : [],
    });
    
    // Validar que tenemos un order válido
    if (!order || !order.id) {
      console.error('❌ Invalid order payload received:', { hasOrder: !!order, hasId: !!order?.id });
      console.error('❌ Full payload structure:', JSON.stringify(payload, null, 2));
      await saveAuditLog({
        shopifyOrderId: 'unknown',
        orderName: 'unknown',
        shop,
        eventType: 'error',
        status: 'error',
        errorMessage: 'Invalid order payload: missing order or order.id',
        requestData: { hasPayload: !!payload, hasOrder: !!order, payloadKeys: payload ? Object.keys(payload as object) : [] }
      });
      return new Response(JSON.stringify({ error: 'Invalid order payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validar que el pedido esté pagado
    if (order.financial_status !== 'paid') {
      const orderIdString = order.id?.toString() || 'unknown';
      console.log(`⚠️ Order ${orderIdString} not paid yet, financial_status: ${order.financial_status}`);
      return new Response('Order not paid', { status: 200 });
    }

    // Obtener centro logístico configurado para esta tienda
    const logisticCenter = await prisma.logisticCenter.findFirst({
      where: { shop }
    });

    // Extraer el nombre del pedido (ej: #9663) que será el ID interno en Recibelo
    const orderIdString = order.id?.toString() || '';
    const shopifyOrderId = orderIdString.replace('gid://shopify/Order/', '') || 'unknown';
    const orderName = order.name || order.order_number?.toString() || shopifyOrderId;

    if (!logisticCenter) {
      console.error(`❌ No logistic center configured for shop: ${shop}`);
      // Guardar log de error
      await saveAuditLog({
        shopifyOrderId,
        orderName,
        shop,
        eventType: 'error',
        status: 'error',
        errorMessage: 'No logistic center configured for this shop',
        requestData: {
          order_id: order.id,
          order_name: orderName,
          financial_status: order.financial_status,
        }
      });
      return new Response('No logistic center configured', { status: 200 });
    }

    if (!logisticCenter.baseUrl || !logisticCenter.accessToken) {
      console.error(`❌ Logistic center missing baseUrl or accessToken for shop: ${shop}`);
      // Guardar log de error
      await saveAuditLog({
        shopifyOrderId,
        orderName,
        shop,
        eventType: 'error',
        status: 'error',
        errorMessage: 'Logistic center missing baseUrl or accessToken',
        requestData: {
          order_id: order.id,
          order_name: orderName,
          financial_status: order.financial_status,
        }
      });
      return new Response('Logistic center not fully configured', { status: 200 });
    }

    // Guardar log inicial con el payload completo
    console.log(`📝 Saving audit log for order ${orderName} (${shopifyOrderId})`);
    try {
      await saveAuditLog({
        shopifyOrderId,
        orderName,
        shop,
        eventType: 'order_paid',
        status: 'pending',
        requestData: {
          // Guardar el payload completo de Shopify
          full_order: order,
          // También guardar campos clave para fácil acceso
          order_id: order.id,
          order_name: orderName,
          financial_status: order.financial_status,
          total_price: order.total_price,
          currency: order.currency,
          line_items_count: order.line_items?.length || 0,
          has_shipping_address: !!order.shipping_address,
          has_billing_address: !!order.billing_address,
          has_customer: !!order.customer,
        }
      });
      console.log(`✅ Audit log saved successfully for order ${orderName}`);
    } catch (logError) {
      console.error(`❌ Error saving audit log:`, logError);
      // No lanzamos el error para que no interrumpa el flujo principal
    }
    
    // Construir la URL del webhook de Recibelo
    // Formato: {{BASE_URL}}/webhook/{{API_TOKEN}}/shopify
    const recibeloWebhookUrl = `${logisticCenter.baseUrl}/webhook/${logisticCenter.accessToken}/shopify`;

    // Log detallado de los campos antes de construir paqueteData
    console.log('📋 Order data availability:', {
      line_items: {
        exists: !!order.line_items,
        count: order.line_items?.length || 0,
        first_item: order.line_items?.[0] ? {
          hasId: !!order.line_items[0].id,
          hasName: !!order.line_items[0].name,
          hasQuantity: !!order.line_items[0].quantity,
          hasSku: !!order.line_items[0].sku,
          hasPrice: !!order.line_items[0].price,
        } : null
      },
      shipping_address: {
        exists: !!order.shipping_address,
        hasFirstName: !!order.shipping_address?.first_name,
        hasAddress1: !!order.shipping_address?.address1,
        hasCity: !!order.shipping_address?.city,
        hasCountry: !!order.shipping_address?.country,
      },
      customer: {
        exists: !!order.customer,
        hasId: !!order.customer?.id,
        hasEmail: !!order.customer?.email,
      },
      totals: {
        total_price: order.total_price,
        subtotal_price: order.subtotal_price,
        currency: order.currency,
      }
    });

    // Preparar los datos del paquete para Recibelo
    const paqueteData = {
      shopify_order_id: shopifyOrderId, // Solo el número
      order_name: orderName, // El nombre del pedido (#9663) será el ID interno
      order_number: order.order_number || order.name,
      financial_status: order.financial_status,
      line_items: order.line_items?.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        sku: item.sku,
        variant_id: item.variant_id,
        price: item.price
      })) || [],
      shipping_address: order.shipping_address ? {
        first_name: order.shipping_address.first_name,
        last_name: order.shipping_address.last_name,
        address1: order.shipping_address.address1,
        address2: order.shipping_address.address2,
        city: order.shipping_address.city,
        province: order.shipping_address.province,
        country: order.shipping_address.country,
        zip: order.shipping_address.zip,
        phone: order.shipping_address.phone
      } : null,
      billing_address: order.billing_address ? {
        first_name: order.billing_address.first_name,
        last_name: order.billing_address.last_name,
        address1: order.billing_address.address1,
        address2: order.billing_address.address2,
        city: order.billing_address.city,
        province: order.billing_address.province,
        country: order.billing_address.country,
        zip: order.billing_address.zip,
        phone: order.billing_address.phone
      } : null,
      customer: order.customer ? {
        id: order.customer.id,
        email: order.customer.email,
        first_name: order.customer.first_name,
        last_name: order.customer.last_name,
        phone: order.customer.phone
      } : null,
      total_price: order.total_price,
      subtotal_price: order.subtotal_price,
      total_shipping_price: order.total_shipping_price_set?.shop_money?.amount || order.total_shipping_price,
      currency: order.currency,
      created_at: order.created_at,
      updated_at: order.updated_at,
      shop: shop,
      // Información adicional para Recibelo
      ecommerce_id: 1, // Shopify = 1
      client_id: logisticCenter.externalId, // ID del cliente en Recibelo
    };

    console.log(`📦 Enviando paquete a Recibelo para orden ${orderName}:`, {
      url: recibeloWebhookUrl,
      shopify_order_id: paqueteData.shopify_order_id,
      order_name: orderName
    });

    // Enviar webhook a Recibelo
    let response: Response | undefined;
    let recibeloResponse: unknown;
    let errorText: string | null = null;

    try {
      response = await fetch(recibeloWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paqueteData)
      });

      if (!response.ok) {
        errorText = await response.text();
        console.error(`❌ Error enviando webhook a Recibelo: ${response.status} - ${errorText}`);
        
        // Actualizar log con error
        await updateAuditLog(shopifyOrderId, 'order_paid', {
          status: 'error',
          errorMessage: `Error from Recibelo: ${response.status} - ${errorText}`,
          httpStatus: response.status,
          responseData: { error: errorText }
        });
        
        throw new Error(`Error from Recibelo: ${response.status} - ${errorText}`);
      }

      recibeloResponse = await response.json();
      console.log(`✅ Paquete creado en Recibelo:`, recibeloResponse);

      // Actualizar log con éxito
      await updateAuditLog(shopifyOrderId, 'order_paid', {
        status: 'success',
        httpStatus: response.status,
        responseData: recibeloResponse
      });

      return new Response(JSON.stringify({ 
        success: true,
        message: `Paquete enviado a Recibelo para orden ${orderName}`,
        recibelo_response: recibeloResponse
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (fetchError) {
      // Actualizar log con error de red
      await updateAuditLog(shopifyOrderId, 'order_paid', {
        status: 'error',
        errorMessage: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        httpStatus: response?.status,
        responseData: errorText ? { error: errorText } : null
      });
      
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Error processing orders/paid webhook:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      shop: shop || 'unknown',
      topic: topic || 'unknown',
      hasPayload: !!payload,
    });
    
    // Intentar guardar log de error si tenemos los datos
    try {
      const order = (payload as ShopifyOrder) || null;
      const orderIdString = order?.id?.toString() || '';
      const shopifyOrderId = orderIdString.replace('gid://shopify/Order/', '') || 'unknown';
      const orderName = order?.name || order?.order_number?.toString() || shopifyOrderId;
      
      console.log(`📝 Attempting to save error log for order ${orderName} (${shopifyOrderId})`);
      await saveAuditLog({
        shopifyOrderId,
        orderName,
        shop: shop || 'unknown',
        eventType: 'error',
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        requestData: payload ? { 
          order_id: order?.id,
          order_name: orderName,
          error_type: error instanceof Error ? error.name : 'Unknown',
        } : { error_type: 'Authentication or parsing error' }
      });
      console.log(`✅ Error log saved for order ${orderName}`);
    } catch (logError) {
      console.error('❌ Error saving error log:', logError);
      console.error('❌ Log error details:', {
        message: logError instanceof Error ? logError.message : 'Unknown error',
        stack: logError instanceof Error ? logError.stack : undefined,
        code: (logError as { code?: string })?.code,
        meta: (logError as { meta?: unknown })?.meta,
      });
    }
    
    // Retornar 200 para que Shopify no marque el webhook como fallido
    // Pero loguear el error para diagnóstico
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 200, // Cambiado a 200 para que Shopify no desactive el webhook
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

