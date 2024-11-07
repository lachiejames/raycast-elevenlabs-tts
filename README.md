# ElevenLabs TTS

Convert selected text to natural-sounding speech using ElevenLabs' premium text-to-speech voices.

## Features

- Convert any selected text to speech instantly
- Choose from 20 high-quality voices
- Adjust voice stability and clarity
- Real-time streaming playback
- Simple keyboard shortcut activation
- Stop playback anytime with Escape key

## Installation

1. Install the extension from Raycast's store
2. Configure your ElevenLabs API key in preferences
3. Select your preferred voice and settings

## Prerequisites

- Raycast v1.50.0 or higher
- macOS 10.15 or higher
- An ElevenLabs account with API key ([Get one here](https://elevenlabs.io))

## Getting Started

1. Get your ElevenLabs API key:

   - Create an account at [elevenlabs.io](https://elevenlabs.io)
   - Go to your [API Keys](https://elevenlabs.io/app/settings/api-keys)
   - Click "Create API Key"
   - (Optional) Set the key name to something like "Raycast TTS"
   - (Optional) Click "Restrict Key" and enable only the permissions needed for this extension:
     - ✅ Text to Speech
     - ❌ All other permissions
   - Copy your API key

2. Configure the extension in Raycast preferences (⌘,):
   - Paste your ElevenLabs API key
   - Choose your preferred voice
   - Adjust stability and similarity boost settings (optional)

## Usage

1. Select any text in any application
2. Trigger the extension (default: ⌥ D)
3. The selected text will be read aloud
4. Press Escape to stop playback

## Voice Settings

### Stability (0.0-1.0)

Controls how stable/consistent the voice will be:

- Higher values (0.7-1.0): More consistent, good for formal content
- Lower values (0.0-0.3): More expressive, good for casual content
- Default: 0.5 (balanced)

### Similarity Boost (0.0-1.0)

Controls voice clarity and naturalness:

- Higher values (0.7-1.0): Clearer, more precise pronunciation
- Lower values (0.0-0.3): More natural-sounding, with subtle variations
- Default: 0.75 (clear but natural)

## Credits

This extension uses:

- [ElevenLabs API](https://elevenlabs.io) for text-to-speech conversion
- [Raycast API](https://developers.raycast.com) for the extension framework

## Support

For issues and feature requests, please [create an issue](https://github.com/raycast/extensions/issues) in the Raycast extensions repository.

## Privacy

This extension:

- Only processes text that you explicitly select
- Sends selected text to ElevenLabs for speech synthesis
- Does not store any data locally
- Does not collect any analytics
