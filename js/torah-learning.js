import { loadComponent, initLeafletMap, typeWriter, sleep } from './services.js';
import { 
    fetchHebcal,
    fetchParshaAliyot,      // Keep in case of fallback 
    fetchSefariaText, 
    fetchSefariaLinks,      // REQUIRED for Commentary Ranking
    fetchCommentaryText,    // REQUIRED for Commentary Reader
    fetchSefariaCalendar,   // NEW
    fetchAliyahText         // NEW
} from './api-service.js';

// IMPORTING RANKING ENGINE
import { parseSefariaData } from './sefaria-parser.js';
import { CommentatorRankingEngine } from './sefaria-commentator-rank.js';

// 1. STATE
// At the top of torah-learning.js
let appState = { 
    name: '', 
    lat: null, 
    lng: null, 
    parsha: '', 
    candleLighting: '',
    aliyotList: [],      // NEW: Store the list of refs
    currentAliyahIndex: 0 // NEW: Track current position
};

// 2. UI RENDERING including BiLingaual stuff
function renderCommentarySuggestion(topCommentator) {
    const suggestionBox = document.getElementById('commentary-suggestion');
    if (!suggestionBox) return;

    suggestionBox.innerHTML = `
        <div class="context-box" style="border-left: 4px solid var(--brand-green); margin-top: 20px;">
            <p class="noir-body">
                <strong>Cooperative Suggestion:</strong> Our ranking algorithm identifies 
                <span class="accent-green">${topCommentator.commentator}</span> (Score: ${topCommentator.commentator_rank.toFixed(2)}) 
                as the most significant commentator for this portion.
            </p>
            <p class="noir-body">Would you like to study ${topCommentator.commentator}'s commentary now?</p>
            <button id="btn-accept-commentary" class="btn-send" style="margin-top: 10px;">
                Yes, show me ${topCommentator.commentator}
            </button>
        </div>
    `;
    suggestionBox.classList.remove('hidden');
}

// 1. HELPER: Flattens nested arrays from Sefaria
function flattenText(arr) {
    return arr.flat(Infinity).filter(t => typeof t === 'string' && t.length > 0);
}

// 2. HELPER: Renders Hebrew and Language text in aligned rows
function renderBilingualText(hebrew, langText, langCode = 'en') {
    // Handle missing inputs safely
    if (!hebrew && !langText) return '<div class="noir-body">No text available.</div>';

    // Flatten inputs to arrays of strings
    const heLines = hebrew ? (Array.isArray(hebrew) ? flattenText(hebrew) : [String(hebrew)]) : [];
    const langLines = langText ? (Array.isArray(langText) ? flattenText(langText) : [String(langText)]) : [];

    // CASE A: Only Hebrew exists
    if (langLines.length === 0) {
        const text = heLines.join(' ');
        return `
            <div style="direction: rtl; text-align: right; font-family: 'Times New Roman', serif; font-size: 1.1em; padding: 10px;">
                ${text}
            </div>
        `;
    }

    // CASE B: Both exist - Create Aligned Rows
    let html = '';
    const maxLen = Math.max(heLines.length, langLines.length);

    for (let i = 0; i < maxLen; i++) {
        const heContent = heLines[i] || '';
        const langContent = langLines[i] || '';

        html += `
            <div class="text-row" style="display: flex; flex-direction: row-reverse; gap: 15px; margin-bottom: 12px; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px;">
                <div class="text-he" style="flex: 1; direction: rtl; text-align: right; font-family: 'Times New Roman', serif; font-size: 1.1em;">
                    ${heContent}
                </div>
                <div class="text-lang" style="flex: 1; direction: ltr; text-align: left; font-size: 0.95em; color: #333;">
                    ${langContent}
                </div>
            </div>
        `;
    }

    return html;
}

