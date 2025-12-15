// api/musicbrainz.js - доступ к реальной базе музыки
class MusicBrainzAPI {
    constructor() {
        this.baseUrl = 'https://musicbrainz.org/ws/2/';
        this.userAgent = 'MusicAIAssistant/1.0 (your-email@example.com)';
    }

    async searchArtist(name) {
        try {
            const response = await fetch(
                `${this.baseUrl}artist?query=${encodeURIComponent(name)}&fmt=json&limit=5`,
                {
                    headers: { 'User-Agent': this.userAgent }
                }
            );
            return await response.json();
        } catch (error) {
            console.error('MusicBrainz error:', error);
            return null;
        }
    }

    async searchRecording(title, artist = '') {
        try {
            const query = artist ? 
                `recording:${title} AND artist:${artist}` : 
                `recording:${title}`;
                
            const response = await fetch(
                `${this.baseUrl}recording?query=${encodeURIComponent(query)}&fmt=json&limit=10`,
                {
                    headers: { 'User-Agent': this.userAgent }
                }
            );
            return await response.json();
        } catch (error) {
            console.error('MusicBrainz error:', error);
            return null;
        }
    }

    async getArtistReleases(artistId) {
        try {
            const response = await fetch(
                `${this.baseUrl}release?artist=${artistId}&fmt=json&limit=20`,
                {
                    headers: { 'User-Agent': this.userAgent }
                }
            );
            return await response.json();
        } catch (error) {
            console.error('MusicBrainz error:', error);
            return null;
        }
    }
}

// Вспомогательные функции
class MusicSearch {
    constructor() {
        this.mb = new MusicBrainzAPI();
    }

    async searchByDescription(description) {
        // Пытаемся найти по ключевым словам
        const keywords = this.extractKeywords(description);
        let results = [];
        
        for (const keyword of keywords.slice(0, 3)) {
            const data = await this.mb.searchRecording(keyword);
            if (data && data.recordings) {
                results = [...results, ...data.recordings];
            }
        }
        
        // Убираем дубликаты
        const uniqueResults = this.removeDuplicates(results);
        return uniqueResults.slice(0, 10);
    }

    extractKeywords(text) {
        // Простая экстракция ключевых слов
        return text.toLowerCase()
            .replace(/[^\w\sа-яА-Я]/g, ' ')
            .split(' ')
            .filter(word => word.length > 2);
    }

    removeDuplicates(recordings) {
        const seen = new Set();
        return recordings.filter(rec => {
            const key = `${rec.title}-${rec['artist-credit']?.[0]?.name || ''}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    formatRecording(rec) {
        return {
            title: rec.title,
            artist: rec['artist-credit']?.[0]?.name || 'Неизвестен',
            year: rec['first-release-date']?.split('-')[0] || 'Неизвестен',
            id: rec.id,
            score: rec.score || 0
        };
    }
}

window.MusicBrainzAPI = MusicBrainzAPI;
window.MusicSearch = MusicSearch;