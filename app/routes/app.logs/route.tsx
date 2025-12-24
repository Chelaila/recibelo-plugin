import { useState, useEffect } from "react";
import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import prisma from "../../db.server";

interface AuditLog {
  id: number;
  shopifyOrderId: string;
  orderName: string | null;
  shop: string;
  eventType: string;
  status: string;
  requestData: string | null;
  responseData: string | null;
  errorMessage: string | null;
  httpStatus: number | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  if (!shop) {
    throw new Error('Shop not available');
  }

  try {
    // Obtener todos los logs para esta tienda, ordenados por fecha (más recientes primero)
    const logs = await prisma.auditLog.findMany({
      where: { shop },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // Limitar a los 100 más recientes
    });

    // Contar total de logs
    const totalLogs = await prisma.auditLog.count({
      where: { shop }
    });

    // Contar logs por estado
    const logsByStatus = await prisma.auditLog.groupBy({
      by: ['status'],
      where: { shop },
      _count: {
        id: true
      }
    });

    // Contar logs por tipo de evento
    const logsByEventType = await prisma.auditLog.groupBy({
      by: ['eventType'],
      where: { shop },
      _count: {
        id: true
      }
    });

    return {
      logs: logs.map(log => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt.toISOString(),
      })),
      totalLogs,
      logsByStatus,
      logsByEventType,
    };
  } catch (error) {
    console.error('Error loading audit logs:', error);
    return {
      logs: [],
      totalLogs: 0,
      logsByStatus: [],
      logsByEventType: [],
      shop,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export default function AuditLogsPage() {
  const { logs, totalLogs, logsByStatus, logsByEventType } = useLoaderData<typeof loader>();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterEventType, setFilterEventType] = useState<string>('');
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>(logs);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    let filtered = [...logs];

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.shopifyOrderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.orderName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.errorMessage?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por estado
    if (filterStatus) {
      filtered = filtered.filter(log => log.status === filterStatus);
    }

    // Filtrar por tipo de evento
    if (filterEventType) {
      filtered = filtered.filter(log => log.eventType === filterEventType);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, filterStatus, filterEventType]);

  const handleCleanup = async () => {
    if (confirm('¿Estás seguro de que deseas eliminar los logs con más de 15 días?')) {
      try {
        const response = await fetch('/api/cleanup-audit-logs', {
          method: 'POST'
        });
        const result = await response.json();
        if (result.success) {
          alert(`Se eliminaron ${result.deleted_count} logs`);
          window.location.reload();
        } else {
          alert('Error al limpiar logs: ' + result.error);
        }
      } catch (error) {
        alert('Error al limpiar logs');
        console.error(error);
      }
    }
  };

  const getStatusBadgeTone = (status: string): 'success' | 'critical' | 'warning' | 'info' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'critical';
      case 'pending':
        return 'warning';
      case 'retry':
        return 'info';
      default:
        return 'info';
    }
  };

  const getEventTypeLabel = (eventType: string): string => {
    const labels: Record<string, string> = {
      'order_paid': 'Orden Pagada',
      'package_created': 'Paquete Creado',
      'shipment_completed': 'Envío Completado',
      'fulfillment_updated': 'Fulfillment Actualizado',
      'error': 'Error'
    };
    return labels[eventType] || eventType;
  };

  return (
    <s-page heading="Logs de Auditoría">
      <s-section heading="Resumen">
        <s-grid gridTemplateColumns="repeat(4, 1fr)" gap="base">
          <s-grid-item>
            <s-box padding="base">
              <s-heading>Total de Logs </s-heading>
              <s-paragraph> {totalLogs} </s-paragraph>
            </s-box>
          </s-grid-item>
          {logsByStatus.map((stat) => (
            <s-grid-item key={stat.status}>
              <s-box padding="base">
                <s-heading>{stat.status}</s-heading>
                <s-paragraph>{stat._count.id}</s-paragraph>
              </s-box>
            </s-grid-item>
          ))}
        </s-grid>
      </s-section>

      <s-section heading="Filtros">
        <s-grid gridTemplateColumns="repeat(3, 1fr)" gap="base">
          <s-grid-item>
            <s-text-field
              label="Buscar"
              placeholder="Buscar por orden, nombre o error..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
            />
            <s-paragraph>Buscar por ID de orden, nombre de orden o mensaje de error</s-paragraph>
          </s-grid-item>
          <s-grid-item>
            <s-select
              label="Estado"
              value={filterStatus}
              onChange={(e) => setFilterStatus((e.target as HTMLSelectElement).value)}
            >
              <s-option value="">Todos los estados</s-option>
              <s-option value="success">Success</s-option>
              <s-option value="error">Error</s-option>
              <s-option value="pending">Pending</s-option>
              <s-option value="retry">Retry</s-option>
            </s-select>
          </s-grid-item>
          <s-grid-item>
            <s-select
              label="Tipo de Evento"
              value={filterEventType}
              onChange={(e) => setFilterEventType((e.target as HTMLSelectElement).value)}
            >
              <s-option value="">Todos los eventos</s-option>
              {logsByEventType.map((event) => (
                <s-option key={event.eventType} value={event.eventType}>
                  {getEventTypeLabel(event.eventType)}
                </s-option>
              ))}
            </s-select>
          </s-grid-item>
        </s-grid>

        <s-box paddingBlockStart="base">
          <s-button variant="secondary" onClick={handleCleanup}>
            Limpiar Logs Antiguos (15+ días)
          </s-button>
        </s-box>
      </s-section>

      <s-section heading={`Logs (${filteredLogs.length})`}>
        {filteredLogs.length === 0 ? (
          <s-paragraph>No se encontraron logs que coincidan con los filtros.</s-paragraph>
        ) : (
          <s-table variant="list">
            <s-table-header-row>
              <s-table-header listSlot="primary">Orden</s-table-header>
              <s-table-header listSlot="secondary">Evento</s-table-header>
              <s-table-header>Estado</s-table-header>
              <s-table-header>HTTP Status</s-table-header>
              <s-table-header>Fecha</s-table-header>
              <s-table-header>Acciones</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {filteredLogs.map((log) => (
                <s-table-row key={log.id}>
                  <s-table-cell>
                    {log.orderName || log.shopifyOrderId}
                  </s-table-cell>
                  <s-table-cell>
                    {getEventTypeLabel(log.eventType)}
                  </s-table-cell>
                  <s-table-cell>
                    <s-badge tone={getStatusBadgeTone(log.status)}>
                      {log.status}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>
                    {log.httpStatus ? (
                      <s-badge tone={log.httpStatus >= 200 && log.httpStatus < 300 ? 'success' : 'critical'}>
                        {log.httpStatus}
                      </s-badge>
                    ) : (
                      '-'
                    )}
                  </s-table-cell>
                  <s-table-cell>
                    {new Date(log.createdAt).toLocaleString('es-CL')}
                  </s-table-cell>
                  <s-table-cell>
                    <s-button
                      variant="secondary"
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    >
                      {selectedLog?.id === log.id ? 'Ocultar' : 'Ver Detalles'}
                    </s-button>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>

      {selectedLog && (
        <s-section heading="Detalles del Log">
          <s-grid gridTemplateColumns="repeat(2, 1fr)" gap="base">
            <s-grid-item>
              <s-box padding="base">
                <s-heading>Información General</s-heading>
                <s-paragraph><strong>ID:</strong> {selectedLog.id}</s-paragraph>
                <s-paragraph><strong>Orden Shopify:</strong> {selectedLog.shopifyOrderId}</s-paragraph>
                <s-paragraph><strong>Nombre de Orden:</strong> {selectedLog.orderName || '-'}</s-paragraph>
                <s-paragraph><strong>Tienda:</strong> {selectedLog.shop}</s-paragraph>
                <s-paragraph><strong>Tipo de Evento:</strong> {getEventTypeLabel(selectedLog.eventType)}</s-paragraph>
                <s-paragraph><strong>Estado:</strong> 
                  <s-badge tone={getStatusBadgeTone(selectedLog.status)}>
                    {selectedLog.status}
                  </s-badge>
                </s-paragraph>
                <s-paragraph><strong>Reintentos:</strong> {selectedLog.retryCount}</s-paragraph>
                <s-paragraph><strong>Creado:</strong> {new Date(selectedLog.createdAt).toLocaleString('es-CL')}</s-paragraph>
                <s-paragraph><strong>Actualizado:</strong> {new Date(selectedLog.updatedAt).toLocaleString('es-CL')}</s-paragraph>
              </s-box>
            </s-grid-item>
            <s-grid-item gridColumn="span 2">
              <s-box padding="base">
                <s-heading>Datos de la Petición (Request Data)</s-heading>
                {selectedLog.requestData ? (
                  <div style={{ backgroundColor: '#f6f6f7', borderRadius: '4px', maxHeight: '500px', overflow: 'auto', padding: '16px', fontFamily: 'monospace' }}>
                    <pre style={{ margin: 0, fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {(() => {
                        try {
                          const parsed = JSON.parse(selectedLog.requestData);
                          // Si tiene full_order, mostrarlo de forma destacada
                          if (parsed.full_order) {
                            return JSON.stringify({
                              ...parsed,
                              full_order: parsed.full_order // Mostrar el objeto completo
                            }, null, 2);
                          }
                          return JSON.stringify(parsed, null, 2);
                        } catch (e) {
                          return selectedLog.requestData;
                        }
                      })()}
                    </pre>
                  </div>
                ) : (
                  <s-paragraph>No hay datos de petición</s-paragraph>
                )}
              </s-box>
            </s-grid-item>
            <s-grid-item gridColumn="span 2">
              <s-box padding="base">
                <s-heading>Datos de la Respuesta (Response Data)</s-heading>
                {selectedLog.responseData ? (
                  <div style={{ backgroundColor: '#f6f6f7', borderRadius: '4px', maxHeight: '500px', overflow: 'auto', padding: '16px', fontFamily: 'monospace' }}>
                    <pre style={{ margin: 0, fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLog.responseData), null, 2);
                        } catch (e) {
                          return selectedLog.responseData;
                        }
                      })()}
                    </pre>
                  </div>
                ) : (
                  <s-paragraph>No hay datos de respuesta</s-paragraph>
                )}
              </s-box>
            </s-grid-item>
            {selectedLog.errorMessage && (
              <s-grid-item gridColumn="span 2">
                <s-box padding="base">
                  <s-heading>Mensaje de Error</s-heading>
                  <s-banner tone="critical">
                    {selectedLog.errorMessage}
                  </s-banner>
                </s-box>
              </s-grid-item>
            )}
          </s-grid>
        </s-section>
      )}
    </s-page>
  );
}

