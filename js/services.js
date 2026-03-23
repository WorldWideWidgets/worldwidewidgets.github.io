// services.js - Shared Functional Logic

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

// THE REFINED MAP ENGINE (Extracted from main.js)
export function initLeafletMap(containerId, onCoordsCaptured) {
    const mapElement = document.getElementById(containerId);
    if (!mapElement) return null;

    const map = L.map(containerId, {
        minZoom: 2,
        worldCopyJump: false 
    }).setView([40.3488, -74.6022], 7);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    const bounds = L.latLngBounds(L.latLng(-89.9, -179.9), L.latLng(89.9, 179.9));
    map.setMaxBounds(bounds);
    map.on('drag', () => map.panInsideBounds(bounds, { animate: false }));

    let marker = null;
    map.on('click', (e) => {
        const wrapped = e.latlng.wrap();
        if (marker) marker.setLatLng(wrapped);
        else marker = L.marker(wrapped).addTo(map);
        if (onCoordsCaptured) onCoordsCaptured(wrapped);
    });

    return { map, marker };
}
