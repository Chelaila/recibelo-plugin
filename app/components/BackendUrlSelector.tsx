import { LogisticCenter, BackendUrlOption } from '../interfaces';

interface BackendUrlSelectorProps {
  baseUrl: string;
  customUrl: string;
  useCustomUrl: boolean;
  savedLogisticCenter: LogisticCenter | null;
  onBaseUrlChange: (url: string) => void;
  onUseCustomUrlChange: (useCustom: boolean) => void;
  onCustomUrlChange: (url: string) => void;
}

// URLs base predefinidas
export const BACKEND_URL_OPTIONS: BackendUrlOption[] = [
  { value: 'https://staging-api.recibelo.cl', label: 'Staging API (staging-api.recibelo.cl)' },
  { value: 'https://app.recibelo.cl', label: 'Producción (app.recibelo.cl)' },
  { value: 'https://api4-dev.recibelo.cl', label: 'Development (api4-dev.recibelo.cl)' },
  { value: 'https://api4.recibelo.cl', label: 'App4 (api4.recibelo.cl)' },
];

export default function BackendUrlSelector({
  baseUrl,
  customUrl,
  useCustomUrl,
  onBaseUrlChange,
  onUseCustomUrlChange,
  onCustomUrlChange,
}: BackendUrlSelectorProps) {
  return (
    <s-section>
      <s-select
        label="URL Base del Backend"
        value={useCustomUrl ? 'custom' : baseUrl}
        onChange={(e) => {
          const value = (e.target as HTMLSelectElement).value;
          if (value === 'custom') {
            onUseCustomUrlChange(true);
          } else {
            onUseCustomUrlChange(false);
            onBaseUrlChange(value);
          }
        }}
      >
        {BACKEND_URL_OPTIONS.map((option) => (
          <s-option key={option.value} value={option.value}>
            {option.label}
          </s-option>
        ))}
        <s-option value="custom">URL Personalizada</s-option>
      </s-select>

      {useCustomUrl && (
        <s-box paddingBlockStart="base">
          <s-text-field
            label="URL Personalizada"
            value={customUrl}
            onChange={(e) => onCustomUrlChange(e.currentTarget.value)}
            placeholder="https://ejemplo.recibelo.cl"
          />
          <s-paragraph>Ingresa la URL base completa (ej: https://app.recibelo.cl)</s-paragraph>
        </s-box>
      )}
    </s-section>
  );
}

