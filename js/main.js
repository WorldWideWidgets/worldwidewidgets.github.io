import { sleep, loadComponent, typeWriter, initLeafletMap } from './services.js';
import { fetchJoke, fetchHebcal } from './api-service.js';
window.fetchJoke = fetchJoke; // this is a total hack, these should be in their own file bot.js
window.fetchHebcal = fetchHebcal; // see above

document.addEventListener('DOMContentLoaded', () => {
  // -----------------------------------------------------------------
  // Load the shared header and footer (now in the correct arg order!)
  // -----------------------------------------------------------------
  Promise.all([
    loadComponent('header-site', './components/header.html'), 
    loadComponent('footer-site', './components/footer.html')
  ])
  .then(() => {
    // ← NEW: After header loads, typewrite the quote
    const headerQuote = document.querySelector('.header-quote');
    if (headerQuote) {
      const text = headerQuote.textContent.trim();
      headerQuote.textContent = ''; // Clear it first
      typeWriter(text, headerQuote, 40); // Animate it
    }
  })
  .catch(err => console.error('ERR: Could not load header/footer:', err));

  if (window.location.pathname.endsWith('torah-learning.html')) {
    
    // Helper function to create module scripts safely
    const loadModule = (path) => {
      const s = document.createElement('script');
      s.type = 'module'; // THIS IS CRITICAL
      s.src = path;
      document.head.appendChild(s);
    };

    // Load all torah-learning dependencies
    loadModule('/js/sefaria-constants.js');
    loadModule('/js/sefaria-parser.js');
    loadModule('/js/sefaria-display.js');
    loadModule('/js/sefaria-commentator-rank.js');
    
    // Load the main page logic last (optional: ensures dependencies are requested first)
    loadModule('/js/torah-learning.js');
  }

  // visualisation page
  if (window.location.pathname.endsWith('cluster.html')) {
    const visScript = document.createElement('script');
    visScript.type = 'module';
    visScript.src = '/js/cluster.js';
    document.head.appendChild(visScript);
  }

  if (window.location.pathname.endsWith('sentiment.html')) {
    const sentimentScript = document.createElement('script');
    sentimentScript.type = 'module';
    sentimentScript.src = '/js/sentiment.js';
    document.head.appendChild(sentimentScript);

    
  } 
});

