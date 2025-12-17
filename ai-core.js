// ai-core.js - GOOGLE GEMINI (ВЕРСИЯ 8.0 - FIXED KEY LOADING)
console.log('🚀 AI Core загружен (версия 8.0 - Fixed Key Loading)');

class MusicAICore {
    constructor() {
        this.apiKeys = [];
        this.currentKeyIndex = 0;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        this.modelName = 'gemini-1.5-flash';
        
        // Ждем немного, чтобы все скрипты загрузились, потом инициализируем
        setTimeout(() => this.loadKeys(), 100);
    }

    loadKeys() {
        console.log("🔍 Загрузка ключей...");
        
        const allKeys = [];
        
        // 1. Из window.API_CONFIG (keys.js)
        if (window.API_CONFIG?.googleKeys?.length > 0) {
            console.log("✅ Нашел ключи в API_CONFIG:", window.API_CONFIG.googleKeys.length);
            allKeys.push(...window.API_CONFIG.googleKeys);
        }
        
        // 2. Из window.CONFIG
        if (window.CONFIG?.GOOGLE_AI?.API_KEYS?.length > 0) {
            console.log("✅ Нашел ключи в CONFIG:", window.CONFIG.GOOGLE_AI.API_KEYS.length);
            allKeys.push(...window.CONFIG.GOOGLE_AI.API_KEYS);
        }
        
        // 3. Из window.currentApiKey (введенный в модальном окне)
        if (window.currentApiKey && typeof window.currentApiKey === 'string' && window.currentApiKey.length > 20) {
            console.log("✅ Нашел ключ в currentApiKey");
            allKeys.push(window.currentApiKey);
        }
        
        // 4. Из localStorage (только если других нет)
        if (allKeys.length === 0) {
            try {
                const savedKey = localStorage.getItem('music_ai_google_key');
                if (savedKey && savedKey.length > 20) {
                    console.log("✅ Нашел ключ в localStorage");
                    allKeys.push(savedKey);
                }
            } catch(e) {}
        }
        
        // Убираем дубликаты и пустые значения
        this.apiKeys = [...new Set(allKeys.filter(k => k && k.trim().length > 20))];
        
        console.log(`📦 Всего ключей загружено: ${this.apiKeys.length}`);
        
        if (this.apiKeys.length > 0) {
            console.log("🔑 Первый ключ:", this.apiKeys[0].substring(0, 20) + "...");
            
            // После загрузки ключей, проверяем доступные модели
            setTimeout(() => this.initAutoDiscovery(), 300);
        } else {
            console.error("❌ Нет доступных ключей API!");
            this.showApiKeyError();
        }
    }

    getCurrentKey() {
        if (this.apiKeys.length === 0) {
            console.error("Нет доступных ключей!");
            return null;
        }
        return this.apiKeys[this.currentKeyIndex];
    }

    showApiKeyError() {
        if (window.addMessageToChat) {
            window.addMessageToChat(
                "🔑 **Требуется API ключ Google AI**\n\n" +
                "1. Нажмите на кнопку микрофона в поле ввода\n" +
                "2. Введите ваш Google AI API ключ\n" +
                "3. Ключ сохранится локально\n\n" +
                "📌 Получить ключ можно бесплатно: https://aistudio.google.com/app/apikey",
                'ai'
            );
        }
    }

    async initAutoDiscovery() {
        const apiKey = this.getCurrentKey();
        if (!apiKey) return;
        
        try {
            const response = await fetch(`${this.baseUrl}/models?key=${apiKey}`);
            if (!response.ok) {
                console.error("❌ Ошибка проверки ключа:", response.status);
                return;
            }
            
            const data = await response.json();
            if (data.models) {
                const validModels = data.models
                    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                    .map(m => m.name.replace('models/', ''));
                
                console.log("✅ Доступные модели:", validModels);
                
                const priority = ['gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.0-pro', 'gemini-pro'];
                const selected = validModels.find(m => priority.includes(m)) || validModels[0];
                
                if (selected) {
                    this.modelName = selected;
                    console.log(`🎉 Использую модель: ${this.modelName}`);
                }
            }
        } catch (e) {
            console.warn("⚠️ Не удалось получить список моделей:", e.message);
        }
    }

