import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { Preferences, VoiceSettings } from "./types/preferences";
import { validateSelectedText, getTextStats, getTextPreview } from "./utils/text";
import { streamElevenLabsAudio } from "./services/elevenlabs/streaming";

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