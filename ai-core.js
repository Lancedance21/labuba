// ai-core.js - GOOGLE GEMINI (ВЕРСИЯ 7.5 - FIXED MODEL NAME)
console.log('🚀 AI Core загружен (версия 7.5 - Fixed Model)');

// Создаем фабрику для гарантированного создания методов
function createAICore() {
    console.log('🛠️ Создание AI Core с гарантированными методами');
    
    const aiCore = {
        apiKeys: [],
        currentKeyIndex: 0,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        // 🔥 ИСПРАВЛЕНО: Используем только существующие модели
        modelName: 'gemini-1.5-flash', // ТОЛЬКО существующие модели
        musicDB: window.musicDatabase || [],

        // 🔥 ГЛАВНЫЙ МЕТОД
        processQuery: function(userInput) {
            console.log('📝 ProcessQuery:', userInput?.substring(0, 50) || 'пусто');
            return this.processWithOpenRouter(userInput, window.currentSearchType || 'text');
        },

        process: function(userInput) {
            return this.processQuery(userInput);
        },

        processWithOpenRouter: async function(userInput, searchType = 'text') {
            console.log('🎯 ProcessWithOpenRouter:', searchType);
            
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

            const thinkingMsgId = 'thinking_' + Date.now();
            if (window.addMessageToChat) {
                window.addMessageToChat('🤔 Думаю...', 'ai', thinkingMsgId);
            }

            try {
                const apiKey = this.getCurrentKey();
                if (!apiKey) throw new Error('Нет API ключа');
                
                // 🔥 ИСПРАВЛЕНО: Используем безопасное имя модели
                const safeModelName = this.getSafeModelName();
                const prompt = this.buildPrompt(userInput, searchType);
                const url = `${this.baseUrl}/models/${safeModelName}:generateContent?key=${apiKey}`;
                
                console.log(`📡 Отправка запроса к ${safeModelName}...`);
                
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
                    const errorMessage = errorData.error?.message || 'Ошибка API';
                    
                    // 🔥 Пробуем другую модель при ошибке
                    if (errorMessage.includes('model') || errorMessage.includes('overloaded')) {
                        console.log('🔄 Пробую другую модель из-за ошибки:', errorMessage);
                        this.modelName = this.getFallbackModel();
                        return this.processWithOpenRouter(userInput, searchType);
                    }
                    
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                if (window.removeMessageFromChat) {
                    window.removeMessageFromChat(thinkingMsgId);
                }
                
                if (text && window.addMessageToChat) {
                    window.addMessageToChat(text, 'ai');
                } else {
                    throw new Error('Пустой ответ от AI');
                }

            } catch (error) {
                console.error('❌ Ошибка:', error);
                
                if (window.removeMessageFromChat) {
                    window.removeMessageFromChat(thinkingMsgId);
                }
                
                if (window.addMessageToChat) {
                    let errorMsg = `❌ **Ошибка:** ${error.message}`;
                    
                    if (error.message.includes('overloaded') || error.message.includes('перегружен')) {
                        errorMsg = '⚠️ **Модель перегружена**\n\nСерверы Google AI временно перегружены. Пожалуйста, попробуйте через несколько минут.';
                    } else if (error.message.includes('model') || error.message.includes('модель')) {
                        errorMsg = '⚠️ **Проблема с моделью AI**\n\nПопробую использовать другую модель...';
                        this.modelName = this.getFallbackModel();
                        setTimeout(() => this.processWithOpenRouter(userInput, searchType), 1000);
                    }
                    
                    window.addMessageToChat(errorMsg, 'ai');
                }
            }
        },

        // 🔥 НОВЫЙ МЕТОД: Безопасное имя модели
        getSafeModelName: function() {
            // 🔥 ИСПРАВЛЕНО: Только реально существующие модели
            const validModels = [
                'gemini-1.5-flash',
                'gemini-1.5-flash-001',
                'gemini-1.5-flash-latest',
                'gemini-1.5-pro',
                'gemini-1.5-pro-latest',
                'gemini-1.0-pro',
                'gemini-pro'
            ];
            
            // Если текущая модель валидна, используем ее
            if (validModels.includes(this.modelName)) {
                return this.modelName;
            }
            
            // Иначе используем самую надежную
            console.log(`⚠️ Модель ${this.modelName} невалидна, использую gemini-1.5-flash`);
            return 'gemini-1.5-flash';
        },

        // 🔥 НОВЫЙ МЕТОД: Запасная модель
        getFallbackModel: function() {
            const fallbackModels = [
                'gemini-1.5-flash',
                'gemini-1.5-flash-001',
                'gemini-1.5-pro',
                'gemini-1.0-pro',
                'gemini-pro'
            ];
            
            // Текущий индекс в списке запасных моделей
            const currentIndex = fallbackModels.indexOf(this.modelName);
            const nextIndex = (currentIndex + 1) % fallbackModels.length;
            
            console.log(`🔄 Смена модели: ${this.modelName} → ${fallbackModels[nextIndex]}`);
            return fallbackModels[nextIndex];
        },

        loadKeys: function() {
            console.log('🔍 Загрузка ключей...');
            
            const allKeys = [];
            
            if (window.currentApiKey && window.currentApiKey.length >= 20) {
                allKeys.push(window.currentApiKey);
            }
            
            if (window.API_CONFIG?.googleKeys?.length > 0) {
                allKeys.push(...window.API_CONFIG.googleKeys);
            }
            
            if (window.CONFIG?.GOOGLE_AI?.API_KEYS?.length > 0) {
                allKeys.push(...window.CONFIG.GOOGLE_AI.API_KEYS);
            }
            
            try {
                const savedKey = localStorage.getItem('music_ai_google_key');
                if (savedKey && savedKey.length >= 20 && !allKeys.includes(savedKey)) {
                    allKeys.push(savedKey);
                }
            } catch (e) {}
            
            this.apiKeys = [...new Set(allKeys.filter(k => 
                k && typeof k === 'string' && k.length >= 20
            ))];
            
            console.log(`📊 Ключей: ${this.apiKeys.length}`);
            return this.apiKeys;
        },

        updateKeys: function() {
            const oldCount = this.apiKeys.length;
            this.loadKeys();
            console.log(`🔄 Ключей было: ${oldCount}, стало: ${this.apiKeys.length}`);
            return this.apiKeys.length > 0;
        },

        getCurrentKey: function() {
            if (this.apiKeys.length === 0) {
                console.error('❌ Нет ключей');
                return null;
            }
            const key = this.apiKeys[this.currentKeyIndex];
            return key;
        },

        buildPrompt: function(userInput, searchType) {
            const basePrompt = `Ты музыкальный эксперт. Запрос: "${userInput}"`;
            
            const prompts = {
                melody: `${basePrompt}\n\nНайди песни похожие на эту мелодию. Дай список: 1. Название - Исполнитель. Объясни почему похоже.`,
                lyrics: `${basePrompt}\n\nНайди песни с похожими строчками. Дай список: 1. Название - Исполнитель. Объясни сходство.`,
                mood: `${basePrompt}\n\nПодбери музыку для этого настроения. Дай список: 1. Название - Исполнитель (жанр). Объясни почему подходит.`,
                describe: `${basePrompt}\n\nНайди музыку под это описание. Дай список: 1. Название - Исполнитель. Объясни связь.`
            };
            
            return prompts[searchType] || 
                `${basePrompt}\n\nОтветь как музыкальный эксперт. Если это поиск песни - предложи варианты. Всегда указывай названия и исполнителей.`;
        },

        initAutoDiscovery: async function() {
            if (this.apiKeys.length === 0) return;
            
            const apiKey = this.getCurrentKey();
            if (!apiKey) return;
            
            try {
                console.log('🔍 Проверяю доступные модели...');
                const response = await fetch(`${this.baseUrl}/models?key=${apiKey}`);
                const data = await response.json();
                
                if (data.models) {
                    // 🔥 ИСПРАВЛЕНО: Только реально существующие модели
                    const validModels = data.models
                        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                        .map(m => m.name.replace('models/', ''))
                        .filter(name => name.includes('gemini')); // Только Gemini модели
                    
                    console.log('✅ Доступные модели:', validModels);
                    
                    // Безопасный выбор модели
                    const safeModels = validModels.filter(name => 
                        name.includes('1.5-flash') || 
                        name.includes('1.5-pro') ||
                        name.includes('1.0-pro')
                    );
                    
                    if (safeModels.length > 0) {
                        this.modelName = safeModels[0];
                        console.log(`🎉 Использую модель: ${this.modelName}`);
                    }
                }
            } catch (e) {
                console.warn('⚠️ Не удалось определить модели, использую gemini-1.5-flash');
                this.modelName = 'gemini-1.5-flash';
            }
        },

        setupVoiceRecognition: function() {
            console.log('🎤 Голосовой ввод настроен');
        },
        
        startVoiceInput: function() {
            console.log('🎤 Начало голосового ввода');
            alert('Голосовой ввод в разработке.');
        },
        
        stopVoiceInput: function() {
            console.log('🎤 Остановка голосового ввода');
        },
        
        onVoiceInput: function(text) {
            console.log('🎤 Голосовой ввод:', text);
            if (text && window.addMessageToChat) {
                window.addMessageToChat(text, 'user');
                this.processQuery(text);
            }
        }
    };

    // Инициализация
    aiCore.loadKeys();
    
    // 🔥 ИСПРАВЛЕНО: Используем безопасную модель сразу
    aiCore.modelName = 'gemini-1.5-flash';
    
    // Откладываем auto-discovery
    setTimeout(() => aiCore.initAutoDiscovery(), 1500);
    
    console.log('✅ AI Core создан');
    return aiCore;
}

