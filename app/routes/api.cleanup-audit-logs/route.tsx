import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import { cleanupOldAuditLogs } from "../../utils/auditLog";

/**
 * Endpoint para limpiar logs de auditoría con más de 15 días
 * 
 * Puede ser llamado manualmente o configurarse como cron job
 * 
 * GET /api/cleanup-audit-logs - Obtiene estadísticas de limpieza
 * POST /api/cleanup-audit-logs - Ejecuta la limpieza
 */
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Solo retornar información, no ejecutar limpieza
    return new Response(JSON.stringify({ 
      message: 'Use POST method to execute cleanup',
      endpoint: '/api/cleanup-audit-logs',
      method: 'POST'
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
}

export async function action({ request }: ActionFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }

    const deletedCount = await cleanupOldAuditLogs();

    return new Response(JSON.stringify({ 
      success: true,
      message: `Cleaned up ${deletedCount} audit logs older than 15 days`,
      deleted_count: deletedCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('❌ Error cleaning up audit logs:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


