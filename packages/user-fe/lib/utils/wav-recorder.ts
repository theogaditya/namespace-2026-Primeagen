/**
 * Recorder utility for voice chat.
 * Prefers compressed MediaRecorder output when available, while still exposing
 * the AudioContext + source node for silence detection.
 */
export class WavRecorder {
  private _audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private _source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private buffers: Float32Array[] = [];
  private sampleRate = 44100;
  private mediaRecorder: MediaRecorder | null = null;
  private compressedChunks: Blob[] = [];
  private preferredMimeType = "audio/wav";

  /** Expose audioContext for external AnalyserNode (e.g. silence detection) */
  get audioContext(): AudioContext | null {
    return this._audioContext;
  }

  /** Expose source node for connecting an AnalyserNode */
  get source(): MediaStreamAudioSourceNode | null {
    return this._source;
  }

  get mimeType(): string {
    return this.preferredMimeType;
  }

  private resolvePreferredMimeType(): string {
    if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
      return "audio/wav";
    }

    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
    ];

    for (const candidate of candidates) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        return candidate;
      }
    }

    return "audio/wav";
  }

  async start(): Promise<void> {
    this.buffers = [];
    this.compressedChunks = [];
    this.preferredMimeType = this.resolvePreferredMimeType();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.sampleRate = this._audioContext.sampleRate || 44100;
    this._source = this._audioContext.createMediaStreamSource(this.stream);

    if (this.preferredMimeType !== "audio/wav" && typeof MediaRecorder !== "undefined") {
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.preferredMimeType,
        audioBitsPerSecond: 48_000,
      });
      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          this.compressedChunks.push(event.data);
        }
      };
      this.mediaRecorder.start(250);
      return;
    }

    // Fallback for environments without reliable compressed audio support
    this.processor = this._audioContext.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = (event: AudioProcessingEvent) => {
      const input = event.inputBuffer.getChannelData(0);
      this.buffers.push(new Float32Array(input));
    };

    this._source.connect(this.processor);
    this.processor.connect(this._audioContext.destination);
  }

  async stop(): Promise<Blob> {
    if (!this._audioContext) throw new Error("Not recording");

    const stream = this.stream;
    const mediaRecorder = this.mediaRecorder;

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      const blob = await new Promise<Blob>((resolve, reject) => {
        mediaRecorder.onstop = () => {
          resolve(new Blob(this.compressedChunks, { type: mediaRecorder.mimeType || this.preferredMimeType }));
        };
        mediaRecorder.onerror = () => reject(new Error("Failed to encode compressed audio"));
        mediaRecorder.stop();
      });
      await this.cleanup(stream);
      return blob;
    }

    try {
      this.processor?.disconnect();
      this._source?.disconnect();
    } catch (error) {
      console.warn("Error disconnecting audio nodes:", error);
    }

    const samples = this.interleaveBuffers(this.buffers);
    const wavBuffer = this.encodeWAV(samples, this.sampleRate);
    const blob = new Blob([new Uint8Array(wavBuffer.buffer as ArrayBuffer)], { type: "audio/wav" });
    await this.cleanup(stream);
    return blob;
  }

  private async cleanup(stream: MediaStream | null): Promise<void> {
    stream?.getTracks().forEach((track) => track.stop());
    if (this._audioContext) {
      await this._audioContext.close();
    }
    this._audioContext = null;
    this.processor = null;
    this._source = null;
    this.stream = null;
    this.buffers = [];
    this.mediaRecorder = null;
    this.compressedChunks = [];
    this.preferredMimeType = "audio/wav";
  }

  private interleaveBuffers(buffers: Float32Array[]): Float32Array {
    let length = 0;
    for (const buffer of buffers) length += buffer.length;
    const result = new Float32Array(length);
    let offset = 0;
    for (const buffer of buffers) {
      result.set(buffer, offset);
      offset += buffer.length;
    }
    return result;
  }

  private encodeWAV(samples: Float32Array, sampleRate: number): DataView {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (target: DataView, offset: number, value: string) => {
      for (let i = 0; i < value.length; i++) {
        target.setUint8(offset + i, value.charCodeAt(i));
      }
    };

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    }

    return view;
  }
}
