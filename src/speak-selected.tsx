import { getSelectedText, showHUD, getPreferenceValues } from "@raycast/api";
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
  "Will (Friendly, American)": "bIHbv24MWmeRgasZH58o"
};

export default async function Command() {
  try {
    const selectedText = await getSelectedText();
    
    if (!selectedText) {
      await showHUD("No text selected");
      return;
    }

    const preferences = getPreferenceValues<Preferences>();
    
    // Convert stability and similarity boost to numbers (0-1)
    const stability = Math.min(1, Math.max(0, parseFloat(preferences.stability) || 0.5));
    const similarityBoost = Math.min(1, Math.max(0, parseFloat(preferences.similarityBoost) || 0.75));

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${preferences.voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': preferences.elevenLabsApiKey
        },
        body: JSON.stringify({
          text: selectedText,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability,
            similarity_boost: similarityBoost
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs API error: ${error}`);
    }

    // Save the audio buffer to a temporary file
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempFile = join(tmpdir(), `raycast-tts-${Date.now()}.mp3`);
    await fs.writeFile(tempFile, buffer);

    // Play the audio file
    audioPlayer.play(tempFile, async (err: PlayError) => {
      if (err) {
        console.error("Error playing audio:", err);
        await showHUD("Failed to play audio");
      }
      // Clean up the temporary file
      fs.unlink(tempFile).catch(console.error);
    });

    await showHUD("Speaking selected text");
    
  } catch (error) {
    console.error("Error:", error);
    await showHUD("Failed to speak text");
  }
} 