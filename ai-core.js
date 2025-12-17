// ai-core.js - Музыкальный ИИ v15.0 (Groq - быстрый и стабильный)

class MusicAICore {
    constructor() {
        this.groqKeys = [];
        this.currentKeyIndex = 0;
        this.baseUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'llama-3.3-70b-versatile'; // Умная модель
        this.chatHistory = []; // История диалога
        this.maxHistory = 20; // Максимум сообщений в памяти
        this.loadKeys();
    }

    loadKeys() {
        // 1. Сначала создаем пустой список, чтобы не было ошибок
        this.groqKeys = [];

        try {
            // 2. БЕЗОПАСНАЯ ПРОВЕРКА: Если keys.js есть - берем ключи оттуда
            // (Проверяем typeof, чтобы на GitHub не вылетала ошибка)
            if (typeof window.API_CONFIG !== 'undefined' && window.API_CONFIG.groqKeys) {
                this.groqKeys = [...window.API_CONFIG.groqKeys];
            }
        } catch(e) {
            console.log('⚠️ keys.js не найден, работаем только с сохраненным ключом');
        }

        try {
            // 3. Достаем ключ из памяти браузера (тот, что ты введешь)
            const saved = localStorage.getItem('groq_key');
            if (saved && saved.startsWith('gsk_')) {
                // Если такого ключа еще нет в списке - ставим его ПЕРВЫМ
                if (!this.groqKeys.includes(saved)) {
                    this.groqKeys.unshift(saved);
                }
            }
            console.log(`🔑 Groq ключей доступно: ${this.groqKeys.length}`);
        } catch(e) {}
    }

    saveKey(key) {
        if (key && key.startsWith('gsk_')) {
            if (!this.groqKeys.includes(key)) {
                this.groqKeys.unshift(key);
            }
            localStorage.setItem('groq_key', key);
            console.log('✅ Groq ключ сохранён');
            return true;
        }
        return false;
    }

    hasKey() {
        return this.groqKeys.length > 0;
    }
    
    getKey() {
        return this.groqKeys[0] || '';
    }

    async chat(message, retryCount = 0) {
        if (!this.hasKey()) {
            return { error: 'Введите API ключ Groq (получить на console.groq.com)' };
        }

        const apiKey = this.groqKeys[this.currentKeyIndex];
        
        // Добавляем сообщение пользователя в историю
        this.chatHistory.push({ role: 'user', content: message });
        
        // Ограничиваем историю
        if (this.chatHistory.length > this.maxHistory) {
            this.chatHistory = this.chatHistory.slice(-this.maxHistory);
        }

        // Системный промпт
        const systemPrompt = `Ты — профессиональный музыкальный эксперт и критик с глубокими знаниями во всех жанрах музыки.

ТВОИ ЗАДАЧИ:
- Рекомендовать музыку на основе запросов пользователя
- Анализировать музыкальные предпочтения
- Объяснять особенности жанров, исполнителей, альбомов
- Помогать находить похожие треки и исполнителей
- Составлять плейлисты под настроение или ситуацию

ФОРМАТ РЕКОМЕНДАЦИЙ:
1. "Название песни" — Исполнитель
2. "Название песни" — Исполнитель
(и так далее)

После списка кратко объясни, почему эти треки подходят под запрос.

ВАЖНО:
- Отвечай ТОЛЬКО на русском языке
- Помни контекст разговора и предыдущие запросы пользователя
- Будь дружелюбным и увлечённым музыкой
- Давай развёрнутые и полезные ответы`;

        try {
            console.log(`📡 Groq [ключ ${this.currentKeyIndex + 1}] История: ${this.chatHistory.length} сообщений`);
            
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...this.chatHistory
                    ],
                    max_tokens: 2000,
                    temperature: 0.8
                })
            });

            // Rate limit - переключаем ключ
            if (response.status === 429) {
                console.log('⏳ Rate limit, переключаю ключ...');
                this.currentKeyIndex = (this.currentKeyIndex + 1) % this.groqKeys.length;
                if (retryCount < this.groqKeys.length) {
                    await new Promise(r => setTimeout(r, 1000));
                    return this.chat(message, retryCount + 1);
                }
                return { error: 'Лимит запросов. Подождите минуту.' };
            }

            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            
            if (text && text.length > 10) {
                // Сохраняем ответ ИИ в историю
                this.chatHistory.push({ role: 'assistant', content: text });
                console.log('✅ Ответ получен');
                return { text };
            }
            
            return { error: 'Пустой ответ' };

        } catch (e) {
            console.error('❌', e.message);
            // Пробуем другой ключ
            if (retryCount < this.groqKeys.length - 1) {
                this.currentKeyIndex = (this.currentKeyIndex + 1) % this.groqKeys.length;
                return this.chat(message, retryCount + 1);
            }
            return { error: e.message };
        }
    }

    async processWithOpenRouter(userInput) {
        if (window.addMessageToChat) {
            window.addMessageToChat('🤔 Ищу музыку...', 'ai', 'thinking_msg');
        }

        const result = await this.chat(userInput);

        if (window.removeMessageFromChat) {
            window.removeMessageFromChat('thinking_msg');
        }

        if (result.error) {
            if (window.addMessageToChat) {
                window.addMessageToChat(`❌ ${result.error}`, 'ai');
            }
        } else if (result.text) {
            if (window.addMessageToChat) {
                window.addMessageToChat(result.text, 'ai');
            }
        }
    }

    processQuery(t) { this.processWithOpenRouter(t); }
    setupVoiceRecognition() {}
    startVoiceInput() {}
}

window.MusicAICore = MusicAICore;
window.aiCore = new MusicAICore();

console.log('🎵 AI Core v15.0 (Groq) загружен');
