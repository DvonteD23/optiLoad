const form         = document.getElementById('request-form');
const offerBox     = document.getElementById('offer');
const balInput     = document.getElementById('balance-amount');
const balButton    = document.getElementById('balance-btn');
const balDisplay   = document.getElementById('balance'); // from header.ejs

// 1) Balance update handler
balButton.addEventListener('click', async () => {
  const amt = parseFloat(balInput.value);
  if (isNaN(amt) || amt <= 0) {
    return alert('Please enter a valid amount');
  }

  const res = await fetch('/balance', {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ amount: amt })
  });

  if (res.ok) {
    const { balance } = await res.json();
    balDisplay.textContent = `Balance: $${balance.toFixed(2)}`;
    balInput.value = '';
  } else {
    alert('Error updating balance');
  }
});

// 2) Shipment request + offer display
form.addEventListener('submit', async e => {
  e.preventDefault();
  await fetchOffer();
});

async function fetchOffer() {
  offerBox.innerHTML = `<p>Loading shipment…</p>`;

  const data = Object.fromEntries(new FormData(form));
  data.vehicleLength     = Number(data.vehicleLength);
  data.currentLoadLength = Number(data.currentLoadLength || 0);
  data.currentLoadWeight = Number(data.currentLoadWeight || 0);
  data.requestType       = data.requestType === 'partial' ? 'partial' : 'full';

  const res = await fetch('/api/shipments', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(data)
  });
  if (!res.ok) {
    let msg = 'Error requesting load';
    try { msg = (await res.json()).msg; } catch {}
    offerBox.textContent = msg;
    return;
  }

  const load = await res.json();
  displayOffer(load);
  loadMyShipments();
}

function displayOffer(load) {
  offerBox.innerHTML = '';

  //Shipment Info
  const info = document.createElement('p');
  info.className = 'offer-info';
  info.textContent =
    `${load.shippingCompany} — ${load.city}, ${load.state} — ` +
    `${load.loadLength} ft · ${load.loadWeight} lb · ` +
    `${load.distance} mi · $${load.rate.toFixed(2)}/mi`;
  offerBox.appendChild(info);

  const btns = document.createElement('div');
  btns.className = 'buttons';

  const accept = document.createElement('button');
  accept.textContent = 'Accept';
  accept.addEventListener('click', () => decide(true, load._id));
  btns.appendChild(accept);

  const decline = document.createElement('button');
  decline.textContent = 'Decline';
  decline.addEventListener('click', async () => {
    offerBox.innerHTML = `<p>Searching for next shipment…</p>`;
    await new Promise(r => setTimeout(r, 5000));
    fetchOffer();
  });
  btns.appendChild(decline);

  offerBox.appendChild(btns);
}

async function decide(accept, id) {
  if (!accept) return;
  const res = await fetch(`/api/shipments/${id}/accept`, { method:'PUT' });
  if (res.ok) {
    window.location.href = `/transit/${id}`;
  } else {
    offerBox.textContent = 'Error accepting load.';
  }
}

async function loadMyShipments() {
  const tbody = document.getElementById('loads-body');
  const res   = await fetch('/api/shipments');
  if (!res.ok) {
    tbody.innerHTML = `<tr><td colspan="9">Error loading shipments</td></tr>`;
    return;
  }
  const items = await res.json();
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="9">No shipments found</td></tr>`;
    return;
  }

  tbody.innerHTML = items.map(s => `
    <tr>
      <td>${s.shippingCompany}</td>
      <td>${s.loadLength}</td>
      <td>${s.loadWeight}</td>
      <td>${s.distance}</td>
      <td>${s.commodity}</td>
      <td>$${s.rate.toFixed(2)}</td>
      <td>${s.city}</td>
      <td>${s.state}</td>
      <td>${s.status}</td>
    </tr>
  `).join('');
}

loadMyShipments();
