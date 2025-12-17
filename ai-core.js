// 🔥 ИСПРАВЛЕННАЯ И СТАБИЛЬНАЯ ВЕРСИЯ processWithOpenRouter
processWithOpenRouter: async function(userInput, searchType = 'text') {
    console.log('🎯 ProcessWithOpenRouter вызван:', userInput?.substring(0, 100));
    
    // ВАЖНО: Сохраняем оригинальную модель перед началом
    const originalModel = this.modelName;
    
    // 1. Проверка ключей (как было)
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
        
        // 🔥 ИСПРАВЛЕНИЕ: Используем БЕЗОПАСНЫЙ метод получения модели
        const safeModelName = this.getSafeModelName();
        const prompt = this.buildPrompt(userInput, searchType);
        const url = `${this.baseUrl}/models/${safeModelName}:generateContent?key=${apiKey}`;
        
        console.log(`📡 Отправка запроса к ${safeModelName}...`);
        
        // 🔥 ДОБАВЛЕНО: Таймаут запроса
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 секунд максимум
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048
                }
            }),
            signal: controller.signal // Добавляем контроль прерывания
        });
        
        clearTimeout(timeoutId); // Очищаем таймер
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
            
            // 🔥 ИСПРАВЛЕНИЕ: Правильная обработка ошибок
            if (window.removeMessageFromChat) {
                window.removeMessageFromChat(thinkingMsgId);
            }
            
            // Показываем понятную ошибку пользователю
            let userErrorMessage = `❌ **Ошибка:** ${errorMessage}`;
            
            if (response.status === 429) {
                userErrorMessage = '⚠️ **Слишком много запросов**\n\nПодождите 1-2 минуты перед следующим запросом.';
            } else if (response.status === 500 || response.status === 503) {
                userErrorMessage = '⚠️ **Сервер перегружен**\n\nПопробуйте через несколько минут.';
            } else if (errorMessage.includes('API key') || response.status === 403) {
                userErrorMessage = '🔑 **Проблема с API ключом**\n\nПроверьте ключ в настройках.';
            }
            
            if (window.addMessageToChat) {
                window.addMessageToChat(userErrorMessage, 'ai');
            }
            
            // 🔥 ВАЖНО: НЕ вызываем рекурсивно при ошибке!
            // Просто возвращаем управление
            return;
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
        console.error('❌ Ошибка в processWithOpenRouter:', error);
        
        // 🔥 ИСПРАВЛЕНИЕ: Всегда убираем индикатор
        if (window.removeMessageFromChat) {
            window.removeMessageFromChat(thinkingMsgId);
        }
        
        if (window.addMessageToChat) {
            let errorMsg = `❌ **Ошибка:** `;
            
            if (error.name === 'AbortError') {
                errorMsg = '⏱️ **Превышено время ожидания**\n\nЗапрос занял слишком много времени. Попробуйте снова.';
            } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
                errorMsg = '🌐 **Проблема с сетью**\n\nПроверьте подключение к интернету.';
            } else {
                errorMsg += error.message;
            }
            
            window.addMessageToChat(errorMsg, 'ai');
        }
        
        // 🔥 ВАЖНО: Восстанавливаем оригинальную модель
        this.modelName = originalModel;
    }
},

// 🔥 ИСПРАВЛЕННАЯ ФУНКЦИЯ БЕЗОПАСНОЙ МОДЕЛИ
getSafeModelName: function() {
    // 🔥 ИСПРАВЛЕНО: Только существующие и стабильные модели
    const validModels = [
        'gemini-1.5-flash',      // Основная модель
        'gemini-1.5-flash-001',  // Стабильная версия
        'gemini-1.5-pro',        // Альтернатива
        'gemini-1.0-pro',        // Запасной вариант
    ];
    
    // Если текущая модель валидна, используем ее
    if (validModels.includes(this.modelName)) {
        return this.modelName;
    }
    
    // Иначе возвращаем самую надежную
    console.log(`⚠️ Модель ${this.modelName} невалидна, использую gemini-1.5-flash`);
    return 'gemini-1.5-flash';
},

// 🔥 ИСПРАВЛЕННАЯ ФУНКЦИЯ ЗАПАСНОЙ МОДЕЛИ (простая версия)
getFallbackModel: function() {
    const fallbackModels = [
        'gemini-1.5-flash',
        'gemini-1.5-flash-001',
        'gemini-1.5-pro',
        'gemini-1.0-pro'
    ];
    
    // Просто возвращаем следующую модель в списке
    const currentIndex = fallbackModels.indexOf(this.modelName);
    const nextIndex = (currentIndex + 1) % fallbackModels.length;
    
    console.log(`🔄 Смена модели: ${this.modelName} → ${fallbackModels[nextIndex]}`);
    return fallbackModels[nextIndex];
}
