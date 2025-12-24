import { LogisticCenter } from '../interfaces';

interface ConfiguredLogisticCenterViewProps {
  savedLogisticCenter: LogisticCenter;
  deleteLoading: boolean;
  deleteError: string | null;
  deleteSuccess: string | null;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function ConfiguredLogisticCenterView({
  savedLogisticCenter,
  deleteLoading,
  deleteError,
  deleteSuccess,
  onUpdate,
  onDelete,
}: ConfiguredLogisticCenterViewProps) {
  return (
    <>
      <s-section heading="Centro Logístico Configurado">
        <s-section padding="none">
          <s-heading>{savedLogisticCenter.name}</s-heading>
          <s-paragraph>
            {savedLogisticCenter.baseUrl}/api/{savedLogisticCenter.accessToken}
          </s-paragraph>
        </s-section>
        
        <s-table variant="list">
          <s-table-header-row>
            <s-table-header>Nombre</s-table-header>
            <s-table-header>Responsable</s-table-header>
            <s-table-header>Dirección</s-table-header>
            <s-table-header>ID</s-table-header>
            <s-table-header>Email</s-table-header>
            <s-table-header>Teléfono</s-table-header>
            <s-table-header>Estado</s-table-header>
          </s-table-header-row>
          <s-table-body>
            <s-table-row>
              <s-table-cell>{savedLogisticCenter.name}</s-table-cell>
              <s-table-cell>{savedLogisticCenter.responsable}</s-table-cell>
              <s-table-cell>
                {savedLogisticCenter.address + (savedLogisticCenter.detail ? ' - ' + savedLogisticCenter.detail : '')}
              </s-table-cell>
              <s-table-cell>{savedLogisticCenter.id}</s-table-cell>
              <s-table-cell>{savedLogisticCenter.email}</s-table-cell>
              <s-table-cell>{savedLogisticCenter.phone}</s-table-cell>
              <s-table-cell>
                <s-badge tone={savedLogisticCenter.active ? 'success' : 'critical'}>
                  {savedLogisticCenter.active ? 'Activo' : 'Inactivo'}
                </s-badge>
              </s-table-cell>
            </s-table-row>
          </s-table-body>
        </s-table>
      </s-section>

      <s-section heading="Acciones">
        {deleteError && (
          <s-box paddingBlockEnd="base">
            <s-banner tone="critical">
              <strong>Error:</strong> {deleteError}
            </s-banner>
          </s-box>
        )}
        
        {deleteSuccess && (
          <s-box paddingBlockEnd="base">
            <s-banner tone="success">
              <strong>Éxito:</strong> {deleteSuccess}
            </s-banner>
          </s-box>
        )}

        <s-box paddingBlockStart="base" paddingBlockEnd="base">
          <s-button variant="primary" onClick={onUpdate}>
            Actualizar Centro Logístico
          </s-button>
        </s-box>
        
        <s-box paddingBlockEnd="base">
          <s-button
            variant="primary"
            tone="critical"
            onClick={onDelete}
            disabled={deleteLoading}
            loading={deleteLoading}
          >
            {deleteLoading ? 'Eliminando...' : 'Eliminar Centro Logístico'}
          </s-button>
        </s-box>
      </s-section>
    </>
  );
}

