import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { showToast, Toast } from "@raycast/api";
import { ExecException } from "child_process";
import { VoiceSettings } from "../../types/preferences";
import { audioPlayer } from "../../utils/audio";
import { getErrorMessage } from "../../utils/errors";
import { setupWebSocket } from "./websocket";
import { createStreamConfig } from "./config";

/**
 * Streams audio from ElevenLabs API and plays it in real-time
 *
 * Note: While the official ElevenLabs Node.js library (https://www.npmjs.com/package/elevenlabs)
 * would provide better TypeScript support and convenience methods, it currently throws
 * "fetch is not defined" errors in the Raycast environment, and also requires additional
 * dependencies to be installed (MPV and ffmpeg), which makes extension setup more complex.
 * Using direct fetch calls as a workaround until these Node.js compatibility issues are resolved.
 *
 * @param text - Text content to convert to speech
 * @param voiceId - ID of the selected voice
 * @param apiKey - ElevenLabs API key
 * @param settings - Voice generation settings
 * @param previewText - Truncated text preview for UI feedback
 * @returns Promise that resolves when audio playback completes
 * @throws {Error} with user-friendly message for various error cases
 */
export async function streamElevenLabsAudio(
  text: string,
  voiceId: string,
  apiKey: string,
  settings: VoiceSettings,
  previewText: string,
): Promise<void> {
  console.log("Starting audio stream for text:", previewText);

  // Create a unique temporary file for storing audio chunks
  const tempFile = join(tmpdir(), `raycast-tts-${Date.now()}.mp3`);

  // Construct WebSocket URL with voice ID and model parameters
  const wsUrl = `wss://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream-input?model_id=eleven_monolingual_v1`;

  return new Promise((resolve, reject) => {
    // Initialize WebSocket connection with API key authentication
    const ws = setupWebSocket(wsUrl, apiKey);

    // Track playback state and chunk statistics
    let isPlaying = false;
    let chunksReceived = 0;

    // Handle successful WebSocket connection
    ws.on("open", () => {
      console.log("WebSocket connection established, sending configuration...");

      // Send initial configuration with text and voice settings
      ws.send(JSON.stringify(createStreamConfig(text, settings)));

      // Signal start and end of text stream to ElevenLabs
      ws.send(JSON.stringify({ type: "bos" })); // Beginning of Stream
      ws.send(JSON.stringify({ type: "eos" })); // End of Stream
    });

    // Process incoming WebSocket messages
    ws.on("message", async (data) => {
      const message = JSON.parse(data.toString());

      // Skip non-audio messages (like acknowledgments)
      if (!message.audio) {
        console.log("Received non-audio message:", message);
        return;
      }

      chunksReceived++;
      console.log(`Processing audio chunk ${chunksReceived}`);

      // Convert Base64 audio data to buffer and append to temp file
      await fs.writeFile(tempFile, Buffer.from(message.audio, "base64"), { flag: "a" });

      // Start playback when we receive the first chunk
      if (!isPlaying) {
        isPlaying = true;
        console.log("Starting audio playback...");

        // Show toast notification that audio is playing
        await showToast({
          style: Toast.Style.Success,
          title: `▶️ Now speaking: "${previewText}"`,
        });

        // Play the audio file and handle completion/errors
        audioPlayer.play(tempFile, (err: ExecException | null) => {
          if (err) {
            console.error("Error playing audio:", err);
            reject(err);
          }
          console.log("Audio playback completed, cleaning up...");
          // Clean up temp file after playback
          fs.unlink(tempFile).catch(console.error);
        });
      }

      // Handle end of stream
      if (message.isFinal) {
        console.log(`Stream completed, received ${chunksReceived} chunks`);
        ws.close();
        resolve();
      }
    });

    // Handle WebSocket errors
    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      // Clean up temp file on error
      fs.unlink(tempFile).catch(console.error);
      reject(new Error(getErrorMessage(error)));
    });

    // Clean up resources when WebSocket closes
    ws.on("close", () => {
      console.log("WebSocket connection closed");
      if (!isPlaying) {
        console.log("Cleaning up unused temp file...");
        fs.unlink(tempFile).catch(console.error);
      }
    });
  });
} 