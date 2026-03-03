// api-service.js - API Communications

export async function fetchJoke() {
    const response = await fetch('https://official-joke-api.appspot.com/jokes/random');
    return await response.json();
}

export async function fetchHebcal(lat, lng) {
    const url = `https://www.hebcal.com/shabbat?latitude=${lat}&longitude=${lng}&cfg=json`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        return formatShabbatTimes(data.items);
    } catch (error) {
        console.error("Hebcal Fetch Failed:", error);
        return null;
    }
}

function formatShabbatTimes(items) {
    if (!items) return null;
    const candleItem = items.find(i => i.category === 'candles');
    const parshaItem = items.find(i => i.category === 'parashat');
  
    if (candleItem) {
        const candleTime = new Date(candleItem.date); 
        const safeArrivalTime = new Date(candleTime.getTime() - (18 * 60000)); 
        const timeOptions = { hour: 'numeric', minute: '2-digit' };

        return {
            candleLighting: candleTime.toLocaleTimeString([], timeOptions),
            toBeHereBy: safeArrivalTime.toLocaleTimeString([], timeOptions),
            parsha: parshaItem ? parshaItem.title.replace('Parashat ', '') : 'N/A'
        };
    }
    return null;
}

// FIXED: Added /api/ to the URL
export async function fetchSefariaText(parshaName) {
    // const enc_parshaName = encodeURIComponent(parshaName);
    const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(parshaName)}?commentary=0&context=0`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Sefaria API unreachable');
        const data = await response.json();
        
        return {
            he: data.he,        // Array of Hebrew verses
            en: data.text,      // Array of English verses
            ref: data.ref       // e.g., "Genesis 1:1-2:3"
        };
    } catch (error) {
        console.error("Sefaria Error:", error);
        return null;
    }
}

// api-service.js

export async function fetchSefariaLinks(ref) {
    // USE /related/ INSTEAD OF /links/
    const url = `https://www.sefaria.org/api/related/${encodeURIComponent(ref)}`;
    try {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors'
        });
        
        if (!response.ok) throw new Error('Sefaria Related API unreachable');
        const data = await response.json();
        
        // The /related/ endpoint returns an object like { "Commentary": [...], "Tanakh": [...] }
        // We want to flatten this to a simple array of links for our parser.
        let allLinks = [];
        if (data && data.links) {
            // Some versions return a "links" array
            allLinks = data.links;
        } else {
            // Others return categories directly
            for (const category in data) {
                if (Array.isArray(data[category])) {
                    allLinks = allLinks.concat(data[category]);
                }
            }
        }
        return allLinks;

    } catch (error) {
        console.error("Sefaria Links Error:", error);
        return [];
    }
}


// NEW: Fetches specific commentary text with navigation data
export async function fetchCommentaryText(ref) {
    // const enc_ref = encodeURIComponent(ref);
    // Using the main API endpoint to get 'next' and 'prev' data
    const url = `https://www.sefaria.org/api/texts/${encodeURIComponent(ref)}?commentary=1`;
    // const url = `https://www.sefaria.org/api/related/${ref}`
    try {
        // alert(url)
        const response = await fetch(url);
        if (!response.ok) throw new Error('Commentary text fetch failed');
        return await response.json();
    } catch (error) {
        console.error("Commentary Text Error:", error);
        return null;
    }
}
