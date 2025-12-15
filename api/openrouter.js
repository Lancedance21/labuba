// api/openrouter.js - интеграция с OpenRouter AI
class OpenRouterAI {
    constructor(apiKey) {
        this.apiKey = apiKey || loadConfig('openrouter_key');
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'google/gemini-flash-2.5'; // Бесплатная модель
    }

    async chat(message, history = []) {
        if (!this.apiKey) {
            throw new Error('API ключ не установлен. Получите бесплатный на openrouter.ai');
        }

        const messages = [
            {
                role: 'system',
                content: `Ты музыкальный эксперт и ИИ-ассистент. Отвечай на русском.
                Твои задачи:
                1. Помогать с поиском музыки
                2. Объяснять музыкальные термины
                3. Давать рекомендации
                4. Анализировать музыкальные треки
                5. Подбирать плейлисты по настроению
                
                Используй музыкальные эмодзи 🎵🎶🎧🎸🥁
                Будь дружелюбным и информативным.`
            },
            ...history,
            { role: 'user', content: message }
        ];

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'HTTP-Referer': window.location.origin,
                    'X-Title': 'Музыкальный ИИ Помощник'
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    max_tokens: 1000,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenRouter error:', error);
            throw error;
        }
    }

    // Специализированные музыкальные запросы
    async searchMusicByDescription(description) {
        const prompt = `Найди песни по описанию: "${description}"
        Верни JSON массив с объектами:
        [{
            "title": "Название песни",
            "artist": "Исполнитель",
            "genre": "Жанр",
            "year": "Год",
            "reason": "Почему подходит"
        }]`;
        
        return await this.chat(prompt);
    }

    async analyzeSong(song, artist) {
        const prompt = `Проанализируй песню "${song}" исполнителя ${artist}.
        Расскажи о:
        1. Музыкальном стиле и жанре
        2. Особенностях композиции
        3. Лирическом содержании
        4. Историческом контексте
        5. Похожих треках`;
        
        return await this.chat(prompt);
    }
}

// Экспорт
window.OpenRouterAI = OpenRouterAI;