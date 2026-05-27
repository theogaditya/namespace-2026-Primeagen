import { Router } from 'express'
import type { Request, Response } from 'express'
import { PrismaClient } from '../prisma/generated/client/client'
import ChatService from '../services/chat'
import { authenticateAdmin } from '../middleware/unifiedAuth'
import type { AuthenticatedRequest } from '../middleware/unifiedAuth'

export default function (prisma: PrismaClient) {
  const router = Router()
  const chatService = ChatService(prisma)

  /**
   * Get all chat messages for a specific complaint
   * GET /api/chat/:complaintId
   */
  router.get('/:complaintId', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest
      const { complaintId } = req.params
      const { page = '1', limit = '100' } = req.query

      if (!complaintId) {
        return res.status(400).json({ success: false, message: 'complaintId is required' })
      }

      // Verify agent has access to this complaint
      const agentId = authReq.admin?.id
      if (authReq.admin?.adminType === 'AGENT' && agentId) {
        const hasAccess = await chatService.canAgentChatOnComplaint(agentId, complaintId)
        if (!hasAccess) {
          return res.status(403).json({ success: false, message: 'You do not have access to this complaint chat' })
        }
      }

      const result = await chatService.getChatsForComplaint({
        complaintId,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
      })

      return res.json({ success: true, data: result.chats, pagination: result.pagination })
    } catch (err) {
      console.error('Error fetching chats:', err)
      return res.status(500).json({ success: false, message: 'Failed to fetch chats' })
    }
  })

  /**
   * Create a new chat message for a specific complaint (agent sends message)
   * POST /api/chat/:complaintId
   */
  router.post('/:complaintId', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest
      const { complaintId } = req.params
      const { message, imageUrl } = req.body

      if (!message) {
        return res.status(400).json({ success: false, message: 'message is required' })
      }

      if (!complaintId) {
        return res.status(400).json({ success: false, message: 'complaintId is required' })
      }

      const agentId = authReq.admin?.id
      if (!agentId) {
        return res.status(401).json({ success: false, message: 'Agent not authenticated' })
      }

      // Verify agent has access to this complaint
      if (authReq.admin?.adminType === 'AGENT') {
        const hasAccess = await chatService.canAgentChatOnComplaint(agentId, complaintId)
        if (!hasAccess) {
          return res.status(403).json({ success: false, message: 'You are not assigned to this complaint' })
        }
      }

      const chat = await chatService.createChat({
        message,
        complaintId,
        agentId,
        senderType: 'AGENT' as any,
        imageUrl,
      })

      return res.status(201).json({ success: true, data: chat })
    } catch (err) {
      console.error('Error creating chat:', err)
      return res.status(500).json({ success: false, message: 'Failed to create chat' })
    }
  })

  /**
   * Get chat count for a complaint
   * GET /api/chat/:complaintId/count
   */
  router.get('/:complaintId/count', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { complaintId } = req.params

      if (!complaintId) {
        return res.status(400).json({ success: false, message: 'complaintId is required' })
      }

      const count = await chatService.getChatCountForComplaint(complaintId)

      return res.json({ success: true, data: { count } })
    } catch (err) {
      console.error('Error fetching chat count:', err)
      return res.status(500).json({ success: false, message: 'Failed to fetch chat count' })
    }
  })

  /**
   * Delete a chat message (only the sender can delete)
   * DELETE /api/chat/message/:messageId
   */
  router.delete('/message/:messageId', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const authReq = req as AuthenticatedRequest
      const { messageId } = req.params
      const agentId = authReq.admin?.id

      if (!messageId) {
        return res.status(400).json({ success: false, message: 'messageId is required' })
      }

      // Verify the message belongs to this agent
      const existingChat = await chatService.getChatById(messageId)
      if (!existingChat) {
        return res.status(404).json({ success: false, message: 'Message not found' })
      }

      if (existingChat.agentId !== agentId) {
        return res.status(403).json({ success: false, message: 'You can only delete your own messages' })
      }

      await chatService.deleteChat(messageId)

      return res.json({ success: true, message: 'Message deleted successfully' })
    } catch (err) {
      console.error('Error deleting chat:', err)
      return res.status(500).json({ success: false, message: 'Failed to delete chat' })
    }
  })

  return router
}
