/**
 * Pretty print ranked commentators with scoring breakdown.
 * @param {Object[]} rankedList
 * @param {number} topN
 */
function printRankedCommentators(rankedList, topN = null) {
    if (topN) {
        rankedList = rankedList.slice(0, topN);
    }

    const output = [];
    output.push('\n' + '='.repeat(140));
    output.push('COMMENTATORS RANKED BY HYBRID FAME SCORE');
    output.push('='.repeat(140));
    output.push(
        `${'Rank'.padEnd(6)} ${'Commentator'.padEnd(25)} ${'Tier'.padEnd(8)} ${'Refs'.padEnd(6)} ` +
        `${'SCS'.padEnd(10)} ${'Tier×SCS'.padEnd(12)} ${'log(Refs)'.padEnd(12)} ${'TOTAL RANK'.padEnd(14)}`
    );
    output.push('-'.repeat(140));

    rankedList.forEach((comm, idx) => {
        const tierStr = typeof comm.tier === 'number' ? comm.tier.toFixed(1) : String(comm.tier);
        output.push(
            `${String(idx + 1).padEnd(6)} ${comm.commentator.padEnd(25)} ${tierStr.padEnd(8)} ` +
            `${String(comm.local_pop).padEnd(6)} ${comm.sefaria_score.toFixed(3).padEnd(10)} ` +
            `${comm.tier_component.toFixed(3).padEnd(12)} ${comm.local_component.toFixed(3).padEnd(12)} ` +
            `${comm.commentator_rank.toFixed(3).padEnd(14)}`
        );
    });

    console.log(output.join('\n'));
    return output.join('\n');
}

/**
 * Display commentator summary.
 * @param {Object[]} commentaries
 */
function printCommentatorSummary(commentaries) {
    const summary = getCommentatorSummary(commentaries);
    const output = [];
    output.push('\n' + '='.repeat(60));
    output.push('COMMENTATOR SUMMARY');
    output.push('='.repeat(60));
    summary.forEach(([name, count]) => {
        output.push(`${name}: ${count} references`);
    });
    console.log(output.join('\n'));
    return output.join('\n');
}
