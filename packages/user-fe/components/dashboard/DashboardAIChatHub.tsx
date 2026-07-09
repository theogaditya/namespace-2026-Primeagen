"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Send,
  Mic,
  MicOff,
  Loader2,
  User,
  X,
  ImageIcon,
  MapPin,
  Phone,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserData } from "@/app/dashboard/customComps/types";
import { WavRecorder } from "@/lib/utils/wav-recorder";
import { normalizeDistrictName } from "@/lib/location/normalizeDistrict";
import { useRouter } from "next/navigation";

const SentientSphere = dynamic(() => import("./SentientSphere"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="w-24 h-24 rounded-full bg-purple-600/20 animate-pulse" />
    </div>
  ),
});

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  agent?: string;
}

interface DashboardAIChatHubProps {
  user: UserData | null;
}

interface SavedSession {
  sessionId: string;
  messages: ChatMessage[];
  timestamp: number;
  preview: string;
}

function normalizeComplaintDraftLocation(draft: unknown) {
  if (!draft || typeof draft !== "object") return draft;

  const draftRecord = draft as Record<string, unknown>;

  return {
    ...draftRecord,
    district:
      typeof draftRecord.district === "string"
        ? normalizeDistrictName(draftRecord.district)
        : draftRecord.district,
  };
}

// Silence detection config
const SILENCE_THRESHOLD = 0.012;
const SPEECH_START_THRESHOLD = 0.02;
const SILENCE_DURATION_MS = 1200;
const INITIAL_SILENCE_TIMEOUT_MS = 4000;
const MAX_RECORDING_MS = 15000;
const MIN_SPEECH_FRAMES = 3;

function getAudioFileExtension(mimeType: string): string {
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  return "wav";
}

function parseSseEvent(rawEvent: string): { event: string; data: any } | null {
  const lines = rawEvent.split("\n");
  const event = lines
    .filter((line) => line.startsWith("event:"))
    .map((line) => line.slice(6).trim())
    .join("");
  const dataText = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");

  if (!event) return null;

  try {
    return {
      event,
      data: dataText ? JSON.parse(dataText) : null,
    };
  } catch {
    return {
      event,
      data: dataText,
    };
  }
}