// Создаем или возвращаем AI Core
function getAICore() {
    if (!window.aiCore) {
        console.log('🛠️ Создаю AI Core...');
        window.aiCore = createAICore();
    }
    
    // 🔥 ГАРАНТИРУЕМ методы
    if (!window.aiCore.processQuery) {
        window.aiCore.processQuery = function(userInput) {
            return this.processWithOpenRouter(userInput, window.currentSearchType || 'text');
        };
    }
    
    return window.aiCore;
}

function ensureAICore() {
    const core = getAICore();
    
    // 🔥 ВАЖНО: Убеждаемся что модель валидна
    if (core.modelName && core.modelName.includes('2.5')) {
        console.warn(`⚠️ Исправляю неверное имя модели: ${core.modelName} → gemini-1.5-flash`);
        core.modelName = 'gemini-1.5-flash';
    }
    
    return core;
}

// Экспортируем
window.getAICore = getAICore;
window.ensureAICore = ensureAICore;
window.MusicAICore = { create: createAICore };

// Создаем сразу
console.log('⚡ Создание AI Core...');
const aiCore = getAICore();

// 🔥 ВАЖНО: Исправляем модель если она неверная
if (aiCore.modelName && aiCore.modelName.includes('2.5')) {
    aiCore.modelName = 'gemini-1.5-flash';
    console.log('✅ Исправлена модель на gemini-1.5-flash');
}

console.log('🎉 AI Core готов. Модель:', aiCore.modelName);
