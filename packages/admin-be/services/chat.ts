import { PrismaClient } from '../prisma/generated/client/client'

export type CreateChatInput = {
  message: string
  userId: string
  adminId?: string | null
  adminRole?: string | null
  imageUrl?: string | null
}

export default function ChatService(prisma: PrismaClient) {
  return {
    async createChat(input: CreateChatInput) {
      const { message, userId, adminId = null, adminRole = null, imageUrl = null } = input
      return prisma.chat.create({
        data: {
          message,
          userId,
          adminId,
          adminRole: adminRole as any,
          imageUrl,
        },
      })
    },

    async listChats(options: { userId?: string; adminId?: string; page?: number; limit?: number; order?: 'asc' | 'desc' } = {}) {
      const { userId, adminId, page = 1, limit = 100, order = 'asc' } = options
      const where: any = {}
      if (userId) where.userId = userId
      if (adminId) where.adminId = adminId

      const skip = (page - 1) * limit

      return prisma.chat.findMany({
        where,
        orderBy: { createdAt: order },
        skip,
        take: limit,
      })
    },

    // Return list of admins the given user has chats with (latest message per admin)
    async listAdminsForUser(userId: string) {
      const chats = await prisma.chat.findMany({
        where: { userId, adminId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { adminId: true, adminRole: true, message: true, createdAt: true, id: true },
      })

      const seen = new Set<string>()
      const result: Array<{ adminId: string; adminRole?: string | null; lastMessage: string; lastAt: Date; chatId: string }> = []
      for (const c of chats) {
        if (!c.adminId) continue
        if (seen.has(c.adminId)) continue
        seen.add(c.adminId)
        result.push({ adminId: c.adminId, adminRole: c.adminRole || null, lastMessage: c.message, lastAt: c.createdAt, chatId: c.id })
      }

      return result
    },

    // Return list of users the given admin has chats with (latest message per user)
    async listUsersForAdmin(adminId: string) {
      const chats = await prisma.chat.findMany({
        where: { adminId },
        orderBy: { createdAt: 'desc' },
        select: { userId: true, message: true, createdAt: true, id: true },
      })

      const seen = new Set<string>()
      const result: Array<{ userId: string; lastMessage: string; lastAt: Date; chatId: string }> = []
      for (const c of chats) {
        if (!c.userId) continue
        if (seen.has(c.userId)) continue
        seen.add(c.userId)
        result.push({ userId: c.userId, lastMessage: c.message, lastAt: c.createdAt, chatId: c.id })
      }

      return result
    },

    async getChatById(id: string) {
      return prisma.chat.findUnique({ where: { id } })
    },

    async deleteChat(id: string) {
      return prisma.chat.delete({ where: { id } })
    },
  }
}
