// sentiment.js
import { pipeline } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.1/dist/transformers.min.js';

// 1. DATA & STATE
const pragmaticMap = {
    "per my last email": "I already told you this; you aren't listening.",
    "as i'm sure you're aware": "You clearly forgot this obvious fact.",
    "thanks in advance": "I'm not asking, I'm ordering. Do it.",
    "moving forward": "Stop talking about your mistake; it's annoying me.",
    "just checking in": "Where is my stuff? I'm losing patience.",
    "hope this clarifies": "Don't ask me about this again.",
    "to be honest": "I'm about to say something you won't like.",
    "all the best": "This conversation is over.",
    "circle back": "Let's delay this until I care (which I won't).",
    "touch base": "I want to have a long, pointless meeting."
};

let classifier = null;

// 2. LOGIC
async function analyze() {
    const text = document.getElementById("input-text").value.trim();
    if (!text || !classifier) return;

    const btn = document.getElementById("analyze-btn");
    const outputEl = document.getElementById("output");
    
    btn.innerText = "Analyzing...";
    
    // Run the model
    const [result] = await classifier(text);

    // Determine pragmatic intent
    let intent = "Likely Neutral";
    const lower = text.toLowerCase();
    for (const [k, v] of Object.entries(pragmaticMap)) {
        if (lower.includes(k)) {
            intent = v;
            break;
        }
    }

    // Update UI
    document.getElementById("literal-out").innerText = text;
    document.getElementById("intent-out").innerText = intent;

    const score = Math.round(result.score * 100);
    const label = result.label === "NEGATIVE" ? "Highly Informal | Slang | Passive-Aggressive" : "Normal Tone";
    document.getElementById("score-out").innerText = `${score}% ${label}`;

    outputEl.classList.remove("hidden");
    btn.innerText = "De-code Intent";
}

async function loadModel() {
    const statusEl = document.getElementById("status");
    const progressEl = document.getElementById("progress");
    const btn = document.getElementById("analyze-btn");

    try {
        // Load the model (quantized by default for efficiency)
        classifier = await pipeline(
            "sentiment-analysis",
            "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
            {
                progress_callback: data => {
                    if (data.status === "progress") {
                        const percent = data.progress ? Math.round(data.progress) : 0;
                        progressEl.style.width = percent + "%";
                    } else if (data.status === "ready") {
                         progressEl.style.width = "100%";
                    }
                }
            }
        );

        statusEl.innerText = "AI Brain Loaded ✅";
        btn.disabled = false;
        btn.innerText = "De-code Intent";

    } catch (err) {
        console.error("Initialization Error:", err);
        statusEl.innerText = "Load failed. CORS error? Run via local server.";
        statusEl.style.color = "red";
    }
}

// 3. EXPORTED STARTER
export function initSentiment() {
    // Attach the listener to the button
    const btn = document.getElementById("analyze-btn");
    if (btn) {
        btn.onclick = analyze;
    }
    
    // Start loading the model immediately
    loadModel();
}

