// config.js - настройки
const CONFIG = {
    GOOGLE_AI: {
        // ЛОГИКА БЕЗОПАСНОСТИ:
        // Если есть секретный файл (локально) -> берем ключи оттуда.
        // Если нет (на GitHub) -> ставим пустой список (попросим у пользователя).
        API_KEYS: (window.SECRET_KEYS && window.SECRET_KEYS.GOOGLE_AI) 
            ? window.SECRET_KEYS.GOOGLE_AI 
            : [],

        // API_KEY (одиночный) убираем, так как ai-core сам возьмет первый ключ из списка выше
        
        MODEL: 'gemini-1.5-flash', 
        ENDPOINT: 'https://generativelanguage.googleapis.com/v1/models'
    },
    
    OPENROUTER: {
        // Настройки для OpenRouter API
        // Используем новую структуру API_CONFIG из keys.js
        API_KEYS: (window.API_CONFIG && window.API_CONFIG.primaryKey && window.API_CONFIG.fallbackKey)
            ? [window.API_CONFIG.primaryKey, window.API_CONFIG.fallbackKey]
            : (window.API_CONFIG && window.API_CONFIG.primaryKey)
                ? [window.API_CONFIG.primaryKey]
                : [],
        
        // ПРИНУДИТЕЛЬНО СТАВИМ РАБОЧИЕ МОДЕЛИ (ИГНОРИРУЯ СТАРЫЕ НАСТРОЙКИ)
        
        // Основная: Flash Lite 2.0 (Быстрая, бесплатная)
        MODEL: 'google/gemini-2.0-flash-lite-preview-02-05:free', 

        // Резервная: Llama 3.1 (Супер-стабильная, не от Google, чтобы точно работала)
        FALLBACK_MODEL: 'meta-llama/llama-3.1-8b-instruct:free', 
            
        ENDPOINT: 'https://openrouter.ai/api/v1/chat/completions'
    },
    
    // Твои настройки голоса (оставил без изменений)
    VOICE: {
        LANG: 'ru-RU',
        ENABLED: true
    },
    
    // Твои настройки музыки (оставил без изменений)
    MUSIC: {
        MAX_RESULTS: 10,
        AUTO_PLAY: false
    }
};

// Функции для работы с localStorage (оставил без изменений)
const Storage = {
    set: (key, value) => {
        try {
            localStorage.setItem(`music_ai_${key}`, JSON.stringify(value));
        } catch (e) {
            console.error('Ошибка сохранения:', e);
        }
    },
    
    get: (key) => {
        try {
            const item = localStorage.getItem(`music_ai_${key}`);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            return null;
        }
    },
    
    clear: () => {
        const keys = Object.keys(localStorage).filter(k => k.startsWith('music_ai_'));
        keys.forEach(k => localStorage.removeItem(k));
    }
};

// Экспорт
window.CONFIG = CONFIG;
window.Storage = Storage;
