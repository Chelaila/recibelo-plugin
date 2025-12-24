import { LogisticCenter } from '../interfaces';

interface LogisticCenterSelectorProps {
  logisticCenters: LogisticCenter[];
  selectedCenter: string;
  confirmLoading: boolean;
  confirmError: string | null;
  confirmSuccess: string | null;
  onCenterChange: (centerId: string) => void;
  onConfirm: () => void;
}

export default function LogisticCenterSelector({
  logisticCenters,
  selectedCenter,
  confirmLoading,
  confirmError,
  confirmSuccess,
  onCenterChange,
  onConfirm,
}: LogisticCenterSelectorProps) {
  const handleCenterChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    onCenterChange(target.value);
  };

  const center = logisticCenters.find(c => c.id.toString() === selectedCenter);

  return (
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

      {selectedCenter && center && (
        <>
          <s-section heading="Información del Centro Seleccionado">
            <s-table variant="list">
              <s-table-header-row>
                <s-table-header>Nombre</s-table-header>
                <s-table-header>ID</s-table-header>
                <s-table-header>Dirección</s-table-header>
                <s-table-header>Responsable</s-table-header>
                <s-table-header>Email</s-table-header>
                <s-table-header>Teléfono</s-table-header>
                <s-table-header>Comuna ID</s-table-header>
                <s-table-header listSlot="labeled">Estado</s-table-header>
                <s-table-header>Detalle</s-table-header>
                <s-table-header>Creado</s-table-header>
                <s-table-header>Actualizado</s-table-header>
              </s-table-header-row>
              <s-table-body>
                <s-table-row>
                  <s-table-cell>{center.name}</s-table-cell>
                  <s-table-cell>{center.id}</s-table-cell>
                  <s-table-cell>{center.address}</s-table-cell>
                  <s-table-cell>{center.responsable}</s-table-cell>
                  <s-table-cell>{center.email}</s-table-cell>
                  <s-table-cell>{center.phone}</s-table-cell>
                  <s-table-cell>{center.commune_id}</s-table-cell>
                  <s-table-cell>
                    <s-badge tone={center.active ? 'success' : 'critical'}>
                      {center.active ? 'Activo' : 'Inactivo'}
                    </s-badge>
                  </s-table-cell>
                  <s-table-cell>{center.detail || '-'}</s-table-cell>
                  <s-table-cell>{new Date(center.created_at).toLocaleDateString()}</s-table-cell>
                  <s-table-cell>{new Date(center.updated_at).toLocaleDateString()}</s-table-cell>
                </s-table-row>
              </s-table-body>
            </s-table>
          </s-section>

          {confirmError && (
            <s-box paddingBlockStart="base" paddingBlockEnd="base">
              <s-banner tone="critical">
                <strong>Error:</strong> {confirmError}
              </s-banner>
            </s-box>
          )}
          
          {confirmSuccess && (
            <s-box paddingBlockStart="base" paddingBlockEnd="base">
              <s-banner tone="success">
                <strong>Éxito:</strong> {confirmSuccess}
              </s-banner>
            </s-box>
          )}
          
          <s-box paddingBlockStart="base" paddingBlockEnd="base">
            <s-button
              variant="primary"
              onClick={onConfirm}
              disabled={confirmLoading}
              loading={confirmLoading}
            >
              {confirmLoading ? 'Guardando...' : 'Confirmar y Guardar'}
            </s-button>
          </s-box>
        </>
      )}
    </s-section>
  );
}

