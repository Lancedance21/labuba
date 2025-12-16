// ai-core.js - GOOGLE GEMINI (ВЕРСИЯ: TERMINATOR - FINAL STABLE)
console.log('🚀 AI Core загружен (Stable Version)');

class MusicAICore {
    constructor() {
        this.apiKeys = [];
        this.loadKeys();
        this.currentKeyIndex = 0;
        this.musicDB = window.musicDatabase || [];
    }

    loadKeys() {
        // 1. Собираем ключи из всех возможных мест
        const allKeys = [
            ...(window.API_CONFIG?.googleKeys || []),
            ...(window.CONFIG?.GOOGLE_AI?.API_KEYS || []),
            window.currentApiKey // Если пользователь ввел через модальное окно
        ].filter(k => k && typeof k === 'string' && k.length > 20);
        
        // 2. Убираем дубликаты
        this.apiKeys = [...new Set(allKeys)];
        
        if (this.apiKeys.length === 0) {
            console.warn("⚠️ Ключи API не найдены при загрузке. Жду ввода пользователя.");
        }
    }

    getCurrentKey() {
        if (this.apiKeys.length === 0) return null;
        return this.apiKeys[this.currentKeyIndex % this.apiKeys.length];
    }

    // === ГЛАВНАЯ ФУНКЦИЯ ЗАПРОСА ===
    async processWithOpenRouter(userInput, searchType = 'text') {
        // Проверка: есть ли ключи?
        if (this.apiKeys.length === 0) {
            if (window.addMessageToChat) window.addMessageToChat("⚠️ Нет ключей API. Введите ключ в настройках.", 'ai');
            return;
        }

        // 1. НАСТРОЙКА "МОЗГА" (Выбираем роль в зависимости от кнопки)
        let prompt = "";
        let thinkingText = '🤔 Думаю...';

        if (searchType === 'lyrics') {
            // Режим: ПО СТРОЧКАМ
            thinkingText = '🔎 Ищу трек по тексту...';
            prompt = `
            РОЛЬ: Профессиональный музыкальный детектив.
            ЗАДАЧА: Найти песню по строчке: "${userInput}".
            
            ЦЕЛЬ: 
            1. Найти 1 точное совпадение.
            2. Объяснить: где звучит эта фраза, почему ты уверен.
            3. Дать 8 похожих песен.

            ФОРМАТ ОТВЕТА (Строго текст без **):
            🎯 НАЙДЕН ТРЕК: Исполнитель - Название
            💡 ИНФО: (Год, Альбом, Контекст)
            👇 ПОХОЖИЕ:
            1. Исполнитель - Название
            ...
            `;
        } else if (searchType === 'melody') {
            // Режим: ПО НАПЕВУ
            thinkingText = '👂 Слушаю ритм...';
            prompt = `
            РОЛЬ: Эксперт по ритмам и мелодиям.
            ЗАДАЧА: Угадай песню по напеву/описанию ритма: "${userInput}".
            ФОРМАТ: Текст без ** (жирного шрифта).
            `;
        } else {
            // Режим: ЭКСПЕРТ (Обычный)
            prompt = `
            РОЛЬ: Музыкальный критик.
            ЗАДАЧА: Посоветуй музыку по запросу: "${userInput}".
            ФОРМАТ: Топ 8 рекомендаций с кратким описанием. Текст без ** (жирного шрифта).
            `;
        }

        if (window.addMessageToChat) window.addMessageToChat(thinkingText, 'ai', 'thinking_msg');
        
        try {
            const rawKey = this.getCurrentKey();
            const apiKey = rawKey ? rawKey.trim() : "";

            // 2. СПИСОК МОДЕЛЕЙ (Plan A -> Plan B -> Plan C)
            // Код будет пробовать их по очереди, пока одна не сработает
            const modelsToTry = [
                'gemini-1.5-flash', 
                'gemini-1.5-flash-001', 
                'gemini-pro',
                'gemini-1.0-pro'
            ];

            let response;
            let usedModel = "";
            let lastError = "";

            // 3. ЦИКЛ ПОПЫТОК
            for (const model of modelsToTry) {
                try {
                    // ПРЯМАЯ ССЫЛКА (Чтобы избежать ошибки 404 из-за кривого baseUrl)
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                    console.log(`📡 Пробую модель: ${model}...`);

                    response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    });

                    // Если успех - выходим из цикла
                    if (response.ok) {
                        usedModel = model;
                        break; 
                    } else {
                        // Если ошибка - запоминаем и идем к следующей модели
                        const errData = await response.json().catch(() => ({}));
                        lastError = errData.error?.message || response.statusText;
                        console.warn(`⚠️ ${model} сбой: ${lastError}`);
                        
                        // Если ошибка доступа (403), нет смысла менять модель, прерываем
                        if (response.status === 403 || response.status === 400) {
                             // Но иногда 403 бывает только на конкретную модель, так что лучше продолжить
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            }

            // 4. ОБРАБОТКА РЕЗУЛЬТАТА
            if (!response || !response.ok) {
                throw new Error(`Все модели недоступны. Последняя ошибка: ${lastError}`);
            }

            const data = await response.json();
            let text = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (window.removeMessageFromChat) window.removeMessageFromChat('thinking_msg');
            
            if (text && window.addMessageToChat) {
                // Чистим звездочки программно
                text = text.replace(/\*\*/g, ''); 
                console.log(`✅ Успех! Сработала модель: ${usedModel}`);
                window.addMessageToChat(text, 'ai');
            } else {
                throw new Error("Пустой ответ от нейросети");
            }

        } catch (e) {
            console.error(e);
            if (window.removeMessageFromChat) window.removeMessageFromChat('thinking_msg');
            if (window.addMessageToChat) {
                let msg = e.message;
                if (msg.includes('Failed to fetch')) msg += " (Проблема с сетью/VPN)";
                window.addMessageToChat(`❌ Ошибка: ${msg}`, 'ai');
            }
        }
    }
    
    // Заглушки для совместимости
    setupVoiceRecognition() {} 
    startVoiceInput() { alert('Голосовой ввод в этой версии отключен для стабильности'); }
    processQuery(t) { this.processWithOpenRouter(t); }
}

// Экспорт для глобального доступа
window.MusicAICore = MusicAICore;
// Пересоздаем объект
window.aiCore = new MusicAICore();
