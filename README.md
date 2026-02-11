# Halo - Your Invisible Guardian Angel

Halo is a privacy focused mobile application designed to protect users from verbal threats, scams, and social engineering attacks in real time. It operates as a background service with a non intrusive overlay, continuously analyzing conversation patterns to detect danger without compromising user privacy.

## How It Protects You

Halo uses an advanced on device AI model to listen to and analyze conversations. When a threat is detected, such as a scammer asking for OTPs or financial details, Halo provides immediate feedback through haptic vibrations and a visual warning on the overlay. The application is designed to be:

*   **Private**: All voice processing and threat analysis happen locally on your device using a local Large Language Model (LLM). No audio data leaves your phone.
*   **Proactive**: It warns you during the conversation, allowing you to disengage before harm occurs.
*   **Intelligent**: It distinguishes between safe, casual conversations and dangerous patterns like financial fraud, identity theft, and coercion.

## Technology Stack

The application is built using modern mobile and AI technologies to ensure performance and privacy:

*   **Frontend**: React Native with Expo (Managed Workflow)
*   **Architecture**: React Native New Architecture (Fabric) for high performance UI execution
*   **AI Engine**: Local LLM inference using OLLAMA and TinyLlama, bridged via custom native modules
*   **AI Integration**: @runanywhere/core, @runanywhere/llamacpp
*   **Native Modules**: Custom Kotlin implementation for Android System Overlay using Expo Modules API
*   **Voice Processing**: On device speech recognition and Text to Speech integration
*   **State Management**: React Hooks and Context API for real time danger state propagation

## Running the Application

To run Halo locally, you need an Android device or emulator and a running OLLAMA instance.

### Prerequisites

1.  Node.js and npm installed
2.  Android Studio with SDK and Emulator configured
3.  OLLAMA installed and running
4.  Git

### Installation

1.  Clone the repository
    ```bash
    git clone https://github.com/bitWise72/Halo.git
    cd Halo
    ```

2.  Install dependencies
    ```bash
    npm install
    ```

3.  Prepare the AI Model
    Ensure OLLAMA is running and the model is available:
    ```bash
    ollama pull tinyllama
    ```

4.  Connect Device to Localhost
    For Android Emulator to access OLLAMA on your host machine:
    ```bash
    adb reverse tcp:11434 tcp:11434
    ```

5.  Build and Run
    ```bash
    npx expo run:android
    ```

## Usage

1.  Launch the app and grant the necessary permissions (Microphone and Overlay).
2.  Tap the Shield icon to activate the Guardian mode.
3.  Enable the Overlay to have the floating icon persist over other apps.
4.  The icon will glow green when safe and turn red with a warning vibration when a threat is detected.

## License

MIT License
