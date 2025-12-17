// 🔥 ИСПРАВЛЕННАЯ И СТАБИЛЬНАЯ ВЕРСИЯ
processWithOpenRouter: async function(userInput, searchType = 'text') {
    console.log('🎯 ProcessWithOpenRouter:', userInput?.substring(0, 100));
    
    // 1. Всегда обновляем список ключей
    if (!this.updateKeys() || this.apiKeys.length === 0) {
        const errorMsg = "⚠️ **Нет рабочего API ключа**\n\nВведите Google AI API ключ в настройках.";
        console.error(errorMsg);
        if (window.addMessageToChat) window.addMessageToChat(errorMsg, 'ai');
        if (window.showApiKeyModal) setTimeout(() => window.showApiKeyModal(), 500);
        return;
    }

    const thinkingMsgId = 'thinking_' + Date.now();
    if (window.addMessageToChat) {
        window.addMessageToChat('🤔 Думаю...', 'ai', thinkingMsgId);
    }

    let currentAttempt = 0;
    const maxAttempts = 2; // Максимум 2 попытки (основная + 1 запасная модель)
    
    while (currentAttempt < maxAttempts) {
        currentAttempt++;
        const apiKey = this.getCurrentKey();
        
        try {
            // 2. Используем ТОЛЬКО реальные, стабильные модели
            const safeModelName = this.getSafeModelName(currentAttempt);
            const prompt = this.buildPrompt(userInput, searchType);
            
            // 3. Контролируем длину промпта
            if (prompt.length > 30000) {
                throw new Error('Запрос слишком длинный. Попробуйте сформулировать короче.');
            }
            
            const url = `${this.baseUrl}/models/${safeModelName}:generateContent?key=${apiKey}`;
            console.log(`📡 Попытка ${currentAttempt}: ${safeModelName}`);
            
            // 4. Добавляем таймаут для запроса (30 секунд)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 2048,
                        topP: 0.9
                    }
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            // 5. ДЕТАЛЬНАЯ обработка HTTP ошибок
            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { error: { message: `HTTP ${response.status}` } };
                }
                
                const errorMessage = errorData.error?.message || 'Ошибка API';
                console.error(`❌ API ошибка (${response.status}):`, errorMessage);
                
                // Удаляем индикатор "Думаю..."
                if (window.removeMessageFromChat) window.removeMessageFromChat(thinkingMsgId);
                
                // Обработка специфических ошибок
                if (response.status === 400 && errorMessage.includes('location') || errorMessage.includes('FAILED_PRECONDITION')) {
                    // Критическая ошибка: регион или биллинг
                    const regionError = `❌ **Проблема с доступом в вашем регионе**\n\nВозможно, бесплатный тариф Gemini API недоступен в вашей стране[citation:8]. Проверьте настройки проекта в Google AI Studio и убедитесь, что биллинг активирован[citation:5].`;
                    if (window.addMessageToChat) window.addMessageToChat(regionError, 'ai');
                    return; // Прекращаем все попытки
                }
                
                if (response.status === 403 || errorMessage.includes('PERMISSION_DENIED') || errorMessage.includes('API key')) {
                    // Критическая ошибка: ключ невалиден или скомпрометирован
                    const keyError = `🔑 **Проблема с API ключом**\n\nКлюч недействителен, заблокирован или у него нет прав доступа[citation:5]. Проверьте ключ в Google AI Studio и сгенерируйте новый.`;
                    if (window.addMessageToChat) window.addMessageToChat(keyError, 'ai');
                    if (window.showApiKeyModal) window.showApiKeyModal();
                    return;
                }
                
                if (response.status === 429) {
                    // Превышена квота или rate limit
                    const quotaError = `⚠️ **Превышен лимит запросов**\n\nСлишком много запросов в минуту. Подождите 1-2 минуты или проверьте квоты проекта[citation:5].`;
                    if (window.addMessageToChat) window.addMessageToChat(quotaError, 'ai');
                    return;
                }
                
                if (response.status === 500 || response.status === 503) {
                    // Проблема на стороне сервера Google - пробуем другую модель
                    console.log(`🔄 Серверная ошибка (${response.status}), пробую другую модель...`);
                    continue; // Переходим к следующей попытке с другой моделью
                }
                
                // Любая другая ошибка - показываем сообщение
                const genericError = `⚠️ **Ошибка API (${response.status})**\n\n${errorMessage}`;
                if (window.addMessageToChat) window.addMessageToChat(genericError, 'ai');
                return;
            }
            
            // 6. УСПЕШНЫЙ ОТВЕТ - парсим и выводим
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (window.removeMessageFromChat) window.removeMessageFromChat(thinkingMsgId);
            
            if (text) {
                if (window.addMessageToChat) {
                    window.addMessageToChat(text, 'ai');
                }
                // Успех - прерываем цикл попыток
                return;
            } else {
                throw new Error('Пустой ответ от AI');
            }
            
        } catch (error) {
            console.error(`❌ Попытка ${currentAttempt} провалена:`, error.name, error.message);
            
            // Удаляем индикатор "Думаю..." при любой ошибке
            if (window.removeMessageFromChat) window.removeMessageFromChat(thinkingMsgId);
            
            // Обработка разных типов ошибок
            if (error.name === 'AbortError') {
                // Таймаут запроса
                const timeoutMsg = `⏱️ **Превышено время ожидания**\n\nСервер не ответил за 30 секунд. Возможно, сеть перегружена или промпт слишком сложный.`;
                if (window.addMessageToChat) window.addMessageToChat(timeoutMsg, 'ai');
                return;
            }
            
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                // Сетевая ошибка
                const networkMsg = `🌐 **Проблема с сетью**\n\nНе удалось подключиться к серверу Google AI. Проверьте интернет-соединение.`;
                if (window.addMessageToChat) window.addMessageToChat(networkMsg, 'ai');
                return;
            }
            
            // Если это последняя попытка - показываем общую ошибку
            if (currentAttempt >= maxAttempts) {
                const finalError = `❌ **Не удалось получить ответ**\n\nПосле ${maxAttempts} попыток ИИ не ответил. Попробуйте позже или упростите запрос.`;
                if (window.addMessageToChat) window.addMessageToChat(finalError, 'ai');
            }
            // Иначе ошибка уже обработана в блоке response.ok, цикл продолжается
        }
    }
},

// 🔥 ОБНОВЛЕННЫЙ СПИСОК МОДЕЛЕЙ - ТОЛЬКО СТАБИЛЬНЫЕ
getSafeModelName: function(attempt = 1) {
    // АКТУАЛЬНЫЙ СПИСОК рабочих моделей (на декабрь 2025)
    const stableModels = [
        'gemini-1.5-flash-latest',    // Основная, самая быстрая
        'gemini-1.5-pro-latest',      // Основная, более умная
        'gemini-1.5-flash-001',       // Резервная, стабильная
        'gemini-1.5-pro-001',         // Резервная, стабильная
    ];
    
    // В зависимости от попытки выбираем модель
    // Первая попытка - самая быстрая, вторая - более мощная
    const modelIndex = (attempt === 1) ? 0 : 1;
    
    // Гарантируем, что индекс в пределах массива
    const selectedModel = stableModels[modelIndex] || stableModels[0];
    
    console.log(`✅ Выбрана модель: ${selectedModel} (попытка ${attempt})`);
    return selectedModel;
},

// УДАЛИТЬ старую функцию getFallbackModel - она больше не нужна
// Вся логика выбора модели теперь в getSafeModelName
