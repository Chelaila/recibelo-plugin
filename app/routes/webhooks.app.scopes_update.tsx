import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getCarrierServices, createCarrierService, updateCarrierService } from "../utils/carrierService";
import type { CarrierService } from "../interfaces";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { payload, session, topic, shop } = await authenticate.webhook(request);
    console.log(`Received ${topic} webhook for ${shop}`);

    const current = payload.current as string[];
    if (session) {
        await db.session.update({   
            where: {
                id: session.id
            },
            data: {
                scope: current.toString(),
            },
        });
        try {
            const shopDomain = session.shop;
            const accessToken = session.accessToken;
            if (shopDomain && accessToken) {
                const desiredCallbackUrl = `${process.env.SHOPIFY_APP_URL}/api/shipping-rates`;
                const services = await getCarrierServices(shopDomain, accessToken);
                const existing = services?.find((s: CarrierService) => s.name?.toLowerCase().includes('recibelo'));

                if (!existing) {
                    await createCarrierService(shopDomain, accessToken, {
                        name: 'Recibelo - Servicio de Envío',
                        callbackUrl: desiredCallbackUrl,
                        serviceDiscovery: true,
                    });
                } else {
                    const needsUpdate =
                        existing.callbackUrl !== desiredCallbackUrl ||
                        existing.active !== true ||
                        existing.supportsServiceDiscovery !== true;
                    if (needsUpdate) {
                        await updateCarrierService(shopDomain, accessToken, existing.id, {
                            callbackUrl: desiredCallbackUrl,
                            serviceDiscovery: true,
                        });
                    }
                }
            }
        } catch (err) {
            console.error('❌ scopes_update webhook: error ensuring carrier service:', err);
        }
    }
    return new Response();
};
