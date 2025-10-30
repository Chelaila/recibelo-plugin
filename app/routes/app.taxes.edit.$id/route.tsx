import { useState } from "react";
import { useLoaderData, useFetcher } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import { PrismaClient } from "@prisma/client";
import { getCommuneById } from "app/utils/communeService";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  if (!session) throw new Response("Unauthorized", { status: 401 });

  const prisma = new PrismaClient();
  try {
    const id = Number(params.id);
    const commune = await getCommuneById(id);
    return { commune };
  } finally {
    await prisma.$disconnect();
  }
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const prisma = new PrismaClient();
  const form = await request.formData();
  const intent = form.get("intent");
  try {
    const id = Number(params.id);
    const commune = await prisma.commune.findUnique({ where: { id } });
    if (!commune) return new Response("Not Found", { status: 404 });

    if (intent === "save") {
      const description = String(form.get("description") || "");
      const value = Number(form.get("value"));
      const isActive = String(form.get("isActive")) === "true";
      if (commune.tax_id == null) return new Response("Bad Request", { status: 400 });
      await prisma.tax.update({
        where: { id: commune.tax_id },
        data: { description, value, isActive },
      });
      return new Response(null, { status: 303, headers: { Location: "/app/taxes" } });
    }

    return new Response("Bad Request", { status: 400 });
  } finally {
    await prisma.$disconnect();
  }
};

export default function EditTaxPage() {
  const { commune } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [description, setDescription] = useState<string>(commune?.tax?.description || "");
  const [value, setValue] = useState<string>((commune?.tax?.value ?? 0).toString());
  const [active, setActive] = useState<boolean>(!!commune?.tax?.isActive);

  // feedback opcional al guardar
  const isSubmitting = fetcher.state === "submitting";

  const onDescriptionChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    setDescription(target.value);
  };

  const onValueChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    setValue(target.value);
  };

  const onActiveChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    setActive(!!target.checked);
  };

  const onSubmit = () => {
    const form = new FormData();
    form.append("intent", "save");
    form.append("description", description);
    form.append("value", value);
    form.append("isActive", String(active));
    fetcher.submit(form, { method: "post" });
  };

  return (
    <s-page heading={`Editar tarifa - ${commune?.name}`}> 
      <s-section>
        <s-text tone="neutral">Región: {commune?.region?.name || "N/A"}</s-text>
      </s-section>

      <s-section heading="Detalles de la tarifa">
        <s-text-area
          label="Descripción"
          value={description}
          onChange={onDescriptionChange}
        />
        <s-money-field
          label="Valor"
          value={value}
          onChange={onValueChange}
        />
        <s-switch
          label="Activo"
          checked={active}
          onChange={onActiveChange}
        />
      <br />  
      <s-button-group gap="base">
          <s-button slot="primary-action" variant="primary" onClick={onSubmit} loading={isSubmitting}>
            Guardar
          </s-button>
          <s-button slot="secondary-actions"href="/app/taxes" variant="secondary">
            Volver
          </s-button>
        </s-button-group>
      </s-section>
    </s-page>
  );
}