// 3. MAIN FUNCTION: Loads and displays the commentary
async function loadCommentaryReader(ref) {
    const reader = document.getElementById('commentary-reader');
    if (!reader) return;

    reader.innerHTML = `<div class="noir-body">Loading ${ref}...</div>`;
    reader.classList.remove('hidden');

    const data = await fetchCommentaryText(ref);
    
    if (!data) {
        reader.innerHTML = `<div class="noir-body error">Could not load commentary for ${ref}.</div>`;
        return;
    }

    // Render Content
    const contentHtml = renderResponsiveText(data.he, data.text);

    // Get Name: Try indexTitle (e.g., "Rashi"), fallback to collectiveTitle, then to the full title
    const commentatorName = data.indexTitle || data.collectiveTitle?.en || data.collectiveTitle || "Commentary";

    reader.innerHTML = `
        <div class="view-side" style="margin-top: 20px; border: 1px solid var(--border);">
            <h4 class="noir-subtitle">${commentatorName}</h4>
            <div class="chat-mini" style="height: 300px; overflow-y: auto; background: #fff;">
                ${contentHtml}
            </div>
            
            <div class="map-controls" style="margin-top: 10px; border: none; background: transparent;">
                <button id="btn-prev" class="btn-send" ${!data.prev ? 'disabled style="opacity:0.5"' : ''}>← Prev</button>
                <span class="noir-body" style="font-size: 0.8rem;">${data.ref}</span>
                <button id="btn-next" class="btn-send" ${!data.next ? 'disabled style="opacity:0.5"' : ''}>Next →</button>
            </div>
        </div>
    `;

    // Navigation Listeners
    document.getElementById('btn-prev')?.addEventListener('click', () => {
        if (data.prev) loadCommentaryReader(data.prev);
    });
    document.getElementById('btn-next')?.addEventListener('click', () => {
        if (data.next) loadCommentaryReader(data.next);
    });
}



// 3. STAGE TRANSITIONS
async function transitionToMap() {
    const nameInput = document.getElementById('user-name');
    if (!nameInput.value.trim()) return alert("Please enter your name.");
    
    appState.name = nameInput.value.trim();
    
    document.getElementById('stage-welcome').classList.add('hidden');
    document.getElementById('stage-location').classList.remove('hidden');

    initLeafletMap('map-container', (coords) => {
        appState.lat = coords.lat;
        appState.lng = coords.lng;
        document.getElementById('coord-display').innerHTML = 
            `<span class="accent-green">TRUTH:</span> ${coords.lat.toFixed(4)} | ${coords.lng.toFixed(4)}`;
    });
}

/**
 * Builds HTML for Stacked Hebrew/English verses.
 * @param {Array} hebrewVerses - Array of Hebrew strings
 * @param {Array} englishVerses - Array of English strings
 * @returns {string} - HTML string
 */
function buildStackedText(hebrewVerses, englishVerses) {
    // Safety check: ensure we have arrays
    const heArr = hebrewVerses || [];
    const enArr = englishVerses || [];
    
    // Determine max length to avoid undefined errors
    const maxLen = Math.max(heArr.length, enArr.length);
    let html = '';

    for (let i = 0; i < maxLen; i++) {
        const heText = heArr[i] || '';
        const enText = enArr[i] || '';

        // Only create a unit if we have content
        if (!heText && !enText) continue;

        html += `
            <div class="verse-unit">
                <div class="hebrew-line">${heText}</div>
                <div class="english-line">${enText}</div>
            </div>
        `;
    }

    return html;
}

// async function loadAliyahByIndex(index) {
//     if (index < 0 || index >= appState.aliyotList.length) return;

//     const ref = appState.aliyotList[index];
//     appState.currentAliyahIndex = index;

//     const reader = document.getElementById('parsha-reader');
//     if (!reader) return;
//     reader.innerHTML = `<div class="noir-body">Loading ${ref}...</div>`;
//     reader.classList.remove('hidden');

//     // Use the NEW fetcher
//     const data = await fetchAliyahText(ref);
    
//     if (!data || (!data.he && !data.en)) {
//         reader.innerHTML = `<div class="noir-body error">Could not load text for ${ref}.</div>`;
//         return;
//     }

//     const contentHtml = renderResponsiveText(data.he, data.en);
    
//     // Title Logic: "Parsha Name: Aliyah 1 (Ref)"
//     const aliyahLabel = index < 7 ? `Aliyah ${index + 1}` : (index === 7 ? "Maftir" : "Haftarah");
//     // Use the parsha name we got from Calendar API
//     const title = `${appState.parshaName || 'Parsha'}: ${aliyahLabel} (${data.ref})`;

//     const hasPrev = index > 0;
//     const hasNext = index < appState.aliyotList.length - 1;

//     reader.innerHTML = `
//         <div class="view-side" style="margin-top: 20px; border: 1px solid var(--border);">
//             <h4 class="noir-subtitle">${title}</h4>
//             <div class="chat-mini" style="height: 300px; overflow-y: auto; background: #fff;">
//                 ${contentHtml}
//             </div>
            