export default function DashboardAIChatHub({
  user,
}: DashboardAIChatHubProps) {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [voiceAttachedImage, setVoiceAttachedImage] = useState<File | null>(null);
  const [voiceImagePreview, setVoiceImagePreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const voiceImageInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<WavRecorder | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const voiceModeRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stoppingRecordingRef = useRef(false);
  const router = useRouter();

  const firstName = user?.name?.split(" ")[0] || "Citizen";
  const locationDetectedRef = useRef(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);

  // Keep voiceModeRef in sync
  useEffect(() => {
    voiceModeRef.current = isVoiceMode;
  }, [isVoiceMode]);

  useEffect(() => {
    const container = chatContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      audioRef.current?.pause();
      recorderRef.current?.stop().catch(() => {});
    };
  }, []);

  // Load conversation history
  useEffect(() => {
    try {
      const raw = localStorage.getItem("swaraj_chat_history");
      if (raw) setSavedSessions(JSON.parse(raw));
    } catch {}
  }, []);

  // Save to history when messages change
  const saveToHistory = useCallback((msgs: ChatMessage[]) => {
    if (!sessionIdRef.current || msgs.length < 2) return;
    try {
      const existing: SavedSession[] = JSON.parse(
        localStorage.getItem("swaraj_chat_history") || "[]"
      );
      const filtered = existing.filter(
        (s) => s.sessionId !== sessionIdRef.current
      );
      const firstUser = msgs.find((m) => m.role === "user");
      filtered.unshift({
        sessionId: sessionIdRef.current!,
        messages: msgs,
        timestamp: Date.now(),
        preview: firstUser?.content?.slice(0, 60) || "Conversation",
      });
      const trimmed = filtered.slice(0, 3);
      localStorage.setItem("swaraj_chat_history", JSON.stringify(trimmed));
      setSavedSessions(trimmed);
    } catch {}
  }, []);

  useEffect(() => {
    if (messages.length >= 2) saveToHistory(messages);
  }, [messages, saveToHistory]);

  const loadSession = useCallback((session: SavedSession) => {
    setMessages(
      session.messages.map((m) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      }))
    );
    sessionIdRef.current = session.sessionId;
    setIsExpanded(true);
    setShowHistory(false);
  }, []);

  const endVoiceMode = useCallback(() => {
    voiceModeRef.current = false;
    stoppingRecordingRef.current = false;
    setIsVoiceMode(false);
    setIsRecording(false);
    setIsSpeaking(false);
    setIsProcessingVoice(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    recorderRef.current?.stop().catch(() => {});
  }, []);

  // --- Location detection helper ---
  const handleLocationDetection = useCallback(async () => {
    if (locationDetectedRef.current) return;
    locationDetectedRef.current = true;
    setDetectingLocation(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });
      const { latitude, longitude } = pos.coords;

      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`
      );
      const geoData = await geoRes.json();
      const addr = geoData.address || {};
      const district = normalizeDistrictName(
        addr.county || addr.state_district || addr.city_district || ""
      );
      const city = addr.city || addr.town || addr.village || "";
      const state = addr.state || "";
      const pin = addr.postcode || "unknown";

      const locationMsg = `City: ${city}, District: ${district}, State: ${state}, PIN: ${pin}`;
      sendToSentientAI(locationMsg);
    } catch {
      locationDetectedRef.current = false;
      sendToSentientAI(
        "I wasn't able to detect my location. Let me tell you manually."
      );
    } finally {
      setDetectingLocation(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Main send function ---
  const sendToSentientAI = useCallback(
    async (text: string, imageFile?: File | null) => {
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: imageFile ? `📎 [Image attached] ${text}` : text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setIsExpanded(true);

      try {
        // Convert image to base64 if attached
        let imageBase64: string | undefined;
        if (imageFile) {
          try {
            const reader = new FileReader();
            imageBase64 = await new Promise<string>((resolve, reject) => {
              reader.onload = () =>
                resolve((reader.result as string).split(",")[1] || "");
              reader.onerror = reject;
              reader.readAsDataURL(imageFile);
            });
          } catch {
            // image read failed, continue without it
          }
        }

        const token = localStorage.getItem("authToken");
        const res = await fetch("/api/agents/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: text,
            language: "english",
            ...(sessionIdRef.current ? { sessionId: sessionIdRef.current } : {}),
            ...(imageBase64 ? { imageBase64 } : {}),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.message || "Failed to get response");
        }

        const data = await res.json();
        const reply =
          data.data?.response ||
          data.data?.reply ||
          data.response ||
          data.reply ||
          "Sorry, I couldn't process that.";

        const newSessionId = data.data?.sessionId || data.sessionId;
        if (newSessionId) sessionIdRef.current = newSessionId;

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: reply,
            timestamp: new Date(),
            agent: data.data?.agent || "sentient-ai",
          },
        ]);

        // Handle complaint draft → navigate to registration with auto-fill
        const complaintFlow =
          data.data?.complaintFlowStarted || data.complaintFlowStarted;
        const complaintDraft =
          data.data?.complaintDraft || data.complaintDraft;
        if (complaintFlow || complaintDraft) {
          if (complaintDraft) {
            localStorage.setItem(
              "complaintDraft",
              JSON.stringify(normalizeComplaintDraftLocation(complaintDraft))
            );
          }
          setTimeout(() => router.push("/regComplaint"), 500);
        }

        // Handle navigation
        const navPath = data.data?.navigationPath || data.navigationPath;
        if (navPath) {
          setTimeout(() => router.push(navPath), 500);
        }

        // Handle location detection request
        const shouldDetectLocation =
          data.data?.detectLocation || data.detectLocation;
        if (shouldDetectLocation) {
          handleLocationDetection();
        }
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content:
              err?.message && err.message !== "Failed to fetch"
                ? err.message
                : "Something went wrong. Please try again.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [router, handleLocationDetection]
  );

  // --- Voice: silence detection ---
  const startSilenceDetection = useCallback(
    (audioContext: AudioContext, source: MediaStreamAudioSourceNode) => {
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      analyserRef.current = analyser;
      const dataArray = new Float32Array(analyser.fftSize);
      const recordingStartedAt = Date.now();
      let silenceStart: number | null = null;
      let speechFrames = 0;
      let speechStarted = false;

      const check = () => {
        if (!voiceModeRef.current) return;
        analyser.getFloatTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sum / dataArray.length);

        const elapsed = Date.now() - recordingStartedAt;
        if (elapsed >= MAX_RECORDING_MS) {
          stopRecordingAndSend();
          return;
        }

        if (!speechStarted) {
          if (rms >= SPEECH_START_THRESHOLD) {
            speechFrames += 1;
            if (speechFrames >= MIN_SPEECH_FRAMES) {
              speechStarted = true;
              silenceStart = null;
            }
          } else {
            speechFrames = 0;
            if (elapsed >= INITIAL_SILENCE_TIMEOUT_MS) {
              stopRecordingAndSend();
              return;
            }
          }
          animFrameRef.current = requestAnimationFrame(check);
          return;
        }

        if (rms < SILENCE_THRESHOLD) {
          if (silenceStart === null) silenceStart = Date.now();
          else if (Date.now() - silenceStart > SILENCE_DURATION_MS) {
            stopRecordingAndSend();
            return;
          }
        } else {
          silenceStart = null;
        }
        animFrameRef.current = requestAnimationFrame(check);
      };
      animFrameRef.current = requestAnimationFrame(check);
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // --- Voice: start recording ---
  const startRecording = useCallback(async () => {
    try {
      stoppingRecordingRef.current = false;
      const recorder = new WavRecorder();
      recorderRef.current = recorder;
      await recorder.start();
      setIsRecording(true);

      // Hook into the recorder's audio context for silence detection
      const ac = (recorder as any).audioContext as AudioContext | null;
      const src = (recorder as any).source as MediaStreamAudioSourceNode | null;
      if (ac && src) {
        startSilenceDetection(ac, src);
      }
    } catch {
      // Mic permission denied
      setIsVoiceMode(false);
    }
  }, [startSilenceDetection]);

  const playVoiceResponse = useCallback(
    async (audioBase64: string | null) => {
      if (!audioBase64) {
        if (voiceModeRef.current) startRecording();
        return;
      }

      setIsSpeaking(true);
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioBase64), (char) => char.charCodeAt(0))],
        { type: "audio/mp3" }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setIsSpeaking(false);
        audioRef.current = null;
        if (voiceModeRef.current) {
          startRecording();
        }
      };

      try {
        await audio.play();
      } catch {
        setIsSpeaking(false);
        audioRef.current = null;
        if (voiceModeRef.current) {
          startRecording();
        }
      }
    },
    [startRecording]
  );

  // --- Voice: stop recording and send ---
  const stopRecordingAndSend = useCallback(async () => {
    if (!recorderRef.current || stoppingRecordingRef.current) return;
    stoppingRecordingRef.current = true;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsRecording(false);
    setIsProcessingVoice(true);

    try {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      const blob = await recorder.stop();
      if (!blob || blob.size < 1000) {
        setIsProcessingVoice(false);
        stoppingRecordingRef.current = false;
        if (voiceModeRef.current) startRecording();
        return;
      }

      const formData = new FormData();
      const mimeType = blob.type || recorder.mimeType || "audio/wav";
      const fileExtension = getAudioFileExtension(mimeType);
      formData.append("audio", blob, `recording.${fileExtension}`);
      formData.append("language", "english");
      formData.append("mimeType", mimeType);
      if (sessionIdRef.current) formData.append("sessionId", sessionIdRef.current);

      // Attach image if user uploaded one during voice mode
      const hadVoiceImage = !!voiceAttachedImage;
      if (voiceAttachedImage) {
        formData.append("image", voiceAttachedImage);
        setVoiceAttachedImage(null);
        setVoiceImagePreview(null);
      }

      const userMessageId = crypto.randomUUID();
      const assistantMessageId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          role: "user",
          content: hadVoiceImage ? "🎙️📎 Voice message with photo..." : "🎙️ Voice message...",
          timestamp: new Date(),
        },
      ]);
      setIsExpanded(true);

      const voiceToken = localStorage.getItem("authToken");
      const res = await fetch("/api/agents/voice/stream", {
        method: "POST",
        headers: {
          ...(voiceToken ? { Authorization: `Bearer ${voiceToken}` } : {}),
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.error || errData?.message || "Voice processing failed"
        );
      }
      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("Voice stream is unavailable");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let assistantMessageCreated = false;
      let streamedResponse = "";
      let finalResult: any = null;
      let audioBase64: string | null = null;

      const ensureAssistantMessage = () => {
        if (assistantMessageCreated) return;
        assistantMessageCreated = true;
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
            agent: "sentient-ai",
          },
        ]);
      };

      const appendAssistantChunk = (chunk: string) => {
        if (!chunk) return;
        ensureAssistantMessage();
        streamedResponse += chunk;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content: `${message.content}${chunk}` }
              : message
          )
        );
      };

      const setAssistantContent = (content: string) => {
        ensureAssistantMessage();
        streamedResponse = content;
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMessageId
              ? { ...message, content }
              : message
          )
        );
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let boundaryIndex = buffer.indexOf("\n\n");
        while (boundaryIndex >= 0) {
          const rawEvent = buffer.slice(0, boundaryIndex).trim();
          buffer = buffer.slice(boundaryIndex + 2);

          if (rawEvent) {
            const parsedEvent = parseSseEvent(rawEvent);
            if (parsedEvent) {
              const { event, data } = parsedEvent;

              if (event === "transcript" && data?.text) {
                if (data.sessionId) sessionIdRef.current = data.sessionId;
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === userMessageId
                      ? { ...message, content: `🎙️ "${data.text}"` }
                      : message
                  )
                );
              } else if (event === "text" && data?.chunk) {
                appendAssistantChunk(data.chunk);
              } else if (event === "result") {
                finalResult = data;
                if (data?.sessionId) sessionIdRef.current = data.sessionId;
                if ((!streamedResponse || !streamedResponse.trim()) && data?.response) {
                  setAssistantContent(data.response);
                }
              } else if (event === "audio") {
                audioBase64 = data?.audioResponse || null;
              } else if (event === "error") {
                throw new Error(data?.message || "Voice processing failed");
              }
            }
          }

          boundaryIndex = buffer.indexOf("\n\n");
        }
      }

      if (finalResult) {
        const complaintFlow = Boolean(finalResult.complaintFlowStarted);
        const complaintDraft = finalResult.complaintDraft;
        if (complaintFlow || complaintDraft) {
          if (complaintDraft) {
            localStorage.setItem(
              "complaintDraft",
              JSON.stringify(normalizeComplaintDraftLocation(complaintDraft))
            );
          }
          endVoiceMode();
          router.push("/regComplaint");
          return;
        }

        if (finalResult.navigationPath) {
          endVoiceMode();
          router.push(finalResult.navigationPath);
          return;
        }

        if (finalResult.detectLocation) {
          handleLocationDetection();
        }
      }

      await playVoiceResponse(audioBase64);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            err?.message && err.message !== "Failed to fetch"
              ? `Voice error: ${err.message}`
              : "Voice processing failed. Please try again.",
          timestamp: new Date(),
        },
      ]);
      if (voiceModeRef.current) {
        setTimeout(() => startRecording(), 1000);
      }
    } finally {
      stoppingRecordingRef.current = false;
      setIsProcessingVoice(false);
    }
  }, [endVoiceMode, handleLocationDetection, playVoiceResponse, router, startRecording, voiceAttachedImage]);

  // --- Voice mode toggle ---
  const toggleVoiceMode = useCallback(() => {
    if (isVoiceMode) {
      endVoiceMode();
    } else {
      voiceModeRef.current = true;
      setIsVoiceMode(true);
      setIsExpanded(true);
      startRecording();
    }
  }, [endVoiceMode, isVoiceMode, startRecording]);

  // --- Chip click ---
  const handleChipClick = (action: string) => {
    const chipMessages: Record<string, string> = {
      register: "I want to register a complaint",
      track: "Track my complaint status",
      trending: "What's trending in my area?",
      help: "Tell me about recent policy updates",
      score: "What's my civic score?",
    };
    const message = chipMessages[action];
    if (message) {
      setInputValue("");
      sendToSentientAI(message);
    }
  };

  // --- Send text ---
  const handleSend = async (message?: string) => {
    const text = message || inputValue.trim();
    if (!text && !attachedImage) return;
    if (isLoading) return;
    setInputValue("");
    const image = attachedImage;
    setAttachedImage(null);
    setImagePreview(null);
    sendToSentientAI(text, image);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- Format content ---
  const formatContent = (content: string) => {
    const cleaned = content
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\*(.+?)\*/g, "$1")
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/^[-*]\s+/gm, "\u2022 ");
    return cleaned.split("\n").map((line, i) => (
      <span key={i}>
        {line}
        {i < cleaned.split("\n").length - 1 && <br />}
      </span>
    ));
  };

  const showChips = messages.length === 0 && !isVoiceMode;

  // Escape key ends voice mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isVoiceMode) toggleVoiceMode();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isVoiceMode, toggleVoiceMode]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-10"
    >
      <div className="relative bg-linear-to-br from-[#0a0a12] via-[#0f0f1e] to-[#141428] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[250px] h-[250px] bg-blue-600/6 rounded-full blur-[100px]" />
        </div>

        {/* Voice Mode Overlay */}
        <AnimatePresence>
          {isVoiceMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#0a0a12]/97 backdrop-blur-xl"
            >
              <div className="w-52 h-52 mb-6">
                <SentientSphere isThinking={isRecording || isProcessingVoice} />
              </div>
              <p className="text-white/60 text-sm mb-1 tracking-[0.2em] uppercase font-medium">
                {isRecording
                  ? "Listening..."
                  : isProcessingVoice
                    ? "Processing..."
                    : isSpeaking
                      ? "Speaking..."
                      : "Starting..."}
              </p>
              <p className="text-white/30 text-xs mb-8">
                {isRecording
                  ? "Speak naturally — I'll detect when you pause"
                  : isSpeaking
                    ? "Playing response"
                    : ""}
              </p>

              {/* Voice mode image upload */}
              <input
                ref={voiceImageInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setVoiceAttachedImage(file);
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setVoiceImagePreview(url);
                  } else {
                    setVoiceImagePreview(null);
                  }
                  e.target.value = "";
                }}
              />

              {/* Voice image preview */}
              <AnimatePresence>
                {voiceImagePreview && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="mb-4 flex items-center gap-3"
                  >
                    <div className="relative">
                      <img
                        src={voiceImagePreview}
                        alt="Attached"
                        className="w-16 h-16 rounded-lg object-cover border border-white/20"
                      />
                      <button
                        onClick={() => {
                          setVoiceAttachedImage(null);
                          setVoiceImagePreview(null);
                        }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                    <span className="text-xs text-white/40">Photo will be sent with your next voice message</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => voiceImageInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-full bg-white/8 border border-white/15 text-white/60 text-sm font-medium hover:bg-white/12 transition-colors flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  Upload Photo
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleVoiceMode}
                  className="px-6 py-2.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-medium hover:bg-red-500/25 transition-colors flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  End Voice Chat
                </motion.button>
              </div>

              <p className="mt-4 text-[10px] text-white/25 tracking-wider uppercase">
                ESC to end call
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="relative z-10 p-6 sm:p-8 flex flex-col min-h-[520px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-[0.2em] text-white/50 uppercase">
                Swaraj Neural Core
              </span>
            </div>
            <div className="flex items-center gap-2">
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    setMessages([]);
                    setIsExpanded(false);
                    locationDetectedRef.current = false;
                    sessionIdRef.current = null;
                  }}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/40 hover:text-white/60"
                  title="Clear chat"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium tracking-wider uppercase transition-colors",
                  showHistory
                    ? "bg-purple-600/20 border border-purple-500/30 text-purple-300"
                    : "bg-white/5 border border-white/8 text-white/40 hover:text-white/60 hover:bg-white/8"
                )}
              >
                <History className="w-3.5 h-3.5" />
                History {savedSessions.length}
              </button>
            </div>
          </div>

          {/* History panel */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="bg-white/3 border border-white/6 rounded-xl p-3 space-y-2">
                  {savedSessions.length === 0 ? (
                    <p className="text-white/30 text-xs text-center py-2">
                      No past conversations
                    </p>
                  ) : (
                    savedSessions.map((s) => (
                      <button
                        key={s.sessionId}
                        onClick={() => loadSession(s)}
                        className="w-full text-left px-3 py-2 rounded-lg bg-white/3 hover:bg-white/6 border border-white/5 transition-colors group"
                      >
                        <p className="text-sm text-white/70 group-hover:text-white/90 truncate">
                          {s.preview}
                        </p>
                        <p className="text-xs text-white/30 mt-0.5">
                          {new Date(s.timestamp).toLocaleDateString()} ·{" "}
                          {s.messages.length} messages
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hero: Sphere + Greeting (no messages) */}
          {showChips && !showHistory && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex-1 flex flex-col items-center justify-center py-4"
            >
              <div className="w-48 h-48 mb-4">
                <SentientSphere isThinking={isLoading} />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">
                How can I assist you, {firstName}?
              </h2>
              <p className="text-xs tracking-[0.2em] text-white/30 uppercase">
                System Listening · Real-Time Mode
              </p>
            </motion.div>
          )}

          {/* Conversation area */}
          <AnimatePresence>
            {isExpanded && messages.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-4 flex-1"
              >
                {/* Mini sphere while chatting */}
                <div className="flex justify-center mb-3">
                  <div className="w-16 h-16">
                    <SentientSphere isThinking={isLoading} />
                  </div>
                </div>

                <div
                  ref={chatContainerRef}
                  className="max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent rounded-xl bg-white/2 p-4 space-y-3"
                >
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-2.5",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-6 h-6 rounded-md bg-purple-600/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3 h-3 text-purple-300" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "max-w-[80%] px-3.5 py-2 rounded-xl text-sm leading-relaxed",
                          msg.role === "user"
                            ? "bg-purple-600/15 border border-purple-500/15 text-white/90"
                            : "bg-white/5 border border-white/5 text-white/75"
                        )}
                      >
                        {formatContent(msg.content)}
                      </div>
                      {msg.role === "user" && (
                        <div className="w-6 h-6 rounded-md bg-white/8 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-3 h-3 text-white/50" />
                        </div>
                      )}
                    </motion.div>
                  ))}

                  {/* Loading */}
                  {(isLoading || isProcessingVoice) && (
                    <div className="flex gap-2.5 items-start">
                      <div className="w-6 h-6 rounded-md bg-purple-600/30 flex items-center justify-center shrink-0">
                        <Bot className="w-3 h-3 text-purple-300" />
                      </div>
                      <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/5">
                        <div className="flex gap-1.5">
                          <span className="w-1.5 h-1.5 bg-purple-400/50 rounded-full animate-bounce [animation-delay:0ms]" />
                          <span className="w-1.5 h-1.5 bg-purple-400/50 rounded-full animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 bg-purple-400/50 rounded-full animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Location detecting */}
                  {detectingLocation && (
                    <div className="flex gap-2.5 items-center">
                      <div className="w-6 h-6 rounded-md bg-purple-600/30 flex items-center justify-center shrink-0">
                        <MapPin className="w-3 h-3 text-purple-300" />
                      </div>
                      <div className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/5 text-xs text-white/40 flex items-center gap-2">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Detecting your location...
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image preview */}
          <AnimatePresence>
            {imagePreview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 flex items-center gap-2"
              >
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Attached"
                    className="w-14 h-14 rounded-lg object-cover border border-white/10"
                  />
                  <button
                    onClick={() => {
                      setAttachedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
                <span className="text-xs text-white/30">Image attached</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input bar */}
          <div className="mt-auto">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setAttachedImage(file);
                if (file) {
                  const url = URL.createObjectURL(file);
                  setImagePreview(url);
                } else {
                  setImagePreview(null);
                }
                e.target.value = "";
              }}
            />

            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => imageInputRef.current?.click()}
                disabled={isVoiceMode || isLoading}
                className="p-2.5 rounded-lg bg-white/5 border border-white/8 text-white/35 hover:text-white/60 hover:bg-white/8 transition-colors disabled:opacity-30"
                title="Attach image"
              >
                <ImageIcon className="w-4 h-4" />
              </motion.button>

              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={
                    isVoiceMode
                      ? "Voice mode active..."
                      : "Command the Neural Core..."
                  }
                  disabled={isVoiceMode}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg text-sm resize-none",
                    "bg-white/5 border border-white/8",
                    "placeholder:text-white/20 text-white",
                    "focus:outline-none focus:ring-1 focus:ring-purple-500/25 focus:border-purple-500/25",
                    "disabled:opacity-40 transition-all duration-200"
                  )}
                  style={{ maxHeight: "120px", overflowY: "auto" }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "auto";
                    target.style.height = Math.min(target.scrollHeight, 120) + "px";
                  }}
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSend()}
                disabled={
                  (!inputValue.trim() && !attachedImage) ||
                  isLoading ||
                  isVoiceMode ||
                  inputValue.length > 500
                }
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  "bg-purple-600/80 text-white hover:bg-purple-500/80",
                  "disabled:opacity-25 disabled:cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Send</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={toggleVoiceMode}
                disabled={isProcessingVoice}
                className={cn(
                  "flex items-center gap-3 pl-2 pr-4 py-2 rounded-xl transition-all duration-200 disabled:opacity-40",
                  isVoiceMode
                    ? "bg-red-900/40 border border-red-500/30 hover:bg-red-900/50"
                    : "bg-[#1a1f2e] border border-white/8 hover:bg-[#1e2435] hover:border-white/12"
                )}
              >
                {/* Icon circle */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    isVoiceMode
                      ? "bg-red-500/20"
                      : "bg-emerald-500/15"
                  )}
                >
                  {isVoiceMode ? (
                    <MicOff className="w-4 h-4 text-red-400" />
                  ) : (
                    <Phone className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                {/* Text */}
                <div className="hidden sm:flex flex-col items-start leading-none">
                  <span className={cn("text-sm font-semibold", isVoiceMode ? "text-red-300" : "text-white/90")}>
                    {isVoiceMode ? "End Call" : "AI Voice Call"}
                  </span>
                  <span className={cn("text-[10px] font-medium tracking-wider uppercase mt-0.5", isVoiceMode ? "text-red-500/70" : "text-emerald-400/80")}>
                    {isVoiceMode ? "Tap to end" : "Instant Connection"}
                  </span>
                </div>
              </motion.button>
            </div>

            <p className="text-center text-[10px] text-white/15 mt-3 tracking-wider">
              SHIFT + ENTER FOR NEW LINE · ESC TO END CALL
            </p>
            <p className="text-center text-[11px] text-purple-400/50 mt-1.5 font-medium tracking-wide">
              🗣️ You can talk or chat in <span className="text-purple-300/70">English</span> or <span className="text-purple-300/70">Hindi</span>
            </p>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
