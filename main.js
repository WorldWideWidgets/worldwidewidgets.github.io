// main.js - Controller for Home & original Bot pages
import { sleep, loadComponent, typeWriter, initLeafletMap } from './services.js';
import { fetchJoke, fetchHebcal } from './api-service.js';

// Configuration for "Deconstruction" Ads
const adTextPool = [
    "Upgrade to Pro for more humor!",
    "World Wide Widgets: Thoroughly Modern.",
    "First World Solutions for First World Problems.",
    "Gricean Principles: Better by Design."
];

async function handleBotResponse() {
    const box = document.getElementById('chat-box');
    const input = document.getElementById('user-input');
    if (!box || !input) return;

    const userText = input.value.trim();
    if (!userText) return;

    box.innerHTML += `<div class="user-msg"><b>You:</b> ${userText}</div>`;
    input.value = ''; 
    box.scrollTop = box.scrollHeight;

    try {
        const joke = await fetchJoke();
        const setupDiv = document.createElement('div');
        setupDiv.className = 'bot-msg glitch';
        setupDiv.setAttribute('data-text', `Bot: ${joke.setup}`);
        setupDiv.innerHTML = `<b>Bot:</b> `;
        box.appendChild(setupDiv);
        
        await typeWriter(joke.setup, setupDiv);

        // Thinking dots
        const dotsDiv = document.createElement('div');
        dotsDiv.className = 'bot-msg';
        box.appendChild(dotsDiv);
        for (let i = 0; i < 6; i++) { 
            await sleep(500); 
            dotsDiv.innerHTML += ". "; 
            box.scrollTop = box.scrollHeight; 
        }
        await sleep(250);
        dotsDiv.innerHTML += " 😂"; 

        const punchDiv = document.createElement('div');
        punchDiv.className = 'bot-msg typing';
        punchDiv.innerHTML = `<b>— </b>`;
        box.appendChild(punchDiv);
        await sleep(800);
        await typeWriter(joke.punchline, punchDiv);
        punchDiv.classList.remove('typing'); 
    } catch (e) { 
        box.innerHTML += `<div class="error-msg"><b>Bot:</b> API Error.</div>`; 
    }
}

async function runDeconstruction() {
    const adBox = document.getElementById('ad-content');
    const botBox = document.getElementById('chat-box-2');
    if (!adBox || !botBox) return;

    const joke = await fetchJoke();
    const randomAd = adTextPool[Math.floor(Math.random() * adTextPool.length)];
    
    adBox.innerHTML = `
        <div class="ad-card">
            <img src="https://picsum.photos/400/200?grayscale" alt="Ad">
            <p><strong>${joke.setup}</strong></p>
            <p>${joke.punchline}</p>
            <span class="ad-tag">Sponsor: ${randomAd}</span>
        </div>`;
    
    botBox.innerHTML += `<div class="bot-msg"><b>Bot:</b> ${joke.setup} ... ${joke.punchline}</div>`;
    botBox.scrollTop = botBox.scrollHeight;
}

async function init() {
    // 1. Global UI
    await loadComponent('header-site', 'header.html');
    const quoteElement = document.querySelector('.header-quote');
    if (quoteElement) {
        const text = quoteElement.getAttribute('data-text');
        quoteElement.innerHTML = "";
        await typeWriter(text, quoteElement, 50);
    }

    await loadComponent('footer-site', 'footer.html');
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    let currentCoords = null;
    // 2. Map (For the bot.html "Coordinate Truth" section)
    const mapTool = initLeafletMap('map-container', (coords) => {
        // This callback runs every time the user clicks!
        currentCoords = coords; 
        const display = document.getElementById('coord-display');
        if (display) display.innerHTML = `LAT: ${coords.lat.toFixed(4)} | LON: ${coords.lng.toFixed(4)}`;
    });

    // 3. Global Listeners
    document.querySelector('.input-area button')?.addEventListener('click', handleBotResponse);
    document.getElementById('user-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleBotResponse();
    });
    
    document.getElementById('btn-bot-joke')?.addEventListener('click', runDeconstruction);

    document.getElementById('btn-confirm-coords')?.addEventListener('click', async () => {
        // Use our local variable instead of mapTool.marker
        if (!currentCoords) {
            alert("Please drop a pin on the map first.");
            return;
        }
        
        console.log("Fetching Hebcal for Coordinate Truth...");
        const data = await fetchHebcal(currentCoords.lat, currentCoords.lng);
        
        // This is the "Synthesis" moment
        if (data) {
            console.log("Context Acquired:", data);
            // If you want to show it on the page like your previous version:
            const truthBox = document.getElementById('coordinate-truth-box');
            if (truthBox) {
                truthBox.style.display = 'block';
                truthBox.innerHTML = `
                    <p>Candle Lighting: <b>${data.candleLighting}</b></p>
                    <p>Portion: <span class="accent-green">${data.parsha}</span></p>
                `;
            }
        }
    });
}

init();
