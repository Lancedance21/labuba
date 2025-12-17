// ai-core.js - GOOGLE GEMINI (ВЕРСИЯ 7.4 - COMPLETE FIX)
console.log('🚀 AI Core загружен (версия 7.4 - Complete Fix)');

// Создаем фабрику для гарантированного создания методов
function createAICore() {
    console.log('🛠️ Создание AI Core с гарантированными методами');
    
    const aiCore = {
        apiKeys: [],
        currentKeyIndex: 0,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        modelName: 'gemini-1.5-flash',
        musicDB: window.musicDatabase || [],

        // 🔥 ГЛАВНЫЙ МЕТОД - должен быть всегда!
        processQuery: function(userInput) {
            console.log('📝 ProcessQuery вызван:', userInput?.substring(0, 50) || 'пусто');
            return this.processWithOpenRouter(userInput, window.currentSearchType || 'text');
        },

        // 🔥 Альтернативное имя
        process: function(userInput) {
            return this.processQuery(userInput);
        },

        // 🔥 Основной рабочий метод
        processWithOpenRouter: async function(userInput, searchType = 'text') {
            console.log('🎯 ProcessWithOpenRouter:', searchType);
            
            // Обновляем ключи
            this.updateKeys();
            
            if (this.apiKeys.length === 0) {
                const errorMsg = "⚠️ **Нет API ключа**\n\nВведите Google AI API ключ в настройках.";
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
                if (!apiKey) throw new Error('Нет доступного API ключа');
                
                const prompt = this.buildPrompt(userInput, searchType);
                const url = `${this.baseUrl}/models/${this.modelName}:generateContent?key=${apiKey}`;
                
                console.log('📡 Отправка запроса к Google AI...');
                
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
                    throw new Error(errorData.error?.message || 'Ошибка Google AI API');
                }

                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

                // Убираем индикатор
                if (window.removeMessageFromChat) {
                    window.removeMessageFromChat(thinkingMsgId);
                }
                
                if (text && window.addMessageToChat) {
                    window.addMessageToChat(text, 'ai');
                } else {
                    throw new Error('Пустой ответ от Google AI');
                }

            } catch (error) {
                console.error('❌ Ошибка Google AI:', error);
                
                // Убираем индикатор
                if (window.removeMessageFromChat) {
                    window.removeMessageFromChat(thinkingMsgId);
                }
                
                if (window.addMessageToChat) {
                    let errorMsg = `❌ **Ошибка Google AI:** ${error.message}`;
                    
                    if (error.message.includes('API') || error.message.includes('key') || error.message.includes('quota')) {
                        errorMsg += '\n\n💡 Проверьте API ключ или попробуйте другой ключ.';
                        if (window.showApiKeyModal) {
                            setTimeout(() => window.showApiKeyModal(), 1000);
                        }
                    }
                    
                    window.addMessageToChat(errorMsg, 'ai');
                }
            }
        },

        // 🔥 Вспомогательные методы
        loadKeys: function() {
            console.log('🔍 Загрузка ключей...');
            
            const allKeys = [];
            
            // window.currentApiKey (из модального окна)
            if (window.currentApiKey && window.currentApiKey.length >= 20) {
                allKeys.push(window.currentApiKey);
            }
            
            // API_CONFIG (keys.js)
            if (window.API_CONFIG?.googleKeys?.length > 0) {
                allKeys.push(...window.API_CONFIG.googleKeys);
            }
            
            // CONFIG (config.js)
            if (window.CONFIG?.GOOGLE_AI?.API_KEYS?.length > 0) {
                allKeys.push(...window.CONFIG.GOOGLE_AI.API_KEYS);
            }
            
            // localStorage
            try {
                const savedKey = localStorage.getItem('music_ai_google_key');
                if (savedKey && savedKey.length >= 20 && !allKeys.includes(savedKey)) {
                    allKeys.push(savedKey);
                }
            } catch (e) {}
            
            // Фильтруем и убираем дубликаты
            this.apiKeys = [...new Set(allKeys.filter(k => 
                k && typeof k === 'string' && k.length >= 20
            ))];
            
            console.log(`📊 Загружено ключей: ${this.apiKeys.length}`);
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
                console.error('❌ Нет доступных ключей');
                return null;
            }
            const key = this.apiKeys[this.currentKeyIndex];
            console.log(`🔑 Использую ключ ${this.currentKeyIndex + 1}/${this.apiKeys.length}`);
            return key;
        },

        buildPrompt: function(userInput, searchType) {
            const basePrompt = `Ты музыкальный эксперт с глубокими знаниями. Запрос: "${userInput}"`;
            
            const prompts = {
                melody: `${basePrompt}\n\nНайди песни похожие на эту мелодию. Дай 5-7 конкретных треков в формате: 1. Название - Исполнитель (год). Кратко объясни почему похоже.`,
                lyrics: `${basePrompt}\n\nНайди песни с похожими строчками. Дай 5-7 конкретных треков в формате: 1. Название - Исполнитель. Объясни какая строчка или тема совпадает.`,
                mood: `${basePrompt}\n\nПодбери музыку для этого настроения. Дай 5-7 конкретных треков в формате: 1. Название - Исполнитель (жанр). Объясни почему подходит для этого настроения.`,
                describe: `${basePrompt}\n\nНайди музыку под это описание. Дай 5-7 конкретных треков в формате: 1. Название - Исполнитель. Объясни связь с описанием.`
            };
            
            return prompts[searchType] || 
                `${basePrompt}\n\nОтветь как музыкальный эксперт. Если это поиск песни - предложи конкретные варианты. Если вопрос - дай развернутый ответ. Всегда указывай названия и исполнителей.`;
        },

        initAutoDiscovery: async function() {
            if (this.apiKeys.length === 0) return;
            
            const apiKey = this.getCurrentKey();
            if (!apiKey) return;
            
            try {
                console.log('🔍 Проверяю доступные модели Google AI...');
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
                        console.log(`🎉 Буду использовать модель: ${this.modelName}`);
                    }
                }
            } catch (e) {
                console.warn('⚠️ Не удалось определить доступные модели');
            }
        },

        // Методы голосового ввода (заглушки)
        setupVoiceRecognition: function() {
            console.log('🎤 Голосовой ввод настроен');
        },
        
        startVoiceInput: function() {
            console.log('🎤 Начало голосового ввода');
            alert('Голосовой ввод в разработке. Напишите запрос текстом.');
        },
        
        stopVoiceInput: function() {
            console.log('🎤 Остановка голосового ввода');
        },
        
        onVoiceInput: function(text) {
            console.log('🎤 Голосовой ввод получен:', text);
            if (text && window.addMessageToChat) {
                window.addMessageToChat(text, 'user');
                this.processQuery(text);
            }
        }
    };

    // Инициализация
    aiCore.loadKeys();
    
    // Запускаем auto-discovery через секунду
    setTimeout(() => aiCore.initAutoDiscovery(), 1000);
    
    console.log('✅ AI Core создан со всеми методами');
    return aiCore;
}

