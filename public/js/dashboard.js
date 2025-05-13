const form     = document.getElementById('request-form');
const offerBox = document.getElementById('offer');

form.addEventListener('submit', async e => {
  e.preventDefault();
  await fetchOffer();
});

async function fetchOffer() {
  offerBox.textContent = 'Loading…';
  const data = Object.fromEntries(new FormData(form));

  data.vehicleType       = data.vehicleType.toLowerCase();
  data.vehicleLength     = parseInt(data.vehicleLength, 10);
  data.currentLoadLength = 0;
  data.currentLoadWeight = 0;
  data.requestType       = data.requestType === 'partial' ? 'partial' : 'full';

  const res = await fetch('/api/shipments/request', {
    method:  'POST',
    headers: { 'Content-Type':'application/json' },
    body:    JSON.stringify(data)
  });

  if (!res.ok) {
    const { msg='Error requesting shipment' } = await res.json().catch(()=>({}));
    return void (offerBox.textContent = msg);
  }

  const s = await res.json();
  displayOffer(s);
  loadMyShipments();
}

function displayOffer(s) {
  offerBox.innerHTML = `
    <p>${s.shippingCompany}: ${s.loadLength} ft · ${s.loadWeight} lb · 
       ${s.distance} mi · $${s.rate.toFixed(2)}/mi</p>
  `;

  const acceptBtn = document.createElement('button');
  acceptBtn.textContent = 'Accept';
  acceptBtn.onclick = () => decide(true, s._id);
  offerBox.appendChild(acceptBtn);
//Decline offer
  const declineBtn = document.createElement('button');
  declineBtn.textContent = 'Decline';
  declineBtn.onclick = () => fetchOffer();
  offerBox.appendChild(declineBtn);
}

async function decide(accept, id) {
  if (!accept) return;
  const res = await fetch(`/api/shipments/${id}/accept`, { method:'PUT' });
  if (res.ok) {
    window.location.href = `/transit/${id}`;
  } else {
    offerBox.textContent = 'Error accepting shipment.';
  }
}

async function loadMyShipments() {
  const tbody = document.getElementById('loads-body');
  const res   = await fetch('/api/shipments');
  if (!res.ok) {
    tbody.innerHTML = `<tr><td colspan="8">Error loading shipments</td></tr>`;
    return;
  }
  const items = await res.json().catch(()=>[]);
  if (!items.length) {
    tbody.innerHTML = `<tr><td colspan="8">No shipments found</td></tr>`;
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
      <td>${s.status}</td>
      <td>${s.status==='available'
          ? `<button data-id="${s._id}" class="accept-btn">Accept</button>`
          : ''}</td>
    </tr>
  `).join('');
  document.querySelectorAll('.accept-btn').forEach(btn =>
    btn.onclick = () => decide(true, btn.dataset.id)
  );
}

// initial fetch
loadMyShipments();