    async processWithOpenRouter(userInput, searchType = 'text') {
        const apiKey = this.getCurrentKey();
        if (!apiKey) {
            this.showApiKeyError();
            return;
        }

        // Показываем сообщение "Думаю..."
        const thinkingMsgId = 'thinking_' + Date.now();
        if (window.addMessageToChat) {
            window.addMessageToChat('🤔 Думаю...', 'ai', thinkingMsgId);
        }

        const prompt = `Ты музыкальный эксперт. Посоветуй музыку по запросу: "${userInput}". 
        Дай список песен в формате: Название - Исполнитель (Год) | Жанр`;
        
        try {
            const url = `${this.baseUrl}/models/${this.modelName}:generateContent?key=${apiKey}`;
            console.log(`📡 Отправка запроса к ${this.modelName}...`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }]
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errText = errData.error?.message || `HTTP ${response.status}`;
                throw new Error(errText);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            // Убираем сообщение "Думаю..."
            if (window.removeMessageFromChat) {
                window.removeMessageFromChat(thinkingMsgId);
            }
            
            if (text && window.addMessageToChat) {
                window.addMessageToChat(text, 'ai');
            } else {
                throw new Error("Пустой ответ от API");
            }

        } catch (e) {
            console.error("❌ Ошибка API:", e);
            
            // Убираем сообщение "Думаю..."
            if (window.removeMessageFromChat) {
                window.removeMessageFromChat(thinkingMsgId);
            }
            
            if (window.addMessageToChat) {
                let errorMsg = `❌ **Ошибка Google AI:**\n\n${e.message}\n\n`;
                
                if (e.message.includes('API key not valid')) {
                    errorMsg += "🔑 **Проблема:** Ключ API недействителен.\n";
                    errorMsg += "✅ **Решение:**\n";
                    errorMsg += "• Проверьте правильность ключа\n";
                    errorMsg += "• Убедитесь, что API включен: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com\n";
                    errorMsg += "• Получите новый ключ: https://aistudio.google.com/app/apikey";
                } else if (e.message.includes('quota')) {
                    errorMsg += "⚠️ **Проблема:** Превышена квота запросов.\n";
                    errorMsg += "✅ **Решение:**\n";
                    errorMsg += "• Подождите 1-24 часа\n";
                    errorMsg += "• Используйте другой API ключ";
                } else {
                    errorMsg += "🔧 **Проверьте:**\n";
                    errorMsg += "• Подключение к интернету\n";
                    errorMsg += "• Наличие ключа в настройках\n";
                    errorMsg += "• Консоль Google Cloud для активации API";
                }
                
                window.addMessageToChat(errorMsg, 'ai');
            }
        }
    }
    
    // Метод для обновления ключей извне
    updateApiKeys() {
        this.loadKeys();
    }
    
    // Заглушки для совместимости
    setupVoiceRecognition() {
        console.log("🎤 Голосовой ввод инициализирован");
    }
    
    startVoiceInput() {
        if (window.addMessageToChat) {
            window.addMessageToChat(
                "🎤 **Голосовой ввод**\n\n" +
                "1. Нажмите кнопку микрофона\n" +
                "2. Говорите четко\n" +
                "3. Я переведу речь в текст",
                'ai'
            );
        }
    }
    
    stopVoiceInput() {
        console.log("🎤 Голосовой ввод остановлен");
    }
    
    onVoiceInput(text) {
        if (window.addMessageToChat) {
            window.addMessageToChat(text, 'user');
            this.processWithOpenRouter(text);
        }
    }
}

// Создаем глобальный экземпляр
window.MusicAICore = MusicAICore;
if (!window.aiCore) {
    window.aiCore = new MusicAICore();
    console.log("✅ AI Core создан");
}
