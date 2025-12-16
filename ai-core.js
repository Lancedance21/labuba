// ai-core.js - АДАПТИВНОЕ ЯДРО (Разные режимы для разных кнопок)
// ВЕРСИЯ: 2.1 - Исправлены hardcoded модели на рабочие Gemini 2.0
console.log('🚀 AI Core загружен (версия 2.1)');

class MusicAICore {
    constructor() {
        // 1. ПРИОРИТЕТ: Используем новую структуру API_CONFIG из keys.js
        let keysFromConfig = [];
        
        // Проверяем новую структуру API_CONFIG
        if (window.API_CONFIG) {
            if (window.API_CONFIG.primaryKey) {
                keysFromConfig.push(window.API_CONFIG.primaryKey);
            }
            if (window.API_CONFIG.fallbackKey) {
                keysFromConfig.push(window.API_CONFIG.fallbackKey);
            }
        }
        
        // Если новая структура не найдена, пробуем старую через CONFIG
        if (keysFromConfig.length === 0 && window.CONFIG && window.CONFIG.OPENROUTER && window.CONFIG.OPENROUTER.API_KEYS) {
            keysFromConfig = [...window.CONFIG.OPENROUTER.API_KEYS];
        }
        
        console.log('🔍 Проверка ключей OpenRouter:', {
            keysFromConfig: keysFromConfig.length,
            keysFromConfigPreview: keysFromConfig.length > 0 ? keysFromConfig[0].substring(0, 15) + '...' : 'нет',
            hasAPI_CONFIG: !!window.API_CONFIG,
            hasCONFIG: !!(window.CONFIG && window.CONFIG.OPENROUTER)
        });
        
        // ПРИНУДИТЕЛЬНО: Используем ключи из API_CONFIG/CONFIG в первую очередь
        // Если их нет, только тогда берем из localStorage
        if (keysFromConfig.length > 0) {
            this.apiKeys = keysFromConfig;
            console.log('✅ Использую ключи OpenRouter из keys.js (API_CONFIG)');
        } else if (window.currentApiKey && typeof window.currentApiKey === 'string' && window.currentApiKey.length >= 20) {
            // Используем ключ из window.currentApiKey (введен в модальном окне)
            this.apiKeys = [window.currentApiKey];
            console.log('✅ Использую ключ OpenRouter из window.currentApiKey (введен в этой сессии)');
        } else {
            // Ключей нет - требуется ввод через модальное окно
            this.apiKeys = [];
            console.log('⚠️ Ключей OpenRouter нет - требуется ввод через модальное окно');
        }
        
        console.log('🔑 Загружено ключей OpenRouter:', this.apiKeys.length);
        console.log('🔑 Первый ключ:', this.apiKeys.length > 0 ? this.apiKeys[0].substring(0, 20) + '...' : 'нет ключей');
        console.log('🔑 Источник:', keysFromConfig.length > 0 ? 'keys.js (API_CONFIG)' : 'localStorage');

        this.currentKeyIndex = 0;
        this.openRouterKey = this.apiKeys.length > 0 ? this.apiKeys[this.currentKeyIndex] : null;
        
        // --- ИСПРАВЛЕНИЕ ЗДЕСЬ (Убрана старая модель flash-1.5-8b) ---
        this.modelName = (window.CONFIG && window.CONFIG.OPENROUTER && window.CONFIG.OPENROUTER.MODEL)
            ? window.CONFIG.OPENROUTER.MODEL
            : (window.API_CONFIG && window.API_CONFIG.model)
                ? window.API_CONFIG.model
                : 'google/gemini-2.0-flash-lite-preview-02-05:free'; // ✅ Новая быстрая модель
        
        // --- ИСПРАВЛЕНИЕ ЗДЕСЬ (Убрана модель mistral) ---
        this.fallbackModel = (window.CONFIG && window.CONFIG.OPENROUTER && window.CONFIG.OPENROUTER.FALLBACK_MODEL)
            ? window.CONFIG.OPENROUTER.FALLBACK_MODEL
            : (window.API_CONFIG && window.API_CONFIG.fallbackModel)
                ? window.API_CONFIG.fallbackModel
                : 'google/gemini-2.0-pro-exp-02-05:free'; // ✅ Мощная Pro модель на замену
        
        this.isListening = false;
        this.recognition = null;
        this.setupVoiceRecognition();
        
        // База данных музыки
        this.musicDB = window.musicDatabase || [];
        
        // Инициализируем MusicBrainz API
        this.musicBrainz = window.MusicBrainzAPI ? new window.MusicBrainzAPI() : null;
        this.musicSearch = window.MusicSearch ? new window.MusicSearch() : null;
        
        // Кэш доступных моделей (будет заполнен при первой ошибке)
        this.availableModels = null;

        // Логирование для отладки
        console.log('🤖 AI Core: Адаптивный режим загружен (OpenRouter).');
        console.log('🔑 Количество API ключей OpenRouter:', this.apiKeys.length);
        console.log('🌐 Endpoint:', window.CONFIG?.OPENROUTER?.ENDPOINT || 'https://openrouter.ai/api/v1/chat/completions');
        console.log('🤖 Модель:', this.modelName);
        console.log('🛡️ Резервная модель:', this.fallbackModel);
        
        if (this.apiKeys.length === 0) {
            console.warn('⚠️ ВНИМАНИЕ: API ключи OpenRouter не найдены! Добавьте ключи в keys.js или через настройки.');
        }
    }
    
