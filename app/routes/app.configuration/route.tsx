import { useLoaderData } from 'react-router';
import { CarrierService } from '../../interfaces';

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import { getCarrierServices, createCarrierService, updateCarrierService } from "../../utils/carrierService";
import prisma from "../../db.server";
import LogisticCenterSection from '../../components/LogisticCenterSection';
import CarrierServiceSection from '../../components/CarrierServiceSection';

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    const accessToken = session.accessToken;

    if (!shop || !accessToken) {
        throw new Error('Shop or access token not available');
    }

    try {
        // 1) Obtener lista actual
        let carrierServices = await getCarrierServices(shop, accessToken as string);

        // 2) Asegurar existencia/config correcta del servicio de Recibelo (idempotente)
        const desiredCallbackUrl = `${process.env.SHOPIFY_APP_URL}/api/shipping-rates`;
        const existing = carrierServices?.find((service: CarrierService) => 
            service.name?.toLowerCase().includes('recibelo')
        );

        try {
            if (!existing) {
                console.log('📦 Creating carrier service...');
                await createCarrierService(shop, accessToken as string, {
                    name: 'Recibelo - Servicio de Envío',
                    callbackUrl: desiredCallbackUrl,
                    serviceDiscovery: true,
                });
                console.log('✅ Carrier service created successfully');
            } else {
                const needsUpdate =
                    existing.callbackUrl !== desiredCallbackUrl ||
                    existing.active !== true ||
                    existing.supportsServiceDiscovery !== true;

                if (needsUpdate) {
                    console.log('📦 Updating carrier service...');
                    await updateCarrierService(shop, accessToken as string, existing.id, {
                        callbackUrl: desiredCallbackUrl,
                        serviceDiscovery: true,
                    });
                    console.log('✅ Carrier service updated successfully');
                } else {
                    console.log('✅ Carrier service is already configured correctly');
                }
            }
        } catch (ensureError) {
            console.error('❌ Configuration Loader: Error ensuring carrier service:', ensureError);
            // No lanzar el error, solo loguearlo para que la página pueda cargar
            // El usuario puede usar el botón manual en la UI
        }

        // 3) Refrescar lista tras asegurar
        carrierServices = await getCarrierServices(shop, accessToken as string);

        // 4) Obtener centro logístico guardado para esta tienda
        const savedLogisticCenter = await prisma.logisticCenter.findFirst({
            where: { shop }
        });

        return { 
            shop, 
            accessToken, 
            carrierServices, 
            baseUrl: process.env.SHOPIFY_APP_URL,
            stagingBackendUrl: process.env.STAGING_BACKEND_URL || 'https://staging-api.recibelo.cl',
            productionBackendUrl: process.env.PRODUCTION_BACKEND_URL || 'https://app.recibelo.cl',
            savedLogisticCenter: savedLogisticCenter ? {
                id: savedLogisticCenter.externalId,
                externalId: savedLogisticCenter.externalId,
                name: savedLogisticCenter.name,
                address: savedLogisticCenter.address,
                detail: savedLogisticCenter.detail,
                responsable: savedLogisticCenter.responsable,
                email: savedLogisticCenter.email,
                phone: savedLogisticCenter.phone,
                active: savedLogisticCenter.active,
                commune_id: savedLogisticCenter.communeId,
                created_at: savedLogisticCenter.createdAt.toISOString(),
                updated_at: savedLogisticCenter.updatedAt.toISOString(),
                accessToken: savedLogisticCenter.accessToken || null,
                baseUrl: savedLogisticCenter.baseUrl || null,
            } : null
        };
    } catch (error) {
        console.error('❌ Configuration Loader: Error loading carrier services:', error);
        return {
            shop,
            accessToken,
            carrierServices: [],
            baseUrl: process.env.SHOPIFY_APP_URL,
            stagingBackendUrl: process.env.STAGING_BACKEND_URL || 'https://staging-api.recibelo.cl',
            productionBackendUrl: process.env.PRODUCTION_BACKEND_URL || 'https://app.recibelo.cl',
            savedLogisticCenter: null,
            error: error instanceof Error ? error.message : 'Unknown error loading carrier services'
        };
    }
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    const shop = session.shop;
    const formData = await request.formData();
    const intent = formData.get("intent");

    try {
        if (intent === "save_logistic_center") {
            const centerData = JSON.parse(formData.get("centerData") as string);
            const accessTokenValue = formData.get("accessToken");
            const baseUrlValue = formData.get("baseUrl");
            
            // Normalizar el token: convertir string vacío a null, y mantener el valor si existe
            const accessToken = accessTokenValue && typeof accessTokenValue === 'string' && accessTokenValue.trim() !== '' 
                ? accessTokenValue.trim() 
                : null;
            
            // Normalizar la baseUrl: convertir string vacío a null, y mantener el valor si existe
            const baseUrl = baseUrlValue && typeof baseUrlValue === 'string' && baseUrlValue.trim() !== '' 
                ? baseUrlValue.trim() 
                : null;

            console.log('🔐 Saving logistic center with token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'null');
            console.log('🌐 Saving logistic center with baseUrl:', baseUrl || 'null');

            await prisma.logisticCenter.upsert({
                where: {
                    externalId_shop: {
                        externalId: centerData.id,
                        shop: shop
                    }
                },
                create: {
                    externalId: centerData.id,
                    name: centerData.name,
                    address: centerData.address,
                    detail: centerData.detail || null,
                    responsable: centerData.responsable,
                    email: centerData.email,
                    phone: centerData.phone,
                    active: centerData.active ?? true,
                    communeId: centerData.commune_id,
                    shop: shop,
                    accessToken: accessToken,
                    baseUrl: baseUrl,
                },
                update: {
                    externalId: centerData.id,
                    name: centerData.name,
                    address: centerData.address,
                    detail: centerData.detail || null,
                    responsable: centerData.responsable,
                    email: centerData.email,
                    phone: centerData.phone,
                    active: centerData.active ?? true,
                    communeId: centerData.commune_id,
                    accessToken: accessToken,
                    baseUrl: baseUrl,
                }
            });

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (intent === "delete_logistic_center") {
            await prisma.logisticCenter.deleteMany({
                where: { shop }
            });

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Invalid intent' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error saving logistic center:', error);
        return new Response(JSON.stringify({ 
            error: error instanceof Error ? error.message : 'Unknown error' 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export default function ConfigurationPage() {
  const { carrierServices, baseUrl, savedLogisticCenter } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Configuración">
      <LogisticCenterSection 
        savedLogisticCenter={savedLogisticCenter}
      />
      <CarrierServiceSection 
        carrierServices={carrierServices || []}
        baseUrl={baseUrl || ''}
      />
    </s-page>
  );
}


