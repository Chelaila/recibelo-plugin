import { PrismaClient } from '@prisma/client';
import { Commune, Tax } from '../interfaces/taxes';

const prisma = new PrismaClient();


export async function getComunasTarifas(): Promise<Commune[]> {
  const comunas = await prisma.commune.findMany({
    include: {
      region: true,
      tax: true,
    },
  });
  return comunas;
}

export async function updateComunaTarifa(comunaId: number, updates: Partial<Commune>): Promise<Commune | null> {
  const comuna = await prisma.commune.update({
    where: { id: comunaId },
    include: {
      tax: true,
    },
    data: {
      name: updates.name,
      isActive: updates.isActive,
      tax_id: updates.tax_id,
      region_id: updates.region_id,
    },
  });
  return comuna;
}

export async function getComunasByRegion(region: string): Promise<Commune[]> {
  const comunas = await prisma.commune.findMany({
    where: {
      region: {
        name: region,
      },
    },
    include: {
      region: true,
      tax: true,
    },
  });
  return comunas;
}

// Funciones de utilidad para usar en la aplicación
export async function getComunaTarifaByCity(cityName: string): Promise<Commune | null> {
  if (!cityName || cityName.trim() === '') {
    return null;
  }

  // Normalizar nombre de búsqueda: trim, lowercase, quitar acentos, quitar espacios extra
  const normalizedSearch = cityName.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples a uno solo
    .trim();

  // Obtener todas las comunas y buscar con normalización
  const allComunas = await prisma.commune.findMany({
    include: {
      tax: true,
    },
  });

  // Función auxiliar para normalizar nombres
  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      .replace(/\s+/g, ' ') // Normalizar espacios múltiples
      .trim();
  };

  // Primero intentar búsqueda exacta (case-insensitive, sin acentos, espacios normalizados)
  let commune = allComunas.find(c => {
    const normalizedName = normalizeName(c.name);
    return normalizedName === normalizedSearch;
  });

  // Si no se encuentra, intentar búsqueda parcial (contiene)
  // Priorizar cuando el nombre de la comuna contiene el término de búsqueda
  if (!commune) {
    const foundCommune = allComunas.find(c => {
      const normalizedName = normalizeName(c.name);
      // Si el nombre de la comuna contiene el término de búsqueda (más confiable)
      if (normalizedName.includes(normalizedSearch)) {
        return true;
      }
      // Si el término de búsqueda contiene el nombre de la comuna (para casos como "Providenci" -> "Providencia")
      if (normalizedSearch.includes(normalizedName)) {
        return true;
      }
      return false;
    });
    commune = foundCommune;
  }

  return commune || null;
}

export async function updateRate(idComune: number, data: Partial<Tax>): Promise<Commune[] | null> {
  const comuna = await prisma.commune.findUnique({
    where: { id: idComune },
    include: {
      tax: true,
    },
  });
  if (!comuna) {
    return null;
  }
  await prisma.tax.update({
    where: { id: comuna.tax_id },
    data,
  });

  const comunasUpdated = await prisma.commune.findMany();
  return comunasUpdated;
}

export async function getCommuneById(id: number): Promise<Commune | null> {
  const commune = await prisma.commune.findUnique({
    where: { id },
    include: {
      tax: true,
    },
  });
  return commune;
}