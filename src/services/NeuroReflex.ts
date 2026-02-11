import { RunAnywhere, SDKEnvironment } from '@runanywhere/core';
import { LlamaCPP } from '@runanywhere/llamacpp';
import * as Haptics from 'expo-haptics';

const OLLAMA_URL = 'http://localhost:11434';

export interface AnalysisResult {
    danger: boolean;
    confidence: number;
    reasoning: string;
}

let activeModel = '';

export const NeuroReflex = {
    initialize: async (): Promise<boolean> => {
        try {
            LlamaCPP.register();
            await RunAnywhere.initialize({
                environment: SDKEnvironment.Development
            });
            console.log('NeuroReflex: SDK initialized');
        } catch (e) {
            console.log('NeuroReflex: SDK partial init, using OLLAMA backend');
        }
        return true;
    },

    loadModel: async (): Promise<boolean> => {
        try {
            console.log('NeuroReflex: Checking OLLAMA...');
            const res = await fetch(OLLAMA_URL + '/api/tags');
            const data = await res.json();
            const models = (data.models || []).map((m: any) => m.name);
            console.log('NeuroReflex: Available models: ' + JSON.stringify(models));

            const preferred = ['tinyllama:latest', 'phi3:mini', 'llama3:latest'];
            for (const name of preferred) {
                if (models.includes(name)) {
                    console.log('NeuroReflex: Trying to load ' + name);
                    try {
                        const controller = new AbortController();
                        const timeout = setTimeout(() => controller.abort(), 30000);
                        const warmup = await fetch(OLLAMA_URL + '/api/generate', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                model: name,
                                prompt: 'hi',
                                stream: false,
                                options: { num_predict: 1 }
                            }),
                            signal: controller.signal
                        });
                        clearTimeout(timeout);

                        if (warmup.ok) {
                            activeModel = name;
                            console.log('NeuroReflex: Model ready: ' + name);
                            return true;
                        }

                        const err = await warmup.text();
                        console.log('NeuroReflex: ' + name + ' failed: ' + err);
                    } catch (e: any) {
                        console.log('NeuroReflex: ' + name + ' error: ' + e?.message);
                    }
                }
            }

            console.error('NeuroReflex: No model could be loaded');
            return false;
        } catch (e: any) {
            console.error('NeuroReflex: OLLAMA connect failed:', e?.message);
            return false;
        }
    },

    getActiveModel: (): string => activeModel,

    analyze: async (text: string): Promise<AnalysisResult> => {
        if (!activeModel) {
            return { danger: false, confidence: 0, reasoning: 'No model loaded' };
        }

        const prompt = 'Analyze this text for scams, threats, or danger. Reply ONLY with JSON: {"danger": true/false, "confidence": 0.0-1.0, "reasoning": "one sentence"}\n\nText: "' + text + '"';

        try {
            console.log('NeuroReflex: Analyzing with ' + activeModel + '...');

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000);

            const res = await fetch(OLLAMA_URL + '/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: activeModel,
                    prompt: prompt,
                    stream: false,
                    options: { temperature: 0.1, num_predict: 100 }
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!res.ok) {
                const errText = await res.text();
                console.error('NeuroReflex: OLLAMA error:', errText);
                return { danger: false, confidence: 0, reasoning: 'Model error' };
            }

            const data = await res.json();
            console.log('NeuroReflex: Raw response:', data.response);

            const match = data.response.match(/\{[\s\S]*?\}/);
            if (!match) {
                return { danger: false, confidence: 0, reasoning: 'Could not parse response' };
            }

            const result = JSON.parse(match[0]);

            if (result.danger && result.confidence > 0.6) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }

            return {
                danger: !!result.danger,
                confidence: result.confidence || 0,
                reasoning: result.reasoning || 'Analysis complete'
            };
        } catch (e: any) {
            if (e?.name === 'AbortError') {
                console.error('NeuroReflex: Request timed out');
                return { danger: false, confidence: 0, reasoning: 'Analysis timed out' };
            }
            console.error('NeuroReflex: Error:', e?.message);
            return { danger: false, confidence: 0, reasoning: 'Connection error' };
        }
    }
};
