import WebSocket from "ws";

/**
 * Sets up a WebSocket connection to ElevenLabs streaming API
 *
 * @param url - WebSocket endpoint URL for ElevenLabs streaming
 * @param apiKey - ElevenLabs API key for authentication
 * @returns WebSocket instance configured for streaming
 * @throws {Error} if connection setup fails
 */
export function setupWebSocket(url: string, apiKey: string): WebSocket {
  console.log("Setting up WebSocket connection to ElevenLabs...");
  return new WebSocket(url, {
    headers: { "xi-api-key": apiKey },
  });
}
