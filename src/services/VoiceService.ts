import Voice, {
    SpeechResultsEvent,
    SpeechErrorEvent,
} from '@react-native-voice/voice';
import * as Speech from 'expo-speech';

type VoiceCallback = (text: string) => void;
type ErrorCallback = (error: string) => void;

let onResultCallback: VoiceCallback | null = null;
let onPartialCallback: VoiceCallback | null = null;
let onErrorCallback: ErrorCallback | null = null;

export const VoiceService = {
    setup: (
        onResult: VoiceCallback,
        onPartial: VoiceCallback,
        onError: ErrorCallback
    ) => {
        onResultCallback = onResult;
        onPartialCallback = onPartial;
        onErrorCallback = onError;

        Voice.onSpeechResults = (e: SpeechResultsEvent) => {
            if (e.value && e.value.length > 0) {
                const text = e.value[0];
                if (onResultCallback) onResultCallback(text);
            }
        };

        Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
            if (e.value && e.value.length > 0) {
                const text = e.value[0];
                if (onPartialCallback) onPartialCallback(text);
            }
        };

        Voice.onSpeechError = (e: SpeechErrorEvent) => {
            if (onErrorCallback) onErrorCallback(e.error?.message || 'Voice recognition error');
        };
    },

    startListening: async () => {
        try {
            await Voice.start('en-US');
            return true;
        } catch (e: any) {
            console.error('VoiceService: Start failed', e);
            return false;
        }
    },

    stopListening: async () => {
        try {
            await Voice.stop();
            return true;
        } catch (e: any) {
            console.error('VoiceService: Stop failed', e);
            return false;
        }
    },

    speak: async (text: string, urgent: boolean = false) => {
        try {
            await Speech.speak(text, {
                language: 'en-US',
                pitch: urgent ? 1.1 : 1.0,
                rate: urgent ? 0.95 : 0.85,
                volume: urgent ? 1.0 : 0.8,
            });
        } catch (e: any) {
            console.error('VoiceService: Speak failed', e);
        }
    },

    stopSpeaking: async () => {
        try {
            await Speech.stop();
        } catch (e) {
            console.error('VoiceService: Stop speaking failed', e);
        }
    },

    cleanup: () => {
        Voice.destroy().then(Voice.removeAllListeners);
        onResultCallback = null;
        onPartialCallback = null;
        onErrorCallback = null;
    }
};
