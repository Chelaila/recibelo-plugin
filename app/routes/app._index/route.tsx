import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../../shopify.server";
import { getCarrierServices } from "../../utils/carrierService";
import { getComunasTarifas } from "../../utils/communeService";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const accessToken = session.accessToken;

    if (!shop || !accessToken) {
        throw new Error('Shop or access token not available');
    }

    try {
        // 1. Verificar estado del Carrier Service
        let carrierServiceConfigured = false;
        try {
            const carrierServices = await getCarrierServices(shop, accessToken as string);
            carrierServiceConfigured = carrierServices?.some((service: { name?: string }) => 
                service.name?.toLowerCase().includes('recibelo')
            ) || false;
        } catch (error) {
            console.error('Error checking carrier service:', error);
        }

        // 2. Obtener estadísticas de tarifas
        const comunas = await getComunasTarifas();
        const totalTarifas = comunas.length;
        const tarifasActivas = comunas.filter(c => c.tax?.isActive).length;
        const tarifasInactivas = totalTarifas - tarifasActivas;

        // 3. Obtener estadísticas por región
        const comunasPorRegion = comunas.reduce((acc: Record<string, number>, comuna) => {
            const regionName = comuna.region?.name || 'Sin región';
            acc[regionName] = (acc[regionName] || 0) + 1;
            return acc;
        }, {});

        const regionesConTarifas = Object.keys(comunasPorRegion).length;

        return {
            shop,
            carrierServiceConfigured,
            stats: {
                totalTarifas,
                tarifasActivas,
                tarifasInactivas,
                regionesConTarifas,
            }
        };
    } catch (error) {
        console.error('Error loading home data:', error);
        return {
            shop,
            carrierServiceConfigured: false,
            stats: {
                totalTarifas: 0,
                tarifasActivas: 0,
                tarifasInactivas: 0,
                regionesConTarifas: 0,
            },
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

export default function AppIndex() {
  const { carrierServiceConfigured, stats } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Recibelo - Plugin de Envío">
      {/* Sección de Bienvenida */}
      <s-section heading="Bienvenido a Recibelo">
        <s-paragraph>
          Gestiona las tarifas de envío para tu tienda Shopify con Recibelo. 
          Configura tarifas personalizadas por comuna y ofrece a tus clientes opciones de envío precisas según su ubicación.
        </s-paragraph>
      </s-section>

      {/* Estado del Servicio */}
      <s-section heading="Estado del Servicio">
        <s-box padding="base" borderColor="base">
          <s-grid gridTemplateColumns="auto 1fr" gap="base" alignItems="center">
            <s-grid-item>
              <s-heading size="small">Servicio de Transporte</s-heading>
            </s-grid-item>
            <s-grid-item>
              {carrierServiceConfigured ? (
                <s-badge tone="success">✅ Configurado y activo</s-badge>
              ) : (
                <s-badge tone="warning">⚠️ No configurado</s-badge>
              )}
            </s-grid-item>
          </s-grid>
          <s-paragraph tone="subdued" paddingBlockStart="small">
            El servicio de transporte permite que Shopify calcule automáticamente las tarifas de envío 
            según la comuna de destino del cliente.
          </s-paragraph>
        </s-box>
      </s-section>

      {/* Estadísticas de Tarifas */}
      <s-section heading="Resumen de Tarifas">
        <s-grid gridTemplateColumns="repeat(4, 1fr)" gap="base">
          <s-grid-item>
            <s-box padding="base" borderColor="base">
              <s-heading size="small">Total de Tarifas</s-heading>
              <s-paragraph size="large">{stats.totalTarifas}</s-paragraph>
              <s-paragraph tone="subdued" size="small">Comunas configuradas</s-paragraph>
            </s-box>
          </s-grid-item>
          <s-grid-item>
            <s-box padding="base" borderColor="base">
              <s-heading size="small">Tarifas Activas</s-heading>
              <s-paragraph size="large" tone="success">{stats.tarifasActivas}</s-paragraph>
              <s-paragraph tone="subdued" size="small">Disponibles para envío</s-paragraph>
            </s-box>
          </s-grid-item>
          <s-grid-item>
            <s-box padding="base" borderColor="base">
              <s-heading size="small">Tarifas Inactivas</s-heading>
              <s-paragraph size="large" tone="subdued">{stats.tarifasInactivas}</s-paragraph>
              <s-paragraph tone="subdued" size="small">No disponibles</s-paragraph>
            </s-box>
          </s-grid-item>
          <s-grid-item>
            <s-box padding="base" borderColor="base">
              <s-heading size="small">Regiones</s-heading>
              <s-paragraph size="large">{stats.regionesConTarifas}</s-paragraph>
              <s-paragraph tone="subdued" size="small">Con tarifas configuradas</s-paragraph>
            </s-box>
          </s-grid-item>
        </s-grid>
        <s-box paddingBlockStart="base">
          <s-button href="/app/taxes" variant="primary">
            Gestionar Tarifas
          </s-button>
        </s-box>
      </s-section>

      {/* Cómo Funciona el Cálculo */}
      <s-section heading="¿Cómo se calculan las tarifas?">
        <s-grid gridTemplateColumns="repeat(2, 1fr)" gap="base">
          <s-grid-item>
            <s-box padding="base">
              <s-heading size="small">1. Cliente ingresa dirección</s-heading>
              <s-paragraph tone="subdued">
                Durante el checkout, el cliente ingresa su dirección de envío incluyendo la comuna.
              </s-paragraph>
            </s-box>
          </s-grid-item>
          <s-grid-item>
            <s-box padding="base">
              <s-heading size="small">2. Shopify consulta tarifa</s-heading>
              <s-paragraph tone="subdued">
                Shopify consulta automáticamente la tarifa configurada para esa comuna específica.
              </s-paragraph>
            </s-box>
          </s-grid-item>
          <s-grid-item>
            <s-box padding="base">
              <s-heading size="small">3. Tarifa mostrada al cliente</s-heading>
              <s-paragraph tone="subdued">
                El cliente ve la tarifa exacta según su comuna antes de completar la compra.
              </s-paragraph>
            </s-box>
          </s-grid-item>
          <s-grid-item>
            <s-box padding="base">
              <s-heading size="small">4. Orden procesada</s-heading>
              <s-paragraph tone="subdued">
                Una vez pagada la orden, se procesa con la tarifa de envío correspondiente.
              </s-paragraph>
            </s-box>
          </s-grid-item>
        </s-grid>
      </s-section>

      {/* Acciones Rápidas */}
      <s-section heading="Acciones Rápidas">
        <s-grid gridTemplateColumns="repeat(2, 1fr)" gap="base">
          <s-grid-item>
            <s-box padding="base" borderColor="base">
              <s-heading size="small">Gestionar Tarifas</s-heading>
              <s-paragraph tone="subdued">
                Configura, edita o activa/desactiva las tarifas de envío por comuna.
              </s-paragraph>
              <s-box paddingBlockStart="base">
                <s-button href="/app/taxes" variant="primary">
                  Ir a Tarifario
                </s-button>
              </s-box>
            </s-box>
          </s-grid-item>
          <s-grid-item>
            <s-box padding="base" borderColor="base">
              <s-heading size="small">Buscar Tarifa</s-heading>
              <s-paragraph tone="subdued">
                Busca rápidamente la tarifa configurada para una comuna específica.
              </s-paragraph>
              <s-box paddingBlockStart="base">
                <s-button href="/app/taxes" variant="secondary">
                  Buscar Comuna
                </s-button>
              </s-box>
            </s-box>
          </s-grid-item>
        </s-grid>
      </s-section>

      {/* Información Importante */}
      <s-section heading="Información Importante">
        <s-banner tone="info" size="large">
          <strong>📌 Limitación Actual:</strong> Las tarifas de envío están disponibles únicamente para la Región Metropolitana (RM).
          <br />
          <br />
          Las órdenes con destino fuera de RM no mostrarán opciones de envío con Recibelo en el checkout.
        </s-banner>
      </s-section>

      {/* Tips */}
      <s-section heading="💡 Consejos">
        <s-list>
          <s-list-item>
            <strong>Activa solo las tarifas que necesites:</strong> Mantén inactivas las comunas donde no realizas envíos para evitar confusión.
          </s-list-item>
          <s-list-item>
            <strong>Revisa periódicamente tus tarifas:</strong> Actualiza los precios según cambios en costos de envío.
          </s-list-item>
          <s-list-item>
            <strong>Usa descripciones claras:</strong> Las descripciones de las tarifas aparecen en el checkout, sé específico.
          </s-list-item>
        </s-list>
      </s-section>
    </s-page>
  );
}


