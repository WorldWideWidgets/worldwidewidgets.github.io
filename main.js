//  main.js - ES Module

// map stuff including a helper function 
let map; 
let marker = null; // Explicitly initialize as null

function initMap() {
    const mapElement = document.getElementById('map-container');
    if (!mapElement) return;

    // 1. Initialize Map: Centered at a neutral zoom (World View)
    // [20, 0] is roughly center-map; zoom 2 shows most continents
    //map = L.map('map-container').setView([20, 0], 2);
    map = L.map('map-container', {
        minZoom: 2,
        worldCopyJump: false // Prevents the map from jumping between world copies
    }).setView([40.3488, -74.6022], 7);

    // 2. Add the "Noir" Tiles (CartoDB Positron) - FIXED URL
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a> contributors &copy; <a href="https://carto.com">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    // This prevents the user from dragging the map into the gray void
    const southWest = L.latLng(-89.9, -179.9);
    const northEast = L.latLng(89.9, 179.9);
    const bounds = L.latLngBounds(southWest, northEast);
    map.setMaxBounds(bounds);
    map.on('drag', function() {
        map.panInsideBounds(bounds, { animate: false });
    });

    // 3. The "Pin Drop" Event
    map.on('click', function(e) {
        const wrappedLatLng = e.latlng.wrap(); 
        const { lat, lng } = wrappedLatLng;
        const display = document.getElementById('coord-display');

        if (marker) {
            marker.setLatLng(wrappedLatLng);
        } else {
            marker = L.marker(wrappedLatLng).addTo(map);
        }

        if (display) {
            display.innerHTML = `LAT: ${lat.toFixed(4)} | LON: ${lng.toFixed(4)}`;
        }
        // Log for our future API calls
        console.log(`Coordinate Truth Captured: ${lat}, ${lng}`);
    });
}
        
// 1. Helper: Delay function
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 1.5 Helper: Loads external HTML files into placeholders
async function loadComponent(id, file) {
    const element = document.getElementById(id);
    if (!element) return; 

    try {
        const response = await fetch(file);
        if (response.ok) {
            const content = await response.text();
            element.innerHTML = content;
        } else {
            console.error(`Failed to load ${file}: ${response.status}`);
        }
    } catch (err) {
        console.error(`Error loading ${file}:`, err);
    }
}


// 2. Helper: Types text letter by letter
async function typeWriter(text, element, speed = 40) {
    for (let char of text) {
        element.innerHTML += char;
        // Find the closest scrollable container
        const box = element.closest('#chat-box, #chat-box-2'); // Added 2nd box support
        if (box) box.scrollTop = box.scrollHeight;
        await sleep(speed);
    }
}

// 3. Main Chat Logic
async function getResponse() {
    const box = document.getElementById('chat-box');
    const input = document.getElementById('user-input');
    if (!box || !input) return;

    const userText = input.value.trim();
    if (!userText) return;

    // Add user message
    box.innerHTML += `<div class="user-msg"><b>You:</b> ${userText}</div>`;
    input.value = ''; 
    box.scrollTop = box.scrollHeight;

    try {
        const response = await fetch('https://official-joke-api.appspot.com/jokes/random');
        const joke = await response.json();

        // Setup with Glitch Effect
        const setupDiv = document.createElement('div');
        setupDiv.className = 'bot-msg glitch';
        setupDiv.setAttribute('data-text', `Bot: ${joke.setup}`);
        setupDiv.innerHTML = `<b>Bot:</b> `;
        box.appendChild(setupDiv);
        
        await typeWriter(joke.setup, setupDiv);

        // Thinking Dots
        const dotsId = `dots-${Date.now()}`;
        const dotsDiv = document.createElement('div');
        dotsDiv.className = 'bot-msg';
        dotsDiv.id = dotsId;
        box.appendChild(dotsDiv);

        for (let i = 0; i < 6; i++) {
            await sleep(500);
            dotsDiv.innerHTML += ". ";
            box.scrollTop = box.scrollHeight;
        }

        await sleep(500);
        dotsDiv.innerHTML += " 😂"; 
        
        // Punchline with Typing Effect
        const punchDiv = document.createElement('div');
        punchDiv.className = 'bot-msg typing';
        punchDiv.innerHTML = `<b>— </b>`;
        box.appendChild(punchDiv);
        
        await sleep(800);
        await typeWriter(joke.punchline, punchDiv);
        punchDiv.classList.remove('typing'); 

        box.innerHTML += `<div class="spacer" style="height: 10px;"></div>`;

    } catch (error) {
        box.innerHTML += `<div class="error-msg"><b>Bot:</b> API Error.</div>`;
    }
    box.scrollTop = box.scrollHeight;
}

