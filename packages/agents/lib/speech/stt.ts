import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

/**
 * Speech-to-Text using OpenAI Whisper.
 * Accepts audio buffer (WAV/WebM/MP3), returns transcribed text.
 * Auto-detects language (Hindi, English, Hinglish).
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = "audio/wav"
): Promise<{ text: string; language: string }> {
  const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp3") ? "mp3" : "wav";

  const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType });

  const transcription = await getOpenAI().audio.transcriptions.create({
    model: "whisper-1",
    file,
    response_format: "verbose_json",
  });

  return {
    text: transcription.text,
    language: (transcription as any).language || "en",
  };
}
