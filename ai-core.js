// ai-core.js - ПРЯМОЕ ПОДКЛЮЧЕНИЕ К GOOGLE (ВЕРСИЯ 3.2 Full)
// Сохранена вся логика промптов, добавлена ротация ключей
console.log('🚀 AI Core загружен (версия 3.2 - Google Direct)');

class MusicAICore {
    constructor() {
        // 1. ЗАГРУЗКА КЛЮЧЕЙ (ПРИОРИТЕТ: keys.js)
        this.apiKeys = [];
        
        // Пытаемся получить ключи из всех возможных источников
        if (window.API_CONFIG && window.API_CONFIG.googleKeys) {
            this.apiKeys = [...window.API_CONFIG.googleKeys];
        } else if (window.CONFIG?.GOOGLE_AI?.API_KEYS?.length > 0) {
            this.apiKeys = [...window.CONFIG.GOOGLE_AI.API_KEYS];
        } else {
            // Проверка одиночного ключа
            const manualKey = window.currentApiKey || localStorage.getItem('music_ai_google_key');
            if (manualKey) this.apiKeys.push(manualKey);
        }

        if (this.apiKeys.length === 0) {
            console.warn('⚠️ Нет API ключей! Введите ключ в настройках.');
        } else {
            console.log(`✅ Загружено ключей Google: ${this.apiKeys.length}`);
        }

        this.currentKeyIndex = 0;
        // Используем модель Google Flash (самая быстрая)
        this.modelName = 'gemini-1.5-flash';
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
        
        this.isListening = false;
        this.recognition = null;
        this.setupVoiceRecognition();
        
        // База данных музыки и API
        this.musicDB = window.musicDatabase || [];
        this.musicBrainz = window.MusicBrainzAPI ? new window.MusicBrainzAPI() : null;
        this.musicSearch = window.MusicSearch ? new window.MusicSearch() : null;
    }

    // Получить текущий ключ
    getCurrentKey() {
        if (this.apiKeys.length === 0) return null;
        return this.apiKeys[this.currentKeyIndex];
    }

    // Сменить ключ на следующий
    rotateKey() {
        if (this.apiKeys.length <= 1) return false;
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        console.log(`🔄 Ротация ключа: #${this.currentKeyIndex + 1}`);
        return true;
    }

