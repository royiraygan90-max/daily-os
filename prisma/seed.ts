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
  await prisma.event.deleteMany()
  await prisma.challengeLog.deleteMany()
  await prisma.challenge.deleteMany()
  await prisma.mainQuestLog.deleteMany()
  await prisma.mainQuest.deleteMany()

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

  // Default recurring calendar events
  await prisma.event.createMany({
    data: [
      {
        title: 'ימי מסחר',
        color: '#f59e0b',
        startTime: '09:30',
        endTime: '16:00',
        isRecurring: true,
        daysOfWeek: JSON.stringify([1, 2, 3, 4, 5]),
      },
      {
        title: 'לימודים',
        color: '#7c3aed',
        startTime: '08:30',
        endTime: '14:00',
        isRecurring: true,
        daysOfWeek: JSON.stringify([0, 1, 2]),
      },
      {
        title: 'אימון',
        color: '#10b981',
        startTime: '18:00',
        endTime: '20:00',
        isRecurring: true,
        daysOfWeek: JSON.stringify([1, 3, 5]),
      },
    ],
  })

  await prisma.challenge.createMany({
    data: [
      {
        title: 'ימי מסחר',
        description: 'לסחור לפחות 3 ימים מתוך 5 ימי המסחר בשבוע',
        icon: '📈',
        xpReward: 150,
        frequency: 'weekly',
        targetCount: 3,
        category: 'trading',
      },
      {
        title: 'אימון כוח',
        description: '2 אימוני כוח בשבוע (Fitness Tracker)',
        icon: '💪',
        xpReward: 100,
        frequency: 'weekly',
        targetCount: 2,
        category: 'fitness',
      },
      {
        title: 'פוציבול',
        description: 'משחק פוציבול שבועי אחד לפחות',
        icon: '🏐',
        xpReward: 60,
        frequency: 'weekly',
        targetCount: 1,
        category: 'fitness',
      },
      {
        title: 'גמישות',
        description: 'אימון גמישות/מתיחות פעם בשבוע',
        icon: '🧘',
        xpReward: 60,
        frequency: 'weekly',
        targetCount: 1,
        category: 'fitness',
      },
      {
        title: 'בדיקת רכב',
        description: 'לבדוק שמן ומים לרכב פעם בחודש',
        icon: '🚗',
        xpReward: 50,
        frequency: 'monthly',
        targetCount: 1,
        category: 'life',
      },
    ],
  })

  // Initialize PlayerProfile (preserve existing user progress — upsert with no-op update)
  await prisma.playerProfile.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })

  // Seed MainQuests
  await prisma.mainQuest.createMany({
    data: [
      {
        title: 'פתיחת הדרך',
        description: 'השלם את שגרת הבוקר המלאה פעם אחת',
        icon: '⚔️',
        xpReward: 200,
        requirement: JSON.stringify({ type: 'win_days', value: 1 }),
        isRepeatable: false,
      },
      {
        title: 'שבוע ראשון',
        description: 'השג 7 Win Days',
        icon: '🔥',
        xpReward: 500,
        requirement: JSON.stringify({ type: 'win_days', value: 7 }),
        isRepeatable: false,
      },
      {
        title: 'סוחר מתחיל',
        description: 'סמן 10 ימי מסחר',
        icon: '💹',
        xpReward: 800,
        requirement: JSON.stringify({ type: 'trading_checkins', value: 10 }),
        isRepeatable: false,
      },
      {
        title: 'עולה רמה',
        description: 'הגע ל-Level 5',
        icon: '🏆',
        xpReward: 300,
        requirement: JSON.stringify({ type: 'level', value: 5 }),
        isRepeatable: false,
      },
      {
        title: 'גוף חזק',
        description: 'השלם 20 אימוני כוח',
        icon: '💪',
        xpReward: 600,
        requirement: JSON.stringify({ type: 'fitness_checkins', value: 20 }),
        isRepeatable: false,
      },
      {
        title: 'חודש מנצח',
        description: 'השג 30 Win Days',
        icon: '🌟',
        xpReward: 1500,
        requirement: JSON.stringify({ type: 'win_days', value: 30 }),
        isRepeatable: false,
      },
      {
        title: 'מאסטר',
        description: 'הגע ל-Level 20',
        icon: '🎯',
        xpReward: 2000,
        requirement: JSON.stringify({ type: 'level', value: 20 }),
        isRepeatable: false,
      },
    ],
  })

  console.log('✅ Seed complete')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
