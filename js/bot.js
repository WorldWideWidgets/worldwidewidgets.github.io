// bot.js - Logic for bot.html
import { initLeafletMap, typeWriter } from './services.js';
import { fetchJoke, fetchHebcal } from './api-service.js';

// --- STATE & DATA ---
let currentCoords = null;
let mapInstance = null;
let marker = null;

// 1. AD POOL (Data for the "Functional" widget side)
const adTextPool = [
    "Sefaria",
    "Jewish Virtual Library",
    "ArtScroll",
    "Koren Publishers",
    "Hebcal",
    "GoDaddy (Just Kidding)",
    "Local Shul",
    "Kosher Deli"
];

// --- 2. MAP INITIALIZATION ---
console.log("Bot Page Logic Initializing...");

mapInstance = initLeafletMap('map-container');

if (mapInstance) {
    mapInstance.on('click', (e) => {
        const wrapped = e.latlng.wrap();
        
        if (marker) marker.setLatLng(wrapped);
        else marker = L.marker(wrapped).addTo(mapInstance);

        currentCoords = wrapped;
        document.getElementById('coord-display').innerText = 
            `Coordinates: ${wrapped.lat.toFixed(4)}, ${wrapped.lng.toFixed(4)}`;
    });
}

// --- 3. PHASE 2: THE DECONSTRUCTION SUITE ---
// This handles the split view: Chatbot vs. Widget
const btnJoke = document.getElementById('btn-bot-joke');

if (btnJoke) {
    btnJoke.addEventListener('click', async () => {
        // Add loading state
        btnJoke.textContent = "Thinking...";
        btnJoke.disabled = true;

        const data = await fetchJoke();
        
        if (!data) {
            alert("Could not fetch joke.");
            btnJoke.textContent = "Ask the Bot";
            btnJoke.disabled = false;
            return;
        }

        // --- SIDE A: ENGAGEMENT (Chatbot Persona) ---
        // Uses slow Typewriter effect to simulate "thinking"
        const chatBox2 = document.getElementById('chat-box-2');
        if (chatBox2) {
            // 1. Clear the box
            chatBox2.innerHTML = '';
            
            // 2. Create the container with the Bold Label already there
            const botMsgDiv = document.createElement('div');
            botMsgDiv.className = 'bot-msg';
            // We put the <b> tag in the 'prefix' span, so it doesn't get typed out
            botMsgDiv.innerHTML = '<b>Bot:</b> <span class="msg-text"></span>';
            chatBox2.appendChild(botMsgDiv);

            // 3. Select the empty span where the text will go
            const textSpan = botMsgDiv.querySelector('.msg-text');

            // 4. Type ONLY the joke text into that span
            await typeWriter(`${data.setup} ... ${data.punchline}`, textSpan, 30);
        }


        // --- SIDE B: FUNCTIONAL (Instant Widget) ---
        // Uses instant image card to simulate "Ad/Widget"
        const adContent = document.getElementById('ad-content');
        const randomAd = adTextPool[Math.floor(Math.random() * adTextPool.length)];

        if (adContent) {
            adContent.innerHTML = `
                <div class="ad-card">
                    <img src="https://picsum.photos/400/200?grayscale&t=${Date.now()}" alt="Ad">
                    <p><strong>${data.setup}</strong></p>
                    <p>${data.punchline}</p>
                    <span class="ad-tag">Sponsor(a.k.a. fake ad text): ${randomAd}</span>
                </div>
            `;
        }

        // Reset button
        btnJoke.textContent = "Ask the Bot";
        btnJoke.disabled = false;
    });
}

// --- 4. PHASE 1: DEFECTIVE CHAT ---
const sendBtn = document.querySelector('.deconstruction-zone .btn-send');
const userInput = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');

if (sendBtn && userInput && chatBox) {
    sendBtn.addEventListener('click', async () => {
        const msg = userInput.value.trim();
        if (!msg) return;

        chatBox.innerHTML += `<div class="user-msg"><b>You:</b> ${msg}</div>`;
        userInput.value = '';
        chatBox.innerHTML += `<div class="bot-msg"><b>Bot:</b> Thinking...</div>`;
        
        const data = await fetchJoke();
        const lastMsg = chatBox.querySelector('.bot-msg:last-child');
        
        if (lastMsg && data) {
            lastMsg.innerHTML = `<b>Bot:</b> ${data.setup} - ${data.punchline}`;
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    });
}

// --- 5. COORDINATE CONFIRM BUTTON ---
const confirmBtn = document.getElementById('btn-confirm-coords');

if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
        if (!currentCoords) {
            alert("Please click the map to select a location first.");
            return;
        }

        confirmBtn.innerText = "Calculating...";
        const data = await fetchHebcal(currentCoords.lat, currentCoords.lng);

        if (data) {
            const truthBox = document.getElementById('coordinate-truth-box');
            truthBox.style.display = 'block';
            truthBox.innerHTML = `
                <h4>Shabbat Times</h4>
                <p><strong>Parsha:</strong> ${data.parsha}</p>
                <p><strong>Candle Lighting:</strong> ${data.candleLighting}</p>
                <p><strong>Be Here By:</strong> ${data.toBeHereBy}</p>
            `;
        } else {
            alert("Could not fetch times for this location.");
        }
        confirmBtn.innerText = "Confirm Location";
    });
}
