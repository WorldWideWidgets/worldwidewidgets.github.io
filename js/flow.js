/* ---------------------------------------------------------------
   flow.js – visualisation of wallet money flow
   --------------------------------------------------------------- */

let network = null;
let nodes = null;
let edges = null;
let rawTransactions = [];

// ----- 1. CORE LOGIC: DIRECTED FLOW -----
function calculateFlow(minValueETH) {
  const edgeMap = {}; 
  
  // 1. Aggregate all transactions
  rawTransactions.forEach(tx => {
    // FIX: Convert Wei to ETH (divide by 10^18)
    const valETH = parseFloat(tx.value) / 1e18;
    const key = `${tx.from}|${tx.to}`;

    if (!edgeMap[key]) {
      edgeMap[key] = { from: tx.from, to: tx.to, value: 0 };
    }
    edgeMap[key].value += valETH;
  });

  // 2. Filter and Sort
  let edgeList = [];
  const connected = new Set();

  // Convert to array so we can sort it
  let sortedEdges = Object.values(edgeMap).filter(e => e.value >= minValueETH);
  
  // Sort by value DESCENDING (show biggest transfers first)
  sortedEdges.sort((a, b) => b.value - a.value);

  // CAP: Only take the top 100 edges to prevent browser crash
  const MAX_EDGES = 150; 
  const topEdges = sortedEdges.slice(0, MAX_EDGES);

  topEdges.forEach(e => {
    edgeList.push({
      id: `${e.from}|${e.to}`,
      from: e.from,
      to: e.to,
      value: e.value,
      arrows: 'to', 
      // Scale width logarithmically so huge txs don't break the screen
      width: Math.log10(e.value + 1) * 2 + 1, 
      title: `${e.value.toFixed(4)} ETH`,
      color: { color: 'rgba(100, 200, 100, 0.8)' }
    });
    connected.add(e.from);
    connected.add(e.to);
  });

  // 3. Build Node List
  const nodeList = Array.from(connected).map(id => ({
    id,
    label: id.substring(0, 6) + '...',
    title: id,
    shape: 'box',
    color: '#333',
    font: { color: '#fff', size: 12 }
  }));

  return { nodes: nodeList, edges: edgeList };
}

// ----- 2. NETWORK SETUP -----
function initNetwork() {
  const container = document.getElementById('wallet-graph-container');
  nodes = new window.vis.DataSet([]);
  edges = new window.vis.DataSet([]);

  const options = {
    edges: {
      smooth: {
        type: 'continuous'
      }
    },
    physics: {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -5000, // More repulsion for cleaner view
        springLength: 120
      }
    }
  };
  
  network = new window.vis.Network(container, { nodes, edges }, options);
}

function updateGraph() {
  // CHANGE: Slider now represents ETH (not tiny units)
  // Also, increase the step size for the slider in HTML to 0.5 or 1.0
  const minVal = parseFloat(document.getElementById('valueSlider').value);
  document.getElementById('valueDisplay').innerText = minVal + " ETH";

  const result = calculateFlow(minVal);

  document.getElementById('nodeCount').innerText = result.nodes.length;
  document.getElementById('edgeCount').innerText = result.edges.length;

  if (nodes) nodes.clear();
  if (edges) edges.clear();

  nodes.update(result.nodes);
  edges.update(result.edges);

  network.setOptions({ physics: true });
  
  // Fit and then stop physics after a moment
  setTimeout(() => {
    network.fit();
    network.setOptions({ physics: false });
  }, 3000);
}

async function loadData() {
  try {
    const resp = await fetch('/coinbase_44_raw_transactions.json');
    rawTransactions = await resp.json();
    console.log('Flow Data Loaded (Wei converted to ETH)');
    updateGraph();
  } catch (e) {
    console.error(e);
  }
}

// ----- 3. EXPORT STARTER -----
export function initFlow() {
  initNetwork();
  loadData();
  document.getElementById('valueSlider').addEventListener('input', updateGraph);
  document.getElementById('resetBtn').addEventListener('click', () => {
    network.setOptions({ physics: true });
    network.fit();
  });
}
