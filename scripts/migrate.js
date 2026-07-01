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
  db.close()

  if (habitCount === 0) {
    console.log('migrate: database is empty, running seed...')
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' })
  } else {
    console.log(`migrate: ${habitCount} habit(s) found, skipping seed`)
  }
} catch (err) {
  console.error('migrate: error —', err.message)
  process.exit(1)
}
