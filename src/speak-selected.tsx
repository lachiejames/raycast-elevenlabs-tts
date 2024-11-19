import { getSelectedText, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawn } from "child_process";
import WebSocket from "ws";

/**
 * Preferences configurable through Raycast's UI
 * These settings affect voice generation quality and characteristics
 */
interface Preferences {
  elevenLabsApiKey: string; // API key from ElevenLabs dashboard
  voiceId: string; // Selected voice identifier
  stability: string; // Voice stability (0.0-1.0)
  similarityBoost: string; // Voice clarity enhancement (0.0-1.0)
}

/**
 * Voice generation settings passed to ElevenLabs API
 * Controls the characteristics of the generated speech
 */
interface VoiceSettings {
  stability: number; // Higher values = more consistent voice
  similarity_boost: number; // Higher values = clearer but potentially less natural
}

/**
 * Configuration object for ElevenLabs streaming API
 * Includes text content, voice settings, and streaming parameters
 */
interface ElevenLabsConfig {
  text: string;
  voice_settings: VoiceSettings;
  generation_config: {
    chunk_length_schedule: number[]; // Defines how audio is split into chunks
    stream_chunk_size: number; // Size of each audio chunk in bytes
  };
}

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
 * Sets up a WebSocket connection to ElevenLabs streaming API
 *
 * @param url - WebSocket endpoint URL for ElevenLabs streaming
 * @param apiKey - ElevenLabs API key for authentication
 * @returns WebSocket instance configured for streaming
 * @throws {Error} if connection setup fails
 */
function setupWebSocket(url: string, apiKey: string): WebSocket {
  console.log("Setting up WebSocket connection to ElevenLabs...");
  return new WebSocket(url, {
    headers: { "xi-api-key": apiKey },
  });
}

/**
 * Creates configuration for ElevenLabs streaming API
 * Optimizes chunk settings for real-time playback performance
 *
 * @param text - Text content to convert to speech
 * @param settings - Voice generation settings
 * @returns Configuration object for streaming API
 */