//             <div class="map-controls" style="margin-top: 10px; border: none; background: transparent;">
//                 <button id="btn-prev-aliyah" class="btn-send" ${!hasPrev ? 'disabled style="opacity:0.5"' : ''}>← Prev</button>
//                 <span class="noir-body" style="font-size: 0.8rem;">Section ${index + 1} of ${appState.aliyotList.length}</span>
//                 <button id="btn-next-aliyah" class="btn-send" ${!hasNext ? 'disabled style="opacity:0.5"' : ''}>Next →</button>
//             </div>
//         </div>
//     `;

//     // Navigation Listeners
//     document.getElementById('btn-prev-aliyah')?.addEventListener('click', () => loadAliyahByIndex(index - 1));
//     document.getElementById('btn-next-aliyah')?.addEventListener('click', () => loadAliyahByIndex(index + 1));
// }

async function loadAliyahByIndex(index) {
    if (index < 0 || index >= appState.aliyotList.length) return;

    const ref = appState.aliyotList[index];
    appState.currentAliyahIndex = index;

    const reader = document.getElementById('parsha-reader');
    if (!reader) return;
    reader.innerHTML = `<div class="noir-body">Loading ${ref}...</div>`;
    reader.classList.remove('hidden');

    // Use the NEW fetcher
    const data = await fetchAliyahText(ref);
    
    if (!data || (!data.he && !data.en)) {
        reader.innerHTML = `<div class="noir-body error">Could not load text for ${ref}.</div>`;
        return;
    }

    const contentHtml = renderResponsiveText(data.he, data.en);
    
    // Title Logic: "Parsha Name: Aliyah 1 (Ref)"
    const aliyahLabel = index < 7 ? `Aliyah ${index + 1}` : (index === 7 ? "Maftir" : "Haftarah");
    // Use the parsha name we got from Calendar API
    const title = `${appState.parshaName || 'Parsha'}: ${aliyahLabel} (${data.ref})`;

    const hasPrev = index > 0;
    const hasNext = index < appState.aliyotList.length - 1;

    reader.innerHTML = `
        <div class="view-side" style="margin-top: 20px; border: 1px solid var(--border);">
            <h4 class="noir-subtitle">${title}</h4>
            <div class="chat-mini" style="height: 300px; overflow-y: auto; background: #fff;">
                ${contentHtml}
            </div>
            
            <div class="map-controls" style="margin-top: 10px; border: none; background: transparent;">
                <button id="btn-prev-aliyah" class="btn-send" ${!hasPrev ? 'disabled style="opacity:0.5"' : ''}>← Prev</button>
                <span class="noir-body" style="font-size: 0.8rem;">Section ${index + 1} of ${appState.aliyotList.length}</span>
                <button id="btn-next-aliyah" class="btn-send" ${!hasNext ? 'disabled style="opacity:0.5"' : ''}>Next →</button>
            </div>
        </div>
    `;

    // Navigation Listeners
    document.getElementById('btn-prev-aliyah')?.addEventListener('click', () => loadAliyahByIndex(index - 1));
    document.getElementById('btn-next-aliyah')?.addEventListener('click', () => loadAliyahByIndex(index + 1));
}


// async function loadAliyahByIndex(index) {
//     if (index < 0 || index >= appState.aliyotList.length) return;

//     const ref = appState.aliyotList[index];
//     appState.currentAliyahIndex = index;

//     const reader = document.getElementById('parsha-reader');
//     if (!reader) return;
//     reader.innerHTML = `<div class="noir-body">Loading ${ref}...</div>`;
//     reader.classList.remove('hidden');

//     const data = await fetchSefariaText(ref);
//     if (!data) {
//         reader.innerHTML = `<div class="noir-body error">Could not load text.</div>`;
//         return;
//     }

//     const contentHtml = renderResponsiveText(data.he, data.en);
    
//     // Create Title: "Ki Tisa: Aliyah 1 (Exodus 30:11)"
//     const aliyahLabel = index < 7 ? `Aliyah ${index + 1}` : (index === 7 ? "Maftir" : "Haftarah");
//     const title = `${appState.parsha}: ${aliyahLabel} (${data.ref})`;

//     // Determine Button States
//     const hasPrev = index > 0;
//     const hasNext = index < appState.aliyotList.length - 1;

