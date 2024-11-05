# Speak Text - A Raycast Extension

A powerful text-to-speech extension for Raycast that uses ElevenLabs' premium voices to read selected text aloud. This extension allows you to convert any selected text to natural-sounding speech with a wide variety of high-quality voices.

## Features

- 🎯 Instantly convert selected text to speech
- 🎤 Choose from 20 premium ElevenLabs voices:
  - Brian: Deep American voice, perfect for narration (default)
  - Alice: Confident British voice
  - Aria: Expressive American voice
  - Bill: Trustworthy American voice
  - Callum: Intense Transatlantic voice
  - Charlie: Natural Australian voice
  - Charlotte: Seductive Swedish voice
  - Chris: Casual American voice
  - Daniel: Authoritative British voice
  - Eric: Friendly American voice
  - George: Warm British voice
  - Jessica: Expressive American voice
  - Laura: Upbeat American voice
  - Liam: Articulate American voice
  - Lily: Warm British voice
  - Matilda: Friendly American voice
  - River: Confident American voice (non-binary)
  - Roger: Confident American voice
  - Sarah: Soft American voice
  - Will: Friendly American voice
- ⚡ Voice customization:
  - Stability control (0.0-1.0)
  - Similarity boost (0.0-1.0)
- 🎮 Simple keyboard shortcut activation

## Requirements

- Raycast
- ElevenLabs API key
- Node.js and npm (for development)

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Configure your ElevenLabs API key in Raycast preferences

## Usage

1. Select any text in any application
2. Trigger the extension using your chosen Raycast keyboard shortcut
3. The selected text will be read aloud using your preferred voice settings

## Configuration

Configure the extension in Raycast preferences:

- **ElevenLabs API Key**: Your API key from ElevenLabs
- **Voice**: Choose from 20 different voices (Brian is default)
- **Stability**: Control voice consistency (0.0-1.0)
  - Higher values: More stable, consistent voice
  - Lower values: More expressive, variable voice
- **Similarity Boost**: Control voice clarity (0.0-1.0)
  - Higher values: Clearer, more precise voice
  - Lower values: More natural-sounding voice

## Development

This extension is built with:

- React and TypeScript
- Raycast Extensions API
- ElevenLabs Text-to-Speech API
- play-sound for audio playback

## Technical Details

The extension:

1. Captures selected text using Raycast's API
2. Converts text to speech using ElevenLabs' API
3. Saves the audio temporarily
4. Plays the audio using play-sound
5. Automatically cleans up temporary files

## Credits

- Built with [Raycast Extensions API](https://developers.raycast.com)
- Voice synthesis by [ElevenLabs](https://elevenlabs.io)

## License

MIT License - feel free to modify and reuse this extension as you please!
