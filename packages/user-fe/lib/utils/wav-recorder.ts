/**
 * WavRecorder - Simple WAV recorder using ScriptProcessorNode
 * Captures PCM audio and encodes to WAV format
 */
export class WavRecorder {
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private buffers: Float32Array[] = [];
  private sampleRate = 44100;

  async start(): Promise<void> {
    this.buffers = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    
    // Disconnect nodes
    try {
      this.processor?.disconnect();
      this.source?.disconnect();
    } catch (e) {
      console.warn("Error disconnecting audio nodes:", e);
    }
    
    // Stop all tracks
    this.stream?.getTracks().forEach((t) => t.stop());

    const samples = this.interleaveBuffers(this.buffers);
    const wavBuffer = this.encodeWAV(samples, this.sampleRate);
    const blob = new Blob([new Uint8Array(wavBuffer.buffer as ArrayBuffer)], { type: "audio/wav" });

    // Close audio context
    await this.audioContext.close();
    this.audioContext = null;
    this.processor = null;
    this.source = null;
    this.stream = null;
    this.buffers = [];

    return blob;
  }

  private interleaveBuffers(buffers: Float32Array[]): Float32Array {
    let length = 0;
    for (const b of buffers) length += b.length;
    const result = new Float32Array(length);
    let offset = 0;
    for (const b of buffers) {
      result.set(b, offset);
      offset += b.length;
    }
    return result;
  }

  private encodeWAV(samples: Float32Array, sampleRate: number): DataView {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

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

    // Write the PCM samples
    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return view;
  }
}