//     reader.innerHTML = `
//         <div class="view-side" style="margin-top: 20px; border: 1px solid var(--border);">
//             <h4 class="noir-subtitle">${title}</h4>
//             <div class="chat-mini" style="height: 300px; overflow-y: auto; background: #fff;">
//                 ${contentHtml}
//             </div>
            
//             <div class="map-controls" style="margin-top: 10px; border: none; background: transparent;">
//                 <button id="btn-prev-aliyah" class="btn-send" ${!hasPrev ? 'disabled style="opacity:0.5"' : ''}>← Prev</button>
//                 <span class="noir-body" style="font-size: 0.8rem;">Section ${index + 1} of ${appState.aliyotList.length}</span>
//                 <button id="btn-next-aliyah" class="btn-send" ${!hasNext ? 'disabled style="opacity:0.5"' : ''}>Next →</button>
//             </div>
//         </div>
//     `;

//     // Navigation Listeners
//     document.getElementById('btn-prev-aliyah')?.addEventListener('click', () => {
//         loadAliyahByIndex(index - 1);
//     });

//     document.getElementById('btn-next-aliyah')?.addEventListener('click', () => {
//         loadAliyahByIndex(index + 1);
//     });
// }


// torah-learning.js

// Helper to get date from Hebcal (which returns ISO strings)
function parseHebcalDate(hebcalData) {
    // Find the item with category 'parashat' to get the date
    // Hebcal returns items for candlelighting, parsha, etc.
    // We usually process the parsha item.
    // Or we can just use the current date if close to Shabbat, but Hebcal date is safer.
    
    // Alternative: Hebcal usually gives us the date in the items list or we use today's date.
    // For simplicity, let's assume we use the current date to query Sefaria Calendar 
    // OR we extract it from the Parsha item if available.
    // A simple approximation for the demo: Use current date or extract from Hebcal.
    
    // Let's use the current date for the Sefaria Calendar query if Hebcal doesn't explicitly give the "Shabbat Date".
    const d = new Date();
    return {
        year: d.getFullYear(),
        month: d.getMonth() + 1, // JS months are 0-indexed
        day: d.getDate()
    };
}

async function transitionToContext() {
    if (!appState.lat) return alert("Please drop a pin on the map.");

    const hebcalData = await fetchHebcal(appState.lat, appState.lng);
    if (!hebcalData) return alert("API Error. Could not fetch times.");

    // Update State
    appState.parsha = hebcalData.parsha; // Still useful for title

    document.getElementById('stage-location').classList.add('hidden');
    const contextStage = document.getElementById('stage-context');
    contextStage.classList.remove('hidden');

    document.getElementById('shabbat-context').innerHTML = `
        <p class="noir-body">
            <strong>Location Confirmed.</strong><br>
            Parsha: <span class="accent-green">${appState.parsha}</span><br>
            Candle Lighting: <strong>${hebcalData.candleLighting}</strong>
        </p>
    `;

    // 1. Get Date (Using current date as placeholder logic, ideally we parse Hebcal date)
    const dateObj = parseHebcalDate(hebcalData);

    // 2. Fetch Aliyot List from Sefaria Calendar
    const calendarData = await fetchSefariaCalendar(dateObj.year, dateObj.month, dateObj.day);

    if (calendarData && calendarData.aliyot.length > 0) {
        // Success!
        appState.aliyotList = calendarData.aliyot;
        appState.parshaName = calendarData.parshaName; // Get name from Sefaria (more accurate)
        
        // Load First Aliyah
        appState.currentAliyahIndex = 0;
        loadAliyahByIndex(0);
        
        // Rank Commentary based on first Aliyah
        rankAndSuggestCommentary(appState.aliyotList[0]);
    } else {
        console.error("Could not fetch Aliyot list.");
        // Fallback: Load whole Parsha (Old Method)
        await loadParshaReader(appState.parsha, appState.parsha);
        rankAndSuggestCommentary(appState.parsha);
    }
}


// async function transitionToContext() {
//     if (!appState.lat) return alert("Please drop a pin on the map.");

//     const hebcalData = await fetchHebcal(appState.lat, appState.lng);
//     if (!hebcalData) return alert("API Error. Could not fetch times.");

//     appState.parsha = hebcalData.parsha;

