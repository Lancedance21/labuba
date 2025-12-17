// config.js - настройки (Google Gemini Direct Fixed)
console.log('⚙️ Config.js загружен');

const CONFIG = {
    GOOGLE_AI: {
        API_KEYS: (window.API_CONFIG && window.API_CONFIG.googleKeys) 
            ? window.API_CONFIG.googleKeys 
            : [],
        MODEL: 'gemini-1.5-flash-001', 
        ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models'
    },
    
    OPENROUTER: { API_KEYS: [], MODEL: 'gemini-1.5-flash', ENDPOINT: '...' },
    VOICE: { LANG: 'ru-RU', ENABLED: true },
    MUSIC: { MAX_RESULTS: 10, AUTO_PLAY: false }
};

const Storage = {
    set: (key, value) => { 
        try { 
            localStorage.setItem(`music_ai_${key}`, JSON.stringify(value)); 
        } catch (e) {
            console.warn('⚠️ Ошибка сохранения в localStorage:', e);
        }
    },
    get: (key) => { 
        try { 
            return JSON.parse(localStorage.getItem(`music_ai_${key}`)); 
        } catch (e) { 
            return null; 
        }
    },
    clear: () => { 
        Object.keys(localStorage)
            .filter(k => k.startsWith('music_ai_'))
            .forEach(k => localStorage.removeItem(k)); 
    }
};

window.CONFIG = CONFIG;
window.Storage = Storage;
