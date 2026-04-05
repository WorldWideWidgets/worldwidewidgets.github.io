/* ---- cluster.js - visualisation of wallet transaction graph ---- */

let network = null;
let nodes = null;
let edges = null;
let rawTransactions = [];
let stabilizationTimeout = null;

// ----- CORE LOGIC – CLUSTERING ----- 
function calculateClusters(timeWindowMinutes, minThreshold) {
  const windowSec = timeWindowMinutes * 60;
  const buckets = {};

  rawTransactions.forEach(tx => {
    const bucket = Math.floor(parseInt(tx.timeStamp) / windowSec);
    if (!buckets[bucket]) buckets[bucket] = new Set();
    // NOTE: This currently tracks SENDERS acting simultaneously (Smurfing detection)
    buckets[bucket].add(tx.from); 
  });

  // Build adjacency matrix (pairwise co‑occurrences)
  const matrix = {};
  Object.values(buckets).forEach(bucket => {
    const addresses = Array.from(bucket);
    for (let i = 0; i < addresses.length; i++) {
      for (let j = i + 1; j < addresses.length; j++) {
        const a = addresses[i];
        const b = addresses[j];
        const pair = a < b ? `${a}|${b}` : `${b}|${a}`;
        matrix[pair] = (matrix[pair] || 0) + 1;
      }
    }
  });

  // Filter by threshold
  const edgeList = [];
  const degree = {};
  const connected = new Set();

  for (const [pair, count] of Object.entries(matrix)) {
    if (count >= minThreshold) {
      const [a, b] = pair.split('|');
      edgeList.push({ id: pair, from: a, to: b, value: count, title: `Co‑occurrences: ${count}` });
      connected.add(a);
      connected.add(b);
    }
  }

  edgeList.forEach(e => {
    degree[e.from] = (degree[e.from] || 0) + 1;
    degree[e.to] = (degree[e.to] || 0) + 1;
  });

  const nodeList = Array.from(connected).map(id => ({
    id,
    label: id,
    title: id,
    value: degree[id] ?? 1
  }));

  return { nodes: nodeList, edges: edgeList };
}

// ----- VIS.JS NETWORK SETUP ------ 
function initNetwork() {
  const container = document.getElementById('wallet-graph-container');
  
  // Vis.js is loaded globally via script tag in HTML, so we use window.vis
  nodes = new window.vis.DataSet([]);
  edges = new window.vis.DataSet([]);

  const options = {
    nodes: {
      shape: 'dot',
      scaling: { min: 10, max: 30, label: { enabled: true, min: 10, max: 14 } },
      font: { face: 'Tahoma', size: 11 },
      borderWidth: 1
    },
    edges: {
      width: 1,
      color: { inherit: 'from', opacity: 0.4 },
      smooth: { type: 'continuous' }
    },
    physics: {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -2000,
        centralGravity: 0.1,
        springLength: 100,
        springConstant: 0.01,
        damping: 0.9
      },
      stabilization: { iterations: 300 }
    },
    interaction: {
      tooltipDelay: 100,
      zoomView: true,
      dragNodes: true,
      dragView: true
    }
  };
  
  network = new window.vis.Network(container, { nodes, edges }, options);

  network.on('stabilized', () => {
    clearTimeout(stabilizationTimeout);
    network.setOptions({ physics: false });
  });
}

function updateGraph() {
  const timeWindow = parseInt(document.getElementById('timeSlider').value);
  const threshold = parseInt(document.getElementById('thresholdSlider').value);

  document.getElementById('timeValue').innerText = timeWindow;
  document.getElementById('thresholdValue').innerText = threshold;

  const result = calculateClusters(timeWindow, threshold);
  document.getElementById('txCount').innerText = rawTransactions?.length ?? 0;
  document.getElementById('walletCount').innerText = result.nodes.length;
  document.getElementById('edgeCount').innerText = result.edges.length;

  if (nodes) nodes.clear();
  if (edges) edges.clear();

  nodes.update(result.nodes);
  edges.update(result.edges);

  network.setOptions({ physics: true });
  try {
    network.fit();
  } catch (e) {
    console.warn('Graph fit failed', e);
  }

  clearTimeout(stabilizationTimeout);
  stabilizationTimeout = setTimeout(() => {
    network.setOptions({ physics: false });
  }, 4000);
}

