// services.js - Shared Functional Logic
// services.js
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function loadComponent(id, file) {
    const element = document.getElementById(id);
    if (!element) return false; 
    try {
        const response = await fetch(file);
        if (response.ok) {
            element.innerHTML = await response.text();
            return true;
        }
    } catch (err) { console.error(`Failed to load ${file}`, err); }
    return false;
}

export async function typeWriter(text, element, speed = 40) {
    for (let char of text) {
        element.innerHTML += char;
        const box = element.closest('#chat-box, #chat-box-2');
        if (box) box.scrollTop = box.scrollHeight;
        await sleep(speed);
    }
}

// REFACTORED: Lean Map Factory
export function initLeafletMap(containerId) {
    const mapElement = document.getElementById(containerId);
    if (!mapElement) return null;

    const map = L.map(containerId, {
        minZoom: 2,
        worldCopyJump: false 
    }).setView([40.3488, -74.6022], 7);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    const bounds = L.latLngBounds(L.latLng(-89.9, -179.9), L.latLng(89.9, 179.9));
    map.setMaxBounds(bounds);
    map.on('drag', () => map.panInsideBounds(bounds, { animate: false }));

    return map; // Return the map instance
}


