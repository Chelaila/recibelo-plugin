import { useState, useEffect } from 'react';
import { useLoaderData } from 'react-router';
import { LogisticCenter, ApiResponse, CarrierService } from '../../interfaces';

import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import { getCarrierServices } from "../../utils/carrierService";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const accessToken = session.accessToken;

    if (!shop || !accessToken) {
        throw new Error('Shop or access token not available');
    }

    try {
        const carrierServices = await getCarrierServices(shop, accessToken as string);
        return { 
            shop, 
            accessToken, 
            carrierServices, 
            baseUrl: process.env.SHOPIFY_APP_URL 
        };
    } catch (error) {
        console.error('❌ Configuration Loader: Error loading carrier services:', error);
        return {
            shop,
            accessToken,
            carrierServices: [],
            baseUrl: process.env.SHOPIFY_APP_URL,
            error: error instanceof Error ? error.message : 'Unknown error loading carrier services'
        };
    }
};

export default function ConfigurationPage() {
  const { carrierServices, baseUrl } = useLoaderData<typeof loader>();
  const [logisticCenters, setLogisticCenters] = useState<LogisticCenter[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para Carrier Service
  const [isCarrierConfigured, setIsCarrierConfigured] = useState(false);
  const [carrierLoading, setCarrierLoading] = useState(false);
  const [carrierError, setCarrierError] = useState<string | null>(null);
  const [carrierSuccess, setCarrierSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogisticCenters = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('https://staging-api.recibelo.cl/api/$2y$10$iyceB40qkj.Y4YsiQclyOTubMqm5M5phhALqO7pvxv5Q2uS6h36u/logistics_center');
        
        if (!response.ok) {
          throw new Error(`Error en la petición: ${response.status}`);
        }
        
        const data: ApiResponse = await response.json();
        setLogisticCenters(data.logistic_centers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
        console.error('Error al obtener centros logísticos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogisticCenters();
  }, []);

  // Verificar estado del Carrier Service
  useEffect(() => {
    const recibeloService = carrierServices?.find((service: CarrierService) => 
      service.name?.toLowerCase().includes('recibelo')
    );
    setIsCarrierConfigured(!!recibeloService);
  }, [carrierServices]);

  const handleCenterChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    setSelectedCenter(target.value);
  };

  // Funciones para manejar Carrier Service
  const handleCreateCarrierService = async () => {
    setCarrierLoading(true);
    setCarrierError(null);
    setCarrierSuccess(null);

    try {
      const callbackUrl = `${baseUrl}/api/shipping-rates`;
      const formData = new FormData();
      formData.append('action', 'create');
      formData.append('name', 'Recibelo - Servicio de Envío');
      formData.append('callbackUrl', callbackUrl);
      formData.append('serviceDiscovery', 'true');

      const response = await fetch('/api/carrier-service', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Error al crear el Carrier Service';
        throw new Error(errorMessage);
      }

      setCarrierSuccess('Servicio de Transporte creado exitosamente');
      setIsCarrierConfigured(true);
      
      // Recargar la página para actualizar la lista
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (err) {
      setCarrierError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCarrierLoading(false);
    }
  };

  const handleUpdateCarrierService = async () => {
    setCarrierLoading(true);
    setCarrierError(null);
    setCarrierSuccess(null);

    try {
      const recibeloService = carrierServices?.find((service: CarrierService) => 
        service.name?.toLowerCase().includes('recibelo')
      );

      if (!recibeloService) {
        throw new Error('No se encontró el Carrier Service de Recibelo');
      }

      const callbackUrl = `${baseUrl}/api/shipping-rates`;
      console.log('🔍 Updating Carrier Service with callback URL:', callbackUrl);
      
      const formData = new FormData();
      formData.append('action', 'update');
      formData.append('id', recibeloService.id);
      formData.append('callbackUrl', callbackUrl);
      formData.append('serviceDiscovery', 'true');

      const response = await fetch('/api/carrier-service', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || 'Error al actualizar el Carrier Service';
        throw new Error(errorMessage);
      }

      setCarrierSuccess('Servicio de Transporte actualizado exitosamente');
      
    } catch (err) {
      setCarrierError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setCarrierLoading(false);
    }
  };

  return (
    <s-page heading="Configuración">
      {/* Sección de Centros Logísticos */}
      <s-section heading="Configuración de Centros Logísticos">
        <s-paragraph>
          Selecciona un centro logístico para configurar.
        </s-paragraph>
        
        {loading && (
          <s-box>
            <s-stack>
              <s-spinner size="base" />
              <s-text>Cargando centros logísticos...</s-text>
            </s-stack>
          </s-box>
        )}
        
        {error && (
          <s-banner tone="critical">
            <strong>Error:</strong> {error}
          </s-banner>
        )}
        
        {!loading && !error && (
          <s-section>
            <s-select
              label="Centro Logístico"
              value={selectedCenter}
              onChange={handleCenterChange}
            >
              <s-option value="">Selecciona un centro logístico</s-option>
              {logisticCenters.map((center) => (
                <s-option key={center.id} value={center.id.toString()}>
                  {center.name}
                </s-option>
              ))}
            </s-select>

            {selectedCenter && (
              <s-section heading="Información del Centro Seleccionado">
                {(() => {
                  const center = logisticCenters.find(c => c.id.toString() === selectedCenter);
                  return center ? (
                    <>
                      <s-paragraph><strong>Nombre:</strong> {center.name}</s-paragraph>
                      <s-paragraph><strong>Dirección:</strong> {center.address}</s-paragraph>
                      <s-paragraph><strong>Responsable:</strong> {center.responsable}</s-paragraph>
                      <s-paragraph><strong>Email:</strong> {center.email}</s-paragraph>
                      <s-paragraph><strong>Teléfono:</strong> {center.phone}</s-paragraph>
                    </>
                  ) : null;
                })()}
              </s-section>
            )}
          </s-section>
        )}
      </s-section>

      {/* Sección de Servicio de Transporte */}
      <s-section heading="Servicio de Transporte">
        <s-paragraph>
          Configura el Servicio de Transporte de Recibelo para integrar las tarifas de envío con Shopify.
        </s-paragraph>

        {carrierError && (
          <s-banner tone="critical">
            <strong>Error:</strong> {carrierError}
          </s-banner>
        )}

        {carrierSuccess && (
          <s-banner tone="success">
            <strong>Éxito:</strong> {carrierSuccess}
          </s-banner>
        )}
        <s-section>
          <s-paragraph>
            <strong>Estado:</strong> {isCarrierConfigured ? '✅ Configurado' : '❌ No configurado'}
          </s-paragraph>
          <s-paragraph>
            <strong>Callback URL:</strong> {baseUrl}/api/shipping-rates
          </s-paragraph>
        </s-section>
        <s-section heading="Acciones">
          {!isCarrierConfigured ? (
              <s-button
                variant="primary"
                onClick={handleCreateCarrierService}
                disabled={carrierLoading}
                loading={carrierLoading}
              >
                {carrierLoading ? 'Creando...' : 'Crear Servicio de Transporte'}
              </s-button>
            ) : (
              <s-button
                variant="primary"
                onClick={handleUpdateCarrierService}
                disabled={carrierLoading}
                loading={carrierLoading}
              >
                {carrierLoading ? 'Actualizando...' : 'Actualizar Servicio de Transporte'}
              </s-button>
            )}
        </s-section>

        {carrierServices && carrierServices.length > 0 && (
          <s-section>
            <s-table>
              <s-table-header-row>
                <s-table-header listSlot="primary">Nombre</s-table-header>
                <s-table-header listSlot="secondary">URL de Callback</s-table-header>
                <s-table-header listSlot="labeled">Estado</s-table-header>
              </s-table-header-row>
              <s-table-body>
                {carrierServices.map((service: CarrierService) => (
                  <s-table-row key={service.id}>
                    <s-table-cell>{service.name}</s-table-cell>
                    <s-table-cell>{service.callbackUrl}</s-table-cell>
                    <s-table-cell>
                      <s-badge tone={service.active ? 'success' : 'critical'}>
                        {service.active ? 'Activo' : 'Inactivo'}
                      </s-badge>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>  
          </s-section>
        )}
      </s-section>
    </s-page>
  );
}


