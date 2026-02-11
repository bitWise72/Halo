import * as Speech from 'expo-speech';

export const VoiceOutput = {
    speak: async (text: string, urgent: boolean = false, onDone?: () => void) => {
        try {
            const isSpeaking = await Speech.isSpeakingAsync();
            if (isSpeaking) await Speech.stop();

            Speech.speak(text, {
                language: 'en-US',
                pitch: urgent ? 1.15 : 0.95,
                rate: urgent ? 1.0 : 0.85,
                volume: 1.0,
                onDone: onDone,
                onStopped: onDone,
                onError: (e) => {
                    console.log('Speech error', e);
                    if (onDone) onDone();
                }
            });
        } catch (e) {
            console.error('VoiceOutput failed:', e);
            if (onDone) onDone();
        }
    },

    stop: async () => {
        try {
            await Speech.stop();
        } catch (e) {
            console.error('VoiceOutput stop failed:', e);
        }
    }
};
