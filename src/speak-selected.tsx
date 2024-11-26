import { showToast, Toast, getPreferenceValues, getSelectedText } from "@raycast/api";
import { AudioManager } from "./audio/AudioManager";
import { Preferences } from "./voice/types";
import { prepareVoiceSettings } from "./voice/settings";
import { validateSelectedText } from "./text/validation";
import { getTextStats } from "./text/processing";
import { getTextPreview } from "./text/processing";

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
    console.log("Starting TTS command");
    await showToast({ style: Toast.Style.Animated, title: "🔍 Checking for selected text..." });

    const text = await getSelectedText();
    const selectedText = validateSelectedText(text);
    const { wordCount } = getTextStats(selectedText);
    const previewText = getTextPreview(selectedText);

    const preferences = getPreferenceValues<Preferences>();
    const settings = prepareVoiceSettings(preferences);

    await showToast({
      style: Toast.Style.Animated,
      title: `🎙️ Processing ${wordCount} words`,
    });

    const audioManager = new AudioManager({
      text: selectedText,
      voiceId: preferences.voiceId,
      apiKey: preferences.elevenLabsApiKey,
      settings,
    });

    await showToast({
      style: Toast.Style.Success,
      title: `▶️ Now speaking: "${previewText}"`,
    });

    await audioManager.streamAndPlay();
  } catch (error) {
    console.error("Command error:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: `❌ ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
