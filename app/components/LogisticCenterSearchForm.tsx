import BackendUrlSelector, { BACKEND_URL_OPTIONS } from './BackendUrlSelector';
import { LogisticCenter } from '../interfaces';

interface LogisticCenterSearchFormProps {
  token: string;
  baseUrl: string;
  customUrl: string;
  useCustomUrl: boolean;
  savedLogisticCenter: LogisticCenter | null;
  loading: boolean;
  error: string | null;
  success: string | null;
  onTokenChange: (token: string) => void;
  onBaseUrlChange: (url: string) => void;
  onCustomUrlChange: (url: string) => void;
  onUseCustomUrlChange: (useCustom: boolean) => void;
  onSearch: () => void;
}

export default function LogisticCenterSearchForm({
  token,
  baseUrl,
  customUrl,
  useCustomUrl,
  savedLogisticCenter,
  loading,
  error,
  success,
  onTokenChange,
  onBaseUrlChange,
  onCustomUrlChange,
  onUseCustomUrlChange,
  onSearch,
}: LogisticCenterSearchFormProps) {
  const isSearchDisabled = 
    loading || 
    !token.trim() || 
    (!useCustomUrl && !baseUrl) || 
    (useCustomUrl && !customUrl.trim());

  return (
    <>
      <s-paragraph>
        Configura la conexión con el backend de Recibelo para acceder a los centros logísticos.
      </s-paragraph>

      <BackendUrlSelector
        baseUrl={baseUrl}
        customUrl={customUrl}
        useCustomUrl={useCustomUrl}
        savedLogisticCenter={savedLogisticCenter}
        onBaseUrlChange={onBaseUrlChange}
        onUseCustomUrlChange={onUseCustomUrlChange}
        onCustomUrlChange={onCustomUrlChange}
      />

      <s-box paddingBlockStart="base">
        <s-text-field
          label="Token de API"
          value={token}
          onChange={(e) => onTokenChange(e.currentTarget.value)}
          placeholder="Ingresa el token de API de Recibelo"
        />
        <s-paragraph>Token requerido para autenticar las peticiones al backend</s-paragraph>
      </s-box>
      
      <s-box paddingBlockStart="base" paddingBlockEnd="base">
        <s-button
          variant="primary"
          onClick={onSearch}
          disabled={isSearchDisabled}
          loading={loading}
        >
          {loading ? 'Buscando...' : 'Buscar Centros Logísticos'}
        </s-button>
      </s-box>

      {error && (
        <s-box paddingBlockEnd="base">
          <s-banner tone="critical">
            <strong>Error de Conexión:</strong> {error}
          </s-banner>
        </s-box>
      )}

      {success && (
        <s-box paddingBlockEnd="base">
          <s-banner tone="success">
            {success}
          </s-banner>
        </s-box>
      )}
    </>
  );
}

