import { getSelectedText, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import player from "play-sound";
import { ExecException } from "child_process";
import WebSocket from "ws";

const audioPlayer = player({});

interface Preferences {
  elevenLabsApiKey: string;
  voiceId: string;
  stability: string;
  similarityBoost: string;
}

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
}

interface ElevenLabsConfig {
  text: string;
  voice_settings: VoiceSettings;
  generation_config: {
    chunk_length_schedule: number[];
    stream_chunk_size: number;
  };
}

// Updated ElevenLabs voices list with the provided voices
const VOICE_OPTIONS = {
  "Brian (Deep, American, Narration)": "nPczCjzI2devNBz1zQrb",
  "Alice (Confident, British)": "Xb7hH8MSUJpSbSDYk0k2",
  "Aria (Expressive, American)": "9BWtsMINqrJLrRacOk9x",
  "Bill (Trustworthy, American)": "pqHfZKP75CvOlQylNhV4",
  "Callum (Intense, Transatlantic)": "N2lVS1w4EtoT3dr4eOWO",
  "Charlie (Natural, Australian)": "IKne3meq5aSn9XLyUdCD",
  "Charlotte (Seductive, Swedish)": "XB0fDUnXU5powFXDhCwa",
  "Chris (Casual, American)": "iP95p4xoKVk53GoZ742B",
  "Daniel (Authoritative, British)": "onwK4e9ZLuTAKqWW03F9",
  "Eric (Friendly, American)": "cjVigY5qzO86Huf0OWal",
  "George (Warm, British)": "JBFqnCBsd6RMkjVDRZzb",
  "Jessica (Expressive, American)": "cgSgspJ2msm6clMCkdW9",
  "Laura (Upbeat, American)": "FGY2WhTYpPnrIDTdsKH5",
  "Liam (Articulate, American)": "TX3LPaxmHKxFdv7VOQHJ",
  "Lily (Warm, British)": "pFZP5JQG7iQjIQuC4Bku",
  "Matilda (Friendly, American)": "XrExE9yKIg1WjnnlVkGX",
  "River (Confident, American)": "SAz9YHcvj6GT2YYXdXww",
  "Roger (Confident, American)": "CwhRBWXzGAHq8TQ4Fs17",
  "Sarah (Soft, American)": "EXAVITQu4vr4xnSDxMaL",
  "Will (Friendly, American)": "bIHbv24MWmeRgasZH58o",
};

/**
 * WebSocket message format from ElevenLabs streaming API
 * audio: Base64 encoded audio chunk
 * isFinal: Indicates the last chunk of the stream
 */
interface WSMessage {
  audio?: string;
  isFinal?: boolean;
}

/**
 * Sets up WebSocket connection with ElevenLabs API
 * @throws {Error} if connection fails
 */
function setupWebSocket(url: string, apiKey: string): WebSocket {
  console.log("Setting up WebSocket connection to ElevenLabs...");
  return new WebSocket(url, {
    headers: { "xi-api-key": apiKey },
  });
}

/**
 * Creates streaming configuration for ElevenLabs API
 * Uses optimized chunk settings for better streaming performance
 */
function createStreamConfig(text: string, settings: VoiceSettings): ElevenLabsConfig {
  console.log("Creating stream configuration with settings:", {
    stability: settings.stability,
    similarity_boost: settings.similarity_boost,
  });
  return {
    text,
    voice_settings: settings,
    generation_config: {
      chunk_length_schedule: [120, 160, 250, 290],
      stream_chunk_size: 8192,
    },
  };
}

/**
 * Streams audio from ElevenLabs API using WebSocket connection
 * Note: While the official ElevenLabs Node.js library exists (https://www.npmjs.com/package/elevenlabs),
 * we're using WebSocket streaming for better performance and compatibility with Raycast's environment.
 * This implementation provides real-time audio streaming with minimal latency.
 *
 * @throws {Error} with user-friendly message for various error cases
 */
