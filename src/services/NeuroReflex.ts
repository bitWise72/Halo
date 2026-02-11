import { RunAnywhere, SDKEnvironment } from '@runanywhere/core';
import { LlamaCPP } from '@runanywhere/llamacpp';
import * as Haptics from 'expo-haptics';

export const NeuroReflex = {
    initialize: async () => {
        try {
            LlamaCPP.register();

            await RunAnywhere.initialize({
                environment: SDKEnvironment.Development
            });

            return true;
        } catch (e) {
            return false;
        }
    },

    loadReflexModel: async () => {
        try {
            await RunAnywhere.downloadModel('smollm2-360m');

            await RunAnywhere.loadModel('smollm2-360m');
            return true;
        } catch (e) {
            return false;
        }
    },

    processSignal: async (transcript: string) => {
        const prompt = `
      Analyze for immediate danger. 
      Input: "${transcript}"
      Reply JSON ONLY: {"danger": boolean, "confidence": number}
    `;

        const response = await RunAnywhere.chat(prompt);

        try {
            const result = JSON.parse(response);

            if (result.danger && result.confidence > 0.8) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return { status: 'INTERVENTION', reasoning: 'Reflex Triggered' };
            }
        } catch (e) {
            return { status: 'SAFE', reasoning: 'Parse Error' };
        }

        return { status: 'SAFE', reasoning: 'Low Risk' };
    }
};
