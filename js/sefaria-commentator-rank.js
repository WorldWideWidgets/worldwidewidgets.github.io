// sefaria-commentator-rank.js

import { FAME_TIER, DEFAULT_UNKNOWN_TIER } from './sefaria-constants.js';
import { SefariaScoringEngine } from './sefaria-scoring.js';

export class CommentatorRankingEngine {
    constructor() {
        this.fameTier = FAME_TIER;
        this.defaultUnknownTier = DEFAULT_UNKNOWN_TIER;
        this.sefariaEngine = SefariaScoringEngine;
    }

    getTierMultiplier(tierScore) {
        return 6 - tierScore;
    }

    // FIX: Fuzzy match names (e.g. "Rashi on Genesis" matches "Rashi")
    getCommentatorTier(commentatorName) {
        // 1. Try Exact Match
        if (this.fameTier[commentatorName]) {
            return this.fameTier[commentatorName];
        }

        // 2. Try Substring Match
        for (const name in this.fameTier) {
            // If "Rashi" is found inside "Rashi on Genesis", use Rashi's tier
            if (commentatorName.includes(name)) {
                return this.fameTier[name];
            }
        }

        // 3. Default
        return this.defaultUnknownTier;
    }

    calculateRank(commentatorName, indexTitle, localPop, sefariaScore = null, hasEn = false) {
        const tierNum = this.getCommentatorTier(commentatorName);
        const tierMultiplier = this.getTierMultiplier(tierNum);

        const sefScore = sefariaScore ?? 0;

        // SCORING FIX:
        // If Sefaria Score is missing (0), we TRUST the Tier Multiplier as the main score.
        // We give it a weight of 100. So Tier 1 = 500pts, Tier 5 = 100pts.
        // This ensures Famous commentators always win, regardless of local comment count.
        const tierComponent = tierMultiplier * (sefScore > 0 ? sefScore : 100);
        
        const localComponent = Math.log(localPop + 1);
        
        // English Bonus (50pts)
        const enBonus = hasEn ? 50 : 0;

        const commentatorRank = tierComponent + localComponent + enBonus;

        return {
            commentator: commentatorName,
            index_title: indexTitle,
            local_pop: localPop,
            tier: tierNum,
            tier_multiplier: tierMultiplier,
            sefaria_score: sefScore,
            tier_component: tierComponent,
            local_component: localComponent,
            hasEn: hasEn,
            en_bonus: enBonus,
            commentator_rank: commentatorRank
        };
    }

    async rankCommentaries(commentaries, fetchSefariaScores = true) {
        let sefariaScores = {};

        // We still try to fetch scores, but the fix above handles the case when they are 0
        if (fetchSefariaScores) {
            const indexTitles = commentaries.map(c => c.index_title);
            sefariaScores = await this.sefariaEngine.getScoresBatch(indexTitles);
        }

        const ranked = [];
        for (const comm of commentaries) {
            const rankData = this.calculateRank(
                comm.collectiveTitle,
                comm.index_title,
                comm.count,
                sefariaScores[comm.index_title],
                comm.hasEn
            );
            rankData.refs = comm.refs;
            ranked.push(rankData);
        }

        ranked.sort((a, b) => b.commentator_rank - a.commentator_rank);

        // DEBUG LOG
        console.log("=== RANKING RESULTS (Top 5) ===");
        ranked.slice(0, 5).forEach(r => {
            console.log(`${r.commentator} (Tier: ${r.tier})`);
            console.log(`   Score: ${r.commentator_rank.toFixed(2)} (TierBonus: ${r.tier_component.toFixed(2)}, Local: ${r.local_component.toFixed(2)}, EnBonus: ${r.en_bonus})`);
        });

        return ranked;
    }
}
