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

            console.log('NeuroReflex: SDK initialized');
            return true;
        } catch (e) {
            console.error('NeuroReflex: SDK init failed', e);
            return false;
        }
    },

    loadReflexModel: async () => {
        try {
            console.log('NeuroReflex: Starting model download...');
            await RunAnywhere.downloadModel('smollm2-360m');
            console.log('NeuroReflex: Model downloaded, loading into memory...');

            await RunAnywhere.loadModel('smollm2-360m');
            console.log('NeuroReflex: Model loaded successfully');
            return true;
        } catch (e: any) {
            console.error('NeuroReflex: Model load failed', e?.message || e);
            console.error('NeuroReflex: Full error', JSON.stringify(e, null, 2));
            return false;
        }
    },

    processSignal: async (transcript: string) => {
        const prompt = `Analyze for immediate danger. Input: "${transcript}" Reply JSON ONLY: {"danger": boolean, "confidence": number}`;

        try {
            console.log('NeuroReflex: Running inference...');
            const response = await RunAnywhere.chat(prompt);
            console.log('NeuroReflex: Raw response', response);

            const result = JSON.parse(response);

            if (result.danger && result.confidence > 0.8) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return { status: 'INTERVENTION', reasoning: 'Reflex Triggered' };
            }
        } catch (e: any) {
            console.error('NeuroReflex: Inference error', e?.message || e);
            return { status: 'SAFE', reasoning: 'Parse Error' };
        }

        return { status: 'SAFE', reasoning: 'Low Risk' };
    }
};
