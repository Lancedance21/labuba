// ai-core.js — стабильная версия без ошибок
console.log('🚀 AI Core загружен (Stable Edition)');

class MusicAICore {
    constructor() {
        this.apiKeys = [];
        this.currentKeyIndex = 0;

        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        this.modelName = 'gemini-1.5-flash'; // дефолт, потом заменим

        this.musicDB = window.musicDatabase || [];

        this.loadKeys();
        this.autoDetectModel();
    }

    // Загружаем ключи из всех источников
    loadKeys() {
        const allKeys = [
            ...(window.API_CONFIG?.googleKeys || []),
            ...(window.CONFIG?.GOOGLE_AI?.API_KEYS || []),
            window.currentApiKey
        ].filter(k => typeof k === 'string' && k.length > 20);

        this.apiKeys = [...new Set(allKeys)];

        if (this.apiKeys.length === 0) {
            console.warn("⚠️ Нет ключей Google API");
        }
    }

    getCurrentKey() {
        return this.apiKeys[this.currentKeyIndex];
    }

    // Автоопределение доступной модели
    async autoDetectModel() {
        if (this.apiKeys.length === 0) return;

        const key = this.getCurrentKey();
        console.log("🔍 Проверяю доступные модели...");

        try {
            const res = await fetch(`${this.baseUrl}/models?key=${key}`);
            const data = await res.json();

            if (data.error) {
                console.error("❌ Ошибка API:", data.error.message);
                return;
            }

            const valid = (data.models || [])
                .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                .map(m => m.name.replace('models/', ''));

            console.log("📌 Доступные модели:", valid);

            const priority = [
                'gemini-1.5-flash',
                'gemini-1.5-flash-001',
                'gemini-1.0-pro',
                'gemini-pro'
            ];

            const selected = priority.find(m => valid.includes(m)) || valid[0];

            if (selected) {
                this.modelName = selected;
                console.log(`🎉 Выбрана модель: ${this.modelName}`);
            }

        } catch (e) {
            console.warn("⚠️ Не удалось получить список моделей:", e.message);
        }
    }

    // Основная функция обработки запроса
    async processWithOpenRouter(userInput) {
        if (this.apiKeys.length === 0) {
            window.addMessageToChat?.("⚠️ Нет ключей API", "ai");
            return;
        }

        window.addMessageToChat?.("🤔 Думаю...", "ai", "thinking_msg");

        const prompt = `Ты музыкальный эксперт. Посоветуй музыку по запросу: "${userInput}". Формат: Название — Исполнитель.`;

        try {
            const key = this.getCurrentKey();
            const url = `${this.baseUrl}/models/${this.modelName}:generateContent?key=${key}`;

            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            const data = await response.json();

            window.removeMessageFromChat?.("thinking_msg");

            if (data.error) {
                throw new Error(data.error.message);
            }

            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) throw new Error("Пустой ответ от API");

            window.addMessageToChat?.(text, "ai");

        } catch (e) {
            window.removeMessageFromChat?.("thinking_msg");
            window.addMessageToChat?.(
                `❌ Ошибка: ${e.message}\n💡 Проверь, включён ли Generative Language API.`,
                "ai"
            );
        }
    }

    // Заглушки
    setupVoiceRecognition() {}
    startVoiceInput() { alert("Голосовой ввод временно отключён"); }
    processQuery(t) { this.processWithOpenRouter(t); }
}

window.MusicAICore = MusicAICore;
if (!window.aiCore) window.aiCore = new MusicAICore();
