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
  const commune = await prisma.commune.findFirst({
    where: {
      name: cityName,
    },
    include: {
      tax: true,
    },
  });
  if (!commune) return null;
  return commune;
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