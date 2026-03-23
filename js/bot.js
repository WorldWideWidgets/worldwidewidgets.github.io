import { loadComponent, initLeafletMap, typeWriter, sleep } from './services.js';


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
