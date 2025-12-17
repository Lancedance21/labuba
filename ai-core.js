// ai-core.js - УПРОЩЕННАЯ ВЕРСИЯ 9.0
console.log('🚀 AI Core загружен (версия 9.0)');

class MusicAICore {
    constructor() {
        console.log("🔄 Инициализация AI Core...");
        this.apiKeys = [];
        this.currentKeyIndex = 0;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        this.modelName = 'gemini-1.5-flash';
        
        // Собираем все ключи
        this.collectApiKeys();
        
        // Ждем и показываем модальное окно если ключей нет
        setTimeout(() => {
            if (this.apiKeys.length === 0) {
                console.log("⚠️ Ключей нет, показываю модальное окно");
                this.showApiKeyModal();
            } else {
                console.log(`✅ Найдено ключей: ${this.apiKeys.length}`);
            }
        }, 500);
    }
    
    collectApiKeys() {
        console.log("🔍 Сбор ключей из всех источников...");
        
        // 1. Из keys.js (через API_CONFIG)
        if (window.API_CONFIG?.googleKeys?.length > 0) {
            console.log("✅ Ключи из keys.js:", window.API_CONFIG.googleKeys.length);
            this.apiKeys.push(...window.API_CONFIG.googleKeys);
        }
        
        // 2. Из config.js
        if (window.CONFIG?.GOOGLE_AI?.API_KEYS?.length > 0) {
            console.log("✅ Ключи из config.js:", window.CONFIG.GOOGLE_AI.API_KEYS.length);
            this.apiKeys.push(...window.CONFIG.GOOGLE_AI.API_KEYS);
        }
        
        // 3. Из localStorage (только для этой сессии)
        try {
            const savedKey = localStorage.getItem('music_ai_current_key');
            if (savedKey && savedKey.length > 30) {
                console.log("✅ Ключ из localStorage");
                this.apiKeys.push(savedKey);
            }
        } catch(e) {
            console.warn("❌ Ошибка чтения localStorage:", e);
        }
        
        // Убираем дубликаты
        this.apiKeys = [...new Set(this.apiKeys.filter(k => k && k.trim().length > 30))];
        
        console.log(`📦 Всего уникальных ключей: ${this.apiKeys.length}`);
    }
    
    showApiKeyModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            
            // Фокус на поле ввода
            setTimeout(() => {
                const input = document.getElementById('googleApiKeyInput');
                if (input) {
                    input.focus();
                    input.value = '';
                }
            }, 300);
        }
    }
    
    saveApiKey(key) {
        if (!key || key.length < 30) {
            alert("❌ Неправильный ключ API");
            return false;
        }
        
        try {
            // Сохраняем в localStorage
            localStorage.setItem('music_ai_current_key', key);
            
            // Добавляем в список ключей
            if (!this.apiKeys.includes(key)) {
                this.apiKeys.push(key);
            }
            
            // Закрываем модальное окно
            const modal = document.getElementById('settingsModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
            
            console.log("✅ Ключ сохранен");
            return true;
        } catch(e) {
            console.error("Ошибка сохранения ключа:", e);
            return false;
        }
    }
    
    getCurrentKey() {
        if (this.apiKeys.length === 0) {
            this.showApiKeyModal();
            return null;
        }
        return this.apiKeys[this.currentKeyIndex];
    }
    
    async processWithOpenRouter(userInput, searchType = 'text') {
        const apiKey = this.getCurrentKey();
        if (!apiKey) {
            this.showApiKeyModal();
            return;
        }
        
        // Показываем "Думаю..."
        const thinkingMsgId = 'thinking_' + Date.now();
        if (window.addMessageToChat) {
            window.addMessageToChat('🤔 Думаю...', 'ai', thinkingMsgId);
        }
        
        const prompt = `Ты музыкальный эксперт. Помоги пользователю: "${userInput}". 
        Давай рекомендации песен в формате: Название - Исполнитель (Год) | Жанр`;
        
        try {
            const url = `${this.baseUrl}/models/${this.modelName}:generateContent?key=${apiKey}`;
            console.log(`📡 Отправка запроса: ${url.substring(0, 100)}...`);
            
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
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            // Убираем "Думаю..."
            if (window.removeMessageFromChat) {
                window.removeMessageFromChat(thinkingMsgId);
            }
            
            if (text && window.addMessageToChat) {
                window.addMessageToChat(text, 'ai');
            } else {
                throw new Error("Пустой ответ от API");
            }
            
        } catch (error) {
            console.error("❌ Ошибка API:", error);
            
            // Убираем "Думаю..."
            if (window.removeMessageFromChat) {
                window.removeMessageFromChat(thinkingMsgId);
            }
            
            if (window.addMessageToChat) {
                window.addMessageToChat(
                    `❌ Ошибка: ${error.message}\n\n` +
                    `💡 Проверьте:\n` +
                    `1. Правильность API ключа\n` +
                    `2. Подключение к интернету\n` +
                    `3. Активацию Google AI API`,
                    'ai'
                );
            }
        }
    }
    
    // Методы для совместимости
    setupVoiceRecognition() {}
    startVoiceInput() {
        alert("🎤 Голосовой ввод временно отключен");
    }
    stopVoiceInput() {}
    onVoiceInput(text) {
        if (window.addMessageToChat) {
            window.addMessageToChat(text, 'user');
            this.processWithOpenRouter(text);
        }
    }
}

// Создаем глобальный экземпляр
if (!window.aiCore) {
    window.aiCore = new MusicAICore();
    console.log("✅ AI Core создан");
}
