// main.js - ES Module

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
        const box = element.closest('#chat-box');
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

// 4. Initialization (The "Modern" Way)
// This attaches the click event automatically when the page loads
async function init() {
    // 1. Load the header
    await loadComponent('header-site', 'header.html');
    
    // 2. Target the quote for a typewriter entrance
    const quoteElement = document.querySelector('.header-quote');
    if (quoteElement) {
        const finalLine = quoteElement.getAttribute('data-text');
        quoteElement.innerHTML = ""; // Clear it first
        await typeWriter(finalLine, quoteElement, 50); // Type it out!
    }

    // ... the rest of the loadComponent stuff... 
    loadComponent('footer-site', 'footer.html').then(() => {
        const yearSpan = document.getElementById('current-year');
        if (yearSpan) yearSpan.textContent = new Date().getFullYear();
    });


    const sendBtn = document.querySelector('.input-area button');
    const inputField = document.getElementById('user-input');

    if (sendBtn) sendBtn.addEventListener('click', getResponse);
    if (inputField) {
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') getResponse();
        });
    }
}

// Run immediately if the DOM is already ready, otherwise wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