// 🔥 ГЛАВНАЯ ФУНКЦИЯ: Создаем или возвращаем существующий aiCore
function getAICore() {
    if (!window.aiCore) {
        console.log('🛠️ Создаю новый AI Core...');
        window.aiCore = createAICore();
        
        // 🔥 Двойная проверка - гарантируем, что методы есть
        if (!window.aiCore.processQuery) {
            console.warn('⚠️ processQuery не создался, добавляю вручную...');
            window.aiCore.processQuery = function(userInput) {
                console.log('📝 processQuery (добавленный):', userInput?.substring(0, 30));
                if (this.processWithOpenRouter) {
                    return this.processWithOpenRouter(userInput, window.currentSearchType || 'text');
                }
                return Promise.reject('AI Core не инициализирован');
            };
        }
        
        if (!window.aiCore.process) {
            window.aiCore.process = window.aiCore.processQuery;
        }
        
        console.log('✅ AI Core готов к работе');
    } else {
        console.log('✅ AI Core уже существует');
    }
    
    return window.aiCore;
}

// 🔥 Альтернативная функция для быстрого вызова
function ensureAICore() {
    const core = getAICore();
    
    // Проверяем критически важные методы
    if (!core.processQuery) {
        console.error('❌ КРИТИЧЕСКО: processQuery отсутствует!');
        core.processQuery = function() {
            return Promise.reject('AI Core не инициализирован правильно');
        };
    }
    
    return core;
}

// 🔥 Создаем глобальные функции для доступа
window.getAICore = getAICore;
window.ensureAICore = ensureAICore;
window.MusicAICore = { create: createAICore };

// 🔥 Создаем AI Core сразу при загрузке скрипта
console.log('⚡ Немедленное создание AI Core...');
const aiCore = getAICore();

// 🔥 Экспортируем для использования в index.html
if (typeof window !== 'undefined') {
    // Добавляем глобальный метод для обновления ключей
    window.updateAICoreKeys = function() {
        const core = ensureAICore();
        return core.updateKeys ? core.updateKeys() : false;
    };
    
    // Добавляем метод для получения ключей
    window.getAICoreKeys = function() {
        const core = ensureAICore();
        return core.apiKeys || [];
    };
}

console.log('🎉 AI Core модуль загружен и готов');
