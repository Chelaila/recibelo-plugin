import { useState, useEffect } from "react";
import { useLoaderData, useFetcher, useNavigate, Outlet, useLocation } from "react-router";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getComunasTarifas } from "../../utils/communeService";
import { Commune, Region } from "../../interfaces";
import { authenticate } from "../../shopify.server";
import { getRegions } from "app/utils/regionService";
// Prisma solo se usa en el servidor dentro de la action
import { PrismaClient } from "@prisma/client";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;
  const accessToken = session.accessToken;
  const comunasData = await getComunasTarifas();
  const regionsData = await getRegions();
  if (!shop || !accessToken) {
    throw new Error("Shop or access token not available");
  }

  return { shop, accessToken, comunasData, regionsData };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const prisma = new PrismaClient();
  const form = await request.formData();
  const intent = form.get("intent");

  try {
    if (intent === "toggle") {
      const taxId = Number(form.get("taxId"));
      const isActive = String(form.get("isActive")) === "true";
      await prisma.tax.update({ where: { id: taxId }, data: { isActive } });
      return new Response(null, { status: 204 });
    }

    if (intent === "update") {
      const taxId = Number(form.get("taxId"));
      const value = Number(form.get("value"));
      const description = String(form.get("description") || "");
      const isActive = String(form.get("isActive")) === "true";
      await prisma.tax.update({
        where: { id: taxId },
        data: { value, description, isActive },
      });
      return new Response(null, { status: 204 });
    }

    return new Response("Bad Request", { status: 400 });
  } finally {
    await prisma.$disconnect();
  }
};

