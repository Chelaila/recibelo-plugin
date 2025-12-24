import { useState, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { LogisticCenter, ApiResponse } from '../interfaces';
import { BACKEND_URL_OPTIONS } from './BackendUrlSelector';
import ConfiguredLogisticCenterView from './ConfiguredLogisticCenterView';
import LogisticCenterSearchForm from './LogisticCenterSearchForm';
import LogisticCenterSelector from './LogisticCenterSelector';

interface LogisticCenterSectionProps {
  savedLogisticCenter: LogisticCenter | null;
}

export default function LogisticCenterSection({ 
  savedLogisticCenter,
}: LogisticCenterSectionProps) {
  const [logisticCenters, setLogisticCenters] = useState<LogisticCenter[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [token, setToken] = useState<string>(savedLogisticCenter?.accessToken || '');
  const [baseUrl, setBaseUrl] = useState<string>(savedLogisticCenter?.baseUrl || 'https://staging-api.recibelo.cl');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [useCustomUrl, setUseCustomUrl] = useState<boolean>(false);
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  
  const fetcher = useFetcher();

  // Cargar token y baseUrl guardados cuando hay un centro logístico
  useEffect(() => {
    if (savedLogisticCenter?.accessToken) {
      setToken(savedLogisticCenter.accessToken);
    }
    if (savedLogisticCenter?.baseUrl) {
      setBaseUrl(savedLogisticCenter.baseUrl);
      // Verificar si la URL guardada está en las opciones predefinidas
      const isPredefined = BACKEND_URL_OPTIONS.some(opt => opt.value === savedLogisticCenter.baseUrl);
      if (!isPredefined) {
        setCustomUrl(savedLogisticCenter.baseUrl);
        setUseCustomUrl(true);
      }
    }
  }, [savedLogisticCenter]);

  // Obtener la URL base a usar
  const getEffectiveBaseUrl = (): string => {
    if (useCustomUrl && customUrl.trim()) {
      return customUrl.trim();
    }
    return baseUrl;
  };

  const fetchLogisticCenters = async () => {
    if (!token || token.trim() === '') {
      setError('Por favor ingresa un token válido');
      setSuccess(null);
      return;
    }

    const effectiveBaseUrl = getEffectiveBaseUrl();
    if (!effectiveBaseUrl || effectiveBaseUrl.trim() === '') {
      setError('Por favor selecciona o ingresa una URL base válida');
      setSuccess(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Construir la URL
      const apiUrl = `${effectiveBaseUrl}/api/${token}/logistics_center`;
      console.log('🔍 Fetching from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`No se encontró el endpoint. Verifica que la URL base sea correcta: ${effectiveBaseUrl}`);
        } else if (response.status === 401 || response.status === 403) {
          throw new Error('Token inválido o sin permisos. Verifica tu token de API.');
        } else if (response.status >= 500) {
          throw new Error(`Error del servidor (${response.status}). El servidor puede estar temporalmente no disponible.`);
        } else {
          throw new Error(`Error en la petición: ${response.status} ${response.statusText}`);
        }
      }
      
      const data: ApiResponse = await response.json();
      
      if (!data.logistic_centers || !Array.isArray(data.logistic_centers)) {
        throw new Error('Respuesta inválida del servidor. El formato de la respuesta no es el esperado.');
      }
      
      setLogisticCenters(data.logistic_centers);
      
      if (data.logistic_centers.length === 0) {
        setError('No se encontraron centros logísticos con este token. Verifica que el token sea correcto y que tengas centros logísticos asociados.');
      } else {
        setSuccess(`✅ Se encontraron ${data.logistic_centers.length} centro(s) logístico(s) disponible(s)`);
      }
    } catch (err) {
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError(`❌ No se pudo conectar con el servidor. Verifica que la URL base sea correcta y esté accesible: ${effectiveBaseUrl}`);
      } else {
        setError(err instanceof Error ? err.message : 'Error desconocido al obtener centros logísticos');
      }
      setSuccess(null);
      console.error('Error al obtener centros logísticos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCenter = async () => {
    if (!selectedCenter) {
      setConfirmError('Por favor selecciona un centro logístico');
      return;
    }

    const center = logisticCenters.find(c => c.id.toString() === selectedCenter);
    if (!center) {
      setConfirmError('Centro logístico no encontrado');
      return;
    }

    try {
      setConfirmLoading(true);
      setConfirmError(null);
      setConfirmSuccess(null);

      const formData = new FormData();
      formData.append('intent', 'save_logistic_center');
      formData.append('centerData', JSON.stringify(center));
      formData.append('accessToken', token);
      formData.append('baseUrl', getEffectiveBaseUrl());
      sessionStorage.setItem('lastFetcherIntent', 'save_logistic_center');

      fetcher.submit(formData, { method: 'post' });
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Error desconocido');
      setConfirmLoading(false);
    }
  };

  // Manejar respuesta del fetcher
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.success) {
        const lastIntent = sessionStorage.getItem('lastFetcherIntent');
        if (lastIntent === 'delete_logistic_center') {
          setDeleteSuccess('Centro logístico eliminado exitosamente');
          setDeleteLoading(false);
          sessionStorage.removeItem('lastFetcherIntent');
        } else {
          setConfirmSuccess('Centro logístico guardado exitosamente');
          setConfirmLoading(false);
        }
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (fetcher.data.error) {
        const lastIntent = sessionStorage.getItem('lastFetcherIntent');
        if (lastIntent === 'delete_logistic_center') {
          setDeleteError(fetcher.data.error);
          setDeleteLoading(false);
          sessionStorage.removeItem('lastFetcherIntent');
        } else {
          setConfirmError(fetcher.data.error);
          setConfirmLoading(false);
        }
      }
    }
  }, [fetcher.state, fetcher.data]);

  const handleDeleteCenter = async () => {
    if (!savedLogisticCenter) {
      setDeleteError('No hay centro logístico para eliminar');
      return;
    }

    try {
      setDeleteLoading(true);
      setDeleteError(null);
      setDeleteSuccess(null);

      const formData = new FormData();
      formData.append('intent', 'delete_logistic_center');
      sessionStorage.setItem('lastFetcherIntent', 'delete_logistic_center');

      fetcher.submit(formData, { method: 'post' });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Error desconocido');
      setDeleteLoading(false);
    }
  };

  const handleUpdateCenter = () => {
    setToken('');
    setLogisticCenters([]);
    setSelectedCenter('');
    setError(null);
    setSuccess(null);
  };

  return (
    <s-section heading="Configuración de Centros Logísticos">
      {savedLogisticCenter ? (
        <ConfiguredLogisticCenterView
          savedLogisticCenter={savedLogisticCenter}
          deleteLoading={deleteLoading}
          deleteError={deleteError}
          deleteSuccess={deleteSuccess}
          onUpdate={handleUpdateCenter}
          onDelete={handleDeleteCenter}
        />
      ) : (
        <>
          <LogisticCenterSearchForm
            token={token}
            baseUrl={baseUrl}
            customUrl={customUrl}
            useCustomUrl={useCustomUrl}
            savedLogisticCenter={savedLogisticCenter}
            loading={loading}
            error={error}
            success={success}
            onTokenChange={setToken}
            onBaseUrlChange={setBaseUrl}
            onCustomUrlChange={setCustomUrl}
            onUseCustomUrlChange={setUseCustomUrl}
            onSearch={fetchLogisticCenters}
          />

          {logisticCenters.length > 0 && (
            <LogisticCenterSelector
              logisticCenters={logisticCenters}
              selectedCenter={selectedCenter}
              confirmLoading={confirmLoading}
              confirmError={confirmError}
              confirmSuccess={confirmSuccess}
              onCenterChange={setSelectedCenter}
              onConfirm={handleConfirmCenter}
            />
          )}
        </>
      )}
    </s-section>
  );
}
