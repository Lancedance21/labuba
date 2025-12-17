// ai-core.js - GOOGLE GEMINI (ВЕРСИЯ 7.3 - FIXED PROCESSQUERY)
console.log('🚀 AI Core загружен (версия 7.3)');

class MusicAICore {
    constructor() {
        console.log('🛠️ Создание нового экземпляра AI Core');
        this.apiKeys = [];
        this.currentKeyIndex = 0;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        this.modelName = 'gemini-1.5-flash';
        this.musicDB = window.musicDatabase || [];
        
        // Загружаем ключи
        this.loadKeys();
        
        // Запускаем auto-discovery
        setTimeout(() => this.initAutoDiscovery(), 1000);
        
        console.log('✅ AI Core создан. Ключей:', this.apiKeys.length);
    }

    loadKeys() {
        console.log('🔍 Загрузка ключей...');
        
        const allKeys = [];
        
        // 1. Ключ из модального окна (самый важный)
        if (window.currentApiKey && window.currentApiKey.length >= 20) {
            allKeys.push(window.currentApiKey);
            console.log('✅ Добавлен ключ из window.currentApiKey');
        }
        
        // 2. Ключи из API_CONFIG (keys.js)
        if (window.API_CONFIG?.googleKeys?.length > 0) {
            allKeys.push(...window.API_CONFIG.googleKeys);
            console.log(`✅ Добавлены ${window.API_CONFIG.googleKeys.length} ключей из API_CONFIG`);
        }
        
        // 3. Ключи из CONFIG (config.js)
        if (window.CONFIG?.GOOGLE_AI?.API_KEYS?.length > 0) {
            allKeys.push(...window.CONFIG.GOOGLE_AI.API_KEYS);
            console.log(`✅ Добавлены ${window.CONFIG.GOOGLE_AI.API_KEYS.length} ключей из CONFIG`);
        }
        
        // 4. Ключ из localStorage
        try {
            const savedKey = localStorage.getItem('music_ai_google_key');
            if (savedKey && savedKey.length >= 20) {
                if (!allKeys.includes(savedKey)) {
                    allKeys.push(savedKey);
                    console.log('✅ Добавлен ключ из localStorage');
                }
            }
        } catch (e) {}
        
        // Убираем дубликаты и невалидные ключи
        this.apiKeys = [...new Set(allKeys.filter(k => 
            k && typeof k === 'string' && k.length >= 20
        ))];
        
        console.log(`📊 Всего ключей: ${this.apiKeys.length}`);
    }

    updateKeys() {
        console.log('🔄 Обновление ключей...');
        const oldCount = this.apiKeys.length;
        this.loadKeys();
        console.log(`📈 Ключей было: ${oldCount}, стало: ${this.apiKeys.length}`);
        return this.apiKeys.length > 0;
    }

    getCurrentKey() {
        if (this.apiKeys.length === 0) {
            console.error('❌ Нет доступных ключей');
            return null;
        }
        return this.apiKeys[this.currentKeyIndex];
    }

    async initAutoDiscovery() {
        if (this.apiKeys.length === 0) {
            console.log('⏳ Auto-discovery: жду ключи...');
            return;
        }
        
        const apiKey = this.getCurrentKey();
        if (!apiKey) return;
        
        try {
            console.log('🔍 Проверяю доступные модели...');
            const response = await fetch(`${this.baseUrl}/models?key=${apiKey}`);
            const data = await response.json();
            
            if (data.models) {
                const validModels = data.models
                    .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                    .map(m => m.name.replace('models/', ''));
                
                const priority = ['gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.5-pro'];
                const selected = validModels.find(m => priority.includes(m)) || validModels[0];
                
                if (selected) {
                    this.modelName = selected;
                    console.log(`🎉 Использую модель: ${this.modelName}`);
                }
            }
        } catch (e) {
            console.warn('⚠️ Не удалось получить список моделей');
        }
    }

    // 🔥 ВАЖНО: Главный метод для обработки запросов
    async processQuery(userInput) {
        console.log('📝 Обработка запроса:', userInput.substring(0, 50));
        return this.processWithOpenRouter(userInput, window.currentSearchType || 'text');
    }
    
    // 🔥 ВАЖНО: Альтернативное имя для совместимости
    async process(userInput) {
        return this.processQuery(userInput);
    }

