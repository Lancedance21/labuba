// ai-core.js - GOOGLE GEMINI (ВЕРСИЯ 7.2 - FIXED processQuery METHOD)
// Добавлен метод processQuery для совместимости
console.log('🚀 AI Core загружен (версия 7.2 - Fixed processQuery)');

class MusicAICore {
    constructor() {
        this.apiKeys = [];
        this.loadKeys();
        this.currentKeyIndex = 0;
        
        // Базовый URL
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        
        // Безопасная дефолтная модель
        this.modelName = 'gemini-1.5-flash'; 
        
        this.musicDB = window.musicDatabase || [];
        
        // Запускаем поиск доступных моделей
        this.initAutoDiscovery();
        
        console.log('✅ AI Core инициализирован. Ключей:', this.apiKeys.length);
    }

    loadKeys() {
        console.log('🔍 Загрузка ключей из всех источников...');
        
        const allKeySources = [];
        
        // Источник 1: window.currentApiKey (из модального окна)
        if (window.currentApiKey && typeof window.currentApiKey === 'string' && window.currentApiKey.length >= 20) {
            allKeySources.push(window.currentApiKey);
            console.log('✅ Ключ из window.currentApiKey');
        }
        
        // Источник 2: API_CONFIG (keys.js)
        if (window.API_CONFIG?.googleKeys) {
            allKeySources.push(...window.API_CONFIG.googleKeys);
        }
        
        // Источник 3: CONFIG (config.js)
        if (window.CONFIG?.GOOGLE_AI?.API_KEYS) {
            allKeySources.push(...window.CONFIG.GOOGLE_AI.API_KEYS);
        }
        
        // Источник 4: localStorage
        try {
            const savedKey = localStorage.getItem('music_ai_google_key');
            if (savedKey && savedKey.length >= 20) {
                allKeySources.push(savedKey);
            }
        } catch (e) {}
        
        // Фильтруем и убираем дубликаты
        this.apiKeys = [...new Set(allKeySources.filter(k => 
            k && typeof k === 'string' && k.length >= 20
        ))];
        
        console.log(`📊 Итого ключей: ${this.apiKeys.length}`);
        
        if (this.apiKeys.length === 0) {
            console.warn("⚠️ Ключи не найдены!");
        }
    }

    updateKeys() {
        console.log('🔄 Обновление ключей в AI Core...');
        const oldCount = this.apiKeys.length;
        this.loadKeys();
        console.log(`📈 Ключей было: ${oldCount}, стало: ${this.apiKeys.length}`);
        return this.apiKeys.length > 0;
    }

    getCurrentKey() {
        if (this.apiKeys.length === 0) {
            console.error('❌ Нет доступных ключей!');
            return null;
        }
        
        const key = this.apiKeys[this.currentKeyIndex];
        return key;
    }

    async initAutoDiscovery() {
        if (this.apiKeys.length === 0) {
            console.log('⏳ Auto-discovery: жду ключи...');
            return;
        }
        
        const apiKey = this.getCurrentKey();
        if (!apiKey) return;
        
        try {
            const response = await fetch(`${this.baseUrl}/models?key=${apiKey}`);
            const data = await response.json();
            
            if (data.error) {
                console.error("❌ Ошибка ключа:", data.error.message);
                return;
            }

            if (data.models) {
                const validModels = data.models
                    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                    .map(m => m.name.replace('models/', ''));
                
                const priority = ['gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro'];
                let selected = validModels.find(m => priority.includes(m)) || validModels[0];

                if (selected) {
                    this.modelName = selected;
                    console.log(`🎉 Использую модель: ${this.modelName}`);
                }
            }
        } catch (e) {
            console.warn("⚠️ Не удалось получить список моделей. Использую дефолтную.");
            this.modelName = 'gemini-1.5-flash';
        }
    }