//     document.getElementById('stage-location').classList.add('hidden');
//     const contextStage = document.getElementById('stage-context');
//     contextStage.classList.remove('hidden');

//     document.getElementById('shabbat-context').innerHTML = `
//         <p class="noir-body">
//             <strong>Location Confirmed.</strong><br>
//             Parsha: <span class="accent-green">${appState.parsha}</span><br>
//             Candle Lighting: <strong>${hebcalData.candleLighting}</strong>
//         </p>
//     `;

//     // 1. Try to Fetch Aliyot
//     const aliyotList = await fetchParshaAliyot(appState.parsha);
    
//     let startRef = null;

//     if (aliyotList && aliyotList.length > 0) {
//         // SUCCESS: We have Aliyot
//         appState.aliyotList = aliyotList;
//         appState.currentAliyahIndex = 0;
        
//         // Load First Aliyah
//         loadAliyahByIndex(0);
        
//         // Set startRef for commentary ranking
//         startRef = aliyotList[0];
//     } else {
//         // FALLBACK: Aliyot failed, load whole Parsha
//         console.warn("Aliyot API failed, falling back to full Parsha.");
//         const fullData = await fetchSefariaText(appState.parsha);
        
//         if (fullData && fullData.ref) {
//             loadParshaReader(fullData.ref, appState.parsha);
            
//             // CRITICAL: Extract the first verse from the range (e.g., "Exodus 30:11-34:35" -> "Exodus 30:11")
//             // This prevents the 504 Timeout on the commentary API
//             if (fullData.ref.includes('-')) {
//                 startRef = fullData.ref.split('-')[0].trim();
//             } else {
//                 startRef = fullData.ref; // Single verse
//             }
//         }
//     }

//     // 2. Rank Commentary (ONLY on the startRef to avoid Timeout)
//     if (startRef) {
//         await rankAndSuggestCommentary(startRef);
//     } else {
//         console.error("Could not determine start reference for commentary.");
//     }
// }




function getFirstVerseFromRef(ref) {
    // Regex matches: Book Name, Chapter, StartVerse
    // Example: "Exodus 27:20-30:10" -> matches "Exodus", "27", "20"
    const match = ref.match(/(.+?)\s(\d+):(\d+)/);
    
    if (match) {
        const book = match[1];
        const chapter = match[2];
        const startVerse = match[3];
        return `${book} ${chapter}:${startVerse}`;
    }
    // Fallback if regex fails
    return ref; 
}

async function rankAndSuggestCommentary(parshaRef) {
    console.log("--- Starting Ranking Process ---");
    
    const firstVerseRef = getFirstVerseFromRef(parshaRef);
    console.log("1. Fetching links for:", firstVerseRef);

    const links = await fetchSefariaLinks(firstVerseRef);
    console.log("2. Links found:", links.length);

    if (!links || links.length === 0) {
        console.warn("No links found. Stopping.");
        return;
    };

    const parsed = parseSefariaData({ links }, firstVerseRef);
    const commentaries = parsed.commentaries; 
    console.log("3. Parsed Commentaries:", commentaries.length);

    const engine = new CommentatorRankingEngine();
    const rankedList = await engine.rankCommentaries(commentaries);
    console.log("4. Ranked List:", rankedList.length);

    appState.rankedCommentaries = rankedList;

    if (rankedList.length > 0) {
        const topPick = rankedList[0];
        
        // Build the HTML for the Top 10 List
        let listHtml = '<ul style="list-style: none; padding: 0; margin-top: 10px;">';
        
        // Loop through top 10 (or fewer if not available)
        rankedList.slice(0, 10).forEach((item, index) => {
            const ref = item.refs[0]; // Get the first reference for this commentator
            listHtml += `
                <li style="margin-bottom: 8px; padding: 5px; border-bottom: 1px solid #eee;">
                    <a href="#" class="commentary-link" data-ref="${ref}" style="text-decoration: none; color: var(--brand-green); font-weight: 600; font-size: 1.1em;">
                        ${item.commentator}
                    </a>
                    <span style="display: block; font-size: 0.85em; color: #666; margin-top: 2px;">
                        Score: ${item.commentator_rank.toFixed(2)} | Tier: ${item.tier}
                    </span>
                </li>
            `;
        });
        listHtml += '</ul>';

        // Inject into the suggestion box
        const suggestionBox = document.getElementById('commentary-suggestion');
        suggestionBox.innerHTML = `
            <div class="context-box" style="background: #f9f9f9; border-left: 4px solid var(--brand-green);">
                <p class="noir-body">
                    <strong>Algorithm Suggestion:</strong> Our metrics indicate <span class="accent-green">${topPick.commentator}</span> is the most significant commentator for this section.
                </p>
                <p class="noir-body" style="margin-top: 10px; font-weight: 700;">
                    Top 10 Commentaries:
                </p>
                ${listHtml}
            </div>
        `;
        suggestionBox.classList.remove('hidden');

        // Attach Event Listeners to the new links
        suggestionBox.querySelectorAll('.commentary-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const ref = e.currentTarget.getAttribute('data-ref');
                
                // Load the commentary into the reader
                loadCommentaryReader(ref);
                
                // Optional: Scroll to the reader
                document.getElementById('commentary-reader').scrollIntoView({ behavior: 'smooth' });
            });
        });

    } else {
        console.warn("Ranking list is empty.");
    }
}



