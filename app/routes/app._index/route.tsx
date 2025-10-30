import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    await authenticate.admin(request);
    return null;
};


export default function AppIndex() {
  return (
    <s-page heading="Recibelo - Plugin de Envío">
      <s-section heading="Bienvenido a Recibelo">
        <s-paragraph>
          Configura y gestiona las tarifas de envío para tu tienda Shopify con Recibelo.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}


