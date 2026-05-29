"use client";

import React, { useRef, useState } from "react";

type ApiResponse = {
  audio_url?: string;
  reply?: string;
  transcription?: string;
};

// Simple WAV recorder using ScriptProcessorNode to capture PCM and encode WAV
class WavRecorder {
  audioContext: AudioContext | null = null;
  processor: ScriptProcessorNode | null = null;
  source: MediaStreamAudioSourceNode | null = null;
  stream: MediaStream | null = null;
  buffers: Float32Array[] = [];
  sampleRate = 44100;

  async start() {
    this.buffers = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.sampleRate = this.audioContext.sampleRate || 44100;
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    // ScriptProcessorNode is deprecated but still widely supported; buffer size 4096
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const input = e.inputBuffer.getChannelData(0);
      this.buffers.push(new Float32Array(input));
    };
    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  async stop(): Promise<Blob> {
    if (!this.audioContext) throw new Error("Not recording");
    // disconnect
    try {
      this.processor?.disconnect();
      this.source?.disconnect();
    } catch (e) {}
    // stop tracks
    this.stream?.getTracks().forEach((t) => t.stop());

    const samples = this._interleaveBuffers(this.buffers);
    const wavBuffer = this._encodeWAV(samples, this.sampleRate);
    const blob = new Blob([wavBuffer], { type: "audio/wav" });

    // close audio context
    await this.audioContext.close();
    this.audioContext = null;
    this.processor = null;
    this.source = null;
    this.stream = null;
    this.buffers = [];

    return blob;
  }

  _interleaveBuffers(buffers: Float32Array[]) {
    let length = 0;
    for (let b of buffers) length += b.length;
    const result = new Float32Array(length);
    let offset = 0;
    for (let b of buffers) {
      result.set(b, offset);
      offset += b.length;
    }
    return result;
  }

  _encodeWAV(samples: Float32Array, sampleRate: number) {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    function writeString(view: DataView, offset: number, str: string) {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    }

    /* RIFF identifier */ writeString(view, 0, "RIFF");
    /* file length */ view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */ writeString(view, 8, "WAVE");
    /* format chunk identifier */ writeString(view, 12, "fmt ");
    /* format chunk length */ view.setUint32(16, 16, true);
    /* sample format (raw) */ view.setUint16(20, 1, true);
    /* channel count */ view.setUint16(22, 1, true);
    /* sample rate */ view.setUint32(24, sampleRate, true);
    /* byte rate (sampleRate * blockAlign) */ view.setUint32(28, sampleRate * 2, true);
    /* block align (channel count * bytes per sample) */ view.setUint16(32, 2, true);
    /* bits per sample */ view.setUint16(34, 16, true);
    /* data chunk identifier */ writeString(view, 36, "data");
    /* data chunk length */ view.setUint32(40, samples.length * 2, true);

    // write the PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return view;
  }
}

export default function VoiceTestPage() {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>("hi");

  const recorderRef = useRef<WavRecorder | null>(null);

  async function handleToggleRecord() {
    if (!recording) {
      // start
      recorderRef.current = new WavRecorder();
      try {
        await recorderRef.current.start();
        setReply(null);
        setTranscription(null);
        setAudioSrc(null);
        setRecording(true);
      } catch (err) {
        console.error("start recording failed", err);
        alert("Could not start microphone. Check permissions.");
      }
    } else {
      // stop and upload
      setRecording(false);
      setUploading(true);
      try {
        const blob = await recorderRef.current?.stop();
        if (!blob) throw new Error("No audio captured");

        const form = new FormData();
        form.append("file", blob, "recording.wav");
        form.append("language", language);

        const res = await fetch("http://44.197.195.150:8000/voice-chat", {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Upload failed: ${res.status} ${text}`);
        }

        const data: ApiResponse = await res.json();
        setReply(data.reply || null);
        setTranscription(data.transcription || null);
        if (data.audio_url) {
          const url = data.audio_url.startsWith("http")
            ? data.audio_url
            : `http://44.197.195.150:8000/${data.audio_url}`;
          setAudioSrc(url);
        }
      } catch (err: any) {
        console.error(err);
        alert("Error uploading audio: " + (err.message || err));
      } finally {
        setUploading(false);
      }
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 780 }}>
      <h2>Voice Test</h2>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Message</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          style={{ width: "100%", padding: 8, fontSize: 14 }}
          placeholder="You can type a message here... (optional)"
        />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <button
          onClick={handleToggleRecord}
          style={{ padding: "10px 14px", fontSize: 16 }}
          disabled={uploading}
        >
          {recording ? "Stop & Send" : "Record"}
        </button>

        <div>
          <label style={{ marginRight: 8 }}>Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="hi">Hindi (hi)</option>
            <option value="en">English (en)</option>
            <option value="mr">Marathi (mr)</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div style={{ minWidth: 120 }}>
          {recording && <span style={{ color: "red" }}>● Recording...</span>}
          {uploading && <span>Uploading...</span>}
        </div>
      </div>

      <div>
        <strong>Reply:</strong>
        <div style={{ marginTop: 8, padding: 12, background: "#f6f6f6", minHeight: 40 }}>
          {reply ? <div dangerouslySetInnerHTML={{ __html: reply }} /> : <em>No reply yet</em>}
        </div>
      </div>

      {transcription && (
        <div style={{ marginTop: 12 }}>
          <strong>Transcription:</strong>
          <div>{transcription}</div>
        </div>
      )}

      {audioSrc && (
        <div style={{ marginTop: 12 }}>
          <strong>Response audio:</strong>
          <div>
            <audio src={audioSrc} controls />
          </div>
        </div>
      )}
    </div>
  );
}
