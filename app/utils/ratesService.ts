import { PrismaClient } from '@prisma/client';
import { Tax } from '../interfaces/taxes';
const prisma = new PrismaClient();

export async function getRates(): Promise<Tax[]> {
  const rates = await prisma.tax.findMany({
    include: {
      communes: true,
    },
  });
  return rates;
}