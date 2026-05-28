import { Router } from 'express'
import type { Request, Response } from 'express'
import { PrismaClient } from '../prisma/generated/client/client'
import ChatService from '../services/chat'
import { authenticateAdmin } from '../middleware/unifiedAuth'
import type { AuthenticatedRequest } from '../middleware/unifiedAuth'

export default function (prisma: PrismaClient) {
  const router = Router()
  const chatService = ChatService(prisma)

  // Create a new chat message (admins only)
  router.post('/create', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { message, userId, adminId, adminRole, imageUrl } = req.body

      if (!message || !userId) {
        return res.status(400).json({ success: false, message: 'message and userId are required' })
      }

      const chat = await chatService.createChat({ message, userId, adminId, adminRole, imageUrl })

      return res.json({ success: true, data: chat })
    } catch (err) {
      console.error('Error creating chat:', err)
      return res.status(500).json({ success: false, message: 'Failed to create chat' })
    }
  })

  // Get chats for a user (admins only) - ordered by createdAt ascending
  router.get('/list', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { userId, adminId } = req.query

      if (!userId && !adminId) {
        return res.status(400).json({ success: false, message: 'userId or adminId query parameter required' })
      }

      const where: any = {}
      if (userId) where.userId = userId as string
      if (adminId) where.adminId = adminId as string

      const chats = await chatService.listChats({ userId: where.userId, adminId: where.adminId, order: 'asc' })

      return res.json({ success: true, data: chats })
    } catch (err) {
      console.error('Error fetching chats:', err)
      return res.status(500).json({ success: false, message: 'Failed to fetch chats' })
    }
  })

  // Get list of users the authenticated admin has chatted with (latest message per user)
  router.get('/admins', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      // Prefer admin id from authenticated token; fallback to query param for testing
      const authReq = req as AuthenticatedRequest
      const adminIdFromToken = authReq?.admin?.id
      const adminIdQuery = req.query.adminId as string | undefined

      const adminId = adminIdFromToken || adminIdQuery

      if (!adminId) {
        return res.status(400).json({ success: false, message: 'adminId required (authenticated admin or adminId query param)' })
      }

      const users = await chatService.listUsersForAdmin(adminId as string)

      return res.json({ success: true, data: users })
    } catch (err) {
      console.error('Error fetching users for admin chats:', err)
      return res.status(500).json({ success: false, message: 'Failed to fetch users list' })
    }
  })

  return router
}
