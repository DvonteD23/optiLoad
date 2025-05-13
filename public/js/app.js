initDate();
bindNavigation();
bindFetchPackage();

//Populate the header date
function initDate() {
  const dateEl = document.getElementById('current-date');
  if (!dateEl) return;
  const today = new Date();
  dateEl.textContent = today.toLocaleDateString();
  dateEl.setAttribute('datetime', today.toISOString().split('T')[0]);
}

//browser-side routing links
function bindNavigation() {
  document.querySelectorAll('[data-route]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      loadRoute(link.getAttribute('data-route'));
    });
  });
}

async function loadRoute(route) {
  try {
    const html = await fetchText(`/api/page/${route}`);
    document.getElementById('main-content').innerHTML = html;
    if (route === 'account') {
      bindFetchPackage();
      bindNavigation();
    }
  } catch (err) {
    console.error('Routing error:', err);
  }
}

//Shipment request binding
function bindFetchPackage() {
  const btn = document.getElementById('fetch-package');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const vehicleSel = document.getElementById('vehicle-select');
    const vehicle = vehicleSel.value;
    if (!vehicle) return;

    const infoEl = document.getElementById('package-info');
    infoEl.textContent = ''; 

    const requestBody = {
      vehicleLength: parseInt(vehicleSel.options[vehicleSel.selectedIndex].dataset.length, 10),
      currentLoadLength: 0,
      currentLoadWeight: 0,
      requestType: 'full'
    };

    try {
      const pkg = await fetchJson('/api/loads/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      displayPackage(pkg, infoEl, vehicle);
    } catch (err) {
      console.error('Fetch shipment error:', err);
      infoEl.textContent = 'No load available or error occurred.';
    }
  });
}

//Build the package card
function displayPackage(pkg, container, vehicle) {
  const title = document.createElement('h3');
  title.textContent = `Load for ${vehicle.toUpperCase()}`;
  container.appendChild(title);

  const entries = [
    ['Distance', `${pkg.distance} miles`],
    ['Weight', `${pkg.weight} lbs`],
    ['Commodity', pkg.commodity],
    ['Rate', `$${pkg.rate}/mile`]
  ];
  entries.forEach(([label, val]) => {
    const p = document.createElement('p');
    p.textContent = `${label}: ${val}`;
    container.appendChild(p);
  });

  const acceptBtn = document.createElement('button');
  acceptBtn.textContent = 'Accept';
  acceptBtn.addEventListener('click', () => handleAccept(pkg, container));
  container.appendChild(acceptBtn);

  const declineBtn = document.createElement('button');
  declineBtn.textContent = 'Decline';
  declineBtn.addEventListener('click', () => { container.textContent = ''; });
  container.appendChild(declineBtn);
}

//Accept handler
async function handleAccept(pkg, container) {
  try {
    await fetchJson(`/api/loads/${pkg._id}/accept`, { method: 'PUT' });
    container.textContent = 'Load accepted!';
  } catch (err) {
    console.error('Accept error:', err);
    container.textContent = 'Error accepting load.';
  }
}

//Helpers

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await res.text();
    console.warn('Expected JSON, got:', text);
    throw new Error('Invalid JSON response');
  }
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
