import { loadComponent } from './services.js';

document.addEventListener('DOMContentLoaded', async () => {
  
  // 1. Load Shared Components (Header/Footer) for ALL pages first
  try {
    await Promise.all([
      loadComponent('header-site', './components/header.html'), 
      loadComponent('footer-site', './components/footer.html')
    ]);
  } catch (err) {
    console.error('ERR: Could not load header/footer:', err);
  }

  // 2. Page Router
  const path = window.location.pathname;

  if (path.endsWith('torah-learning.html')) {
    // Import the module and wait for it to load
    const pageModule = await import('./torah-learning.js');
    // Manually call its start function now that DOM and Header are ready
    if (pageModule.initTorahPage) pageModule.initTorahPage();

  } else if (path.endsWith('bot.html')) {
    // Load the bot logic
    await import('./bot.js');
  }
  else if (path.endsWith('cluster.html')){
    const pageModule = await import('./cluster.js');
    if (pageModule.initCluster) pageModule.initCluster();
  }
  else if (path.endsWith('sentiment.html')) {
    const pageModule = await import('./sentiment.js');
    if (pageModule.initSentiment) pageModule.initSentiment();
    
  }
  else if (path.endsWith('flow.html')) {
    const pageModule = await import('./flow.js');
    if (pageModule.initFlow) pageModule.initFlow();
  }

});
