"use client"

import { useState, useEffect, useRef } from "react"
import { Modal } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, MessageCircle, User, Bot } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatMessage {
  id: string
  message: string
  senderType: "USER" | "AGENT"
  createdAt: string
  user?: {
    id: string
    name: string
    email: string
  } | null
  agent?: {
    id: string
    fullName: string
    email: string
  } | null
}

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  complaintId: string
  complaintTitle: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL

export function ChatModal({ isOpen, onClose, complaintId, complaintTitle }: ChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchMessages = async () => {
    if (!complaintId) return

    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setError("Not authenticated")
        return
      }

      const res = await fetch(`${API_URL}/api/chat/${complaintId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to fetch messages: ${res.status} ${text}`)
      }

      const data = await res.json()
      setMessages(data.data || [])
    } catch (err) {
      console.error("Error fetching messages:", err)
      setError(err instanceof Error ? err.message : "Failed to load messages")
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return

    setSending(true)
    setError(null)
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        setError("Not authenticated")
        return
      }

      const res = await fetch(`${API_URL}/api/chat/${complaintId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: newMessage.trim() }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Failed to send message: ${res.status} ${text}`)
      }

      const data = await res.json()
      setMessages((prev) => [...prev, data.data])
      setNewMessage("")
      inputRef.current?.focus()
    } catch (err) {
      console.error("Error sending message:", err)
      setError(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  useEffect(() => {
    if (isOpen && complaintId) {
      fetchMessages()
    }
  }, [isOpen, complaintId])

  // Poll for new messages every 10 seconds while modal is open
  useEffect(() => {
    if (!isOpen || !complaintId) return

    const intervalId = setInterval(() => {
      // Silent refetch (no loading indicator)
      const token = localStorage.getItem("token")
      if (!token) return

      fetch(`${API_URL}/api/chat/${complaintId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.data) {
            setMessages(data.data)
          }
        })
        .catch(() => {})
    }, 10000)

    return () => clearInterval(intervalId)
  }, [isOpen, complaintId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      })
    }
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.createdAt)
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {} as Record<string, ChatMessage[]>)

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="sm:max-w-lg md:max-w-xl lg:max-w-2xl h-[80vh] flex flex-col p-0">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-white rounded-t-lg">
        <div className="p-2 bg-blue-100 rounded-full">
          <MessageCircle className="h-5 w-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 truncate">Chat</h2>
          <p className="text-sm text-gray-500 truncate">{complaintTitle}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          ✕
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-red-500 mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchMessages}>
              Retry
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageCircle className="h-12 w-12 mb-3 text-gray-300" />
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Start the conversation with the citizen</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {date}
                  </div>
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {dateMessages.map((message) => {
                    const isAgent = message.senderType === "AGENT"
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex items-end gap-2",
                          isAgent ? "justify-end" : "justify-start"
                        )}
                      >
                        {/* Avatar for user messages */}
                        {!isAgent && (
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                            <User className="h-4 w-4 text-gray-500" />
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={cn(
                            "max-w-[75%] rounded-2xl px-4 py-2",
                            isAgent
                              ? "bg-blue-600 text-white rounded-br-md"
                              : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
                          )}
                        >
                          {/* Sender name */}
                          <p
                            className={cn(
                              "text-xs font-medium mb-1",
                              isAgent ? "text-blue-100" : "text-gray-500"
                            )}
                          >
                            {isAgent
                              ? message.agent?.fullName || "Agent"
                              : message.user?.name || "Citizen"}
                          </p>
                          <p className="text-sm whitespace-pre-wrap break-words">
                            {message.message}
                          </p>
                          <p
                            className={cn(
                              "text-xs mt-1",
                              isAgent ? "text-blue-200" : "text-gray-400"
                            )}
                          >
                            {formatTime(message.createdAt)}
                          </p>
                        </div>

                        {/* Avatar for agent messages */}
                        {isAgent && (
                          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-white" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-white rounded-b-lg">
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            size="icon"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
