const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'
const dbFile = dbUrl.replace(/^file:/, '')
const dbPath = dbFile.startsWith('/') ? dbFile : path.resolve(process.cwd(), dbFile)
const dbDir = path.dirname(dbPath)

// This only ever runs at container runtime now (not during npm install), so a
// missing directory means the path needs to be created, not that we should skip.
if (!fs.existsSync(dbDir)) {
  console.log(`migrate: creating database directory at ${dbDir}`)
  fs.mkdirSync(dbDir, { recursive: true })
}

try {
  console.log('migrate: running prisma db push...')
  execSync('npx prisma db push', { stdio: 'inherit' })

  // Check habit count directly via better-sqlite3 to avoid spawning a full Prisma client
  const Database = require('better-sqlite3')
  const db = new Database(dbPath)

  let habitCount = 0
  try {
    habitCount = db.prepare('SELECT COUNT(*) AS n FROM Habit').get().n
  } catch {
    // Table doesn't exist yet (fresh db before first push) — seed will be skipped
    // and will be picked up on the next start after the schema is created.
  }

  if (habitCount === 0) {
    db.close()
    console.log('migrate: database is empty, running seed...')
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' })
  } else {
    console.log(`migrate: ${habitCount} habit(s) found, skipping seed`)

    // seed.ts only runs on a genuinely empty DB. On an already-running install,
    // add newly-introduced content once, without touching anything existing.
    const itemCount = db.prepare('SELECT COUNT(*) AS n FROM RelationshipItem').get().n
    if (itemCount === 0) {
      console.log('migrate: adding date ideas + deep questions...')
      const insertItem = db.prepare('INSERT INTO RelationshipItem (kind, text, icon) VALUES (?, ?, ?)')
      const items = [
        ['date_idea', 'ראמן', '🍜'],
        ['date_idea', 'באולינג', '🎳'],
        ['date_idea', 'סנוקר', '🎱'],
        ['date_idea', 'טיול טבע', '🥾'],
        ['date_idea', 'בית קפה', '☕'],
        ['date_idea', 'חוף ים', '🏖️'],
        ['question', 'מה הדבר שהכי גאה אותך בי בזמן האחרון, גם אם לא אמרת את זה בקול?', null],
        ['question', 'מתי לאחרונה הרגשת הכי אהוב/ה על ידי, ומה בדיוק עשיתי שגרם לזה?', null],
        ['question', 'איזה צד בי את/ה חושב/ת שאני לא רואה מספיק בעצמי?', null],
        ['question', 'מה הדבר שהכי מפחיד אותך לגבי העתיד שלנו, ולא סיפרת לי עליו?', null],
        ['question', 'יש רגע בזוגיות שלנו שפגעתי בך ולא ידעתי? מה קרה שם?', null],
        ['question', 'מתי הרגשת הכי לבד, גם כשהיינו באותו חדר?', null],
        ['question', 'איך נראים החיים שלנו בעוד חמש שנים, בעולם האידיאלי שלך?', null],
        ['question', 'מה משהו שתמיד רצית לעשות ביחד ומעולם לא הצענו?', null],
        ['question', 'איפה את/ה רוצה שנהיה כזוג שאנחנו עדיין לא?', null],
        ['question', 'מה הרגע שבו הבנת שאת/ה מאוהב/ת בי?', null],
        ['question', 'מה הדבר הכי מפתיע שגילית עליי מאז שהתחלנו?', null],
        ['question', 'איזו תקופה בילדות שלך את/ה חושב/ת שעיצבה איך את/ה אוהב/ת היום?', null],
        ['question', 'מה הדבר הכי קטן שאני יכול/ה לעשות השבוע שהכי יגרום לך להרגיש נאהב/ת?', null],
        ['question', 'יש משהו שאת/ה צריך/ה ממני יותר, ומתבייש/ת לבקש?', null],
        ['question', 'מה קורה אצלך כשאנחנו רבים — מה את/ה באמת מרגיש/ה מתחת לכעס?', null],
        ['question', 'אם היינו צריכים לתאר את הזוגיות שלנו במילה אחת, מה הייתה המילה?', null],
        ['question', 'מה הדבר הכי מצחיק שקרה לנו ביחד שאת/ה עדיין נזכר/ת בו?', null],
        ['question', 'איזו תכונה שלי היית רוצה שתדבק בך?', null],
      ]
      const insertMany = db.transaction((rows) => {
        for (const row of rows) insertItem.run(...row)
      })
      insertMany(items)
    }

    const relChallengeCount = db
      .prepare("SELECT COUNT(*) AS n FROM Challenge WHERE category = 'relationship'")
      .get().n
    if (relChallengeCount === 0) {
      console.log('migrate: adding "דייט קבוע" challenge...')
      db.prepare(
        `INSERT INTO Challenge (title, description, icon, xpReward, frequency, targetCount, category, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
      ).run(
        'דייט קבוע',
        'לצאת לדייט (לא מסעדה כברירת מחדל) — תבדוק את רעיונות הדייטים לפני שאת/ה קובע/ת',
        '💕',
        120,
        'weekly',
        1,
        'relationship'
      )
    }

    db.close()
  }
} catch (err) {
  console.error('migrate: error —', err.message)
  process.exit(1)
}