    // ==================== НАСТРОЙКА ГОЛОСОВОГО ВВОДА ====================
    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.lang = 'ru-RU';
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            
            this.recognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                if (event.results[0].isFinal) {
                    this.onVoiceInput(transcript);
                }
            };
            
            this.recognition.onerror = (event) => console.error('Голосовая ошибка:', event.error);
        } else {
            console.warn('Голосовой ввод не поддерживается');
        }
    }

    startVoiceInput() {
        if (this.recognition && !this.isListening) {
            this.isListening = true;
            this.recognition.start();
            return true;
        }
        return false;
    }

    stopVoiceInput() {
        if (this.recognition && this.isListening) {
            this.isListening = false;
            this.recognition.stop();
        }
    }

    onVoiceInput(text) {
        if (window.addMessageToChat) {
            window.addMessageToChat(text, 'user');
            const type = window.currentSearchType || 'text';
            this.processWithOpenRouter(text, type);
        }
    }

    // ==================== ПОИСК ЧЕРЕЗ MUSICBRAINZ ====================
    async searchWithMusicBrainz(query, searchType = 'lyrics') {
        if (!this.musicBrainz || !this.musicSearch) return null;
        try {
            if (searchType === 'lyrics' || searchType === 'describe') {
                const results = await this.musicSearch.searchByDescription(query);
                if (results && results.length > 0) {
                    return results.map(rec => this.musicSearch.formatRecording(rec));
                }
            }
            return null;
        } catch (error) {
            console.error('MusicBrainz search error:', error);
            return null;
        }
    }

    // ==================== ГЛАВНЫЙ МОЗГ (GOOGLE DIRECT) ====================
    async processWithOpenRouter(userInput, searchType = 'text') {
        let musicBrainzResults = null;
        
        if (this.apiKeys.length === 0) {
            if (window.addMessageToChat) window.addMessageToChat("⚠️ API ключ не найден.", 'ai');
            return;
        }

        // Индикатор "думаю"
        let thinkingText = '🤔 Анализирую запрос...';
        if (searchType === 'melody') thinkingText = '👂 Слушаю ритм и мелодию...';
        else if (searchType === 'lyrics') thinkingText = '📖 Листаю тексты песен...';
        else if (searchType === 'mood') thinkingText = '❤️ Чувствую настроение...';

        let thinkingMsgId = null;
        if (window.addMessageToChat) {
            thinkingMsgId = 'thinking_' + Date.now();
            window.addMessageToChat(thinkingText, 'ai', thinkingMsgId);
        }
        
        // 1. Поиск в MusicBrainz
        if ((searchType === 'lyrics' || searchType === 'describe') && this.musicBrainz) {
            musicBrainzResults = await this.searchWithMusicBrainz(userInput, searchType);
        }
        
        // 2. ГЕНЕРАЦИЯ ПРОМПТА (ТВОЯ ЛОГИКА)
        let specializedInstruction = "";
        switch (searchType) {
            case 'melody':
                specializedInstruction = `РЕЖИМ: ПОИСК ПО НАПЕВУ. Твоя задача: Понять ритм ("туц туц", "лалала"). Если "туц туц" -> ищи электронную/клубную.`;
                break;
            case 'lyrics':
                specializedInstruction = `РЕЖИМ: ПОИСК ПО ТЕКСТУ. Ищи песню по обрывкам фраз. Если фраза переведена, попробуй найти оригинал.`;
                break;
            case 'mood':
                specializedInstruction = `РЕЖИМ: ПОДБОР ПО НАСТРОЕНИЮ. Предлагай треки, которые ИДЕАЛЬНО попадают в вайб.`;
                break;
            case 'describe':
                specializedInstruction = `РЕЖИМ: ПОИСК ПО ОПИСАНИЮ. Угадай песню по сюжету клипа или описанию ситуации.`;
                break;
            default:
                specializedInstruction = `РЕЖИМ: МУЗЫКАЛЬНЫЙ ЭКСПЕРТ. Отвечай на вопросы о музыке, ищи песни, советуй жанры.`;
                break;
        }

        const baseRules = `
ЗАПРОС ПОЛЬЗОВАТЕЛЯ: "${userInput}"
${musicBrainzResults ? `Подсказки из базы MusicBrainz: ${musicBrainzResults.map(r => r.title).join(', ')}` : ''}

ФОРМАТ ОТВЕТА (Без markdown жирного шрифта):
Результат: [Название] - [Исполнитель]
Почему: [Объяснение]
Альтернативы:
1. [Название] - [Исполнитель] ([Год])
...
`;
        const finalPrompt = specializedInstruction + "\n\n" + baseRules;

        // 3. ОТПРАВКА В GOOGLE (С РОТАЦИЕЙ КЛЮЧЕЙ)
        let success = false;
        let aiResponse = "";
        let attempts = 0;
        const maxAttempts = this.apiKeys.length * 2; // Пробуем каждый ключ по 2 раза

        while (!success && attempts < maxAttempts) {
            const apiKey = this.getCurrentKey();
            const url = `${this.baseUrl}/${this.modelName}:generateContent?key=${apiKey}`;
            
            try {
                console.log(`📡 Запрос к Google (Ключ ${this.currentKeyIndex + 1})...`);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: finalPrompt }]
                        }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 2000
                        }
                    })
                });

                if (!response.ok) {
                    // Если ошибка 429 (лимит) или 403 (ключ плохой) -> меняем ключ
                    if (response.status === 429 || response.status === 403 || response.status === 400) {
                        console.warn(`⚠️ Ошибка ${response.status}. Меняю ключ...`);
                        if (this.rotateKey()) {
                            attempts++;
                            continue; // Пробуем следующий ключ
                        }
                    }
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();
                
                if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                    aiResponse = data.candidates[0].content.parts[0].text;
                    success = true;
                } else {
                    throw new Error('Пустой ответ от Google');
                }

            } catch (e) {
                console.error("Ошибка запроса:", e);
                if (attempts < maxAttempts - 1) {
                    this.rotateKey();
                    attempts++;
                    await new Promise(r => setTimeout(r, 1000)); // Пауза 1 сек
                } else {
                    break;
                }
            }
        }
        
        // Удаляем "думаю"
        if (thinkingMsgId && window.removeMessageFromChat) {
            window.removeMessageFromChat(thinkingMsgId);
        }
        
        if (success) {
            if (window.addMessageToChat) window.addMessageToChat(aiResponse, 'ai');
            this.generateRecommendationsFromAI(aiResponse);
        } else {
            // Фаллбэк (Локальный ИИ), если Google не ответил
            console.log("⚠️ Google не ответил, использую локальный режим");
            this.fallbackLocalAI(userInput);
        }
    }

    // ==================== РЕКОМЕНДАЦИИ И УТИЛИТЫ ====================
    async generateRecommendationsFromAI(aiText) {
        const keywords = this.extractKeywords(aiText);
        const recommendations = this.findMatches(keywords);
        this.updateRecommendationsUI(recommendations);
        return recommendations;
    }

    findMatches(keywords) {
        return this.musicDB
            .map(song => {
                let score = 0;
                const songText = `${song.title} ${song.artist} ${song.genre} ${song.mood} ${song.features.join(' ')} ${song.description}`.toLowerCase();
                keywords.forEach(keyword => {
                    if (songText.includes(keyword.toLowerCase())) score += 10;
                    if (song.title.toLowerCase().includes(keyword)) score += 20;
                    if (song.artist.toLowerCase().includes(keyword)) score += 15;
                });
                return { ...song, score };
            })
            .filter(song => song.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8);
    }

    extractKeywords(text) {
        const stopWords = ['и', 'или', 'но', 'а', 'в', 'на', 'с', 'по', 'для', 'что', 'как', 'догадка', 'почему', 'альтернативы', 'мой', 'вариант', 'результат'];
        return text
            .toLowerCase()
            .replace(/[^\w\sа-яё]/gi, ' ')
            .split(/\s+/)
            .filter(word => word.length > 3 && !stopWords.includes(word))
            .slice(0, 15);
    }

    fallbackLocalAI(userInput) {
        const responses = {
            search: `🔍 По запросу "${userInput}" нашел:\n\n` + 
                    this.getRandomSongs(3).map(s => `🎵 ${s.title} - ${s.artist}`).join('\n'),
            mood: `🎭 Подбираю музыку под настроение...\n\n` +
                  this.getMoodSongs(userInput).map(s => `❤️ ${s.title}`).join('\n'),
            lyrics: `📝 Ищу по тексту...\n\nПопробуйте точнее вспомнить строчки.`,
            default: `🎶 Музыкальный помощник на связи! (Интернет нестабилен, работаю локально)`
        };
        
        let response = responses.default;
        if (userInput.includes('найди') || userInput.includes('поиск')) response = responses.search;
        else if (userInput.includes('настроен') || userInput.includes('эмоц')) response = responses.mood;
        else if (userInput.includes('текст')) response = responses.lyrics;
        
        if (window.addMessageToChat) window.addMessageToChat(response, 'ai');
    }

    getRandomSongs(count) {
        return [...this.musicDB].sort(() => Math.random() - 0.5).slice(0, count);
    }

    getMoodSongs(moodText) {
        const moodMap = {
            'груст': ['меланхоличное', 'эмоциональное'],
            'весел': ['энергичное', 'радостное'],
            'роман': ['романтическое', 'чувственное'],
            'энерг': ['мощное', 'драйвовое'],
            'споко': ['расслабленное', 'умиротворенное']
        };
        let targetMoods = ['энергичное'];
        for (const [key, moods] of Object.entries(moodMap)) {
            if (moodText.includes(key)) {
                targetMoods = moods;
                break;
            }
        }
        return this.musicDB.filter(song => targetMoods.some(mood => song.mood.includes(mood))).slice(0, 5);
    }

    updateRecommendationsUI(songs) {
        const container = document.getElementById('recommendationsGrid');
        if (!container) return;
        
        container.innerHTML = songs.map(song => `
            <div class="song-card">
                <div class="song-header">
                    <div class="song-avatar" style="background: linear-gradient(135deg, #${(song.id || 1).toString(16).padEnd(6,'0')}, #${((song.id || 1)*2).toString(16).padEnd(6,'0')})">
                        <i class="fas fa-music"></i>
                    </div>
                    <div class="song-info">
                        <h3>${song.title}</h3>
                        <p>${song.artist}</p>
                    </div>
                </div>
                <div style="color: var(--gray); margin-bottom: 15px;">
                    ${song.genre} • ${song.year} • ${song.bpm} BPM
                </div>
                <div class="song-features">
                    ${song.features.slice(0,3).map(f => `<span class="feature-tag">${f}</span>`).join('')}
                </div>
                <div class="neural-match">
                    <div class="match-score">${Math.min(95, 70 + Math.random()*25).toFixed(0)}%</div>
                    <button class="feature-tag" onclick="aiCore.playPreview('${song.title}')">
                        <i class="fas fa-play"></i> Слушать
                    </button>
                </div>
            </div>
        `).join('');
    }

    processQuery(text) { return this.processWithOpenRouter(text, 'text'); }
    voiceSearch() { return this.startVoiceInput(); }
    playPreview(songTitle) { alert(`🎧 Играет: ${songTitle}`); }
}

window.MusicAICore = MusicAICore;
if (!window.aiCore) {
    window.aiCore = new MusicAICore();
}
