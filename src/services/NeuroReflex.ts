import { RunAnywhere, SDKEnvironment } from '@runanywhere/core';
import { LlamaCPP } from '@runanywhere/llamacpp';
import * as Haptics from 'expo-haptics';
import { Vibration } from 'react-native';

const OLLAMA_URL = 'http://localhost:11434';

export interface AnalysisResult {
    danger: boolean;
    confidence: number;
    reasoning: string;
}

let activeModel = '';

const ANALYSIS_PROMPT = `You are a safety analysis tool. Most conversations are completely SAFE. Only flag something as dangerous if it clearly involves scams, fraud, identity theft, blackmail, threats of violence, or financial manipulation.

Normal greetings, casual talk, questions, opinions, and everyday conversations are NOT dangerous. When in doubt, mark it as safe.

Examples:

Input: "Hello, I am calling from your bank. Your account has been compromised. Please share your OTP immediately."
Output: {"danger": true, "confidence": 0.95, "reasoning": "Classic bank impersonation scam. Legitimate banks never ask for OTP over phone calls. The caller is attempting to steal banking credentials."}

Input: "Hey, what time are we meeting for dinner tonight?"
Output: {"danger": false, "confidence": 0.02, "reasoning": "Casual dinner plans with no suspicious elements."}

Input: "What is going on with the weather today?"
Output: {"danger": false, "confidence": 0.01, "reasoning": "Normal conversation about weather conditions."}

Input: "Congratulations! You have won a lottery of 50 lakhs. Send 5000 rupees as processing fee to claim your prize."
Output: {"danger": true, "confidence": 0.98, "reasoning": "Lottery scam. No legitimate lottery requires an upfront processing fee. The caller is trying to extract money through false promises."}

Input: "How are you doing? Long time no see!"
Output: {"danger": false, "confidence": 0.01, "reasoning": "Friendly greeting between acquaintances."}

Input: "I need your Aadhaar number and PAN card to process your insurance claim urgently."
Output: {"danger": true, "confidence": 0.92, "reasoning": "Unsolicited request for sensitive identity documents like Aadhaar and PAN is a strong indicator of identity theft or fraud."}

Input: "Can you pick up some groceries on the way home?"
Output: {"danger": false, "confidence": 0.01, "reasoning": "Normal household request."}

Input: "Mom, I got into an accident and I need you to transfer money right now. Do not tell anyone."
Output: {"danger": true, "confidence": 0.90, "reasoning": "Emergency scam pattern where caller impersonates a family member and creates urgency to extract money while demanding secrecy."}

Analyze the following. Reply with ONLY the JSON object:
`;

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

        const fullPrompt = ANALYSIS_PROMPT + 'Input: "' + text.replace(/"/g, "'") + '"\nOutput: ';

        try {
            console.log('NeuroReflex: Analyzing with ' + activeModel + '...');

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60000);

            const res = await fetch(OLLAMA_URL + '/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: activeModel,
                    prompt: fullPrompt,
                    stream: false,
                    options: { temperature: 0.1, num_predict: 250 }
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!res.ok) {
                const errText = await res.text();
                console.error('NeuroReflex: OLLAMA error:', errText);
                return { danger: false, confidence: 0, reasoning: 'Model returned an error' };
            }

            const data = await res.json();
            const raw = data.response || '';
            console.log('NeuroReflex: Raw response:', raw);

            let parsed: any = null;
            try {
                const braceStart = raw.indexOf('{');
                const braceEnd = raw.lastIndexOf('}');
                if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
                    const jsonStr = raw.substring(braceStart, braceEnd + 1);
                    parsed = JSON.parse(jsonStr);
                }
            } catch (parseErr) {
                console.log('NeuroReflex: JSON parse failed, using fallback');
            }

            if (!parsed) {
                return { danger: false, confidence: 0, reasoning: 'Could not determine threat level' };
            }

            const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
            const isDanger = parsed.danger === true && confidence >= 0.8;

            if (isDanger) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                Vibration.vibrate([0, 400, 200, 400, 200, 600]);
            }

            return {
                danger: isDanger,
                confidence: confidence,
                reasoning: parsed.reasoning || 'Analysis complete'
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