    async processWithOpenRouter(userInput, searchType = 'text') {
        console.log('🎯 Process with OpenRouter:', searchType);
        
        // Обновляем ключи перед запросом
        this.updateKeys();
        
        if (this.apiKeys.length === 0) {
            const errorMsg = "⚠️ **Нет API ключа**\n\nВведите Google AI API ключ.";
            console.error(errorMsg);
            
            if (window.addMessageToChat) {
                window.addMessageToChat(errorMsg, 'ai');
            }
            if (window.showApiKeyModal) {
                setTimeout(() => window.showApiKeyModal(), 500);
            }
            return;
        }

        // Показываем индикатор
        const thinkingMsgId = 'thinking_' + Date.now();
        if (window.addMessageToChat) {
            window.addMessageToChat('🤔 Думаю...', 'ai', thinkingMsgId);
        }

        try {
            const apiKey = this.getCurrentKey();
            if (!apiKey) throw new Error('Нет ключа API');
            
            const prompt = this.buildPrompt(userInput, searchType);
            const url = `${this.baseUrl}/models/${this.modelName}:generateContent?key=${apiKey}`;
            
            console.log('📡 Отправка запроса к:', this.modelName);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Ошибка API');
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            // Убираем индикатор
            if (window.removeMessageFromChat) {
                window.removeMessageFromChat(thinkingMsgId);
            }
            
            if (text) {
                if (window.addMessageToChat) {
                    window.addMessageToChat(text, 'ai');
                }
            } else {
                throw new Error('Пустой ответ от API');
            }

        } catch (error) {
            console.error('❌ Ошибка:', error);
            
            // Убираем индикатор
            if (window.removeMessageFromChat) {
                window.removeMessageFromChat(thinkingMsgId);
            }
            
            if (window.addMessageToChat) {
                let errorMsg = `❌ **Ошибка:** ${error.message}`;
                
                if (error.message.includes('API') || error.message.includes('key')) {
                    errorMsg += '\n\n💡 Проверьте API ключ в настройках.';
                    if (window.showApiKeyModal) {
                        setTimeout(() => window.showApiKeyModal(), 1000);
                    }
                }
                
                window.addMessageToChat(errorMsg, 'ai');
            }
        }
    }

    buildPrompt(userInput, searchType) {
        const basePrompt = `Ты музыкальный эксперт. Запрос: "${userInput}"`;
        
        const prompts = {
            melody: `${basePrompt}\n\nНайди песни похожие на эту мелодию. Дай список: 1. Название - Исполнитель. Объясни почему похоже.`,
            lyrics: `${basePrompt}\n\nНайди песни с похожими строчками. Дай список: 1. Название - Исполнитель. Объясни сходство.`,
            mood: `${basePrompt}\n\nПодбери музыку для этого настроения. Дай список: 1. Название - Исполнитель (жанр). Объясни почему подходит.`,
            describe: `${basePrompt}\n\nНайди музыку под это описание. Дай список: 1. Название - Исполнитель. Объясни связь.`
        };
        
        return prompts[searchType] || 
            `${basePrompt}\n\nОтветь как музыкальный эксперт. Если это поиск песни - предложи варианты. Всегда указывай названия и исполнителей.`;
    }
    
    // Методы голосового ввода
    setupVoiceRecognition() {
        console.log('🎤 Голосовой ввод настроен');
    }
    
    startVoiceInput() {
        console.log('🎤 Начало голосового ввода');
        alert('Голосовой ввод в разработке');
    }
    
    stopVoiceInput() {
        console.log('🎤 Остановка голосового ввода');
    }
    
    onVoiceInput(text) {
        console.log('🎤 Голосовой ввод:', text);
        if (text && window.addMessageToChat) {
            window.addMessageToChat(text, 'user');
            this.processQuery(text);
        }
    }
}

// 🔥 ВАЖНО: Создаем глобальный экземпляр и добавляем методы
console.log('🛠️ Инициализация AI Core...');

// Функция инициализации AI Core
function initializeAICore() {
    if (!window.aiCore) {
        window.aiCore = new MusicAICore();
        console.log('✅ AI Core создан');
    }
    
    // 🔥 ГАРАНТИРУЕМ, что методы существуют
    if (window.aiCore) {
        // Если методы не были созданы в конструкторе, добавляем их
        if (typeof window.aiCore.processQuery !== 'function') {
            window.aiCore.processQuery = function(userInput) {
                return this.processWithOpenRouter(userInput, window.currentSearchType || 'text');
            }.bind(window.aiCore);
            console.log('✅ Добавлен метод processQuery');
        }
        
        if (typeof window.aiCore.process !== 'function') {
            window.aiCore.process = window.aiCore.processQuery;
            console.log('✅ Добавлен метод process');
        }
        
        if (typeof window.aiCore.processWithOpenRouter !== 'function') {
            window.aiCore.processWithOpenRouter = function(userInput, searchType) {
                console.log('⚠️ Метод processWithOpenRouter не найден');
                return Promise.resolve();
            };
        }
    }
    
    return window.aiCore;
}

// Экспортируем класс и функцию инициализации
window.MusicAICore = MusicAICore;
window.initializeAICore = initializeAICore;

// 🔥 ВАЖНО: Инициализируем сразу, но также даем возможность повторной инициализации
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM загружен, инициализирую AI Core...');
    setTimeout(() => {
        initializeAICore();
    }, 500);
});

// Также инициализируем при загрузке скрипта
console.log('⚡ Немедленная инициализация AI Core...');
initializeAICore();
