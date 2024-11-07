/**
 * Formats error messages for user display
 * Converts technical errors into user-friendly messages
 *
 * @param error - Original error from WebSocket or playback
 * @returns User-friendly error message
 */
export function getErrorMessage(error: Error): string {
  console.error("Processing error:", error);
  if (error.message.includes("invalid_api_key")) {
    return "Invalid API key - Please check your ElevenLabs API key in Raycast preferences (⌘,)";
  }
  if (error.message.includes("ENOTFOUND")) {
    return "No internet connection - Please check your network and try again";
  }
  return `ElevenLabs error: ${error.message}`;
} 