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

            console.error('NeuroReflex: Model warmup failed');
            return false;
        } catch (e: any) {
            console.error('NeuroReflex: Cannot connect to OLLAMA at ' + OLLAMA_URL);
            console.error('NeuroReflex: ', e?.message || e);
            return false;
        }
    },

    processSignal: async (transcript: string) => {
        const prompt = 'You are a safety analysis system. Analyze the following text for immediate danger such as scams, threats, or emergencies. Respond with valid JSON only, no other text. Format: {"danger": true/false, "confidence": 0.0 to 1.0, "reasoning": "brief explanation"}\n\nText to analyze: "' + transcript + '"';

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
            console.log('NeuroReflex: Raw OLLAMA response: ' + data.response);

            const jsonMatch = data.response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.error('NeuroReflex: No JSON found in response');
                return { status: 'SAFE', reasoning: 'Could not parse model output' };
            }

            const result = JSON.parse(jsonMatch[0]);

            if (result.danger && result.confidence > 0.8) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return { status: 'INTERVENTION', reasoning: result.reasoning || 'Reflex Triggered' };
            }

            return { status: 'SAFE', reasoning: result.reasoning || 'Low Risk' };
        } catch (e: any) {
            console.error('NeuroReflex: Inference error: ' + (e?.message || e));
            return { status: 'SAFE', reasoning: 'Connection error to OLLAMA' };
        }
    }
};