    // Ротация ключей API
    getNextApiKey() {
        if (this.apiKeys.length === 0) return null;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        this.openRouterKey = this.apiKeys[this.currentKeyIndex];
        return this.openRouterKey;
    }

    // ==================== НАСТРОЙКА ГОЛОСОВОГО ВВОДА ====================
    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.lang = 'ru-RU';
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            
            this.recognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                
                if (event.results[0].isFinal) {
                    this.onVoiceInput(transcript);
                }
            };
            
            this.recognition.onerror = (event) => {
                console.error('Голосовая ошибка:', event.error);
            };
        } else {
            console.warn('Голосовой ввод не поддерживается в этом браузере');
        }
    }

    startVoiceInput() {
        if (this.recognition && !this.isListening) {
            this.isListening = true;
            this.recognition.start();
            return true;
        }
        return false;
    }

    stopVoiceInput() {
        if (this.recognition && this.isListening) {
            this.isListening = false;
            this.recognition.stop();
        }
    }

    onVoiceInput(text) {
            if (window.addMessageToChat) {
            window.addMessageToChat(text, 'user');
            // Передаем текущий выбранный тип поиска (если есть в глобальной переменной) или 'text'
            // В music-ai-assistant.html переменная называется currentSearchType
            const type = window.currentSearchType || 'text';
            this.processWithOpenRouter(text, type);
        }
    }

    // ==================== ПОИСК ЧЕРЕЗ MUSICBRAINZ ====================
    async searchWithMusicBrainz(query, searchType = 'lyrics') {
        if (!this.musicBrainz || !this.musicSearch) {
            return null;
        }

        try {
            // MusicBrainz полезен в основном для текстов и названий
            if (searchType === 'lyrics' || searchType === 'describe') {
                const results = await this.musicSearch.searchByDescription(query);
                if (results && results.length > 0) {
                    return results.map(rec => this.musicSearch.formatRecording(rec));
                }
            }
            return null;
        } catch (error) {
            console.error('MusicBrainz search error:', error);
            return null;
        }
    }

    // ==================== ПОЛУЧЕНИЕ СПИСКА ДОСТУПНЫХ МОДЕЛЕЙ ====================
    async fetchAvailableModels() {
        // Если кэш уже есть, возвращаем его
        if (this.availableModels && this.availableModels.length > 0) {
            return this.availableModels;
        }
        
        if (!this.apiKeys || this.apiKeys.length === 0) {
            return [];
        }
        
        try {
            const endpoint = (window.CONFIG && window.CONFIG.GOOGLE_AI && window.CONFIG.GOOGLE_AI.ENDPOINT)
                ? window.CONFIG.GOOGLE_AI.ENDPOINT
                : 'https://generativelanguage.googleapis.com/v1/models';
            
            // Пробуем все ключи, пока не получим список
            for (let keyAttempt = 0; keyAttempt < this.apiKeys.length; keyAttempt++) {
                const currentKey = this.apiKeys[(this.currentKeyIndex + keyAttempt) % this.apiKeys.length];
                const listUrl = `${endpoint}?key=${currentKey}`;
                
                try {
                    const listResponse = await fetch(listUrl);
                    
                    if (listResponse.ok) {
                        const listData = await listResponse.json();
                        if (listData.models && listData.models.length > 0) {
                            const modelNames = listData.models
                                .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
                                .map(m => {
                                    // Убираем префикс "models/" если есть
                                    const name = m.name.replace(/^models\//, '');
                                    return name;
                                });
                            
                            if (modelNames.length > 0) {
                                this.availableModels = modelNames;
                                
                                // Логируем с разделением на модели с "lite" и без
                                const withLite = modelNames.filter(m => m.includes('lite'));
                                const withoutLite = modelNames.filter(m => !m.includes('lite'));
                                console.log('✅ Получен список доступных моделей:', {
                                    всего: modelNames.length,
                                    без_lite: withoutLite.length,
                                    с_lite: withLite.length,
                                    модели_без_lite: withoutLite,
                                    модели_с_lite: withLite
                                });
                                
                                return modelNames;
                            }
                        }
                    }
                } catch (e) {
                    console.warn(`Ошибка при получении списка моделей (ключ ${keyAttempt + 1}):`, e);
                    continue;
                }
            }
        } catch (e) {
            console.warn('Не удалось получить список моделей:', e);
        }
        
        return [];
    }

    // ==================== ГЛАВНЫЙ МОЗГ (OPENROUTER) ====================
    async processWithOpenRouter(userInput, searchType = 'text') {
        let musicBrainzResults = null;
        // Проверка ключей
        if (!this.apiKeys || this.apiKeys.length === 0) {
            if (window.addMessageToChat) {
                window.addMessageToChat("⚠️ API ключ не найден. Введите его в настройках.", 'ai');
            }
            return;
        }
        
        // OpenRouter не требует получения списка моделей заранее

        // Подбираем сообщение "думаю" в зависимости от типа
        let thinkingText = '🤔 Анализирую запрос...';
        if (searchType === 'melody') thinkingText = '👂 Слушаю ритм и мелодию...';
        else if (searchType === 'lyrics') thinkingText = '📖 Листаю тексты песен...';
        else if (searchType === 'mood') thinkingText = '❤️ Чувствую настроение...';

        // Анимация
        if (window.addMessageToChat) {
            const thinkingMsgId = 'thinking_' + Date.now();
            window.addMessageToChat(thinkingText, 'ai', thinkingMsgId);
            this.currentThinkingMsgId = thinkingMsgId;
        }
        
        // 1. Поиск в MusicBrainz (если полезно)
        if ((searchType === 'lyrics' || searchType === 'describe') && this.musicBrainz) {
            musicBrainzResults = await this.searchWithMusicBrainz(userInput, searchType);
        }
        
        // 2. ГЕНЕРАЦИЯ АДАПТИВНОГО ПРОМПТА
        // Здесь мы меняем инструкцию под кнопку!
        
        let specializedInstruction = "";

        switch (searchType) {
            case 'melody':
                specializedInstruction = `
РЕЖИМ: ПОИСК ПО НАПЕВУ/РИТМУ.
Твоя задача: Понять, что напел пользователь ("туц туц", "лалала", "пам пам").
- Пропой текст про себя, чтобы понять ритм.
- Если пишут "лалала" + контекст (например, Новый год) -> Ищи "Happy New Year".
- Если "туц туц" -> Ищи электронную музыку или известные биты.
НЕ ищи слова "туц" в названии, ищи ЗВУЧАНИЕ.`;
                break;

            case 'lyrics':
                specializedInstruction = `
РЕЖИМ: ПОИСК ПО ТЕКСТУ/СТРОЧКАМ.
Твоя задача: Найти песню по обрывкам фраз.
- Пользователь может перепутать слова. Ищи похожие по смыслу.
- Если фраза переведена, попробуй найти оригинал на английском (или наоборот).`;
                break;

            case 'mood':
                specializedInstruction = `
РЕЖИМ: ПОДБОР ПО НАСТРОЕНИЮ.
Твоя задача: Быть музыкальным психологом.
- Предлагай треки, которые ИДЕАЛЬНО попадают в вайб (атмосферу).
- Объясни, почему этот трек подходит под это чувство.`;
                break;

            case 'describe':
                specializedInstruction = `
РЕЖИМ: ПОИСК ПО ОПИСАНИЮ (КЛИП/ИСТОРИЯ).
Твоя задача: Угадать песню по сюжету клипа или описанию ситуации.
- Вспоминай визуальные образы из клипов.
- Учитывай контекст времени (90-е, 00-е).`;
                break;

            default: // text
                specializedInstruction = `
РЕЖИМ: ОБЩИЙ МУЗЫКАЛЬНЫЙ ЭКСПЕРТ.
Отвечай на любые вопросы о музыке, ищи песни, советуй жанры.`;
                break;
        }

        // Общие правила (всегда активны)
        const baseRules = `
ТВОИ ГЛАВНЫЕ ЗАПРЕТЫ И ПРАВИЛА:
1. ЗАПРЕЩЕНО ИСПОЛЬЗОВАТЬ ЗВЕЗДОЧКИ (**) или жирный шрифт. Пиши только обычным текстом.
2. ЗАПРЕЩЕНО ИСПОЛЬЗОВАТЬ ЗАЧЕРКИВАНИЕ (~~текст~~, <s>, <del>). Всегда пиши обычным текстом без зачеркивания.
3. ВОСПРИНИМАЙ ЗАПРОС ЦЕЛИКОМ. Ищи общий смысл и ассоциации.

ЗАПРОС ПОЛЬЗОВАТЕЛЯ: "${userInput}"

${musicBrainzResults ? `Подсказки из базы MusicBrainz: ${musicBrainzResults.map(r => r.title).join(', ')}` : ''}

ФОРМАТ ОТВЕТА (Строго обычный текст, без **):

Результат: [Название] - [Исполнитель]
Почему: [Объясни, исходя из выбранного РЕЖИМА]

Альтернативы:
1. [Название] - [Исполнитель] ([Год])
2. [Название] - [Исполнитель] ([Год])
3. [Название] - [Исполнитель] ([Год])
4. [Название] - [Исполнитель] ([Год])
5. [Название] - [Исполнитель] ([Год])
6. [Название] - [Исполнитель] ([Год])
7. [Название] - [Исполнитель] ([Год])
8. [Название] - [Исполнитель] ([Год])
`;

        // Склеиваем промпт
        const finalPrompt = specializedInstruction + "\n\n" + baseRules;

        // Используем модель из конфига OpenRouter (с поддержкой fallback)
        let modelToUse = this.modelName;
        let lastError = null;
        let useFallbackModel = false;
        
        // Пробуем все ключи по очереди, сначала с основной моделью, потом с резервной
        const modelsToTry = [this.modelName, this.fallbackModel];
        
        for (let modelAttempt = 0; modelAttempt < modelsToTry.length; modelAttempt++) {
            modelToUse = modelsToTry[modelAttempt];
            useFallbackModel = modelAttempt > 0;
            
            if (useFallbackModel) {
                console.log(`  🔄 Переключение на резервную модель: ${modelToUse}`);
            }
            
            // Пробуем все ключи с текущей моделью
            for (let keyAttempt = 0; keyAttempt < this.apiKeys.length; keyAttempt++) {
                const endpoint = (window.CONFIG && window.CONFIG.OPENROUTER && window.CONFIG.OPENROUTER.ENDPOINT)
                    ? window.CONFIG.OPENROUTER.ENDPOINT
                    : 'https://openrouter.ai/api/v1/chat/completions';
                
                const currentKey = this.apiKeys[(this.currentKeyIndex + keyAttempt) % this.apiKeys.length];
                
                console.log(`  📡 Запрос к OpenRouter (модель: ${modelToUse}, ключ ${keyAttempt + 1}/${this.apiKeys.length})...`);
                
                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${currentKey}`,
                            'HTTP-Referer': window.location.origin,
                            'X-Title': 'Music AI Assistant'
                        },
                        body: JSON.stringify({
                            model: modelToUse,
                            messages: [
                                {
                                    role: 'system',
                                    content: 'Ты музыкальный эксперт и ИИ-ассистент. Отвечай на русском языке. Помогай с поиском музыки, объясняй музыкальные термины, давай рекомендации.'
                                },
                                {
                                    role: 'user',
                                    content: finalPrompt
                                }
                            ],
                            max_tokens: 2000,
                            temperature: 0.7
                        })
                    });

                    if (!response.ok) {
                        let errorDetails = `HTTP ${response.status}`;
                        let errorMessage = '';
                        let errorData = null;
                        try {
                            errorData = await response.json();
                            if (errorData.error && errorData.error.message) {
                                errorMessage = errorData.error.message;
                                errorDetails = errorMessage;
                            }
                        } catch (e) {
                            errorDetails = `HTTP ${response.status}: ${response.statusText}`;
                        }
                        
                        lastError = new Error(`Ошибка OpenRouter API: ${errorDetails}`);
                        
                        // Если ошибка авторизации, пробуем следующий ключ
                        if (response.status === 401 || response.status === 403) {
                            console.warn(`Ключ OpenRouter недействителен, пробуем следующий...`);
                            if (keyAttempt < this.apiKeys.length - 1) continue;
                            // Если все ключи перепробованы, пробуем следующую модель
                            break;
                        }
                        
                        // Для других ошибок пробуем следующий ключ или модель
                        if (keyAttempt < this.apiKeys.length - 1) continue;
                        // Если все ключи перепробованы, пробуем следующую модель
                        break;
                    }
                    
                    const data = await response.json();
                    
                    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                        lastError = new Error('Пустой ответ от OpenRouter (нет choices)');
                        if (keyAttempt < this.apiKeys.length - 1) continue;
                        break;
                    }
                    
                    const aiResponse = data.choices[0].message.content;
                    
                    if (!aiResponse) {
                        lastError = new Error('Пустой ответ от OpenRouter (нет текста)');
                        if (keyAttempt < this.apiKeys.length - 1) continue;
                        break;
                    }
                    
                    console.log(`✅ Ответ получен (Режим: ${searchType}, Модель: ${modelToUse}${useFallbackModel ? ' [резервная]' : ''})`);
                    
                    this.currentKeyIndex = (this.currentKeyIndex + keyAttempt) % this.apiKeys.length;
                    this.openRouterKey = currentKey;
                    
                    if (this.currentThinkingMsgId && window.removeMessageFromChat) {
                        window.removeMessageFromChat(this.currentThinkingMsgId);
                    }
                    
                    if (window.addMessageToChat) {
                        window.addMessageToChat(aiResponse, 'ai');
                    }
                    
                    this.currentThinkingMsgId = null;
                    
                    this.generateRecommendationsFromAI(aiResponse);
                    return;
                    
                } catch (error) {
                    console.warn(`Ошибка OpenRouter (модель: ${modelToUse}, ключ ${keyAttempt + 1}/${this.apiKeys.length}):`, error);
                    
                    // Определяем тип ошибки
                    if (error.name === 'TypeError' && error.message.includes('fetch')) {
                        lastError = new Error(`Ошибка сети: нет подключения к интернету или сервер недоступен`);
                    } else if (error.message) {
                        lastError = error;
                    } else {
                        lastError = new Error(`Неизвестная ошибка: ${error.toString()}`);
                    }
                    
                    if (keyAttempt < this.apiKeys.length - 1) continue;
                    // Если все ключи перепробованы, пробуем следующую модель
                    break;
                }
            }
            
            // Если дошли сюда, значит все ключи с текущей моделью не сработали
            // Пробуем следующую модель (если есть)
            if (modelAttempt < modelsToTry.length - 1) {
                console.log(`  ⚠️ Модель ${modelToUse} не сработала, пробуем резервную...`);
                continue;
            }
        }
        
        // Удаляем индикатор "думаю"
        if (this.currentThinkingMsgId && window.removeMessageFromChat) {
            window.removeMessageFromChat(this.currentThinkingMsgId);
        }
        
        // Формируем подсказку с доступными моделями (только БЕЗ "lite")
        let availableModelsHint = '';
        if (this.availableModels && this.availableModels.length > 0) {
            // Показываем только модели БЕЗ "lite" - они имеют высокие лимиты
            const modelsWithoutLite = this.availableModels.filter(m => !m.includes('lite'));
            if (modelsWithoutLite.length > 0) {
                availableModelsHint = `\n\n📋 **Рекомендуемые модели (с высокими лимитами):**\n${modelsWithoutLite.slice(0, 10).map(m => `• ${m}`).join('\n')}`;
            } else {
                // Если только модели с "lite", показываем их с предупреждением
                availableModelsHint = `\n\n⚠️ **Доступные модели (низкие лимиты - 20 запросов):**\n${this.availableModels.filter(m => m.includes('lite')).slice(0, 5).map(m => `• ${m}`).join('\n')}\n\nРекомендуется использовать другой API ключ с доступом к моделям без "lite".`;
            }
        }
        
        // Формируем детальное сообщение об ошибке
        let errorMessage = `❌ **Ошибка связи с ИИ**\n\n`;
        
        if (lastError) {
            const errorText = lastError.message;
            errorMessage += `**Детали ошибки:**\n${errorText}\n\n`;
            
            // Специальные подсказки в зависимости от типа ошибки
            if (errorText.includes('overloaded') || errorText.includes('overload') || errorText.includes('try again later')) {
                errorMessage += `**🔍 Проблема:** Модель перегружена (слишком много запросов).\n\n`;
                errorMessage += `**✅ Решение:**\n`;
                errorMessage += `• Система автоматически пробует другие доступные модели\n`;
                errorMessage += `• Попробуйте отправить запрос еще раз через несколько секунд\n`;
                errorMessage += `• Используются модели в порядке приоритета: 2.5-flash → 2.5-pro → 2.0-flash и т.д.\n\n`;
            } else if (errorText.includes('not found') || errorText.includes('not supported') || errorText.includes('not available')) {
                errorMessage += `**🔍 Проблема:** Модель недоступна для вашего API ключа или региона.\n\n`;
                errorMessage += `**✅ Решение:**\n`;
                errorMessage += `• Попробуйте использовать другой API ключ\n`;
                errorMessage += `• Проверьте доступные модели в Google AI Studio (https://aistudio.google.com)\n`;
                errorMessage += `• Убедитесь, что ваш проект имеет доступ к Gemini API\n`;
                errorMessage += `• Система автоматически пробует другие модели\n\n`;
            } else if (errorText.includes('401') || errorText.includes('403') || errorText.includes('недействителен')) {
                errorMessage += `**🔍 Проблема:** API ключ недействителен или не имеет доступа.\n\n`;
                errorMessage += `**✅ Решение:**\n`;
                errorMessage += `• Проверьте правильность API ключа в настройках\n`;
                errorMessage += `• Убедитесь, что ключ активен в Google AI Studio\n`;
                errorMessage += `• Попробуйте создать новый API ключ\n`;
                errorMessage += `• Проверьте, что API включен в Google Cloud Console\n\n`;
            } else if (errorText.includes('429') || errorText.includes('quota') || errorText.includes('limit') || errorText.includes('лимит') || errorText.includes('Quota exceeded') || errorText.includes('Квота полностью исчерпана')) {
                // Проверяем, полностью ли исчерпана квота
                const quotaFullyExceeded = (lastError && lastError.quotaFullyExceeded) || 
                                          errorText.includes('limit: 0') || 
                                          errorText.includes('Квота полностью исчерпана');
                
                if (quotaFullyExceeded) {
                    // Извлекаем время ожидания из разных источников
                    let retryAfter = null;
                    
                    // Пробуем извлечь из originalErrorMessage, если есть
                    const errorSource = (lastError && lastError.originalErrorMessage) ? lastError.originalErrorMessage : errorText;
                    const retryMatch = errorSource.match(/retry in ([\d.]+)s/i) || 
                                     errorSource.match(/Please retry in ([\d.]+)s/i) ||
                                     errorSource.match(/retry in ([\d.]+)\s*s/i);
                    if (retryMatch) {
                        retryAfter = Math.ceil(parseFloat(retryMatch[1]));
                    }
                    
                    errorMessage += `**🔍 Проблема:** Бесплатная квота для всех моделей Google AI полностью исчерпана (limit: 0). Это происходит, когда вы используете бесплатный тариф и превысили дневной лимит запросов.\n\n`;
                    errorMessage += `**✅ Решение:**\n`;
                    
                    // Проверяем, используем ли мы ключ из localStorage (GitHub режим)
                    const isGitHubMode = !window.SECRET_KEYS || !window.SECRET_KEYS.GOOGLE_AI || window.SECRET_KEYS.GOOGLE_AI.length === 0;
                    const usingLocalStorageKey = isGitHubMode && this.apiKeys.length === 1;
                    
                    if (usingLocalStorageKey) {
                        errorMessage += `• 🔑 **ВАЖНО (GitHub режим):** Текущий ключ из localStorage исчерпал квоту. Введите новый ключ в настройках!\n`;
                        errorMessage += `• ⚙️ Нажмите на иконку настроек (⚙️) или обновите страницу, чтобы ввести новый API ключ\n`;
                        errorMessage += `• 📝 Получить новый ключ бесплатно: https://aistudio.google.com/apikey\n`;
                        errorMessage += `• 🔄 Или подождите 24 часа для восстановления квоты текущего ключа\n\n`;
                    } else {
                        if (retryAfter) {
                            const minutes = Math.floor(retryAfter / 60);
                            const seconds = retryAfter % 60;
                            errorMessage += `• ⏰ Подождите ${minutes > 0 ? `${minutes} мин ${seconds} сек` : `${retryAfter} секунд`} и попробуйте снова\n`;
                        } else {
                            errorMessage += `• ⏰ Подождите несколько минут или часов и попробуйте снова\n`;
                        }
                        
                        errorMessage += `• 🔑 Используйте другой API ключ (если у вас есть несколько)\n`;
                        errorMessage += `• 💳 Рассмотрите возможность перехода на платный тариф Google AI\n`;
                        errorMessage += `• 📊 Проверьте использование квоты на https://ai.dev/usage?tab=rate-limit\n`;
                        errorMessage += `• 🔄 Квота обычно восстанавливается через 24 часа\n\n`;
                    }
                    
                    errorMessage += `**ℹ️ Примечание:** Это не проблема выбора модели - квота исчерпана для всего API ключа. Переключение между моделями не поможет, нужно подождать восстановления квоты или использовать другой ключ.\n\n`;
                } else {
                    errorMessage += `**🔍 Проблема:** Превышен лимит запросов (обычно это происходит с моделями "lite", у которых лимит всего 20 запросов).\n\n`;
                    errorMessage += `**✅ Решение:**\n`;
                    errorMessage += `• Система автоматически переключится на модели БЕЗ "lite" (с высокими лимитами)\n`;
                    errorMessage += `• Подождите несколько минут и попробуйте снова\n`;
                    errorMessage += `• Проверьте лимиты в Google Cloud Console\n`;
                    errorMessage += `• Используйте другой API ключ из списка\n`;
                    errorMessage += `• Рекомендуется использовать модели: gemini-2.5-flash, gemini-2.5-pro, gemini-2.0-flash (у них высокие лимиты)\n\n`;
                }
            } else if (errorText.includes('сети') || errorText.includes('интернет') || errorText.includes('недоступен')) {
                errorMessage += `**🔍 Проблема:** Нет подключения к интернету.\n\n`;
                errorMessage += `**✅ Решение:**\n`;
                errorMessage += `• Проверьте подключение к интернету\n`;
                errorMessage += `• Проверьте настройки файрвола/прокси\n`;
                errorMessage += `• Убедитесь, что сайт Google AI доступен\n\n`;
            } else {
                errorMessage += `**💡 Общие рекомендации:**\n`;
            }
        } else {
            errorMessage += `**Причина:** Не удалось получить ответ от Google AI после всех попыток\n\n`;
            errorMessage += `**💡 Общие рекомендации:**\n`;
        }
        
        if (!lastError || (!lastError.message.includes('overloaded') && !lastError.message.includes('not found') && !lastError.message.includes('401') && !lastError.message.includes('403') && !lastError.message.includes('429') && !lastError.message.includes('сети'))) {
            errorMessage += `• Проверьте подключение к интернету\n`;
            errorMessage += `• Убедитесь, что API ключи правильные и активны\n`;
            errorMessage += `• Проверьте, что модели доступны для вашего региона\n`;
            errorMessage += `• Возможно, превышен лимит запросов - подождите немного\n`;
        }
        
        errorMessage += `\n**🔧 Отладка:**\n`;
        errorMessage += `• Откройте консоль браузера (F12) для деталей\n`;
        errorMessage += `• Проверьте настройки API в панели настроек\n`;
        errorMessage += `• Используемая модель: ${modelToUse}\n`;
        errorMessage += `• Попробовано ключей: ${this.apiKeys.length}\n`;
        
        // Добавляем список доступных моделей, если удалось получить
        if (availableModelsHint) {
            errorMessage += availableModelsHint;
        }
        
        if (window.addMessageToChat) {
            window.addMessageToChat(errorMessage, 'ai');
        }
        
        // Если квота исчерпана и мы на GitHub (используем ключ из localStorage),
        // предлагаем ввести новый ключ через модальное окно
        if (lastError && lastError.quotaFullyExceeded) {
            const isGitHubMode = !window.SECRET_KEYS || !window.SECRET_KEYS.GOOGLE_AI || window.SECRET_KEYS.GOOGLE_AI.length === 0;
            if (isGitHubMode && this.apiKeys.length === 1) {
                console.log('⚠️ GitHub режим: квота исчерпана, предлагаю ввести новый ключ');
                // Показываем модальное окно через 2 секунды после показа ошибки
                setTimeout(() => {
                    const modal = document.getElementById('settingsModal');
                    if (modal) {
                        modal.classList.remove('hidden');
                        modal.classList.add('show');
                        modal.style.cssText = `
                            position: fixed !important;
                            top: 0 !important;
                            left: 0 !important;
                            width: 100% !important;
                            height: 100% !important;
                            display: flex !important;
                            opacity: 1 !important;
                            pointer-events: all !important;
                            visibility: visible !important;
                            z-index: 2147483647 !important;
                        `;
                        const input = document.getElementById('googleApiKeyInput');
                        if (input) {
                            input.focus();
                            // Очищаем поле, чтобы пользователь ввел новый ключ
                            input.value = '';
                        }
                    }
                }, 2000);
            }
        }
        
        this.currentThinkingMsgId = null;
        
        // Логируем ошибку в консоль для отладки
        console.error('❌ Ошибка AI Core:', lastError || 'Неизвестная ошибка');
        console.error('Используемая модель:', modelToUse);
        console.error('Количество ключей:', this.apiKeys.length);
    }

    // ==================== РЕКОМЕНДАЦИОННАЯ СИСТЕМА ====================
    async generateRecommendationsFromAI(aiText) {
        const keywords = this.extractKeywords(aiText);
        const recommendations = this.findMatches(keywords);
        this.updateRecommendationsUI(recommendations);
        return recommendations;
    }

    findMatches(keywords) {
        return this.musicDB
            .map(song => {
                let score = 0;
                const songText = `${song.title} ${song.artist} ${song.genre} ${song.mood} ${song.features.join(' ')} ${song.description}`.toLowerCase();
                
                keywords.forEach(keyword => {
                    if (songText.includes(keyword.toLowerCase())) score += 10;
                    if (song.title.toLowerCase().includes(keyword)) score += 20;
                    if (song.artist.toLowerCase().includes(keyword)) score += 15;
                });
                
                return { ...song, score };
            })
            .filter(song => song.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);
    }

    extractKeywords(text) {
        const stopWords = ['и', 'или', 'но', 'а', 'в', 'на', 'с', 'по', 'для', 'что', 'как', 'догадка', 'почему', 'альтернативы', 'мой', 'вариант'];
        return text
            .toLowerCase()
            .replace(/[^\w\sа-яё]/gi, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.includes(word))
            .slice(0, 15);
    }

    // ==================== ФАЛЛБЭК ЛОКАЛЬНЫЙ ИИ ====================
    fallbackLocalAI(userInput) {
        const responses = {
            search: `🔍 По запросу "${userInput}" нашел:\n\n` + 
                    this.getRandomSongs(3).map(s => `🎵 ${s.title} - ${s.artist}`).join('\n'),
            mood: `🎭 Подбираю музыку под настроение...\n\n` +
                  this.getMoodSongs(userInput).map(s => `❤️ ${s.title}`).join('\n'),
            lyrics: `📝 Ищу по тексту...\n\nПопробуйте точнее вспомнить строчки.`,
            default: `🎶 Музыкальный помощник на связи!`
        };
        
        let response = responses.default;
        if (userInput.includes('найди') || userInput.includes('поиск')) response = responses.search;
        else if (userInput.includes('настроен') || userInput.includes('эмоц')) response = responses.mood;
        else if (userInput.includes('текст')) response = responses.lyrics;
        
        if (window.addMessageToChat) window.addMessageToChat(response, 'ai');
    }

    // ==================== УТИЛИТЫ ====================
    getRandomSongs(count) {
        return [...this.musicDB].sort(() => Math.random() - 0.5).slice(0, count);
    }

    getMoodSongs(moodText) {
        const moodMap = {
            'груст': ['меланхоличное', 'эмоциональное'],
            'весел': ['энергичное', 'радостное'],
            'роман': ['романтическое', 'чувственное'],
            'энерг': ['мощное', 'драйвовое'],
            'споко': ['расслабленное', 'умиротворенное']
        };
        
        let targetMoods = ['энергичное'];
        for (const [key, moods] of Object.entries(moodMap)) {
            if (moodText.includes(key)) {
                targetMoods = moods;
                break;
            }
        }
        
        return this.musicDB.filter(song => targetMoods.some(mood => song.mood.includes(mood))).slice(0, 5);
    }

    updateRecommendationsUI(songs) {
        const container = document.getElementById('recommendationsGrid');
        if (!container) return;
        
        container.innerHTML = songs.map(song => `
            <div class="song-card">
                <div class="song-header">
                    <div class="song-avatar" style="background: linear-gradient(135deg, #${song.id.toString(16).padEnd(6,'0')}, #${(song.id*2).toString(16).padEnd(6,'0')})">
                        <i class="fas fa-music"></i>
                    </div>
                    <div class="song-info">
                        <h3>${song.title}</h3>
                        <p>${song.artist}</p>
                    </div>
                </div>
                <div style="color: var(--gray); margin-bottom: 15px;">
                    ${song.genre} • ${song.year} • ${song.bpm} BPM
                </div>
                <div class="song-features">
                    ${song.features.slice(0,3).map(f => `<span class="feature-tag">${f}</span>`).join('')}
                </div>
                <div class="neural-match">
                    <div class="match-score">${Math.min(95, 70 + Math.random()*25).toFixed(0)}%</div>
                    <button class="feature-tag" onclick="aiCore.playPreview('${song.title}')">
                        <i class="fas fa-play"></i> Слушать
                    </button>
                </div>
            </div>
        `).join('');
    }

    processQuery(text) { return this.processWithOpenRouter(text, 'text'); }
    voiceSearch() { return this.startVoiceInput(); }
    playPreview(songTitle) { alert(`🎧 Играет: ${songTitle}`); }
}

window.MusicAICore = MusicAICore;
// Инициализируем AI Core только один раз
if (!window.aiCore) {
    window.aiCore = new MusicAICore();
}
