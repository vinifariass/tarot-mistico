import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { ConsultationChat } from './ConsultationChat'

export default async function ConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { id } = await params

  const consultation = await prisma.consultation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })

  if (!consultation) notFound()
  if (consultation.userId !== session.user.id) notFound()

  if (consultation.status === 'pending_payment') {
    redirect(`/assinar?consultationId=${id}`)
  }

  return <ConsultationChat consultation={consultation as any} />
}
