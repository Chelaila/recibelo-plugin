import { useFetcher } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import prisma from "../../db.server";
import { saveAuditLog } from "../../utils/auditLog";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
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
      return {
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
      };
    } else {
      console.error('❌ TEST WEBHOOK: Log was not saved!');
      return {
        success: false,
        error: 'Log was not saved to database'
      };
    }
  } catch (error) {
    console.error('❌ TEST WEBHOOK ERROR:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    };
  }
};

export default function TestWebhookPage() {
  const fetcher = useFetcher<typeof action>();
  const result = fetcher.data;

  return (
    <s-page heading="Probar Webhook">
      <s-section heading="Test de Guardado de Logs">
        <s-paragraph>
          Este botón creará un log de prueba en la base de datos para verificar que el sistema de guardado funciona correctamente.
        </s-paragraph>

        <s-box paddingBlockStart="base" paddingBlockEnd="base">
          <fetcher.Form method="post">
            <s-button
              type="submit"
              variant="primary"
              loading={fetcher.state === 'submitting'}
              disabled={fetcher.state === 'submitting'}
            >
              {fetcher.state === 'submitting' ? 'Creando log de prueba...' : 'Crear Log de Prueba'}
            </s-button>
          </fetcher.Form>
        </s-box>

        {result && (
          <>
            {result.success ? (
              <s-box paddingBlockStart="base">
                <s-banner tone="success">
                  <strong>✅ Éxito:</strong> {result.message}
                  <br />
                  <br />
                  <strong>Log creado:</strong>
                  <br />
                  ID: {result.log.id}
                  <br />
                  Orden: {result.log.orderName}
                  <br />
                  Tipo: {result.log.eventType}
                  <br />
                  Estado: {result.log.status}
                  <br />
                  Creado: {new Date(result.log.createdAt).toLocaleString('es-CL')}
                </s-banner>
              </s-box>
            ) : (
              <s-box paddingBlockStart="base">
                <s-banner tone="critical">
                  <strong>❌ Error:</strong> {result.error}
                  {result.details && (
                    <>
                      <br />
                      <br />
                      <details>
                        <summary>Detalles técnicos</summary>
                        <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>{result.details}</pre>
                      </details>
                    </>
                  )}
                </s-banner>
              </s-box>
            )}
          </>
        )}

        {result && result.success && (
          <s-box paddingBlockStart="base">
            <s-banner tone="info">
              <strong>✅ El guardado funciona correctamente!</strong>
              <br />
              <br />
              Si el test funciona pero no ves logs cuando pagas una orden, el problema es que el webhook <code>orders/paid</code> no está registrado en Shopify.
              <br />
              <br />
              <strong>Próximo paso:</strong> Reinstala la app para que Shopify registre automáticamente los webhooks.
              <br />
              <br />
              1. Ve a Shopify Admin → Settings → Apps
              <br />
              2. Desinstala "recibelo-plugin"
              <br />
              3. Vuelve a instalarla
              <br />
              4. Verifica en Settings → Notifications → Webhooks que existe "Order payment"
            </s-banner>
          </s-box>
        )}

        <s-box paddingBlockStart="base">
          <s-paragraph>
            <strong>Instrucciones:</strong>
          </s-paragraph>
          <s-paragraph>
            1. Haz clic en "Crear Log de Prueba" arriba
          </s-paragraph>
          <s-paragraph>
            2. Si ves un mensaje de éxito, el guardado funciona correctamente ✅
          </s-paragraph>
          <s-paragraph>
            3. Ve a "Logs de Auditoría" para ver el log creado
          </s-paragraph>
          <s-paragraph>
            4. Si esto funciona pero no ves logs cuando pagas una orden, el webhook no está registrado → <strong>Reinstala la app</strong>
          </s-paragraph>
        </s-box>
      </s-section>
    </s-page>
  );
}

