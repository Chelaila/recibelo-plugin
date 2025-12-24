import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import prisma from "../../db.server";
import { saveAuditLog } from "../../utils/auditLog";

/**
 * Endpoint para probar el webhook manualmente
 * Útil para verificar que el guardado de logs funciona
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    return new Response(JSON.stringify({
      message: 'Use POST to test webhook',
      shop,
      endpoint: '/api/test-webhook'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    console.log('🧪 TEST WEBHOOK: Creating test audit log...');
    
    const testOrderId = 'TEST-' + Date.now();
    const testOrderName = 'TEST ORDER #' + Math.floor(Math.random() * 10000);

    // Intentar guardar un log de prueba
    await saveAuditLog({
      shopifyOrderId: testOrderId,
      orderName: testOrderName,
      shop,
      eventType: 'order_paid',
      status: 'pending',
      requestData: {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'This is a test log created manually'
      }
    });

    // Verificar que se guardó
    const savedLog = await prisma.auditLog.findFirst({
      where: {
        shopifyOrderId: testOrderId,
        shop
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (savedLog) {
      console.log('✅ TEST WEBHOOK: Log saved successfully!');
      return new Response(JSON.stringify({
        success: true,
        message: 'Test log created successfully',
        log: {
          id: savedLog.id,
          shopifyOrderId: savedLog.shopifyOrderId,
          orderName: savedLog.orderName,
          eventType: savedLog.eventType,
          status: savedLog.status,
          createdAt: savedLog.createdAt.toISOString()
        },
        shop
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.error('❌ TEST WEBHOOK: Log was not saved!');
      return new Response(JSON.stringify({
        success: false,
        error: 'Log was not saved to database'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('❌ TEST WEBHOOK ERROR:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};




