import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import prisma from "../../db.server";

/**
 * Endpoint de prueba para verificar que los webhooks están funcionando
 * GET /api/webhook-test - Información sobre el estado del webhook
 * POST /api/webhook-test - Simula un webhook de prueba
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    // Verificar si hay centro logístico configurado
    const logisticCenter = await prisma.logisticCenter.findFirst({
      where: { shop }
    });

    // Contar logs de auditoría
    const logCount = await prisma.auditLog.count({
      where: { shop }
    });

    // Obtener los últimos 5 logs
    const recentLogs = await prisma.auditLog.findMany({
      where: { shop },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return new Response(JSON.stringify({
      success: true,
      shop,
      hasLogisticCenter: !!logisticCenter,
      logisticCenter: logisticCenter ? {
        hasBaseUrl: !!logisticCenter.baseUrl,
        hasAccessToken: !!logisticCenter.accessToken,
        name: logisticCenter.name
      } : null,
      auditLogs: {
        total: logCount,
        recent: recentLogs.map(log => ({
          id: log.id,
          shopifyOrderId: log.shopifyOrderId,
          orderName: log.orderName,
          eventType: log.eventType,
          status: log.status,
          createdAt: log.createdAt.toISOString(),
          errorMessage: log.errorMessage
        }))
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
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

    // Simular un log de prueba
    const { saveAuditLog } = await import("../../utils/auditLog");
    
    await saveAuditLog({
      shopifyOrderId: 'TEST-' + Date.now(),
      orderName: 'TEST ORDER',
      shop,
      eventType: 'order_paid',
      status: 'pending',
      requestData: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Test log created successfully',
      shop
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