    async processWithOpenRouter(userInput, searchType = 'text') {
        this.updateKeys();
        
        if (this.apiKeys.length === 0) {
            const errorMsg = "⚠️ **Нет API ключа**\n\nПожалуйста, введите Google AI API ключ.";
            
            if (window.addMessageToChat) {
                window.addMessageToChat(errorMsg, 'ai');
            }
            
            if (window.showApiKeyModal) {
                window.showApiKeyModal();
            }
            
            return;
        }

        let thinkingMsgId = null;
        if (window.addMessageToChat) {
            const thinkingMsg = window.addMessageToChat('🤔 Думаю...', 'ai', 'thinking_msg');
            thinkingMsgId = 'thinking_msg';
        }

        let prompt = this.buildPrompt(userInput, searchType);
        
        try {
            const apiKey = this.getCurrentKey();
            if (!apiKey) {
                throw new Error('Не удалось получить API ключ');
            }
            
            const url = `${this.baseUrl}/models/${this.modelName}:generateContent?key=${apiKey}`;
            
            console.log(`📡 Отправка запроса к ${this.modelName}...`);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    contents: [{ 
                        parts: [{ text: prompt }] 
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                const errText = errData.error?.message || response.statusText;
                
                if (this.apiKeys.length > 1) {
                    console.log(`🔄 Пробую следующий ключ`);
                    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
                    return this.processWithOpenRouter(userInput, searchType);
                }
                
                throw new Error(`Google API Error: ${errText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (thinkingMsgId && window.removeMessageFromChat) {
                window.removeMessageFromChat(thinkingMsgId);
            }
            
            if (text && window.addMessageToChat) {
                window.addMessageToChat(text, 'ai');
            } else {
                throw new Error("Пустой ответ от API");
            }

        } catch (e) {
            console.error('❌ Ошибка:', e);
            
            if (thinkingMsgId && window.removeMessageFromChat) {
                window.removeMessageFromChat(thinkingMsgId);
            }
            
            if (window.addMessageToChat) {
                let errorMessage = `❌ **Ошибка:** ${e.message}`;
                
                if (e.message.includes('API') || e.message.includes('ключ')) {
                    errorMessage += "\n\n💡 **Что делать:**\n";
                    errorMessage += "• Проверьте правильность API ключа\n";
                    errorMessage += "• Убедитесь, что Generative Language API включен\n";
                    
                    if (window.showApiKeyModal) {
                        setTimeout(() => window.showApiKeyModal(), 1000);
                    }
                }
                
                window.addMessageToChat(errorMessage, 'ai');
            }
        }
    }
    
    buildPrompt(userInput, searchType) {
        const basePrompt = `Ты - музыкальный эксперт. Запрос: "${userInput}"`;
        
        switch(searchType) {
            case 'melody':
                return `${basePrompt}
                
Найди песни похожие на описанную мелодию. Дай список: 1. Название - Исполнитель (год). Кратко объясни почему похоже.`;
            
            case 'lyrics':
                return `${basePrompt}
                
Найди песни с похожими строчками. Дай список: 1. Название - Исполнитель. Объясни сходство.`;
            
            case 'mood':
                return `${basePrompt}
                
Подбери музыку для этого настроения. Дай список: 1. Название - Исполнитель (жанр). Объясни почему подходит.`;
            
            case 'describe':
                return `${basePrompt}
                
Найди музыку подходящую под описание. Дай список: 1. Название - Исполнитель. Объясни связь.`;
            
            default:
                return `${basePrompt}
                
Ответь как музыкальный эксперт. Если это поиск песни - предложи варианты. Если вопрос - дай развернутый ответ. Всегда указывай названия и исполнителей.`;
        }
    }
    
    // 🔥 ВАЖНО: Добавляем метод processQuery для совместимости с index.html
    processQuery(userInput) {
        console.log('📝 Обработка запроса через processQuery:', userInput.substring(0, 50) + '...');
        // Используем processWithOpenRouter с текущим типом поиска или дефолтным
        return this.processWithOpenRouter(userInput, window.currentSearchType || 'text');
    }
    
    // 🔥 Также добавляем метод process для дополнительной совместимости
    process(userInput) {
        return this.processQuery(userInput);
    }
    
    setupVoiceRecognition() {
        console.log('🎤 Голосовой ввод настроен');
    } 
    
    startVoiceInput() {
        console.log('🎤 Начало голосового ввода');
        alert('Голосовой ввод в разработке. Напишите запрос.');
    }
    
    stopVoiceInput() {
        console.log('🎤 Остановка голосового ввода');
    }
    
    onVoiceInput(text) {
        console.log('🎤 Голосовой ввод получен:', text);
        if (text && window.addMessageToChat) {
            window.addMessageToChat(text, 'user');
            this.processQuery(text);
        }
    }
}

// Создаем и экспортируем экземпляр
window.MusicAICore = MusicAICore;

// Создаем глобальный экземпляр
console.log('🛠️ Создаю глобальный экземпляр AI Core...');
if (!window.aiCore) {
    window.aiCore = new MusicAICore();
    console.log('✅ Глобальный aiCore создан');
    
    // 🔥 ВАЖНО: Добавляем отсутствующие методы для совместимости
    if (window.aiCore) {
        // Убедимся, что все нужные методы есть
        if (!window.aiCore.processQuery) {
            window.aiCore.processQuery = function(userInput) {
                return this.processWithOpenRouter(userInput, window.currentSearchType || 'text');
            }.bind(window.aiCore);
            console.log('✅ Добавлен метод processQuery');
        }
        
        if (!window.aiCore.process) {
            window.aiCore.process = window.aiCore.processQuery;
            console.log('✅ Добавлен метод process');
        }
    }
}

// Экспортируем метод для обновления ключей
window.updateAICoreKeys = function() {
    if (window.aiCore && window.aiCore.updateKeys) {
        return window.aiCore.updateKeys();
    }
    return false;
};
