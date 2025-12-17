// ai-core.js - GOOGLE GEMINI (ВЕРСИЯ 7.1 - FIXED KEY TRANSFER)
// Исправлена передача ключей из модального окна
console.log('🚀 AI Core загружен (версия 7.1 - Fixed Key Transfer)');

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
        
        // 1. Собираем все возможные источники ключей
        const allKeySources = [];
        
        // Источник 1: window.currentApiKey (из модального окна - самый важный!)
        if (window.currentApiKey && typeof window.currentApiKey === 'string' && window.currentApiKey.length >= 20) {
            allKeySources.push(window.currentApiKey);
            console.log('✅ Ключ из window.currentApiKey:', window.currentApiKey.substring(0, 20) + '...');
        }
        
        // Источник 2: API_CONFIG (keys.js)
        if (window.API_CONFIG?.googleKeys) {
            allKeySources.push(...window.API_CONFIG.googleKeys);
            console.log('✅ Ключи из API_CONFIG:', window.API_CONFIG.googleKeys.length);
        }
        
        // Источник 3: CONFIG (config.js)
        if (window.CONFIG?.GOOGLE_AI?.API_KEYS) {
            allKeySources.push(...window.CONFIG.GOOGLE_AI.API_KEYS);
            console.log('✅ Ключи из CONFIG:', window.CONFIG.GOOGLE_AI.API_KEYS.length);
        }
        
        // Источник 4: localStorage (если есть)
        try {
            const savedKey = localStorage.getItem('music_ai_google_key');
            if (savedKey && savedKey.length >= 20) {
                allKeySources.push(savedKey);
                console.log('✅ Ключ из localStorage');
            }
        } catch (e) {
            console.log('⚠️ localStorage недоступен');
        }
        
        // Фильтруем и убираем дубликаты
        this.apiKeys = [...new Set(allKeySources.filter(k => 
            k && typeof k === 'string' && k.length >= 20
        ))];
        
        console.log(`📊 Итого ключей после фильтрации: ${this.apiKeys.length}`);
        
        if (this.apiKeys.length === 0) {
            console.warn("⚠️ ВНИМАНИЕ: Ключи не найдены! Пользователю нужно будет ввести ключ в модальном окне.");
            // Не показываем ошибку - модальное окно само появится
        } else {
            console.log("✅ Ключи успешно загружены");
        }
    }

    // НОВЫЙ МЕТОД: Обновление ключей в реальном времени
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
        console.log(`🔑 Использую ключ ${this.currentKeyIndex + 1}/${this.apiKeys.length}: ${key.substring(0, 15)}...`);
        return key;
    }

    // 🔥 САМАЯ ВАЖНАЯ ФУНКЦИЯ: Спрашиваем у Google правильное имя модели
    async initAutoDiscovery() {
        if (this.apiKeys.length === 0) {
            console.log('⏳ Auto-discovery: жду ключи...');
            // Ждем 2 секунды и проверяем снова
            setTimeout(() => {
                if (this.apiKeys.length === 0) {
                    console.log('⚠️ Auto-discovery: ключи все еще не загружены');
                } else {
                    console.log('✅ Ключи появились, запускаю auto-discovery');
                    this.initAutoDiscovery();
                }
            }, 2000);
            return;
        }
        
        const apiKey = this.getCurrentKey();
        if (!apiKey) return;
        
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
                const priority = ['gemini-1.5-flash', 'gemini-1.5-flash-001', 'gemini-1.5-pro', 'gemini-1.0-pro', 'gemini-pro'];
                let selected = validModels.find(m => priority.includes(m)) || validModels[0];

                if (selected) {
                    this.modelName = selected;
                    console.log(`🎉 УСПЕХ! Буду использовать модель: ${this.modelName}`);
                    
                    // Обновляем статус в интерфейсе
                    if (window.updateStatus) {
                        window.updateStatus(`✅ Использую ${this.modelName}`, 'active');
                    }
                } else {
                    console.warn('⚠️ Не найдено подходящих моделей, использую дефолтную');
                    this.modelName = 'gemini-1.5-flash';
                }
            }
        } catch (e) {
            console.warn("⚠️ Не удалось получить список моделей (возможно, CORS или нет сети). Использую дефолтную.");
            this.modelName = 'gemini-1.5-flash';
        }
    }

    async processWithOpenRouter(userInput, searchType = 'text') {
        // Обновляем ключи перед каждым запросом (на случай, если ввели новый)
        this.updateKeys();
        
        if (this.apiKeys.length === 0) {
            const errorMsg = "⚠️ **Нет API ключа**\n\nПожалуйста, введите Google AI API ключ в появившемся окне.";
            console.error(errorMsg);
            
            if (window.addMessageToChat) {
                window.addMessageToChat(errorMsg, 'ai');
            }
            
            // Показываем модальное окно
            if (window.showApiKeyModal) {
                window.showApiKeyModal();
            }
            
            return;
        }

        // Показываем индикатор "Думаю..."
        let thinkingMsgId = null;
        if (window.addMessageToChat) {
            const thinkingMsg = window.addMessageToChat('🤔 Думаю...', 'ai', 'thinking_msg');
            thinkingMsgId = 'thinking_msg';
        }

        // Формируем промпт в зависимости от типа поиска
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
                        parts: [{ 
                            text: prompt 
                        }] 
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.8,
                        topK: 40,
                        maxOutputTokens: 2048,
                    }
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                const errText = errData.error?.message || response.statusText;
                
                // Пробуем следующий ключ при ошибке
                if (this.apiKeys.length > 1) {
                    console.log(`🔄 Пробую следующий ключ (ошибка: ${errText})`);
                    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
                    return this.processWithOpenRouter(userInput, searchType);
                }
                
                throw new Error(`Google API Error: ${errText}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            // Убираем индикатор "Думаю..."
            if (thinkingMsgId && window.removeMessageFromChat) {
                window.removeMessageFromChat(thinkingMsgId);
            }
            
            if (text && window.addMessageToChat) {
                window.addMessageToChat(text, 'ai');
                
                // Добавляем в историю находок
                this.extractAndSaveFinds(text);
            } else {
                throw new Error("Пустой ответ от API");
            }

        } catch (e) {
            console.error('❌ Ошибка в processWithOpenRouter:', e);
            
            // Убираем индикатор "Думаю..."
            if (thinkingMsgId && window.removeMessageFromChat) {
                window.removeMessageFromChat(thinkingMsgId);
            }
            
            if (window.addMessageToChat) {
                let errorMessage = `❌ **Ошибка:** ${e.message}`;
                
                // Добавляем полезные советы
                if (e.message.includes('API') || e.message.includes('ключ')) {
                    errorMessage += "\n\n💡 **Что делать:**\n";
                    errorMessage += "• Проверьте правильность API ключа\n";
                    errorMessage += "• Убедитесь, что Generative Language API включен в Google Cloud Console\n";
                    errorMessage += "• Попробуйте ввести ключ снова через модальное окно";
                    
                    // Показываем модальное окно для повторного ввода
                    if (window.showApiKeyModal) {
                        setTimeout(() => window.showApiKeyModal(), 1000);
                    }
                } else if (e.message.includes('сеть') || e.message.includes('CORS')) {
                    errorMessage += "\n\n🌐 **Проблема с сетью:**\n";
                    errorMessage += "• Проверьте подключение к интернету\n";
                    errorMessage += "• Попробуйте обновить страницу";
                }
                
                window.addMessageToChat(errorMessage, 'ai');
            }
        }
    }
    
    // Формирование промпта в зависимости от типа поиска
    buildPrompt(userInput, searchType) {
        const basePrompt = `Ты - музыкальный эксперт с энциклопедическими знаниями. Твоя задача - помочь пользователю найти музыку.`;
        
        switch(searchType) {
            case 'melody':
                return `${basePrompt}
                
Пользователь напел или описал мелодию: "${userInput}"

Проанализируй описание и найди похожие песни:
1. Определи возможные жанры и настроение
2. Найди конкретные песни, которые могли бы подходить
3. Объясни, почему каждая песня похожа на описанную мелодию
4. Предложи 5-7 конкретных треков с названиями и исполнителями

Формат ответа:
🎵 Похожие песни:
1. [Название] - [Исполнитель] ([Год])
   💡 Почему похоже: [краткое объяснение]`;
            
            case 'lyrics':
                return `${basePrompt}
                
Пользователь ищет песню по строчкам: "${userInput}"

Найди песни с похожими строчками или смыслом:
1. Проанализируй текст
2. Найди песни с похожими темами или фразами
3. Предложи 5-7 вариантов

Формат ответа:
📝 Похожие песни по тексту:
1. [Название] - [Исполнитель]
   💡 Сходство: [какая строчка или тема совпадает]`;
            
            case 'mood':
                return `${basePrompt}
                
Пользователь ищет музыку по настроению: "${userInput}"

Подбери музыку, которая соответствует этому настроению:
1. Определи эмоциональный профиль
2. Подбери жанры и исполнителей
3. Предложи 5-7 треков

Формат ответа:
😊 Музыка для настроения "${userInput}":
1. [Название] - [Исполнитель] ([Жанр])
   💡 Почему подходит: [связь с настроением]`;
            
            case 'describe':
                return `${basePrompt}
                
Пользователь описал: "${userInput}"

Найди музыку, которая подходит под это описание:
1. Проанализируй описание (клип, атмосферу, ситуацию)
2. Подбери соответствующие треки
3. Объясни связь

Формат ответа:
🎬 Музыка для описания:
1. [Название] - [Исполнитель]
   💡 Связь: [почему подходит под описание]`;
            
            default:
                return `${basePrompt}
                
Запрос пользователя: "${userInput}"

Дайте подробный, полезный ответ как музыкальный эксперт:
- Если это поиск песни - предложи конкретные варианты
- Если это вопрос о музыке - дай развернутый ответ
- Если просят рекомендации - предложи подборку
- Всегда указывай названия и исполнителей

Будь дружелюбным, профессиональным и конкретным.`;
        }
    }
    
    // Извлечение находок для сохранения в истории
    extractAndSaveFinds(text) {
        try {
            // Простая логика извлечения названий песен из текста
            const lines = text.split('\n');
            const finds = [];
            
            lines.forEach(line => {
                // Ищем паттерны типа "1. Название - Исполнитель"
                const match = line.match(/(\d+\.\s*)?([^-]+)\s*-\s*([^(]+)/);
                if (match) {
                    const track = match[2].trim();
                    const artist = match[3].trim();
                    
                    if (track && artist && track.length > 2 && artist.length > 2) {
                        finds.push({ track, artist });
                    }
                }
            });
            
            // Сохраняем находки
            if (finds.length > 0 && window.addRecentFind) {
                finds.slice(0, 3).forEach(find => {
                    window.addRecentFind(find.track, find.artist);
                });
            }
        } catch (e) {
            console.log('⚠️ Не удалось извлечь находки:', e);
        }
    }
    
    // Заглушки для совместимости с index.html
    setupVoiceRecognition() {
        console.log('🎤 Настройка голосового ввода...');
        // Реализация голосового ввода будет здесь
    } 
    
    startVoiceInput() {
        console.log('🎤 Начало голосового ввода...');
        alert('Голосовой ввод пока в разработке. Напишите запрос текстом.');
    }
    
    stopVoiceInput() {
        console.log('🎤 Остановка голосового ввода...');
    }
    
    onVoiceInput(text) {
        console.log('🎤 Голосовой ввод:', text);
        if (text && window.addMessageToChat) {
            window.addMessageToChat(text, 'user');
            this.processQuery(text);
        }
    }
    
    // Основной метод для обработки запросов (совместимость)
    processQuery(userInput) {
        console.log('📝 Обработка запроса:', userInput.substring(0, 50) + '...');
        this.processWithOpenRouter(userInput, window.currentSearchType || 'text');
    }
}

// Создаем и экспортируем экземпляр
window.MusicAICore = MusicAICore;

// Создаем глобальный экземпляр сразу
console.log('🛠️ Создаю глобальный экземпляр AI Core...');
if (!window.aiCore) {
    window.aiCore = new MusicAICore();
    console.log('✅ Глобальный aiCore создан');
}

// Экспортируем метод для обновления ключей
window.updateAICoreKeys = function() {
    if (window.aiCore && window.aiCore.updateKeys) {
        return window.aiCore.updateKeys();
    }
    return false;
};
