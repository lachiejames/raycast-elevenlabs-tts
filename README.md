# Speak Text - A Raycast Extension

A powerful text-to-speech extension for Raycast that uses OpenAI's advanced TTS API to read selected text aloud. This extension allows you to convert any selected text to natural-sounding speech with multiple voice options and customizable settings.

## Features

- 🎯 Instantly convert selected text to speech
- 🎤 Choose from 6 high-quality OpenAI voices:
  - Alloy: A versatile, balanced voice
  - Echo: A deep, warm tone
  - Fable: A British-accented storyteller
  - Onyx: A deep, authoritative voice
  - Nova: An energetic, clear voice
  - Shimmer: A clear, youthful sound
- ⚡ Two quality levels:
  - Standard (tts-1)
  - High Definition (tts-1-hd)
- 🔧 Adjustable speech speed (0.25x to 4.0x)
- 🎮 Simple keyboard shortcut activation

## Requirements

- Raycast
- OpenAI API key
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
4. Configure your OpenAI API key in Raycast preferences

## Usage

1. Select any text in any application
2. Trigger the extension using your chosen Raycast keyboard shortcut
3. The selected text will be read aloud using your preferred voice settings

## Configuration

Configure the extension in Raycast preferences:

- **OpenAI API Key**: Your API key from OpenAI
- **Voice**: Choose from 6 different voices
- **Model**: Select standard or HD quality
- **Speed**: Set speech speed (0.25 to 4.0)

## Development

This extension is built with:
- React and TypeScript
- Raycast Extensions API
- OpenAI's Text-to-Speech API
- play-sound for audio playback

## Technical Details

The extension:
1. Captures selected text using Raycast's API
2. Converts text to speech using OpenAI's TTS API
3. Saves the audio temporarily
4. Plays the audio using play-sound
5. Automatically cleans up temporary files

## Credits

- Built with [Raycast Extensions API](https://developers.raycast.com)
- Voice synthesis by [OpenAI](https://openai.com)

## License

MIT License - feel free to modify and reuse this extension as you please!