async function streamElevenLabsAudio(
  text: string,
  voiceId: string,
  apiKey: string,
  settings: VoiceSettings,
  previewText: string,
): Promise<void> {
  console.log("Starting audio stream for text:", previewText);
  const tempFile = join(tmpdir(), `raycast-tts-${Date.now()}.mp3`);
  const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_monolingual_v1`;

  return new Promise((resolve, reject) => {
    const ws = setupWebSocket(wsUrl, apiKey);
    let isPlaying = false;
    let chunksReceived = 0;

    ws.on("open", () => {
      console.log("WebSocket connection established, sending configuration...");
      ws.send(JSON.stringify(createStreamConfig(text, settings)));
      ws.send(JSON.stringify({ type: "bos" }));
      ws.send(JSON.stringify({ type: "eos" }));
    });

    ws.on("message", async (data) => {
      const message = JSON.parse(data.toString()) as WSMessage;

      if (!message.audio) {
        console.log("Received non-audio message:", message);
        return;
      }

      chunksReceived++;
      console.log(`Processing audio chunk ${chunksReceived}`);

      await fs.writeFile(tempFile, Buffer.from(message.audio, "base64"), { flag: "a" });

      if (!isPlaying) {
        isPlaying = true;
        console.log("Starting audio playback...");
        await showToast({
          style: Toast.Style.Success,
          title: `▶️ Now speaking: "${previewText}"`,
        });

        audioPlayer.play(tempFile, (err: ExecException | null) => {
          if (err) {
            console.error("Error playing audio:", err);
            reject(err);
          }
          console.log("Audio playback completed, cleaning up...");
          fs.unlink(tempFile).catch(console.error);
        });
      }

      if (message.isFinal) {
        console.log(`Stream completed, received ${chunksReceived} chunks`);
        ws.close();
        resolve();
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      fs.unlink(tempFile).catch(console.error);
      reject(new Error(getErrorMessage(error)));
    });

    ws.on("close", () => {
      console.log("WebSocket connection closed");
      if (!isPlaying) {
        console.log("Cleaning up unused temp file...");
        fs.unlink(tempFile).catch(console.error);
      }
    });
  });
}

/**
 * Converts WebSocket errors into user-friendly messages
 */
function getErrorMessage(error: Error): string {
  console.error("Processing error:", error);
  if (error.message.includes("invalid_api_key")) {
    return "Invalid API key - Please check your ElevenLabs API key in Raycast preferences (⌘,)";
  }
  if (error.message.includes("ENOTFOUND")) {
    return "No internet connection - Please check your network and try again";
  }
  return `ElevenLabs error: ${error.message}`;
}

function getTextPreview(text: string, maxLength = 50): string {
  const trimmedText = text.trim();
  return trimmedText.length > maxLength ? `${trimmedText.substring(0, maxLength)}...` : trimmedText;
}

function getTextStats(text: string) {
  return {
    wordCount: text.trim().split(/\s+/).length,
    charCount: text.length,
  };
}

function getVoiceNameFromId(voiceId: string): string {
  return (
    Object.entries(VOICE_OPTIONS)
      .find(([, id]) => id === voiceId)?.[0]
      .split(" (")[0] || "Unknown Voice"
  );
}

async function validateSelectedText(): Promise<string> {
  try {
    const selectedText = await getSelectedText();
    
    if (!selectedText || selectedText.trim().length === 0) {
      throw new Error("No text selected - Select text and try again (⌥ D)");
    }
    
    return selectedText;
  } catch (error) {
    // Handle the specific "Unable to get selected text" error
    if (error instanceof Error && error.message.includes("Unable to get selected text")) {
      throw new Error("Select text in any application before running this command (⌥ D)");
    }
    throw error;
  }
}

async function prepareVoiceSettings(preferences: Preferences): Promise<{
  settings: VoiceSettings;
  voiceName: string;
}> {
  return {
    settings: {
      stability: Math.min(1, Math.max(0, parseFloat(preferences.stability) || 0.5)),
      similarity_boost: Math.min(1, Math.max(0, parseFloat(preferences.similarityBoost) || 0.75)),
    },
    voiceName: getVoiceNameFromId(preferences.voiceId),
  };
}

export default async function Command() {
  try {
    console.log("Starting TTS command...");
    await showToast({
      style: Toast.Style.Animated,
      title: "🔍 Checking for selected text...",
    });

    const selectedText = await validateSelectedText();
    const { wordCount, charCount } = getTextStats(selectedText);
    const previewText = getTextPreview(selectedText);
    console.log(`Processing text: ${wordCount} words, ${charCount} chars`);

    const preferences = getPreferenceValues<Preferences>();
    const { settings, voiceName } = await prepareVoiceSettings(preferences);
    console.log(`Using voice: ${voiceName} with stability: ${settings.stability}`);

    await showToast({
      style: Toast.Style.Animated,
      title: `📝 Processing ${wordCount} words (${charCount} chars)`,
    });

    await showToast({
      style: Toast.Style.Animated,
      title: `🎙️ Generating speech with ${voiceName} (Stability: ${preferences.stability})`,
    });

    await streamElevenLabsAudio(selectedText, preferences.voiceId, preferences.elevenLabsApiKey, settings, previewText);
  } catch (error) {
    console.error("Command error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: `❌ ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
