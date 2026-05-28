import { PrismaClient, SenderType } from '../prisma/generated/client/client'

export type CreateChatInput = {
  message: string
  complaintId: string
  userId?: string | null
  agentId?: string | null
  senderType: SenderType
  imageUrl?: string | null
}

export type ListChatsOptions = {
  complaintId: string
  page?: number
  limit?: number
  order?: 'asc' | 'desc'
}

export default function ChatService(prisma: PrismaClient) {
  return {
    /**
     * Create a new chat message for a specific complaint
     */
    async createChat(input: CreateChatInput) {
      const { message, complaintId, userId = null, agentId = null, senderType, imageUrl = null } = input
      return prisma.chat.create({
        data: {
          message,
          complaintId,
          userId,
          agentId,
          senderType,
          imageUrl,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          agent: {
            select: { id: true, fullName: true, email: true },
          },
        },
      })
    },

    /**
     * Get all chat messages for a specific complaint
     */
    async getChatsForComplaint(options: ListChatsOptions) {
      const { complaintId, page = 1, limit = 100, order = 'asc' } = options
      const skip = (page - 1) * limit

      const [chats, total] = await Promise.all([
        prisma.chat.findMany({
          where: { complaintId },
          orderBy: { createdAt: order },
          skip,
          take: limit,
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            agent: {
              select: { id: true, fullName: true, email: true },
            },
          },
        }),
        prisma.chat.count({ where: { complaintId } }),
      ])

      return {
        chats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    },

    /**
     * Get a single chat message by ID
     */
    async getChatById(id: string) {
      return prisma.chat.findUnique({
        where: { id },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          agent: {
            select: { id: true, fullName: true, email: true },
          },
        },
      })
    },

    /**
     * Delete a chat message by ID
     */
    async deleteChat(id: string) {
      return prisma.chat.delete({ where: { id } })
    },

    /**
     * Get the latest chat for a complaint (useful for previews)
     */
    async getLatestChatForComplaint(complaintId: string) {
      return prisma.chat.findFirst({
        where: { complaintId },
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          agent: {
            select: { id: true, fullName: true, email: true },
          },
        },
      })
    },

    /**
     * Get chat count for a complaint
     */
    async getChatCountForComplaint(complaintId: string) {
      return prisma.chat.count({ where: { complaintId } })
    },

    /**
     * Check if agent has access to chat for a complaint (must be assigned)
     */
    async canAgentChatOnComplaint(agentId: string, complaintId: string) {
      const complaint = await prisma.complaint.findFirst({
        where: {
          id: complaintId,
          OR: [
            { assignedAgentId: agentId },
            { coAssignedAgents: { some: { id: agentId } } },
          ],
        },
      })
      return !!complaint
    },
  }
}
