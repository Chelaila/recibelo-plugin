import { PrismaClient } from '@prisma/client';
import { Region } from '../interfaces';

const prisma = new PrismaClient();

export async function getRegions(): Promise<Region[]> {
  const regions = await prisma.region.findMany();
  return regions;
}