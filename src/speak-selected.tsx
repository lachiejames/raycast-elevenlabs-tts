import { getSelectedText, showHUD, getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import player from "play-sound";
import { ExecException } from "child_process";

// Initialize audio player
const audioPlayer = player({});

interface Preferences {
  openAiApiKey: string;
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
  model: "tts-1" | "tts-1-hd";
  speed: string;
}

// Type for the play-sound callback error
type PlayError = ExecException | null;

export default async function Command() {
  try {
    // Get the currently selected text
    const selectedText = await getSelectedText();
    
    if (!selectedText) {
      await showHUD("No text selected");
      return;
    }

    // Get user preferences
    const preferences = getPreferenceValues<Preferences>();
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: preferences.openAiApiKey,
    });

    // Parse speed and ensure it's within valid range (0.25 to 4.0)
    const speed = Math.min(4.0, Math.max(0.25, parseFloat(preferences.speed) || 1.0));

    // Generate speech using OpenAI's TTS API
    const response = await openai.audio.speech.create({
      model: preferences.model,
      voice: preferences.voice,
      input: selectedText,
      speed: speed,
    });

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