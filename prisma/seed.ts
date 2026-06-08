import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'

const dbPath = path.resolve(__dirname, '../dev.db')
const adapter = new PrismaBetterSqlite3({ url: dbPath })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Clear existing data
  await prisma.habitLog.deleteMany()
  await prisma.habit.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.quote.deleteMany()

  // Default habits (morning routine)
  await prisma.habit.createMany({
    data: [
      { name: 'שתיית מים', icon: '💧', xpValue: 10, order: 1 },
      { name: '10 דקות שמש', icon: '☀️', xpValue: 15, order: 2 },
      { name: 'מקלחת קרה', icon: '🚿', xpValue: 20, order: 3 },
      { name: 'מתיחות גוף', icon: '🧘', xpValue: 15, order: 4 },
      { name: 'קריאת מטרות', icon: '🎯', xpValue: 10, order: 5 },
    ],
  })

  // Pinned career goal
  await prisma.goal.create({
    data: {
      text: 'להיות סוחר נוסטרו מצליח',
      category: 'career',
      isPinned: true,
    },
  })

  // 20 motivational quotes
  await prisma.quote.createMany({
    data: [
      { text: 'The most important investment you can make is in yourself.', author: 'Warren Buffett' },
      { text: 'Price is what you pay. Value is what you get.', author: 'Warren Buffett' },
      { text: 'Risk comes from not knowing what you are doing.', author: 'Warren Buffett' },
      { text: 'It takes 20 years to build a reputation and five minutes to ruin it.', author: 'Warren Buffett' },
      { text: 'The stock market is a device for transferring money from the impatient to the patient.', author: 'Warren Buffett' },
      { text: 'Wealth is the ability to fully experience life.', author: 'Henry David Thoreau' },
      { text: 'Get rich slow. That is the only way to get rich and stay rich.', author: 'Naval Ravikant' },
      { text: 'Seek wealth, not money or status. Wealth is having assets that earn while you sleep.', author: 'Naval Ravikant' },
      { text: 'You should be working on your product and getting product-market fit. Code and users are the only things that matter.', author: 'Naval Ravikant' },
      { text: 'You will not get rich renting out your time. You must own equity to gain your financial freedom.', author: 'Naval Ravikant' },
      { text: 'Waste no more time arguing what a good man should be. Be one.', author: 'Marcus Aurelius' },
      { text: 'The impediment to action advances action. What stands in the way becomes the way.', author: 'Marcus Aurelius' },
      { text: 'You have power over your mind, not outside events. Realize this, and you will find strength.', author: 'Marcus Aurelius' },
      { text: 'דעת את עצמך היא ראשית החוכמה.', author: 'Marcus Aurelius' },
      { text: 'Invert, always invert: Turn a situation or problem upside down. Look at it backwards.', author: 'Charlie Munger' },
      { text: 'It is not supposed to be easy. Anyone who finds it easy is stupid.', author: 'Charlie Munger' },
      { text: 'The best thing a human being can do is to help another human being know more.', author: 'Charlie Munger' },
      { text: 'כישלון הוא אופציה כאן. אם דברים לא נכשלים, אינך מחדש מספיק.', author: 'Elon Musk' },
      { text: 'משמעת היא הגשר בין מטרות להישגים.', author: 'Jim Rohn' },
      { text: 'אל תחכה. הזמן לעולם לא יהיה נכון בדיוק.', author: 'Napoleon Hill' },
    ],
  })

  console.log('✅ Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
