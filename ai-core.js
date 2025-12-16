// ai-core.js - GOOGLE GEMINI (ВЕРСИЯ 7.0 - DIAGNOSTIC & AUTO-DISCOVERY)
// Этот код сам находит правильное название модели через API
console.log('🚀 AI Core загружен (версия 7.0 - Auto-Discovery)');

class MusicAICore {
    constructor() {
        this.apiKeys = [];
        this.loadKeys();
        this.currentKeyIndex = 0;
        
        // Базовый URL
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        
        // Сначала ставим безопасную дефолтную, но потом заменим её через autoDetect
        this.modelName = 'gemini-1.5-flash'; 
        
        this.musicDB = window.musicDatabase || [];
        
        // Сразу запускаем поиск доступных моделей
        this.initAutoDiscovery();
    }

    loadKeys() {
        // Собираем ключи отовсюду
        const allKeys = [
            ...(window.API_CONFIG?.googleKeys || []),
            ...(window.CONFIG?.GOOGLE_AI?.API_KEYS || []),
            window.currentApiKey
        ].filter(k => k && typeof k === 'string' && k.length > 20);
        
        // Убираем дубликаты
        this.apiKeys = [...new Set(allKeys)];
        
        if (this.apiKeys.length === 0) {
            console.error("❌ Ключи не найдены! Введите ключ в настройках.");
        }
    }

    getCurrentKey() {
        return this.apiKeys[this.currentKeyIndex];
    }

    // 🔥 САМАЯ ВАЖНАЯ ФУНКЦИЯ: Спрашиваем у Google правильное имя модели
    async initAutoDiscovery() {
        if (this.apiKeys.length === 0) return;
        
        const apiKey = this.getCurrentKey();
        console.log("🔍 Диагностика ключа: проверяю доступные модели...");
        
        try {
            const response = await fetch(`${this.baseUrl}/models?key=${apiKey}`);
            const data = await response.json();
            
            if (data.error) {
                console.error("❌ Ошибка ключа:", data.error.message);
                if (window.addMessageToChat) {
                    window.addMessageToChat(`⚠️ Проблема с ключом: ${data.error.message}. Проверьте, включен ли Generative Language API.`, 'ai');
                }
                return;
            }

            if (data.models) {
                // Ищем модели, которые умеют генерировать текст (generateContent)
                const validModels = data.models
                    .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
                    .map(m => m.name.replace('models/', '')); // Убираем префикс models/
                
                console.log("✅ Доступные модели для этого ключа:", validModels);

                // Выбираем лучшую из доступных
                const priority = ['gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.0-pro', 'gemini-pro'];
                let selected = validModels.find(m => priority.includes(m)) || validModels[0];

                if (selected) {
                    this.modelName = selected;
                    console.log(`🎉 УСПЕХ! Буду использовать модель: ${this.modelName}`);
                }
            }
        } catch (e) {
            console.warn("⚠️ Не удалось получить список моделей (возможно, CORS или нет сети). Использую дефолтную.");
        }
    }

    async processWithOpenRouter(userInput, searchType = 'text') {
        if (this.apiKeys.length === 0) {
            if (window.addMessageToChat) window.addMessageToChat("⚠️ Нет ключей API", 'ai');
            return;
        }

        if (window.addMessageToChat) window.addMessageToChat('🤔 Думаю...', 'ai', 'thinking_msg');

        const prompt = `Ты музыкальный, серьезный  эксперт. Посоветуй музыку: "${userInput}". Дай список: Название - Исполнитель.`;
        
        try {
            const apiKey = this.getCurrentKey();
            // Используем модель, которую нашли в initAutoDiscovery
            const url = `${this.baseUrl}/models/${this.modelName}:generateContent?key=${apiKey}`;
            
            console.log(`📡 Отправка запроса к ${this.modelName}...`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) {
                const errData = await response.json();
                const errText = errData.error?.message || response.statusText;
                throw new Error(`Google API Error: ${errText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (window.removeMessageFromChat) window.removeMessageFromChat('thinking_msg');
            
            if (text && window.addMessageToChat) {
                window.addMessageToChat(text, 'ai');
            } else {
                throw new Error("Пустой ответ");
            }

        } catch (e) {
            console.error(e);
            if (window.removeMessageFromChat) window.removeMessageFromChat('thinking_msg');
            if (window.addMessageToChat) {
                window.addMessageToChat(`❌ Ошибка: ${e.message}. \n\n💡 Совет: Скорее всего, нужно включить API в консоли Google.`, 'ai');
            }
        }
    }
    
    // Заглушки для совместимости с index.html
    setupVoiceRecognition() {} 
    startVoiceInput() { alert('Голосовой ввод пока отключен для теста'); }
    processQuery(t) { this.processWithOpenRouter(t); }
}

window.MusicAICore = MusicAICore;
if (!window.aiCore) window.aiCore = new MusicAICore();
