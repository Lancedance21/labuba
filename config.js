// config.js - настройки приложения

const CONFIG = {
    GOOGLE_AI: {
        API_KEYS: window.API_CONFIG?.googleKeys || []
    },
    VOICE: { LANG: 'ru-RU', ENABLED: true },
    MUSIC: { MAX_RESULTS: 10 }
};

const Storage = {
    set: (key, value) => { 
        try { localStorage.setItem(`music_ai_${key}`, JSON.stringify(value)); } catch (e) {} 
    },
    get: (key) => { 
        try { return JSON.parse(localStorage.getItem(`music_ai_${key}`)); } catch (e) { return null; } 
    }
};

window.CONFIG = CONFIG;
window.Storage = Storage;
console.log('⚙️ Config.js загружен');
