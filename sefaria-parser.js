// function extractCommentaries(links, sourceRef) {
//     const commentariesByTitle = {};

//     console.log("Parser: Received links", links.length);

//     for (const link of links) {
//         // DEBUG: Log the first link to see its structure
//         // if (Object.keys(commentariesByTitle).length === 0) {
//         //     console.log("Parser: First link sample:", link);
//         // }

//         // RELAXED CHECK: Accept anything that has refs, don't strictly enforce type === 'commentary' for now
//         // if (!link.refs || link.refs.length < 2) {
//         //     console.log("Parser: Skipping link (no refs)", link);
//         //     continue; 
//         // }

//         // Logic to find the commentary ref
//         let commentaryRef = null;
//         if (link.refs[0] === sourceRef) {
//             commentaryRef = link.refs[1];
//         } else if (link.refs[1] === sourceRef) {
//             commentaryRef = link.refs[0];
//         } else {
//             // Fallback: Assume the second one is the commentary if source doesn't match perfectly
//             commentaryRef = link.refs[1];
//         }

//         // Get the name
//         const collectiveTitle = link.collectiveTitle?.en || link.index_title || 'Unknown';

//         if (!commentariesByTitle[collectiveTitle]) {
//             commentariesByTitle[collectiveTitle] = {
//                 refs: [],
//                 index_title: link.index_title || 'Unknown'
//             };
//         }

//         commentariesByTitle[collectiveTitle].refs.push(commentaryRef);
//     }

//     // ... (rest of the function: map to array, count, return) ...
//     const result = [];
//     for (const collectiveTitle of Object.keys(commentariesByTitle).sort()) {
//         const data = commentariesByTitle[collectiveTitle];
//         result.push({
//             collectiveTitle: collectiveTitle,
//             index_title: data.index_title,
//             refs: data.refs,
//             count: data.refs.length
//         });
//     }
//     console.log("Parser: Extracted commentaries", result.length, result);
//     return result;
// }

// sefaria-parser.js

function extractCommentaries(links, sourceRef) {
    const commentariesByTitle = {};

    for (const link of links) {
        if (!link) continue;
        
        let commentaryRef = null;
        if (link.sourceRef) {
            commentaryRef = link.sourceRef;
        } else if (link.refs && link.refs.length === 2) {
            console.log("There are n=2 commentar refs here, for some reason... we'll continue momentarily")
             // ... (fallback logic)
        }

        let title = link.collectiveTitle?.en || link.index_title || 'Unknown';
        
        // NEW: Check if Sefaria says this source has English
        const hasEn = link.sourceHasEn || false; 

        if (!commentaryRef) continue;

        if (!commentariesByTitle[title]) {
            commentariesByTitle[title] = {
                refs: [],
                index_title: link.index_title || 'Unknown',
                hasEn: hasEn // Store this flag
            };
        }
        
        // Update hasEn to true if ANY link has English
        if (hasEn) commentariesByTitle[title].hasEn = true;
        
        commentariesByTitle[title].refs.push(commentaryRef);
    }

    // Convert to array
    const result = [];
    for (const title of Object.keys(commentariesByTitle).sort()) {
        const data = commentariesByTitle[title];
        result.push({
            collectiveTitle: title,
            index_title: data.index_title,
            refs: data.refs,
            count: data.refs.length
        });
    }
    return result;
}

// ... keep extractAllTopics and parseSefariaData the same ...



/**
 * Extract all topics from all top-level sections.
 * @param {Object} data
 * @returns {Object}
 */
function extractAllTopics(data) {
    const topicsByText = {};
    const topicsBySlug = {};
    const sectionsWithTopics = ['links', 'sheets', 'notes', 'webpages', 'topics', 'manuscripts', 'media'];

    for (const sectionName of sectionsWithTopics) {
        const items = data[sectionName];

        if (!Array.isArray(items)) continue;

        for (const item of items) {
            const topicsList = item.topics;

            if (!Array.isArray(topicsList)) continue;

            for (const topic of topicsList) {
                const enText = (topic.en || '').toLowerCase();
                const slug = (topic.slug || '').toLowerCase();

                if (enText) {
                    if (!topicsByText[enText]) topicsByText[enText] = [];
                    topicsByText[enText].push(sectionName);
                }

                if (slug) {
                    if (!topicsBySlug[slug]) topicsBySlug[slug] = [];
                    topicsBySlug[slug].push(sectionName);
                }
            }
        }
    }

    return {
        by_text: topicsByText,
        by_slug: topicsBySlug
    };
}

/**
 * Calculate TF/IDF scores for topics.
 * @param {Object} topicData
 * @returns {Object}
 */
function calculateTopicStats(topicData) {
    const topicsByText = topicData.by_text;
    const topicsBySlug = topicData.by_slug;

    const textStats = [];
    for (const [topicText, sources] of Object.entries(topicsByText)) {
        const df = new Set(sources).size;
        const tf = sources.length;
        textStats.push({
            topic: topicText,
            type: 'text',
            tf: tf,
            df: df,
            tf_idf: tf * Math.log(1 + df)
        });
    }

    const slugStats = [];
    for (const [topicSlug, sources] of Object.entries(topicsBySlug)) {
        const df = new Set(sources).size;
        const tf = sources.length;
        slugStats.push({
            topic: topicSlug,
            type: 'slug',
            tf: tf,
            df: df,
            tf_idf: tf * Math.log(1 + df)
        });
    }

    textStats.sort((a, b) => b.tf_idf - a.tf_idf);
    slugStats.sort((a, b) => b.tf_idf - a.tf_idf);

    return {
        by_text: textStats,
        by_slug: slugStats
    };
}

/**
 * Get list of commentators and their counts.
 * @param {Object[]} commentaries
 * @returns {Array[]}
 */
function getCommentatorSummary(commentaries) {
    return commentaries.map(comm => [comm.collectiveTitle, comm.count]);
}

// UPDATE: Pass sourceRef to the extraction function
export function parseSefariaData(data, sourceRef) {
    const commentaries = extractCommentaries(data.links || [], sourceRef);
    const allTopicsByText = extractAllTopics(data);
    const topicStats = calculateTopicStats(allTopicsByText);

    return {
        commentaries,
        topicStats
    };
}
