import { prisma } from '@/lib/prisma'
import GoalsClient from '@/components/GoalsClient'

export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
  const goals = await prisma.goal.findMany({
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  })
  return <GoalsClient goals={goals} />
}