/**
 * Generates HTML for Responsive Reader (Side-by-Side on Desktop, Stacked on Mobile)
 */
function renderResponsiveText(hebrewData, englishData) {
    // 1. Flatten arrays to simple lists
    const heVerses = hebrewData ? (Array.isArray(hebrewData) ? hebrewData.flat(Infinity).filter(t => t) : [String(hebrewData)]) : [];
    const enVerses = englishData ? (Array.isArray(englishData) ? englishData.flat(Infinity).filter(t => t) : [String(englishData)]) : [];

    if (heVerses.length === 0 && enVerses.length === 0) {
        return '<div class="noir-body">No text available.</div>';
    }

    let html = '';
    const maxLen = Math.max(heVerses.length, enVerses.length);

    for (let i = 0; i < maxLen; i++) {
        const heContent = heVerses[i] || '';
        const enContent = enVerses[i] || '';

        // Structure: 
        // <div class="verse-row">
        //    <div class="en-col">English Text</div>
        //    <div class="he-col">Hebrew Text</div>
        // </div>
        // <div class="accent-line"></div>
        
        // We only add the line if it's NOT the last verse
        const line = (i < maxLen - 1) ? '<div class="accent-line"></div>' : '';

        html += `
            <div class="verse-row">
                <div class="en-col">${enContent}</div>
                <div class="he-col">${heContent}</div>
            </div>
            ${line}
        `;
    }

    return html;
}


async function loadParshaReader(ref) {
    const reader = document.getElementById('parsha-reader');
    if (!reader) return;

    reader.innerHTML = `<div class="noir-body">Loading...</div>`;
    reader.classList.remove('hidden');

    const data = await fetchSefariaText(ref);
    if (!data) {
        reader.innerHTML = `<div class="noir-body error">Could not load text.</div>`;
        return;
    }

    // Use the new responsive renderer
    const contentHtml = renderResponsiveText(data.he, data.en);

    reader.innerHTML = `
        <div class="view-side" style="margin-top: 20px; border: 1px solid var(--border);">
            <h4 class="noir-subtitle">${data.ref}</h4>
            <div class="chat-mini" style="height: 300px; overflow-y: auto; background: #fff;">
                ${contentHtml}
            </div>
            
            <div class="map-controls" style="margin-top: 10px; border: none; background: transparent;">
                <button id="btn-prev-parsha" class="btn-send" ${!data.prev ? 'disabled style="opacity:0.5"' : ''}>← Prev</button>
                <span class="noir-body" style="font-size: 0.8rem;">Navigate Section</span>
                <button id="btn-next-parsha" class="btn-send" ${!data.next ? 'disabled style="opacity:0.5"' : ''}>Next →</button>
            </div>
        </div>
    `;

    // Attach Navigation
    document.getElementById('btn-prev-parsha')?.addEventListener('click', () => {
        if (data.prev) loadParshaReader(data.prev);
    });
    document.getElementById('btn-next-parsha')?.addEventListener('click', () => {
        if (data.next) loadParshaReader(data.next);
    });
}


// 4. THE DIRECTOR
async function init() {
    await loadComponent('header-site', 'header.html');
    await loadComponent('footer-site', 'footer.html');
    
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    document.getElementById('btn-continue-to-map')?.addEventListener('click', transitionToMap);
    document.getElementById('btn-confirm-location')?.addEventListener('click', transitionToContext);
}

init();