async function loadData() {
  try {
    const resp = await fetch('/coinbase_44_raw_transactions.json');
    if (!resp.ok) throw new Error('Network response not ok');
    rawTransactions = await resp.json();
    console.log('Loaded', rawTransactions.length, 'transactions');
    updateGraph();
  } catch (e) {
    console.error('Failed to load transaction data', e);
    document.getElementById('wallet-graph-container').innerHTML =
      '<div style="padding:20px;color:red">Error loading data.</div>';
  }
}

function debounce(fn, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

// ----- EXPORTED STARTER FUNCTION -----
export function initCluster() {
  // 1. Init the network
  initNetwork();
  
  // 2. Setup Listeners
  const debouncedUpdate = debounce(updateGraph, 300);
  document.getElementById('timeSlider').addEventListener('input', debouncedUpdate);
  document.getElementById('thresholdSlider').addEventListener('input', debouncedUpdate);
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (network) {
      network.setOptions({ physics: true });
      network.fit({ animation: true });
      clearTimeout(stabilizationTimeout);
      stabilizationTimeout = setTimeout(() => {
        network.setOptions({ physics: false });
      }, 4000);
    }
  });
  
  // 3. Load Data
  loadData();
}


// /* ---------------------------------------------------------------
//    cluster.js – visualisation of wallet transaction graph
//    --------------------------------------------------------------- */
// // import { sleep, loadComponent, typeWriter } from './services.js';
// // import { fetchJoke, fetchHebcal } from './api-service.js';

// let network = null;
// let nodes = null;
// let edges = null;
// let rawTransactions = [];
// let stabilizationTimeout = null;


// async function loadData() {
//   try {
//     const resp = await fetch('/coinbase_44_raw_transactions.json');
//     if (!resp.ok) throw new Error('Network response not ok');
//     rawTransactions = await resp.json();
//     console.log('Loaded', rawTransactions.length, 'transactions');
//     updateGraph();                     // (re)draw the network
//     // NO LONGER NEEDED - the graph rescales on window resize
//     // window.addEventListener('resize', () => network?.fit().redraw());
//   } catch (e) {
//     console.error('Failed to load transaction data', e);
//     document.getElementById('wallet-graph-container').innerHTML =
//       '<div style="padding:20px;color:red">Error loading data.</div>';
//   }
// }

// // ----- CORE LOGIC – CLUSTERING ----- 
// function calculateClusters(timeWindowMinutes, minThreshold) {
//   // ----- 1️⃣  Build time‑buckets ---------------------------
//   const windowSec = timeWindowMinutes * 60;   // minutes → seconds
//   const buckets   = {};

//   rawTransactions.forEach(tx => {
//     const bucket = Math.floor(parseInt(tx.timeStamp) / windowSec);
//     if (!buckets[bucket]) buckets[bucket] = new Set();
//     buckets[bucket].add(tx.from);               // each address belongs to a bucket
//   });

//   // ----- 2️⃣  Build adjacency matrix (pairwise co‑occurrences) --
//   const matrix = {};                // { pair: count }
//   Object.values(buckets).forEach(bucket => {
//     const addresses = Array.from(bucket);
//     for (let i = 0; i < addresses.length; i++) {
//       for (let j = i + 1; j < addresses.length; j++) {
//         const a = addresses[i];
//         const b = addresses[j];
//         const pair = a < b ? `${a}|${b}` : `${b}|${a}`;
//         matrix[pair] = (matrix[pair] || 0) + 1;
//       }
//     }
//   });

//   // ----- Filter by threshold and build edge list -----
//   const edgeList = [];
//   const degree   = {};
//   const connected = new Set();

//   for (const [pair, count] of Object.entries(matrix)) {
//     if (count >= minThreshold) {
//       const [a, b] = pair.split('|');
//       edgeList.push({
//         id: pair,
//         from:   a,
//         to:     b,
//         value:  count,
//         title:  `Co‑occurrences: ${count}`
//       });
//       connected.add(a);
//       connected.add(b);
//     }
//   }

//   // ---- Build node list (with degree counts) ----
//   edgeList.forEach(e => {
//     degree[e.from] = (degree[e.from] || 0) + 1;
//     degree[e.to]   = (degree[e.to]   || 0) + 1;
//   });
//   const nodeList = Array.from(connected).map(id => ({
//     id,
//     label:   id,
//     title:   id,
//     value:   degree[id] ?? 1
//   }));

