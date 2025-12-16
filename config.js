// config.js - настройки (Google Direct Mode)
const CONFIG = {
    // Настройки подключения к Google Gemini напрямую
    GOOGLE_AI: {
        // Берем ключи из глобального конфига (keys.js)
        API_KEYS: (window.API_CONFIG && window.API_CONFIG.googleKeys) 
            ? window.API_CONFIG.googleKeys 
            : [],

        MODEL: 'gemini-1.5-flash', 
        ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models'
    },
    
    // OpenRouter больше не нужен, но оставляем заглушку, чтобы старый код не падал
    OPENROUTER: {
        API_KEYS: [],
        MODEL: 'gemini-1.5-flash',
        ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models'
    },
    
    VOICE: {
        LANG: 'ru-RU',
        ENABLED: true
    },
    
    MUSIC: {
        MAX_RESULTS: 10,
        AUTO_PLAY: false
    }
};

const Storage = {
    set: (key, value) => {
        try { localStorage.setItem(`music_ai_${key}`, JSON.stringify(value)); } catch (e) {}
    },
    get: (key) => {
        try { return JSON.parse(localStorage.getItem(`music_ai_${key}`)); } catch (e) { return null; }
    },
    clear: () => {
        Object.keys(localStorage).filter(k => k.startsWith('music_ai_')).forEach(k => localStorage.removeItem(k));
    }
};

window.CONFIG = CONFIG;
window.Storage = Storage;
