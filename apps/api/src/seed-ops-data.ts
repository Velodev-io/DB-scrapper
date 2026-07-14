import { PrismaClient } from '@prisma/client'
import { assertNotProduction } from './lib/db-guard'

assertNotProduction()

const prisma = new PrismaClient()

async function main() {
  const agentId = 'cmrj41zb60000uiaodacnqekz' // Found agent ID

  console.log('Seeding mock Labours...')
  const labours = [
    {
      fullName: 'Ramesh Kumar',
      age: 34,
      gender: 'Male',
      skillLevel: 'Skilled',
      skillType: 'Mason / Bricklayer',
      phone: '+919876543210',
      minimumWage: 650,
      houseNo: 'Flat 102',
      street: 'Gandhi Road',
      locality: 'Indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
      reviewStatus: 'pending',
      agentId,
    },
    {
      fullName: 'Sunita Devi',
      age: 29,
      gender: 'Female',
      skillLevel: 'Non-Skilled',
      skillType: 'Civil Helper / General Labour',
      phone: '+919876543211',
      minimumWage: 450,
      houseNo: 'House 44',
      street: 'Main Bazaar',
      locality: 'Whitefield',
      city: 'Bengaluru',
      pincode: '560066',
      reviewStatus: 'pending',
      agentId,
    },
    {
      fullName: 'Amit Patel',
      age: 41,
      gender: 'Male',
      skillLevel: 'Skilled',
      skillType: 'Electrician',
      phone: '+919876543212',
      minimumWage: 800,
      houseNo: 'B-305',
      street: 'Green Valley road',
      locality: 'Marathahalli',
      city: 'Bengaluru',
      pincode: '560037',
      reviewStatus: 'reviewed',
      agentId,
    },
    {
      fullName: 'Suresh Rao',
      age: 38,
      gender: 'Male',
      skillLevel: 'Skilled',
      skillType: 'Plumber',
      phone: '+919876543213',
      minimumWage: 750,
      houseNo: 'Plot 15',
      street: 'Lakeview Avenue',
      locality: 'BTM Layout',
      city: 'Bengaluru',
      pincode: '560076',
      reviewStatus: 'pending',
      agentId,
    },
    {
      fullName: 'Priya Sharma',
      age: 26,
      gender: 'Female',
      skillLevel: 'Skilled',
      skillType: 'Painter',
      phone: '+919876543214',
      minimumWage: 600,
      houseNo: 'Door 2A',
      street: 'Rose Garden',
      locality: 'Jayanagar',
      city: 'Bengaluru',
      pincode: '560041',
      reviewStatus: 'reviewed',
      agentId,
    },
  ]

  for (const l of labours) {
    await prisma.labour.create({ data: l })
  }

  console.log('Seeding mock Shops...')
  const shops = [
    {
      shopName: 'Sri Balaji Cement & Steel',
      shopType: 'Cement',
      keeperName: 'Balaji Rao',
      keeperPhone: '+919988776655',
      address: '45, Indiranagar Double Road, Bengaluru',
      lat: 12.9716,
      lng: 77.5946,
      reviewStatus: 'pending',
      agentId,
    },
    {
      shopName: 'Vikas Brick Kiln & Co.',
      shopType: 'Bricks',
      keeperName: 'Vikas Gowda',
      keeperPhone: '+919988776656',
      address: 'Survey No 89, Whitefield Main Road, Bengaluru',
      lat: 12.9698,
      lng: 77.7499,
      reviewStatus: 'reviewed',
      agentId,
    },
    {
      shopName: 'Royal Hardware & Paints',
      shopType: 'Hardware & Tools',
      keeperName: 'Mohammad Ali',
      keeperPhone: '+919988776657',
      address: '22, Outer Ring Road, Marathahalli, Bengaluru',
      lat: 12.9562,
      lng: 77.7011,
      reviewStatus: 'pending',
      agentId,
    },
    {
      shopName: 'Elite Tiles & Sanitaryware',
      shopType: 'Tiles & Flooring',
      keeperName: 'Rajesh Hegde',
      keeperPhone: '+919988776658',
      address: '108, 100 Feet Road, Jayanagar, Bengaluru',
      lat: 12.9307,
      lng: 77.5838,
      reviewStatus: 'reviewed',
      agentId,
    },
  ]

  for (const s of shops) {
    await prisma.shop.create({ data: s })
  }

  console.log('Seeding successful!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
