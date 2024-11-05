import { getSelectedText, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import player from "play-sound";
import { ExecException } from "child_process";
import fetch from "node-fetch";

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

/**
 * Calls ElevenLabs API to convert text to speech
 * @throws {Error} with user-friendly message for various error cases
 * 
 * Note: While the official ElevenLabs Node.js library (https://www.npmjs.com/package/elevenlabs) 
 * would provide better TypeScript support and convenience methods, it currently throws 
 * "fetch is not defined" errors in the Raycast environment. Using direct fetch calls as a 
 * workaround until these Node.js compatibility issues are resolved.
 */
async function callElevenLabsAPI(text: string, voiceId: string, apiKey: string, settings: VoiceSettings): Promise<ArrayBuffer> {
  try {
    const request: ElevenLabsRequest = {
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: settings,
    };

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText) as ElevenLabsError;
        if (errorJson.detail?.status === "invalid_api_key") {
          throw new Error("Invalid API key - Please check your ElevenLabs API key in Raycast preferences (⌘,)");
        }
        throw new Error(`ElevenLabs error: ${errorJson.detail?.message || errorText}`);
      } catch (e) {
        if (e instanceof Error) throw e;
        throw new Error(`ElevenLabs API error: ${errorText}`);
      }
    }

    return await response.arrayBuffer();
  } catch (error) {
    if (error instanceof Error) {
      // Handle network errors
      if (error.message.includes("ENOTFOUND")) {
        throw new Error("No internet connection - Please check your network and try again");
      }
      if (error.message.includes("FetchError")) {
        throw new Error("Network error - Please check your internet connection");
      }
      // Rethrow already formatted errors
      throw error;
    }
    throw new Error("Unknown error while calling ElevenLabs API");
  }
}

export default async function Command() {
  try {
    // Show initial checking toast
    await showToast({
      style: Toast.Style.Animated,
      title: "🔍 Checking for selected text...",
    });

    let selectedText: string;
    try {
      selectedText = await getSelectedText();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "⚠️ No text selected - Select text and try again (⌥ D)",
      });
      return;
    }

    if (!selectedText || selectedText.trim().length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "⚠️ Selected text is empty - Select text and try again (⌥ D)",
      });
      return;
    }

    // Calculate text stats
    const wordCount = selectedText.trim().split(/\s+/).length;
    const charCount = selectedText.length;
    const previewText = selectedText.length > 50 ? `${selectedText.substring(0, 50)}...` : selectedText;

    await showToast({
      style: Toast.Style.Animated,
      title: `📝 Processing ${wordCount} words (${charCount} chars)`,
    });

    const preferences = getPreferenceValues<Preferences>();

    // Get voice name from VOICE_OPTIONS
    const voiceName = Object.entries(VOICE_OPTIONS)
      .find(([_, id]) => id === preferences.voiceId)?.[0]
      .split(" (")[0] || "Unknown Voice";

    await showToast({
      style: Toast.Style.Animated,
      title: `🎙️ Generating speech with ${voiceName} (Stability: ${preferences.stability})`,
    });

    // Prepare voice settings
    const settings: VoiceSettings = {
      stability: Math.min(1, Math.max(0, parseFloat(preferences.stability) || 0.5)),
      similarity_boost: Math.min(1, Math.max(0, parseFloat(preferences.similarityBoost) || 0.75)),
    };

    // Call ElevenLabs API
    const audioBuffer = await callElevenLabsAPI(
      selectedText,
      preferences.voiceId,
      preferences.elevenLabsApiKey,
      settings
    );

    await showToast({
      style: Toast.Style.Animated,
      title: "🔊 Preparing audio playback...",
    });

    // Process audio file
    const buffer = Buffer.from(audioBuffer);
    const tempFile = join(tmpdir(), `raycast-tts-${Date.now()}.mp3`);
    await fs.writeFile(tempFile, buffer);

    await showToast({
      style: Toast.Style.Success,
      title: `▶️ Now speaking: "${previewText}"`,
    });

    // Play the audio file
    audioPlayer.play(tempFile, async (err: PlayError) => {
      if (err) {
        console.error("Error playing audio:", err);
        await showToast({
          style: Toast.Style.Failure,
          title: `❌ Playback failed: ${err.message}`,
        });
      }
      // Clean up the temporary file
      fs.unlink(tempFile).catch(console.error);
    });
  } catch (error) {
    console.error("Error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: `❌ ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