//   return { nodes: nodeList, edges: edgeList };
//   }

//   // ----- VIS.JS NETWORK SETUP ------ 
//   function initNetwork() {
//     const container = document.getElementById('wallet-graph-container');
//     nodes = new vis.DataSet([]);
//     edges   = new vis.DataSet([]);

//     const options = {
//       nodes: {
//         shape: 'dot',
//         scaling: { min: 10, max: 30, label: { enabled: true, min: 10, max: 14 } },
//         font: { face: 'Tahoma', size: 11 },
//         borderWidth: 1
//       },
//       edges: {
//         width: 1,
//         color: { inherit: 'from', opacity: 0.4 },
//         smooth: { type: 'continuous' }
//       },
//       physics: {
//         enabled: true,
//         barnesHut: {
//           gravitationalConstant: -2000,
//           centralGravity: 0.1,
//           springLength: 100,
//           springConstant: 0.01,
//           damping: 0.9
//         },
//         stabilization: { iterations: 300 }
//       },
//       interaction: {
//         tooltipDelay: 100,
//         zoomView: true,
//         dragNodes: true,
//         dragView:   true
//       }
//     };
//     network = new vis.Network(container, { nodes, edges }, options);

//     // When the layout settles naturally we stop the forced stop‑timer
//     network.on('stabilized', () => {
//       clearTimeout(stabilizationTimeout);
//       network.setOptions({ physics: false });
//       console.log('Graph settled naturally');
//     });
//   }


//   function updateGraph() {
//     const timeWindow = parseInt(document.getElementById('timeSlider').value);
//     const threshold = parseInt(document.getElementById('thresholdSlider').value);

//     // Update the numeric displays
//     document.getElementById('timeValue').innerText = timeWindow;
//     document.getElementById('thresholdValue').innerText = threshold;

//     // Calculate clusters and update UI statistics
//     const result = calculateClusters(timeWindow, threshold);
//     document.getElementById('txCount').innerText = rawTransactions?.length ?? 0;
//     document.getElementById('walletCount').innerText = result.nodes.length;
//     document.getElementById('edgeCount').innerText = result.edges.length;

//     // Clear old data and apply new data
//     if(nodes) { nodes.clear(); }
//     if(edges) { edges.clear(); }

//     nodes.update(result.nodes);
//     edges.update(result.edges);

//     // Re-enable physics so the layout adapts
//     network.setOptions({ physics: true });
  
//     // Fit the graph to the view
//     // (Wrap in a safety check to avoid the Canvas error)
//     try {
//           network.fit();
//     } catch (e) {
//           console.warn('Graph fit failed, waiting for stabilization...', e);
//     }

//     // Hard-stop timer
//     clearTimeout(stabilizationTimeout);
//     stabilizationTimeout = setTimeout(() => {
//         network.setOptions({ physics: false });
//     }, 4000);
// }



// // ----- UTILITY: DEBOUNCE FUNCTION -----
//   function debounce(fn, wait) {
//     let timeout;
//     return (...args) => {
//       clearTimeout(timeout);
//       timeout = setTimeout(() => fn.apply(this, args), wait);
//     };
//   }

// // ----- EVENT LISTENERS & INITIALISATION -----
// // Wrap everything in window.onload to ensure CSS is loaded
// // and the container has its defined height (600px) before Vis.js starts.
// window.onload = function() {
//   // 1. Initialize the network
//   initNetwork();
//   // 2. Set up event listeners
//   const debouncedUpdate = debounce(updateGraph, 300);
//   document.getElementById('timeSlider').addEventListener('input', debouncedUpdate);
//   document.getElementById('thresholdSlider').addEventListener('input', debouncedUpdate);
//   document.getElementById('resetBtn').addEventListener('click', () => {
//     if (network) {
//       network.setOptions({ physics: true });
//       network.fit({ animation: true });
//       clearTimeout(stabilizationTimeout);
//       stabilizationTimeout = setTimeout(() => {
//         network.setOptions({ physics: false });
//       }, 4000);
//     }
//   });
//   // 3. Load the data (which triggers updateGraph)
//   loadData();
// };

