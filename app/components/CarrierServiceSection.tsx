import { useState, useEffect } from 'react';
import { CarrierService } from '../interfaces';

interface CarrierServiceSectionProps {
  carrierServices: CarrierService[];
  baseUrl: string;
}

export default function CarrierServiceSection({ 
  carrierServices, 
  baseUrl 
}: CarrierServiceSectionProps) {
  const [isCarrierConfigured, setIsCarrierConfigured] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const recibeloService = carrierServices?.find((service: CarrierService) => 
      service.name?.toLowerCase().includes('recibelo')
    );
    setIsCarrierConfigured(!!recibeloService);
  }, [carrierServices]);

  const handleCreateCarrierService = async () => {
    setLoading(true);
    setMessage(null);

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
        throw new Error(result.error || 'Error al crear el Carrier Service');
      }

      setIsCarrierConfigured(true);
      window.location.reload();
      
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCarrierService = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const recibeloService = carrierServices?.find((service: CarrierService) => 
        service.name?.toLowerCase().includes('recibelo')
      );

      if (!recibeloService) {
        throw new Error('No se encontró el Carrier Service de Recibelo');
      }

      const callbackUrl = `${baseUrl}/api/shipping-rates`;
      
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
        throw new Error(result.error || 'Error al actualizar el Carrier Service');
      }

      setMessage('Actualizado correctamente');
      
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <s-section heading="Servicio de Transporte">
      {message && (
        <s-paragraph>{message}</s-paragraph>
      )}

      <s-paragraph>
        Estado: {isCarrierConfigured ? 'Configurado' : 'No configurado'}
      </s-paragraph>
      
      {!isCarrierConfigured ? (
        <s-button
          variant="primary"
          onClick={handleCreateCarrierService}
          disabled={loading}
          loading={loading}
        >
          {loading ? 'Creando...' : 'Crear'}
        </s-button>
      ) : (
        <s-button
          variant="primary"
          onClick={handleUpdateCarrierService}
          disabled={loading}
          loading={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar'}
        </s-button>
      )}
    </s-section>
  );
}

