import { RunAnywhere, SDKEnvironment } from '@runanywhere/core';
import { LlamaCPP } from '@runanywhere/llamacpp';
import * as Haptics from 'expo-haptics';

const OLLAMA_URL = 'http://localhost:11434';
const OLLAMA_MODEL = 'llama3';

export const NeuroReflex = {
    initialize: async () => {
        try {
            LlamaCPP.register();
            await RunAnywhere.initialize({
                environment: SDKEnvironment.Development
            });
            console.log('NeuroReflex: RunAnywhere SDK initialized');
        } catch (e) {
            console.log('NeuroReflex: RunAnywhere SDK init partial, continuing with OLLAMA backend');
        }
        return true;
    },

    loadReflexModel: async () => {
        try {
            console.log('NeuroReflex: Checking OLLAMA connection at ' + OLLAMA_URL);

            const tagsResponse = await fetch(OLLAMA_URL + '/api/tags');
            const tagsData = await tagsResponse.json();
            const models = tagsData.models || [];
            const modelNames = models.map((m: any) => m.name);
            console.log('NeuroReflex: Available OLLAMA models: ' + JSON.stringify(modelNames));

            const hasModel = modelNames.some((name: string) => name.startsWith(OLLAMA_MODEL));
            if (!hasModel) {
                console.error('NeuroReflex: Model ' + OLLAMA_MODEL + ' not found in OLLAMA');
                return false;
            }

            console.log('NeuroReflex: Warming up model...');
            const warmup = await fetch(OLLAMA_URL + '/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    prompt: 'Hello',
                    stream: false,
                    options: { num_predict: 1 }
                })
            });

            if (warmup.ok) {
                console.log('NeuroReflex: Model warmed up and ready');
                return true;
            }

            return false;
        } catch (e: any) {
            console.error('NeuroReflex: Cannot connect to OLLAMA', e?.message || e);
            return false;
        }
    },

    processSignal: async (transcript: string): Promise<{ status: string; reasoning: string; danger: boolean; confidence: number }> => {
        const prompt = 'You are Halo, a guardian angel AI that protects people from scams, threats, and dangers. Analyze the following text for immediate danger such as phone scams, threats, manipulation, or emergencies. Respond with valid JSON only, no other text. Format: {"danger": true/false, "confidence": 0.0 to 1.0, "reasoning": "brief one-sentence explanation"}\n\nText to analyze: "' + transcript + '"';

        try {
            console.log('NeuroReflex: Running inference via OLLAMA...');
            const response = await fetch(OLLAMA_URL + '/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.1,
                        num_predict: 150
                    }
                })
            });

            const data = await response.json();
            console.log('NeuroReflex: Raw response: ' + data.response);

            const jsonMatch = data.response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return { status: 'SAFE', reasoning: 'Could not parse model output', danger: false, confidence: 0 };
            }

            const result = JSON.parse(jsonMatch[0]);

            if (result.danger && result.confidence > 0.7) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                return { status: 'INTERVENTION', reasoning: result.reasoning || 'Threat detected', danger: true, confidence: result.confidence };
            }

            return { status: 'SAFE', reasoning: result.reasoning || 'No threat detected', danger: false, confidence: result.confidence || 0 };
        } catch (e: any) {
            console.error('NeuroReflex: Inference error: ' + (e?.message || e));
            return { status: 'ERROR', reasoning: 'Connection error to OLLAMA', danger: false, confidence: 0 };
        }
    },

    chat: async (message: string): Promise<string> => {
        try {
            const response = await fetch(OLLAMA_URL + '/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: OLLAMA_MODEL,
                    prompt: 'You are Halo, a caring and gentle guardian angel AI assistant. You protect people from scams and dangers. Respond warmly and concisely in 1-2 sentences. User says: "' + message + '"',
                    stream: false,
                    options: {
                        temperature: 0.7,
                        num_predict: 100
                    }
                })
            });

            const data = await response.json();
            return data.response || 'I am here for you.';
        } catch (e: any) {
            return 'I could not connect right now. Please check your connection.';
        }
    }
};
