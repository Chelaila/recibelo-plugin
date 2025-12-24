import prisma from "../db.server";

export interface AuditLogData {
  shopifyOrderId: string;
  orderName?: string;
  shop: string;
  eventType: 'order_paid' | 'package_created' | 'shipment_completed' | 'error' | 'fulfillment_updated';
  status: 'success' | 'error' | 'pending' | 'retry';
  requestData?: unknown;
  responseData?: unknown;
  errorMessage?: string;
  httpStatus?: number;
  retryCount?: number;
}

/**
 * Guarda un log de auditoría en la base de datos
 */
export async function saveAuditLog(data: AuditLogData): Promise<void> {
  try {
    console.log('📝 saveAuditLog called with:', {
      shopifyOrderId: data.shopifyOrderId,
      orderName: data.orderName,
      shop: data.shop,
      eventType: data.eventType,
      status: data.status,
      hasRequestData: !!data.requestData,
      hasResponseData: !!data.responseData,
      errorMessage: data.errorMessage,
    });
    
    // Validar datos requeridos
    if (!data.shopifyOrderId || !data.shop || !data.eventType || !data.status) {
      const missingFields = [];
      if (!data.shopifyOrderId) missingFields.push('shopifyOrderId');
      if (!data.shop) missingFields.push('shop');
      if (!data.eventType) missingFields.push('eventType');
      if (!data.status) missingFields.push('status');
      
      console.error('❌ saveAuditLog: Missing required fields:', missingFields);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    const created = await prisma.auditLog.create({
      data: {
        shopifyOrderId: data.shopifyOrderId,
        orderName: data.orderName,
        shop: data.shop,
        eventType: data.eventType,
        status: data.status,
        requestData: data.requestData ? JSON.stringify(data.requestData) : null,
        responseData: data.responseData ? JSON.stringify(data.responseData) : null,
        errorMessage: data.errorMessage,
        httpStatus: data.httpStatus,
        retryCount: data.retryCount || 0,
      }
    });
    
    console.log('✅ Audit log saved successfully:', {
      id: created.id,
      shopifyOrderId: created.shopifyOrderId,
      eventType: created.eventType,
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('❌ Error saving audit log:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      code: (error as { code?: string })?.code,
      meta: (error as { meta?: unknown })?.meta,
      attemptedData: {
        shopifyOrderId: data.shopifyOrderId,
        shop: data.shop,
        eventType: data.eventType,
        status: data.status,
      }
    });
    // No lanzamos el error para que no interrumpa el flujo principal
    // pero logueamos todos los detalles para debugging
  }
}

/**
 * Actualiza un log de auditoría existente
 */
export async function updateAuditLog(
  shopifyOrderId: string,
  eventType: string,
  updates: Partial<AuditLogData>
): Promise<void> {
  try {
    // Buscar el log más reciente para esta orden y evento
    const existingLog = await prisma.auditLog.findFirst({
      where: {
        shopifyOrderId,
        eventType,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (existingLog) {
      await prisma.auditLog.update({
        where: { id: existingLog.id },
        data: {
          status: updates.status || existingLog.status,
          responseData: updates.responseData ? JSON.stringify(updates.responseData) : existingLog.responseData,
          errorMessage: updates.errorMessage || existingLog.errorMessage,
          httpStatus: updates.httpStatus || existingLog.httpStatus,
          retryCount: updates.retryCount !== undefined ? updates.retryCount : existingLog.retryCount,
        }
      });
    } else {
      // Si no existe, crear uno nuevo
      await saveAuditLog({
        shopifyOrderId,
        shop: updates.shop || '',
        eventType: eventType as AuditLogData['eventType'],
        status: updates.status || 'pending',
        ...updates
      });
    }
  } catch (error) {
    console.error('❌ Error updating audit log:', error);
  }
}

/**
 * Obtiene los logs de auditoría para una orden específica
 */
export async function getAuditLogsForOrder(
  shopifyOrderId: string,
  limit: number = 50
) {
  try {
    return await prisma.auditLog.findMany({
      where: {
        shopifyOrderId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  } catch (error) {
    console.error('❌ Error getting audit logs:', error);
    return [];
  }
}

/**
 * Elimina logs de auditoría con más de 15 días de antigüedad
 */
export async function cleanupOldAuditLogs(): Promise<number> {
  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: fifteenDaysAgo
        }
      }
    });

    console.log(`🗑️ Cleaned up ${result.count} audit logs older than 15 days`);
    return result.count;
  } catch (error) {
    console.error('❌ Error cleaning up old audit logs:', error);
    return 0;
  }
}


