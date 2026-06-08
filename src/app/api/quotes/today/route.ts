import { prisma } from '@/lib/prisma'
import { getDayOfYear } from '@/lib/utils'

export async function GET() {
  const quotes = await prisma.quote.findMany({ orderBy: { id: 'asc' } })
  if (quotes.length === 0) return Response.json({ text: '', author: '' })
  const idx = getDayOfYear() % quotes.length
  return Response.json(quotes[idx])
}
