import OpenAI from "openai";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

/**
 * Text-to-Speech using OpenAI TTS.
 * Returns audio as a Buffer (mp3).
 */
export async function synthesizeSpeech(
  text: string,
  voice: TTSVoice = "nova",
  speed: number = 1.0
): Promise<Buffer> {
  const response = await getOpenAI().audio.speech.create({
    model: "tts-1",
    voice,
    input: text,
    speed,
    response_format: "mp3",
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
