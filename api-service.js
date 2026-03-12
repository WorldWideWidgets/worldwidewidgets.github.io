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
// CHANGED: vertical cols, prev and next buttons
export async function fetchSefariaText(parshaName) {
    const url = `https://www.sefaria.org/api/texts/${parshaName}?commentary=0&context=0`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Sefaria API unreachable');
        const data = await response.json();
        
        return {
            he: data.he,        // Array of Hebrew verses
            en: data.text,      // Array of English verses
            ref: data.ref,      // Current Reference
            prev: data.prev,    // Previous Section Ref
            next: data.next     // Next Section Ref
        };
    } catch (error) {
        console.error("Sefaria Error:", error);
        return null;
    }
}

// api-service.js
// api-service.js

// NEW: Fetch Calendar to get Aliyot breakdown
export async function fetchSefariaCalendar(year, month, day) {
    // Sefaria Calendar API
    const url = `https://www.sefaria.org/api/calendars?year=${year}&month=${month}&day=${day}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Calendar API Error');
        const data = await response.json();

        // Find the Parsha item (usually first, but we filter to be safe)
        // The structure is calendar_items -> extraDetails -> aliyot
        const parshaItem = data.calendar_items.find(item => 
            item.parsha || (item.extraDetails && item.extraDetails.aliyot)
        );

        if (parshaItem && parshaItem.extraDetails && parshaItem.extraDetails.aliyot) {
            return {
                aliyot: parshaItem.extraDetails.aliyot, // ["Exodus 35:1-35:29", ...]
                parshaName: parshaItem.displayValue.en // "Parashat Vayakhel"
            };
        }
        
        return null;
    } catch (error) {
        console.error("Sefaria Calendar Error:", error);
        return null;
    }
}

// NEW: Fetch specific Hebrew and English texts for a Ref
export async function fetchAliyahText(ref) {
    // We run two queries in parallel for efficiency
    const [enData, heData] = await Promise.all([
        fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}?version=english`).then(r => r.json()),
        fetch(`https://www.sefaria.org/api/v3/texts/${encodeURIComponent(ref)}?version=hebrew`).then(r => r.json())
    ]);

    return {
        he: heData.versions?.[0]?.text || [],
        en: enData.versions?.[0]?.text || [],
        ref: enData.ref || heData.ref || ref,
        prev: enData.prev || null,
        next: enData.next || null
    };
}

// Keep existing fetchHebcal and fetchSefariaLinks
// ...

export async function fetchParshaAliyot(parshaName) {
    // Use the Index API to get the Aliyot structure (alt_ids)
    // Example: https://www.sefaria.org/api/index/Ki_Tisa
    // We replace spaces with underscores for the URL
    const url = `https://www.sefaria.org/api/index/${encodeURIComponent(parshaName.replace(/ /g, '_'))}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Index API unreachable');
        const data = await response.json();

        // The Index API returns 'alt_ids' for the Aliyot: { "1": "Exodus 30:11", "2": "..." }
        if (data.alt_ids) {
            // Convert the object { "1": "...", "2": "..." } into an array ["...", "..."]
            const aliyot = Object.values(data.alt_ids);
            return aliyot;
        }      
        return null;
    } catch (error) {
        console.error("Error fetching Aliyot:", error);
        return null;
    }
}


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
