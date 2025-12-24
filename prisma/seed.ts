import { PrismaClient } from '@prisma/client'
import chileData from '../app/data/communesChile.json'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando seed de datos de Chile...')
  
  // Limpiar datos existentes
  console.log('🧹 Limpiando datos existentes...')
  await prisma.commune.deleteMany()
  await prisma.tax.deleteMany()
  await prisma.region.deleteMany()

  const createdRegions: { [key: string]: number } = {}
  const createdTaxes: { [key: string]: number } = {}

  // Procesar cada región
  for (const regionData of chileData.regions) {
    console.log(`📍 Procesando región: ${regionData.name}`)
    
    // Crear región
    const region = await prisma.region.create({
      data: {
        name: regionData.name,
        code: regionData.id,
        isActive: true
      }
    })
    
    createdRegions[regionData.name] = region.id

    // Procesar comunas de la región
    for (const communeData of regionData.communes) {
      if (regionData.id === "RM"){
        console.log(`  🏘️  Procesando comuna: ${communeData.name}`)
      
        // Calcular tarifa de envío
        const shippingRate = 2500;
        const description = "Envio entre 1 y 2 dias habiles";
        // Crear tarifa de envío
        const tax = await prisma.tax.create({
          data: {
            name: `Envío ${communeData.name}`,
            value: shippingRate,
            description: description,
            isActive: true
          }
        })
        
        createdTaxes[`${regionData.name}-${communeData.name}`] = tax.id
  
        // Crear comuna
        await prisma.commune.create({
          data: {
            name: communeData.name,
            isActive: true,
            region_id: region.id,
            tax_id: tax.id
          }
        })
      }
    }
  }

  // Estadísticas finales
  const totalRegions = await prisma.region.count()
  const totalCommunes = await prisma.commune.count()
  const totalTaxes = await prisma.tax.count()

  console.log('✅ Seed completado exitosamente!')
  console.log(`📊 Estadísticas:`)
  console.log(`   - Regiones creadas: ${totalRegions}`)
  console.log(`   - Comunas creadas: ${totalCommunes}`)
  console.log(`   - Tarifas creadas: ${totalTaxes}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })    