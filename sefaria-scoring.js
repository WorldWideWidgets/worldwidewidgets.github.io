// sefaria-scoring.js

export class SefariaScoringEngine {
    // CHANGE: Use the Index API for metadata/scores, not the Texts API
    static SEFARIA_INDEX_BASE = "https://www.sefaria.org/api/index";
    static CACHE = {};

    static async getCombinedScore(indexTitle) {
        if (indexTitle in this.CACHE) {
            return this.CACHE[indexTitle];
        }

        try {
            // CHANGE: Endpoint is now /api/index/{title}
            const url = `${this.SEFARIA_INDEX_BASE}/${encodeURIComponent(indexTitle)}`;
            
            const response = await fetch(url);

            if (!response.ok) {
                // If index not found, score 0
                this.CACHE[indexTitle] = 0;
                return 0;
            }

            const data = await response.json();
            
            // CHANGE: combined_score might be directly on the index object, 
            // or inside a 'stats' property depending on Sefaria version.
            // We default to 0 if missing.
            const score = data.combined_score || data.stats?.combined_score || 0;
            
            this.CACHE[indexTitle] = score;
            return score;
        } catch (error) {
            console.error(`Error fetching score for ${indexTitle}:`, error);
            this.CACHE[indexTitle] = 0;
            return 0;
        }
    }

    static async getScoresBatch(indexTitles) {
        const results = {};
        // Note: Batch processing is sequential to avoid rate limits. 
        // Could be optimized with Promise.all if needed.
        for (const title of indexTitles) {
            results[title] = await this.getCombinedScore(title);
        }
        return results;
    }

    static clearCache() {
        this.CACHE = {};
    }

    /**
     * Fetch scores for multiple index titles.
     * @param {string[]} indexTitles
     * @returns {Promise<Object>}
     */
    static async getScoresBatch(indexTitles) {
        const results = {};
        for (const title of indexTitles) {
            results[title] = await this.getCombinedScore(title);
        }
        return results;
    }

    /**
     * Clear the cache.
     */
    static clearCache() {
        this.CACHE = {};
    }
}
