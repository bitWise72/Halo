# Halo

Your Invisible Guardian Angel

Halo is a mobile application built with React Native and Expo that uses locally hosted OLLAMA-based Llama models to protect users from scams, threats, and dangers in real time.

## Features

- Real-time threat analysis powered by Llama3 running locally via OLLAMA
- Voice input for hands-free threat detection
- Voice alerts when dangers are detected
- Chat interface for conversational interaction with the guardian AI
- Haptic feedback for danger alerts
- RunAnywhere SDK integration with LlamaCPP backend
- Angelic, minimal UI with animated status indicators

## Architecture

The app uses a "Neuro-Reflex" pattern:
- The Reflex Layer analyzes input for immediate danger using low-temperature inference
- The Chat Layer provides conversational responses using the same local Llama3 model
- Voice alerts trigger automatically when threats are detected above 70% confidence

## Tech Stack

- React Native + Expo (Development Build)
- TypeScript
- RunAnywhere SDK (@runanywhere/core, @runanywhere/llamacpp)
- OLLAMA (local LLM server)
- Llama3 (language model)
- expo-speech (text-to-speech)
- @react-native-voice/voice (speech-to-text)
- expo-haptics (vibration feedback)
- expo-sensors (motion detection)

## Prerequisites

- Node.js 18+
- Android SDK with NDK 27.1
- OLLAMA installed with llama3 model pulled
- Physical Android device with USB debugging enabled

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start OLLAMA: `ollama serve`
4. Pull the model if needed: `ollama pull llama3`
5. Connect your Android device via USB
6. Set up port forwarding: `adb reverse tcp:11434 tcp:11434`
7. Build and run: `npx expo run:android`

## How It Works

The app connects to OLLAMA running on your development machine through ADB port forwarding. When you type or speak text, it sends the input to Llama3 for analysis. If the model detects a scam or threat with confidence above 70%, the app triggers haptic feedback and a voice alert to warn the user.

## License

MIT
