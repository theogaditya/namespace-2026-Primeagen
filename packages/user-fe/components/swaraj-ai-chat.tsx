"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, User, Loader2, Languages, X, MessageSquare, Mic, MicOff, ArrowLeft, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ChatMessage,
  ChatMode,
  Language,
  ChatAPIResponse,
  VoiceChatMessage,
  VoiceChatAPIResponse,
  LANGUAGE_OPTIONS,
  SUGGESTED_QUESTIONS,
  MAX_WORD_COUNT,
  countWords,
  validateMessage,
} from "@/lib/types/chat";
import { WavRecorder } from "@/lib/utils/wav-recorder";

interface SwarajAIChatProps {
  className?: string;
}

export function SwarajAIChat({ className }: SwarajAIChatProps) {
  // Mode selection
  const [chatMode, setChatMode] = useState<ChatMode | null>(null);
  
  // Text chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("english");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  // Voice chat state
  const [voiceMessages, setVoiceMessages] = useState<VoiceChatMessage[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceMessagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<WavRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const wordCount = countWords(inputValue);
  const isOverLimit = wordCount > MAX_WORD_COUNT;

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatMode === "text") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } else if (chatMode === "voice") {
      voiceMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, voiceMessages, chatMode]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

  // ============= VOICE CHAT FUNCTIONS =============
  const startRecording = async () => {
    try {
      setVoiceError(null);
      recorderRef.current = new WavRecorder();
      await recorderRef.current.start();
      setIsRecording(true);
      setRecordingStartTime(Date.now());
    } catch (err) {
      console.error("Failed to start recording:", err);
      setVoiceError("Could not access microphone. Please check permissions.");
    }
  };

  const stopRecordingAndSend = async () => {
    if (!recorderRef.current) return;
    
    // Check minimum recording duration (1.5 seconds)
    const recordingDuration = recordingStartTime ? Date.now() - recordingStartTime : 0;
    if (recordingDuration < 1500) {
      setVoiceError("Recording too short. Please speak for at least 2 seconds.");
      setIsRecording(false);
      setRecordingStartTime(null);
      try {
        await recorderRef.current.stop();
      } catch (e) {
        console.warn("Error stopping short recording:", e);
      }
      return;
    }
    
    setIsRecording(false);
    setRecordingStartTime(null);
    setIsProcessingVoice(true);
    setVoiceError(null);

    try {
      const blob = await recorderRef.current.stop();
      if (!blob) throw new Error("No audio captured");

      // Create FormData for API
      const formData = new FormData();
      formData.append("file", blob, "recording.wav");
      formData.append("language", selectedLanguage);

      const response = await fetch("/api/voice-chat", {
        method: "POST",
        body: formData,
      });

      const data: VoiceChatAPIResponse = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error || "Failed to get response");
      }

      // Add user message (transcription)
      const userMessage: VoiceChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        transcription: data.data.transcription,
        timestamp: new Date(),
        language: selectedLanguage,
      };

      // Add assistant message (reply + audio)
      const assistantMessage: VoiceChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        reply: data.data.reply,
        audioUrl: data.data.audio_url,
        timestamp: new Date(),
        language: selectedLanguage,
      };

      setVoiceMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Auto-play the response audio
      if (data.data.audio_url) {
        playAudio(data.data.audio_url, assistantMessage.id);
      }

    } catch (err) {
      console.error("Voice chat error:", err);
      setVoiceError(err instanceof Error ? err.message : "Failed to process voice message");
    } finally {
      setIsProcessingVoice(false);
    }
  };

  const playAudio = (url: string, messageId: string) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    // Create audio element with WebView-compatible settings
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    
    // Set source after configuration
    audio.src = url;
    audioRef.current = audio;
    setPlayingAudioId(messageId);

    audio.onended = () => {
      setPlayingAudioId(null);
      audioRef.current = null;
    };

    audio.onerror = (e) => {
      setPlayingAudioId(null);
      audioRef.current = null;
      console.error("Error playing audio:", e, "URL:", url);
    };

    // Wait for audio to be ready before playing
    audio.oncanplaythrough = () => {
      audio.play().catch((err) => {
        console.error("Failed to play audio:", err);
        setPlayingAudioId(null);
        // Try alternative playback method for WebView
        tryAlternativePlayback(url, messageId);
      });
    };

    // Trigger load
    audio.load();
  };

  // Alternative playback method for Android WebView
  const tryAlternativePlayback = (url: string, messageId: string) => {
    // Create a temporary anchor to trigger download/play
    const existingPlayer = document.getElementById("voice-audio-player") as HTMLAudioElement;
    if (existingPlayer) {
      existingPlayer.src = url;
      existingPlayer.play().catch(console.error);
      setPlayingAudioId(messageId);
      existingPlayer.onended = () => setPlayingAudioId(null);
    }
  };

  const toggleAudio = (url: string, messageId: string) => {
    if (playingAudioId === messageId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingAudioId(null);
    } else {
      playAudio(url, messageId);
    }
  };

  const handleRecordButton = () => {
    if (isRecording) {
      stopRecordingAndSend();
    } else {
      startRecording();
    }
  };

  // ============= UI HELPERS =============
  const formatMessageContent = (content: string) => {
    return content.split("\n").map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split("\n").length - 1 && <br />}
      </span>
    ));
  };

  const handleBackToModeSelection = () => {
    setChatMode(null);
    // Stop any recording in progress
    if (isRecording && recorderRef.current) {
      recorderRef.current.stop().catch(() => {});
      setIsRecording(false);
    }
    // Stop any playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingAudioId(null);
    }
  };

  // ============= RENDER SECTIONS =============

  // Mode Selection Screen
  const renderModeSelection = () => (
    <div className="flex flex-col items-center justify-center h-full text-center py-6 sm:py-8 px-4">
      <div className="p-3 rounded-full bg-primary/10 mb-4">
        <Bot className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
      </div>
      <h4 className="font-semibold text-lg mb-1">Welcome to Swaraj AI</h4>
      <p className="text-sm text-muted-foreground mb-6">
        How would you like to chat today?
      </p>
      
      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={() => setChatMode("text")}
          className={cn(
            "w-full flex items-center gap-3 p-4 rounded-xl border-2 border-border",
            "hover:border-primary hover:bg-primary/5 transition-all duration-200",
            "group"
          )}
        >
          <div className="p-2.5 rounded-lg bg-blue-100 group-hover:bg-blue-200 transition-colors">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="font-medium">Chat with Text</p>
            <p className="text-xs text-muted-foreground">Type your questions</p>
          </div>
        </button>

        <button
          onClick={() => setChatMode("voice")}
          className={cn(
            "w-full flex items-center gap-3 p-4 rounded-xl border-2 border-border",
            "hover:border-primary hover:bg-primary/5 transition-all duration-200",
            "group"
          )}
        >
          <div className="p-2.5 rounded-lg bg-green-100 group-hover:bg-green-200 transition-colors">
            <Mic className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-left">
            <p className="font-medium">Chat with Voice</p>
            <p className="text-xs text-muted-foreground">Speak your questions</p>
          </div>
        </button>
      </div>
    </div>
  );

  // Text Chat UI
  const renderTextChat = () => (
    <>
      {/* Language Selector */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-border bg-muted/20 shrink-0 overflow-x-auto">
        <Languages className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => setSelectedLanguage(lang.value)}
              className={cn(
                "px-2.5 sm:px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap",
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
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 sm:py-8">
            <div className="p-3 rounded-full bg-primary/10 mb-4">
              <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
            </div>
            <h4 className="font-medium mb-1 text-sm sm:text-base">Text Chat</h4>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              Type your message below
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
                    "w-full px-3 py-2 text-xs sm:text-sm text-left rounded-lg",
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
      <div className="px-3 sm:px-4 py-3 border-t border-border bg-muted/20 shrink-0">
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
    </>
  );

  // Voice Chat UI
  const renderVoiceChat = () => (
    <>
      {/* Language Selector */}
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-border bg-muted/20 shrink-0 overflow-x-auto">
        <Languages className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex gap-1">
          {LANGUAGE_OPTIONS.map((lang) => (
            <button
              key={lang.value}
              type="button"
              onClick={() => setSelectedLanguage(lang.value)}
              disabled={isRecording || isProcessingVoice}
              className={cn(
                "px-2.5 sm:px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap",
                selectedLanguage === lang.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground",
                (isRecording || isProcessingVoice) && "opacity-50 cursor-not-allowed"
              )}
            >
              {lang.labelNative}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3">
        {voiceMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 sm:py-8">
            <div className="p-3 rounded-full bg-green-100 mb-4">
              <Mic className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" />
            </div>
            <h4 className="font-medium mb-1 text-sm sm:text-base">Voice Chat</h4>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">
              Tap the microphone to start speaking
            </p>
            <p className="text-xs text-muted-foreground">
              Select your preferred language above
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {voiceMessages.map((message) => (
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
                    "max-w-[75%] rounded-2xl text-sm",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm px-3 py-2"
                      : "bg-muted rounded-tl-sm"
                  )}
                >
                  {message.role === "user" ? (
                    // User transcription
                    <div>
                      <p className="text-xs opacity-75 mb-0.5">You said:</p>
                      <p>{message.transcription}</p>
                    </div>
                  ) : (
                    // Assistant reply with audio
                    <div className="px-3 py-2">
                      <p className="mb-2">{formatMessageContent(message.reply || "")}</p>
                      {message.audioUrl && (
                        <button
                          onClick={() => toggleAudio(message.audioUrl!, message.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
                            "bg-primary/10 hover:bg-primary/20 transition-colors",
                            playingAudioId === message.id && "bg-primary/20"
                          )}
                        >
                          {playingAudioId === message.id ? (
                            <>
                              <Pause className="w-3.5 h-3.5" />
                              <span>Playing...</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Play Audio</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Processing indicator */}
            {isProcessingVoice && (
              <div className="flex gap-2">
                <div className="shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-muted px-3 py-2 rounded-2xl rounded-tl-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Processing...</span>
                </div>
              </div>
            )}

            <div ref={voiceMessagesEndRef} />
          </div>
        )}
      </div>

      {/* Error Display */}
      {voiceError && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs">
          {voiceError}
        </div>
      )}

      {/* Record Button Area */}
      <div className="px-3 sm:px-4 py-4 border-t border-border bg-muted/20 shrink-0">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleRecordButton}
            disabled={isProcessingVoice}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200",
              "shadow-lg hover:shadow-xl",
              isRecording
                ? "bg-red-500 hover:bg-red-600 animate-pulse"
                : "bg-green-500 hover:bg-green-600",
              isProcessingVoice && "opacity-50 cursor-not-allowed"
            )}
          >
            {isRecording ? (
              <MicOff className="w-7 h-7 text-white" />
            ) : (
              <Mic className="w-7 h-7 text-white" />
            )}
          </button>
          <p className="text-xs text-muted-foreground">
            {isRecording 
              ? "Tap to stop & send" 
              : isProcessingVoice 
                ? "Processing your message..." 
                : "Tap to start recording"
            }
          </p>
          {isRecording && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-500 font-medium">Recording...</span>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Hidden audio player for WebView compatibility */}
      <audio 
        id="voice-audio-player" 
        style={{ display: "none" }} 
        playsInline 
        preload="auto"
      />
      
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 px-3 sm:px-4 py-2.5 sm:py-3 rounded-full bg-primary text-primary-foreground shadow-xl",
          "hover:scale-105 transition-all duration-100 hover:shadow-2xl",
          "flex items-center gap-2",
          "animate-pulse hover:animate-none",
          isOpen && "hidden"
        )}
        aria-label="Open Swaraj AI Chat"
      >
        <Bot className="w-6 h-6 sm:w-8 sm:h-8" />
        <span className="font-medium text-xs sm:text-sm hidden sm:inline">Chat with Swaraj AI</span>
      </button>

      {/* Chat Window */}
      <div
        ref={chatContainerRef}
        className={cn(
          "fixed z-50",
          "bottom-0 right-0 sm:bottom-6 sm:right-6",
          "w-full sm:w-[380px] sm:max-w-[calc(100vw-48px)]",
          "h-[85vh] sm:h-[600px] sm:max-h-[calc(100vh-100px)]",
          "bg-background border-t sm:border border-border sm:rounded-2xl shadow-2xl",
          "flex flex-col overflow-hidden transition-all duration-300",
          isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-border bg-muted/30 shrink-0">
          <div className="flex items-center gap-2">
            {chatMode !== null && (
              <button
                onClick={handleBackToModeSelection}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Back to mode selection"
                type="button"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Swaraj AI</h3>
              <p className="text-xs text-muted-foreground">
                {chatMode === "text" ? "Text Chat" : chatMode === "voice" ? "Voice Chat" : "Ask me anything"}
              </p>
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

        {/* Content based on mode */}
        {chatMode === null && renderModeSelection()}
        {chatMode === "text" && renderTextChat()}
        {chatMode === "voice" && renderVoiceChat()}
      </div>
    </>
  );
}

export default SwarajAIChat;