// 3.5 Deconstruction Logic (NEW)
const adTextPool = [
    "Upgrade to Pro for more humor!",
    "World Wide Widgets: Thoroughly Modern.",
    "First World Solutions for First World Problems.",
    "Gricean Principles: Better by Design."
];

async function updateDeconstruction() {
    const adBox = document.getElementById('ad-content');
    const botBox = document.getElementById('chat-box-2');
    if (!adBox || !botBox) return;

    try {
        const response = await fetch('https://official-joke-api.appspot.com/jokes/random');
        const joke = await response.json();

        // 1. Functional Layer: Instant Update (No query params, Picsum handles it)
        const randomAd = adTextPool[Math.floor(Math.random() * adTextPool.length)];
        const imageUrl = `https://picsum.photos/400/200?grayscale`;

        adBox.innerHTML = `
            <div class="ad-card">
                <div class="ad-image-container">
                    <img src="${imageUrl}" alt="Contextual Ad">
                </div>
                <p class="ad-joke-setup"><strong>${joke.setup}</strong></p>
                <p class="ad-joke-punchline">${joke.punchline}</p>
                <span class="ad-tag">Sponsor: ${randomAd}</span>
            </div>
        `;

        // 2. Engagement Layer: Persistent Scrollable Conversation
        botBox.innerHTML += `<div class="bot-msg"><b>Bot:</b> ${joke.setup} ... ${joke.punchline}</div>`;
        
        // Auto-scroll the mini-bot window
        botBox.scrollTop = botBox.scrollHeight;

    } catch (e) {
        adBox.innerHTML = "API Connection Lost.";
    }
}

// 4. Initialization
async function init() {
    // 4a. Load the header
    await loadComponent('header-site', 'header.html');
    
    // 4b. Target the quote for a typewriter entrance
    const quoteElement = document.querySelector('.header-quote');
    if (quoteElement) {
        const finalLine = quoteElement.getAttribute('data-text');
        quoteElement.innerHTML = ""; // Clear it first
        await typeWriter(finalLine, quoteElement, 50); // Type it out!
    }

    // 4c. Load footer
    loadComponent('footer-site', 'footer.html').then(() => {
        const yearSpan = document.getElementById('current-year');
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    });

    // 4d. Fire up the Leaflet engine
    await initMap(); 

    // .. AND setup the "Coordinate" button listener
    const confirmBtn = document.getElementById('btn-confirm-coords');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
            if (!marker) {
                alert("Please drop a pin on the map first.");
                return;
            }
            const coords = marker.getLatLng();
            console.log("Confirmed Coordinates:", coords);
            // Next: trigger API chain here!
        });
    }

    // 4e. Listeners for original Chatbot
    const sendBtn = document.querySelector('.input-area button');
    const inputField = document.getElementById('user-input');

    if (sendBtn) sendBtn.addEventListener('click', getResponse);
    if (inputField) {
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') getResponse();
        });
    }


    // 5. Unified Listener for Deconstruction Suite
    const botJokeBtn = document.getElementById('btn-bot-joke');

    // We only run this if the button actually exists (i.e., we are on bot.html)
    if (botJokeBtn) {
        botJokeBtn.addEventListener('click', updateDeconstruction);
        console.log("Deconstruction Suite: Active");
    }

}

// Run immediately if the DOM is already ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