function createStreamConfig(text: string, settings: VoiceSettings): ElevenLabsConfig {
  // Log settings for debugging but exclude text content for privacy
  console.log("Creating stream configuration with settings:", {
    stability: settings.stability,
    similarity_boost: settings.similarity_boost,
  });

  return {
    text,
    voice_settings: settings,
    generation_config: {
      // Chunk schedule determines how text is split for streaming
      // Smaller initial chunks enable faster playback start
      chunk_length_schedule: [120, 160, 250, 290],
      stream_chunk_size: 8192, // Optimal size for smooth streaming
    },
  };
}

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
async function streamElevenLabsAudio(
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
      const message = JSON.parse(data.toString()) as WSMessage;

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
        try {
          await playAudio(tempFile);
          console.log("Audio playback completed, cleaning up...");
          await fs.unlink(tempFile);
        } catch (err) {
          console.error("Error playing audio:", err);
          await fs.unlink(tempFile).catch(console.error);
          reject(err);
        }
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

/**
 * Formats error messages for user display
 * Converts technical errors into user-friendly messages
 *
 * @param error - Original error from WebSocket or playback
 * @returns User-friendly error message
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

/**
 * Creates a preview of the text content
 * Trims whitespace and truncates long text for display
 *
 * @param text - Full text content
 * @param maxLength - Maximum length before truncation (default: 50)
 * @returns Trimmed and potentially truncated text
 */
function getTextPreview(text: string, maxLength = 50): string {
  // Remove any leading/trailing whitespace before processing
  const trimmedText = text.trim();

  // If text is longer than maxLength, truncate and add ellipsis
  // Otherwise return the full trimmed text
  return trimmedText.length > maxLength ? `${trimmedText.substring(0, maxLength)}...` : trimmedText;
}

/**
 * Calculates statistics about the text content
 * Used for progress feedback in UI
 *
 * @param text - Text content to analyze
 * @returns Object containing word and character counts
 */
function getTextStats(text: string) {
  // Split text on any whitespace characters to count words
  // This handles multiple spaces, tabs, and newlines
  const wordCount = text.trim().split(/\s+/).length;

  // Simple character count including spaces and punctuation
  const charCount = text.length;

  return { wordCount, charCount };
}

/**
 * Validates that text is selected in the active application
 * Provides user-friendly error messages for common issues
 *
 * @returns Selected text if available
 * @throws {Error} with guidance if no text is selected
 */
async function validateSelectedText(): Promise<string> {
  try {
    // Attempt to get text selection from the active application
    // This will throw if no text is selected or if we can't access the selection
    const selectedText = await getSelectedText();

    // Check for empty or whitespace-only selection
    // This catches cases where text is selected but is just spaces/tabs/newlines
    if (!selectedText || selectedText.trim().length === 0) {
      throw new Error("No text selected - Select text and try again (⌥ D)");
    }

    return selectedText;
  } catch (error) {
    // Special handling for Raycast's "Unable to get selected text" error
    // This occurs when no text is actually selected in any application
    if (error instanceof Error && error.message.includes("Unable to get selected text")) {
      throw new Error("Select text in any application before running this command (⌥ D)");
    }
    throw error;
  }
}

/**
 * Prepares voice settings from user preferences
 * Converts string values to numbers and applies safety bounds
 *
 * @param preferences - User-configured preferences from Raycast
 * @returns Normalized voice settings
 */
async function prepareVoiceSettings(preferences: Preferences): Promise<VoiceSettings> {
  // Parse string values from preferences and ensure they're within valid range
  // Default to reasonable values if parsing fails or values are out of bounds
  const stability = Math.min(1, Math.max(0, parseFloat(preferences.stability) || 0.5));
  const similarityBoost = Math.min(1, Math.max(0, parseFloat(preferences.similarityBoost) || 0.75));

  return {
    stability, // Higher values = more consistent voice
    similarity_boost: similarityBoost, // Higher values = clearer but potentially less natural
  };
}

/**
 * Main command handler for the Raycast extension
 * Orchestrates the text-to-speech process:
 * 1. Validates selected text
 * 2. Prepares voice settings
 * 3. Streams audio from ElevenLabs
 * 4. Provides user feedback through toasts
 *
 * @throws {Error} with user-friendly messages for all error cases
 */
export default async function Command() {
  try {
    // Log the start of command execution for debugging
    console.log("Starting TTS command...");

    // Show initial toast to indicate we're checking for text selection
    // This provides immediate feedback that the command is running
    await showToast({
      style: Toast.Style.Animated,
      title: "🔍 Checking for selected text...",
    });

    // Get and validate the selected text
    // This will throw an error if no text is selected or if it's empty
    const selectedText = await validateSelectedText();

    // Calculate statistics about the selected text for user feedback
    // This helps users understand how much text will be processed
    const { wordCount, charCount } = getTextStats(selectedText);
    const previewText = getTextPreview(selectedText);
    console.log(`Processing text: ${wordCount} words, ${charCount} chars`);

    // Load user preferences from Raycast
    // This includes API key, voice selection, and voice settings
    const preferences = getPreferenceValues<Preferences>();

    // Prepare voice settings and get the friendly name of the selected voice
    // This converts string preferences to proper number values and validates ranges
    const settings = await prepareVoiceSettings(preferences);

    // Show processing toast with text statistics
    // This lets users know their text was successfully captured
    await showToast({
      style: Toast.Style.Animated,
      title: `🎙️ Processing ${wordCount} words`,
    });

    // Start the streaming process
    // This will connect to ElevenLabs, generate audio, and play it
    await streamElevenLabsAudio(selectedText, preferences.voiceId, preferences.elevenLabsApiKey, settings, previewText);
  } catch (error) {
    // Log the full error for debugging purposes
    console.error("Command error:", error);

    // Show a user-friendly error message
    // If it's a known error type, show its message, otherwise show generic error
    await showToast({
      style: Toast.Style.Failure,
      title: `❌ ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}

function playAudio(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn('afplay', [filePath]);
    
    process.on('error', (error) => {
      console.error('Error playing audio:', error);
      reject(error);
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`afplay exited with code ${code}`));
      }
    });
  });
}
