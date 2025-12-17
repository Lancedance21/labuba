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
            
            // 🔥 ВАЖНОЕ ИСПРАВЛЕНИЕ: Убрал рекурсивный вызов!
            // Теперь просто показываем ошибку и выходим
            
            if (window.removeMessageFromChat) {
                window.removeMessageFromChat(thinkingMsgId);
            }
            
            let errorMsg = `❌ **Ошибка:** ${errorMessage}`;
            
            if (errorMessage.includes('overloaded') || errorMessage.includes('перегружен')) {
                errorMsg = '⚠️ **Модель перегружена**\n\nСерверы Google AI временно перегружены. Пожалуйста, попробуйте через несколько минут.';
            } else if (errorMessage.includes('model') || errorMessage.includes('модель')) {
                errorMsg = '⚠️ **Проблема с моделью AI**\n\nПопробую использовать другую модель...';
                // Меняем модель для следующего запроса, но НЕ вызываем рекурсивно
                this.modelName = this.getFallbackModel();
            }
            
            if (window.addMessageToChat) {
                window.addMessageToChat(errorMsg, 'ai');
            }
            
            return; // 🔥 ВАЖНО: Просто выходим, не вызываем себя снова!
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
                // Меняем модель для следующего запроса
                this.modelName = this.getFallbackModel();
            }
            
            window.addMessageToChat(errorMsg, 'ai');
        }
    }
},
