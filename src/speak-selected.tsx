import { getSelectedText, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import player from "play-sound";
import { ExecException } from "child_process";
import WebSocket from 'ws';

const audioPlayer = player({});

interface Preferences {
  elevenLabsApiKey: string;
  voiceId: string;
  stability: string;
  similarityBoost: string;
}

interface ElevenLabsError {
  detail: {
    status: string;
    message: string;
  };
}

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
}

interface ElevenLabsRequest {
  text: string;
  model_id: string;
  voice_settings: VoiceSettings;
}

type PlayError = ExecException | null;

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

interface WSMessage {
  audio: string;
  isFinal: boolean;
  normalizedAlignment: null | any;
}

/**
 * Streams audio from ElevenLabs API using WebSocket connection
 * Allows for real-time playback as chunks arrive
 * @throws {Error} with user-friendly message for various error cases
 */
async function streamElevenLabsAudio(
  text: string,
  voiceId: string,
  apiKey: string,
  settings: VoiceSettings,
  previewText: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_monolingual_v1`;
    const ws = new WebSocket(wsUrl, {
      headers: {
        'xi-api-key': apiKey,
      },
    });

    const tempFile = join(tmpdir(), `raycast-tts-${Date.now()}.mp3`);
    let isPlaying = false;

    ws.on('open', () => {
      // Send the initial configuration message
      ws.send(JSON.stringify({
        text: text,
        voice_settings: settings,
        generation_config: {
          chunk_length_schedule: [120, 160, 250, 290],
          stream_chunk_size: 8192,
        },
      }));

      ws.send(JSON.stringify({ type: "bos" }));
      ws.send(JSON.stringify({ type: "eos" }));
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WSMessage;
        
        if (message.audio) {
          const audioChunk = Buffer.from(message.audio, 'base64');

          // Write the new chunk to the file
          await fs.writeFile(tempFile, audioChunk, { flag: 'a' });

          // Start playing if not already playing
          if (!isPlaying) {
            isPlaying = true;
            
            await showToast({
              style: Toast.Style.Success,
              title: `▶️ Now speaking: "${previewText}"`,
            });

            audioPlayer.play(tempFile, async (err: PlayError) => {
              if (err) {
                console.error("Error playing audio:", err);
                await showToast({
                  style: Toast.Style.Failure,
                  title: `❌ Playback failed: ${err.message}`,
                });
                reject(err);
              }
              // Clean up the temporary file
              fs.unlink(tempFile).catch(console.error);
            });
          }
        }

        if (message.isFinal) {
          ws.close();
          resolve();
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        reject(new Error("Failed to process audio stream"));
      }
    });

    ws.on('error', (error) => {
      console.error("WebSocket error:", error);
      fs.unlink(tempFile).catch(console.error);
      
      if (error.message.includes("invalid_api_key")) {
        reject(new Error("Invalid API key - Please check your ElevenLabs API key in Raycast preferences (⌘,)"));
      } else if (error.message.includes("ENOTFOUND")) {
        reject(new Error("No internet connection - Please check your network and try again"));
      } else {
        reject(new Error(`ElevenLabs error: ${error.message}`));
      }
    });

    ws.on('close', () => {
      if (!isPlaying) {
        fs.unlink(tempFile).catch(console.error);
      }
    });
  });
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
  const selectedText = await getSelectedText();

  if (!selectedText || selectedText.trim().length === 0) {
    throw new Error("No text selected - Select text and try again (⌥ D)");
  }

  return selectedText;
}

export default async function Command() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "🔍 Checking for selected text...",
    });

    const selectedText = await validateSelectedText();
    const { wordCount, charCount } = getTextStats(selectedText);
    const previewText = getTextPreview(selectedText);

    await showToast({
      style: Toast.Style.Animated,
      title: `📝 Processing ${wordCount} words (${charCount} chars)`,
    });

    const preferences = getPreferenceValues<Preferences>();
    const voiceName = getVoiceNameFromId(preferences.voiceId);

    await showToast({
      style: Toast.Style.Animated,
      title: `🎙️ Generating speech with ${voiceName} (Stability: ${preferences.stability})`,
    });

    const settings: VoiceSettings = {
      stability: Math.min(1, Math.max(0, parseFloat(preferences.stability) || 0.5)),
      similarity_boost: Math.min(1, Math.max(0, parseFloat(preferences.similarityBoost) || 0.75)),
    };

    await showToast({
      style: Toast.Style.Animated,
      title: "🔊 Starting audio stream...",
    });

    await streamElevenLabsAudio(
      selectedText,
      preferences.voiceId,
      preferences.elevenLabsApiKey,
      settings,
      previewText
    );
  } catch (error) {
    console.error("Error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: `❌ ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