export default function TaxesPage() {
  const { comunasData, regionsData } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = location.pathname.startsWith("/app/taxes/edit/");
  const [comunas, setComunas] = useState<Commune[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    const loadComunas = async () => {
      try {
        setComunas(comunasData);
        setHasNextPage(comunasData.length > itemsPerPage);
        setHasPreviousPage(false);
      } catch (error) {
        console.error("Error loading comunas:", error);
      } finally {
        setLoading(false);
      }
    };

    loadComunas();
  }, [comunasData]);

  useEffect(() => {
    const loadRegions = async () => {
      try {
        setRegions(regionsData);
      } catch (error) {
        console.error("Error loading regions:", error);
      }
    };

    loadRegions();
  }, [regionsData]);

  const filteredComunas = comunas.filter((comuna) => {
    const matchesRegion =
      !selectedRegion || comuna.region?.name === selectedRegion;
    const matchesSearch =
      !searchTerm ||
      comuna.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comuna.region?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comuna.tax?.description.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesRegion && matchesSearch;
  });

  // Ordenar comunas
  const sortedComunas = [...filteredComunas].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case "name":
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case "region":
        aValue = a.region?.name?.toLowerCase() || "";
        bValue = b.region?.name?.toLowerCase() || "";
        break;
      case "value":
        aValue = a.tax?.value || 0;
        bValue = b.tax?.value || 0;
        break;
      case "active":
        aValue = a.tax?.isActive ? 1 : 0;
        bValue = b.tax?.isActive ? 1 : 0;
        break;
      default:
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  // Calcular paginación
  const totalPages = Math.ceil(sortedComunas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedComunas = sortedComunas.slice(startIndex, endIndex);

  // Actualizar estado de paginación
  useEffect(() => {
    setHasNextPage(currentPage < totalPages);
    setHasPreviousPage(currentPage > 1);
  }, [currentPage, totalPages]);

  const handleRegionChange = (event: Event) => {
    const target = event.target as HTMLSelectElement;
    setSelectedRegion(target.value);
    setCurrentPage(1); // Reset a la primera página al cambiar filtro
  };

  const handleSearchChange = (event: Event) => {
    const target = event.target as HTMLInputElement;
    setSearchTerm(target.value);
    setCurrentPage(1); // Reset a la primera página al buscar
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset a la primera página al ordenar
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (hasPreviousPage) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const toggleTaxActive = async (comunaId: number, nextActive: boolean) => {
    setComunas((prev) =>
      prev.map((c) =>
        c.id === comunaId
          ? {
              ...c,
              tax: c.tax ? { ...c.tax, isActive: nextActive } : c.tax,
            }
          : c
      )
    );
    const taxId = comunas.find((c) => c.id === comunaId)?.tax?.id;
    if (taxId) {
      const form = new FormData();
      form.append("intent", "toggle");
      form.append("taxId", String(taxId));
      form.append("isActive", String(nextActive));
      fetcher.submit(form, { method: "post", action: "/app/taxes" });
    }
  };

  if (loading) {
    return (
      <s-page heading="Tarifario">
        <s-section heading="Configuración de Tarifas por Comuna">
          <s-spinner size="large" />
          <s-text>Cargando comunas...</s-text>
        </s-section>
      </s-page>
    );
  }

  if (isEdit) {
    return (
      <s-page heading="Tarifario">
        <Outlet />
      </s-page>
    );
  }

  return (
    <s-page heading="Tarifario">
      <s-section heading="Configuración de Tarifas por Comuna">
        <s-paragraph>
          Gestiona las tarifas de envío para cada comuna de Chile.
        </s-paragraph>

        <s-grid
          gridTemplateColumns="repeat(2, 1fr)"
          gap="small"
          justifyContent="center"
        >
          <s-grid-item gridColumn="span 1">
            <s-select
              label="Filtrar por región"
              value={selectedRegion}
              onChange={handleRegionChange}
            >
              <s-option value="">Todas las regiones</s-option>
              {regions.map((region) => (
                <s-option key={region.id} value={region.name}>
                  {region.name}
                </s-option>
              ))}
            </s-select>
          </s-grid-item>
          <s-grid-item gridColumn="auto">
            <s-search-field
              label="Buscar comunas"
              placeholder="Buscar por nombre de comuna, región o descripción..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </s-grid-item>
        </s-grid>

        <s-section padding="none">
          <s-table
            paginate
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            onNextPage={handleNextPage}
            onPreviousPage={handlePreviousPage}
          >
            <s-table-header-row>
              <s-table-header listSlot="primary">
                <s-clickable onClick={() => handleSort("name")}>
                  Comuna{" "}
                  {sortField === "name" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </s-clickable>
              </s-table-header>
              <s-table-header listSlot="secondary">
                <s-clickable onClick={() => handleSort("region")}>
                  Región{" "}
                  {sortField === "region" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </s-clickable>
              </s-table-header>
              <s-table-header listSlot="labeled">Descripción</s-table-header>
              <s-table-header listSlot="labeled" format="currency">
                <s-clickable onClick={() => handleSort("value")}>
                  Tarifa{" "}
                  {sortField === "value" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </s-clickable>
              </s-table-header>
              <s-table-header listSlot="inline">
                <s-clickable onClick={() => handleSort("active")}>
                  Estado{" "}
                  {sortField === "active" &&
                    (sortDirection === "asc" ? "↑" : "↓")}
                </s-clickable>
              </s-table-header>
              <s-table-header listSlot="labeled">Acciones</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {paginatedComunas.map((comuna) => {
                return (
                  <s-table-row key={comuna.id}>
                    <s-table-cell>{comuna.name}</s-table-cell>
                    <s-table-cell>{comuna.region?.name || "N/A"}</s-table-cell>
                    <s-table-cell>
                      {comuna.tax?.description || "Sin descripción"}
                    </s-table-cell>
                    <s-table-cell>
                      {`$${(comuna.tax?.value || 0).toLocaleString()}`}
                    </s-table-cell>
                    <s-table-cell>
                      <s-switch
                        accessibilityLabel="Estado de la tarifa"
                        checked={!!comuna.tax?.isActive}
                        onChange={(event: Event) => {
                          const target = event.target as HTMLInputElement;
                          toggleTaxActive(comuna.id, !!target.checked);
                        }}
                      />
                    </s-table-cell>
                    <s-table-cell>
                      <s-button onClick={() => {
                        const path = `/app/taxes/edit/${comuna.id}`;
                        console.log("[Taxes] Navigating to edit page:", { path, from: window.location.pathname });
                        navigate(path);
                      }}>Editar</s-button>
                    </s-table-cell>
                  </s-table-row>
                );
              })}
            </s-table-body>
          </s-table>
        </s-section>

        {sortedComunas.length === 0 && !loading && (
          <s-box>
            <s-text tone="neutral">
              {searchTerm
                ? `No se encontraron comunas que coincidan con "${searchTerm}"`
                : "No se encontraron comunas para la región seleccionada."}
            </s-text>
          </s-box>
        )}

        <s-box>
          <s-text tone="neutral">
            Mostrando {startIndex + 1}-
            {Math.min(endIndex, sortedComunas.length)} de {sortedComunas.length}{" "}
            comunas
            {searchTerm && ` (buscando: "${searchTerm}")`}
          </s-text>
        </s-box>
      </s-section>
      {/* Rutas hijas */}
      <Outlet />
    </s-page>
  );
}
