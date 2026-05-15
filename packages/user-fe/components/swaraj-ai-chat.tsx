"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, Languages, MessageCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ChatMessage,
  Language,
  ChatAPIResponse,
  LANGUAGE_OPTIONS,
  SUGGESTED_QUESTIONS,
  MAX_WORD_COUNT,
  countWords,
  validateMessage,
} from "@/lib/types/chat";

interface SwarajAIChatProps {
  className?: string;
}

export function SwarajAIChat({ className }: SwarajAIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("english");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const wordCount = countWords(inputValue);
  const isOverLimit = wordCount > MAX_WORD_COUNT;

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  const sendMessage = useCallback(async (message: string) => {
    const validation = validateMessage(message);
    if (!validation.valid) {
      setError(validation.error || "Invalid message");
      return;
    }

    setError(null);
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message.trim(),
      timestamp: new Date(),
      language: selectedLanguage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/aichat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_query: message.trim(),
          language: selectedLanguage,
        }),
      });

      const data: ChatAPIResponse = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "Failed to get response");
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.data.bot_response,
        timestamp: new Date(),
        language: selectedLanguage,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      // Remove the user message if there was an error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, [selectedLanguage]);

  const handleSubmit = useCallback(() => {
    if (inputValue.trim() && !isLoading && !isOverLimit) {
      sendMessage(inputValue);
    }
  }, [inputValue, isLoading, isOverLimit, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSuggestionClick = (question: string) => {
    sendMessage(question);
  };

  const formatMessageContent = (content: string) => {
    // Split by newlines and render each line
    return content.split("\n").map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split("\n").length - 1 && <br />}
      </span>
    ));
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-xl",
          "hover:scale-105 transition-all duration-100 hover:shadow-2xl",
          "flex items-center gap-2",
          "animate-pulse hover:animate-none",
          isOpen && "hidden"
        )}
        aria-label="Open Swaraj AI Chat"
      >
        <Bot className="w-8 h-8" />
        <span className="font-medium text-sm">Chat with Swaraj AI</span>
      </button>

      {/* Chat Window */}
      <div
        ref={chatContainerRef}
        className={cn(
          "fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-100px)]",
          "bg-background border border-border rounded-2xl shadow-2xl",
          "flex flex-col overflow-hidden transition-all duration-300",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Bot className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Swaraj AI</h3>
              <p className="text-xs text-muted-foreground">Ask me anything</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            aria-label="Close chat"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20 shrink-0">
          <Languages className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-1">
            {LANGUAGE_OPTIONS.map((lang) => (
              <button
                key={lang.value}
                type="button"
                onClick={() => setSelectedLanguage(lang.value)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-full transition-all duration-200",
                  selectedLanguage === lang.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                {lang.labelNative}
              </button>
            ))}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="p-3 rounded-full bg-primary/10 mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h4 className="font-medium mb-1">Welcome to Swaraj AI</h4>
              <p className="text-sm text-muted-foreground mb-4">
                How can I help you today?
              </p>
              
              {/* Suggested Questions */}
              <div className="w-full space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  Quick questions:
                </p>
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(question)}
                    disabled={isLoading}
                    className={cn(
                      "w-full px-3 py-2 text-sm text-left rounded-lg",
                      "border border-border bg-background",
                      "hover:bg-muted/50 hover:border-primary/30 transition-all duration-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Suggested Questions at top when there are messages */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {SUGGESTED_QUESTIONS.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(question)}
                    disabled={isLoading}
                    className={cn(
                      "px-2.5 py-1 text-xs rounded-full",
                      "border border-border bg-background",
                      "hover:bg-muted/50 hover:border-primary/30 transition-all duration-200",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {question}
                  </button>
                ))}
              </div>

              {/* Messages */}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div
                    className={cn(
                      "shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    {message.role === "user" ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "max-w-[75%] px-3 py-2 rounded-2xl text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted rounded-tl-sm"
                    )}
                  >
                    {formatMessageContent(message.content)}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-muted px-3 py-2 rounded-2xl rounded-tl-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}

        {/* Input Area */}
        <div className="px-4 py-3 border-t border-border bg-muted/20 shrink-0">
          {/* Word Counter */}
          <div className="flex justify-end mb-1">
            <span
              className={cn(
                "text-xs",
                isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"
              )}
            >
              {wordCount}/{MAX_WORD_COUNT} words
            </span>
          </div>

          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              className={cn(
                "flex-1 min-h-10 max-h-[120px] resize-none text-sm",
                "rounded-xl border-border focus:border-primary",
                isOverLimit && "border-destructive focus:border-destructive"
              )}
              rows={1}
            />
            <Button
              onClick={handleSubmit}
              disabled={!inputValue.trim() || isLoading || isOverLimit}
              size="icon"
              className="rounded-xl h-10 w-10 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default SwarajAIChat;
