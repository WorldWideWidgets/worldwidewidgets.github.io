import { loadComponent, initLeafletMap, typeWriter, sleep } from './services.js';
import { fetchHebcal, fetchSefariaText, fetchSefariaLinks, fetchCommentaryText } from './api-service.js';

// IMPORTING YOUR RANKING ENGINE
import { parseSefariaData } from './sefaria-parser.js';
import { CommentatorRankingEngine } from './sefaria-commentator-rank.js';

// 1. STATE
let appState = { 
    name: '', 
    lat: null, 
    lng: null, 
    parsha: '', 
    candleLighting: '',
    rankedCommentaries: [] // Store ranking results here
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

    reader.innerHTML = `<div class="noir-body">Loading commentary...</div>`;
    reader.classList.remove('hidden');

    const data = await fetchCommentaryText(ref);
    
    if (!data) {
        reader.innerHTML = `<div class="noir-body error">Could not load commentary.</div>`;
        return;
    }

    // Prepare Texts
    const userLang = 'en'; // Ready for future language selection
    
    // Render using the unified helper
    const contentHtml = renderBilingualText(data.he, data.text, userLang);
    
    // Get Name
    const commentatorName = data.collectiveTitle?.en || data.title || "Commentary";

    // Inject HTML
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

    // Attach Navigation Listeners
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

async function transitionToContext() {
    if (!appState.lat) return alert("Please drop a pin on the map.");

    const hebcalData = await fetchHebcal(appState.lat, appState.lng);
    if (!hebcalData) return alert("API Error. Try again.");

    // Store Parsha name for later
    appState.parsha = hebcalData.parsha;

    // UI Transition
    document.getElementById('stage-location').classList.add('hidden');
    const contextStage = document.getElementById('stage-context');
    contextStage.classList.remove('hidden');

    // 1. Fetch Parsha Text
    const sefariaData = await fetchSefariaText(appState.parsha);

    // Inject Bilingual Parsha Text
    const parshaBox = document.getElementById('parsha-text');
    // Default to 'en', but ready for future languages
    const userLang = 'en'; 
    // Render
    parshaBox.innerHTML = renderBilingualText(sefariaData.he, sefariaData.text, userLang);
    // const parshaBox = document.getElementById('parsha-text');
    
    if (sefariaData) {
        parshaBox.innerHTML = `
            <div class="text-column hebrew-text">${sefariaData.he ? sefariaData.he.join(' ') : 'N/A'}</div>
            <div class="text-column english-text">${sefariaData.en ? sefariaData.en.join(' ') : 'N/A'}</div>
        `;
    }

    // Inject Context Header
    document.getElementById('shabbat-context').innerHTML = `
        <h3 class="noir-subtitle">Truth Acquired for ${appState.name}</h3>
        <p class="noir-body">Parsha: <span class="accent-green">${appState.parsha}</span> | Candle Lighting: <strong>${hebcalData.candleLighting}</strong></p>
    `;

    // --- NEW FEATURE: RANKING ENGINE INTEGRATION ---
    await rankAndSuggestCommentary(sefariaData.ref);
}

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
    
    // 1. Get First Verse
    const firstVerseRef = getFirstVerseFromRef(parshaRef);
    console.log("1. Fetching links for:", firstVerseRef);

    // 2. Fetch Links
    const links = await fetchSefariaLinks(firstVerseRef);
    console.log("2. Links found:", links.length, links); // Check if this is > 0

    if (!links || links.length === 0) {
        console.warn("No links found. Stopping.");
        return;
    };

    // 3. Parse Links
    const parsed = parseSefariaData({ links }, firstVerseRef);
    const commentaries = parsed.commentaries; 
    console.log("3. Parsed Commentaries:", commentaries.length, commentaries); // Check if this is > 0

    // 4. Run Ranking Engine
    const engine = new CommentatorRankingEngine();
    const rankedList = await engine.rankCommentaries(commentaries);
    console.log("4. Ranked List:", rankedList.length, rankedList); // Check if this is > 0

    // Store in state
    appState.rankedCommentaries = rankedList;

    // 5. Suggest Top Commentator
    if (rankedList.length > 0) {
        const topPick = rankedList[0];
        console.log("5. Top Pick:", topPick.commentator);
        renderCommentarySuggestion(topPick);
        if (rankedList.length > 5) {
            console.log("Top Pick:", rankedList[0])
            console.log("Second:", rankedList[1])
            console.log("Third:", rankedList[2])
            console.log("fourth:", rankedList[3])
            console.log("fifth:", rankedList[4])
        }
        // Attach listener
        document.getElementById('btn-accept-commentary')?.addEventListener('click', () => {
            const firstRef = topPick.refs[0]; 
            document.getElementById('commentary-suggestion').classList.add('hidden');
            loadCommentaryReader(firstRef);
        });
    } else {
        console.warn("Ranking list is empty.");
    }
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
