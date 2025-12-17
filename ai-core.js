console.log('🚀 AI Core загружен (Stable + Model Safety)');

class MusicAICore {
    constructor() {
        this.apiKeys = [];
        this.currentKeyIndex = 0;

        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        this.modelName = (window.CONFIG?.GOOGLE_AI?.MODEL) || 'gemini-1.5-flash';
        this.musicDB = window.musicDatabase || [];

        this.loadKeys();
        this.autoDetectModel();
    }

    loadKeys() {
        const allKeys = [
            ...(window.API_CONFIG?.googleKeys || []),
            ...(window.CONFIG?.GOOGLE_AI?.API_KEYS || []),
            window.currentApiKey
        ].filter(k => typeof k === 'string' && k.length > 20);

        this.apiKeys = [...new Set(allKeys)];

        if (this.apiKeys.length === 0) {
            console.warn('⚠️ Ключи Google API не найдены.');
        } else {
            console.log('🔑 Загружено ключей Google API:', this.apiKeys.length);
        }
    }

    getCurrentKey() {
        return this.apiKeys[this.currentKeyIndex];
    }

    rotateKey() {
        if (this.apiKeys.length <= 1) return this.getCurrentKey();
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        console.log('🔁 Смена ключа Google API →', this.currentKeyIndex);
        return this.getCurrentKey();
    }

    getSafeModelName() {
        const validModels = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-001',
            'gemini-1.5-flash-latest',
            'gemini-1.5-pro',
            'gemini-1.5-pro-latest',
            'gemini-1.0-pro',
            'gemini-pro'
        ];

        if (validModels.includes(this.modelName)) return this.modelName;

        console.log(`⚠️ Модель ${this.modelName} невалидна → gemini-1.5-flash`);
        return this.modelName = 'gemini-1.5-flash';
    }

    getFallbackModel() {
        const fallbackModels = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-001',
            'gemini-1.5-pro',
            'gemini-1.0-pro',
            'gemini-pro'
        ];

        const idx = fallbackModels.indexOf(this.modelName);
        const next = idx === -1 ? 0 : (idx + 1) % fallbackModels.length;

        console.log(`🔄 Смена модели: ${this.modelName} → ${fallbackModels[next]}`);
        return this.modelName = fallbackModels[next];
    }

    async autoDetectModel() {
        if (this.apiKeys.length === 0) return;

        const key = this.getCurrentKey();
        console.log('🔍 Проверяю доступные модели...');

        try {
            const res = await fetch(`${this.baseUrl}/models?key=${key}`);
            const data = await res.json();

            if (data.error) {
                console.error('❌ Ошибка API:', data.error.message);
                return;
            }

            const valid = (data.models || [])
                .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));

            if (!valid.length) {
                console.warn('⚠️ Нет моделей generateContent → дефолт.');
                return this.getSafeModelName();
            }

            console.log('📌 Доступные модели:', valid);

            const priority = [
                'gemini-1.5-flash',
                'gemini-1.5-flash-001',
                'gemini-1.5-pro',
                'gemini-1.0-pro',
                'gemini-pro'
            ];

            this.modelName = priority.find(m => valid.includes(m)) || valid[0];
            console.log(`🎉 Выбрана модель: ${this.modelName}`);

        } catch (e) {
            console.warn('⚠️ Ошибка авто-дискавери:', e.message);
            this.getSafeModelName();
        }
    }

    async callGeminiAPI(prompt, attempt = 0) {
        if (this.apiKeys.length === 0) throw new Error('Нет ключей Google API');

        const model = this.getSafeModelName();
        const key = this.getCurrentKey();
        const url = `${this.baseUrl}/models/${model}:generateContent?key=${key}`;

        console.log(`📡 Запрос → ${model}, попытка ${attempt + 1}`);

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await res.json();

        if (!res.ok || data.error) {
            const msg = data.error?.message || res.statusText;
            console.warn('⚠️ Ошибка API:', msg);

            if (attempt < 2) {
                if (msg.includes('API key') || msg.includes('UNAUTHENTICATED')) {
                    this.rotateKey();
                } else if (msg.includes('model')) {
                    this.getFallbackModel();
                }
                return this.callGeminiAPI(prompt, attempt + 1);
            }

            throw new Error(msg);
        }

        return data;
    }

    async processWithOpenRouter(userInput) {
        if (!userInput) {
            window.addMessageToChat?.('⚠️ Введите запрос.', 'ai');
            return;
        }

        if (this.apiKeys.length === 0) {
            window.addMessageToChat?.('⚠️ Нет ключей API.', 'ai');
            return;
        }

        window.addMessageToChat?.('🤔 Думаю...', 'ai', 'thinking_msg');

        const prompt = `Ты музыкальный эксперт. Подбери музыку по запросу "${userInput}". Формат: Название — Исполнитель.`;

        try {
            const data = await this.callGeminiAPI(prompt);
            window.removeMessageFromChat?.('thinking_msg');

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Пустой ответ');

            window.addMessageToChat?.(text, 'ai');

        } catch (e) {
            window.removeMessageFromChat?.('thinking_msg');
            window.addMessageToChat?.(`❌ Ошибка: ${e.message}`, 'ai');
        }
    }

    setupVoiceRecognition() {}
    startVoiceInput() { alert('Голосовой ввод отключён'); }
    processQuery(t) { this.processWithOpenRouter(t); }
}

window.MusicAICore = MusicAICore;
window.aiCore = new MusicAICore();
