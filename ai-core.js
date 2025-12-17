// ai-core.js — стабильная версия с защитой моделей и ротацией
console.log('🚀 AI Core загружен (Stable + Model Safety)');

class MusicAICore {
    constructor() {
        this.apiKeys = [];
        this.currentKeyIndex = 0;

        // Базовый URL Google Generative Language API
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

        // Дефолтная модель (потом может измениться через авто-дискавери)
        this.modelName = (window.CONFIG?.GOOGLE_AI?.MODEL) || 'gemini-1.5-flash';

        // Локальная база (если есть)
        this.musicDB = window.musicDatabase || [];

        // Загружаем ключи
        this.loadKeys();

        // Пробуем автоматически найти лучшую доступную модель
        this.autoDetectModel();
    }

    // ========= КЛЮЧИ =========

    loadKeys() {
        const allKeys = [
            ...(window.API_CONFIG?.googleKeys || []),
            ...(window.CONFIG?.GOOGLE_AI?.API_KEYS || []),
            window.currentApiKey
        ].filter(k => typeof k === 'string' && k.length > 20);

        this.apiKeys = [...new Set(allKeys)];

        if (this.apiKeys.length === 0) {
            console.warn('⚠️ Ключи Google API не найдены. Введите ключ в настройках.');
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
        const newKey = this.getCurrentKey();
        console.log('🔁 Смена ключа Google API, новый индекс:', this.currentKeyIndex);
        return newKey;
    }

    // ========= МОДЕЛИ (БЕЗОПАСНОСТЬ И РЕЗЕРВ) =========

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

        if (validModels.includes(this.modelName)) {
            return this.modelName;
        }

        console.log(`⚠️ Модель ${this.modelName} невалидна, использую gemini-1.5-flash`);
        this.modelName = 'gemini-1.5-flash';
        return this.modelName;
    }

    getFallbackModel() {
        const fallbackModels = [
            'gemini-1.5-flash',
            'gemini-1.5-flash-001',
            'gemini-1.5-pro',
            'gemini-1.0-pro',
            'gemini-pro'
        ];

        const currentIndex = fallbackModels.indexOf(this.modelName);
        const nextIndex = currentIndex === -1
            ? 0
            : (currentIndex + 1) % fallbackModels.length;

        const nextModel = fallbackModels[nextIndex];
        console.log(`🔄 Смена модели: ${this.modelName} → ${nextModel}`);
        this.modelName = nextModel;
        return this.modelName;
    }

    // Автоопределение лучшей доступной модели через /models
    async autoDetectModel() {
        if (this.apiKeys.length === 0) return;

        const key = this.getCurrentKey();
        console.log('🔍 Диагностика ключа: проверяю доступные модели...');

        try {
            const response = await fetch(`${this.baseUrl}/models?key=${key}`);
            const data = await response.json();

            if (data.error) {
                console.error('❌ Ошибка при запросе моделей:', data.error.message);
                return;
            }

            const validModels = (data.models || [])
                .filter(m => Array.isArray(m.supportedGenerationMethods)
                    && m.supportedGenerationMethods.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));

            if (!validModels.length) {
                console.warn('⚠️ Не найдено ни одной модели с generateContent, использую дефолтную.');
                this.getSafeModelName();
                return;
            }

            console.log('✅ Доступные модели для этого ключа:', validModels);

            const priority = [
                'gemini-1.5-flash',
                'gemini-1.5-flash-001',
                'gemini-1.5-pro',
                'gemini-1.0-pro',
                'gemini-pro'
            ];

            const found = priority.find(m => validModels.includes(m));
            this.modelName = found || validModels[0];

            console.log(`🎉 УСПЕХ! Выбрана модель: ${this.modelName}`);
        } catch (e) {
            console.warn('⚠️ Не удалось получить список моделей (CORS, сеть и т.п.). Использую безопасную модель.');
            this.getSafeModelName();
        }
    }

    // ========= ОСНОВНАЯ ЛОГИКА ЗАПРОСА К GOOGLE =========

    async callGeminiAPI(prompt, attempt = 0) {
        if (this.apiKeys.length === 0) {
            throw new Error('Ключи Google API отсутствуют');
        }

        const maxAttempts = 3;
        const modelToUse = this.getSafeModelName();
        const key = this.getCurrentKey();
        const url = `${this.baseUrl}/models/${modelToUse}:generateContent?key=${key}`;

        console.log(`📡 Запрос к модели ${modelToUse}, попытка ${attempt + 1}/${maxAttempts}...`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [{ text: prompt }]
                    }
                ]
            })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            const message = data.error?.message || response.statusText;

            console.warn('⚠️ Ошибка от Google API:', message);

            if (attempt + 1 < maxAttempts) {
                if (message.includes('API key') || message.includes('permission') || message.includes('UNAUTHENTICATED')) {
                    this.rotateKey();
                } else if (message.includes('model') || message.includes('not found')) {
                    this.getFallbackModel();
                }

                return this.callGeminiAPI(prompt, attempt + 1);
            }

            throw new Error(message);
        }

        return data;
    }

    async processWithOpenRouter(userInput) {
        if (!userInput || typeof userInput !== 'string') {
            window.addMessageToChat?.('⚠️ Пустой запрос. Введите, какую музыку вы хотите.', 'ai');
            return;
        }

        if (this.apiKeys.length === 0) {
            window.addMessageToChat?.('⚠️ Нет ключей API. Введите ключ в настройках.', 'ai');
            return;
        }

        window.addMessageToChat?.('🤔 Думаю...', 'ai', 'thinking_msg');

        const prompt =
            `Ты музыкальный, серьезный эксперт. ` +
            `Посоветуй музыку по запросу: "${userInput}". ` +
            `Дай список треков в формате: Название — Исполнитель, по одному на строку.`;

        try {
            const data = await this.callGeminiAPI(prompt);
            window.removeMessageFromChat?.('thinking_msg');

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                throw new Error('Пустой ответ от API');
            }

            window.addMessageToChat?.(text, 'ai');
        } catch (e) {
            console.error('❌ Ошибка при обработке запроса:', e);
            window.removeMessageFromChat?.('thinking_msg');
            window.addMessageToChat?.(
                `❌ Ошибка: ${e.message}\n\n💡 Совет: проверь ключи и включение Generative Language API в консоли Google.`,
                'ai'
            );
        }
    }

    // ========= ЗАГЛУШКИ ДЛЯ СОВМЕСТИМОСТИ =========

    setupVoiceRecognition() {
        // Здесь можно будет подключить голосовой ввод
    }

    startVoiceInput() {
        alert('Голосовой ввод пока отключен для теста');
    }

    processQuery(text) {
        this.processWithOpenRouter(text);
    }
}

// Экспорт в глобальное окно
window.MusicAICore = MusicAICore;
if (!window.aiCore) {
    window.aiCore = new MusicAICore();
}
