import { VoiceSettings } from "../../types/preferences";

/**
 * Configuration object for ElevenLabs streaming API
 * Includes text content, voice settings, and streaming parameters
 */
export interface ElevenLabsConfig {
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
export interface WSMessage {
  audio?: string;
  isFinal?: boolean;
}

/**
 * Creates configuration for ElevenLabs streaming API
 * Optimizes chunk settings for real-time playback performance
 *
 * @param text - Text content to convert to speech
 * @param settings - Voice generation settings
 * @returns Configuration object for streaming API
 */
export function createStreamConfig(text: string, settings: VoiceSettings): ElevenLabsConfig {
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