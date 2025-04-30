initDate();
bindNavigation();
bindAuthForms();
if (document.getElementById('fetch-package')) {
  bindFetchPackage();
}

// Display current date
def initDate() {
  const dateEl = document.getElementById('current-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString();
    dateEl.setAttribute('datetime', new Date().toISOString().split('T')[0]);
  }
}

// Navigation routing via data-route attributes
function bindNavigation() {
  document.querySelectorAll('[data-route]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const route = link.getAttribute('data-route');
      loadRoute(route);
    });
  });
}

async function loadRoute(route) {
  try {
    const res = await fetch(`/api/page/${route}`);
    const html = await res.text();
    document.getElementById('main-content').innerHTML = html;
    if (route === 'account') {
      bindFetchPackage();
      bindNavigation();
    }
  } catch (err) {
    console.error('Routing error:', err);
  }
}

function bindAuthForms() {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if (loginForm) {
    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const data = serializeForm(loginForm);
      await apiPost('/api/login', data);
      loadRoute('account');
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const data = serializeForm(registerForm);
      await apiPost('/api/register', data);
      loadRoute('account');
    });
  }
}

function bindFetchPackage() {
  const btn = document.getElementById('fetch-package');
  const infoEl = document.getElementById('package-info');
  const vehicleSel = document.getElementById('vehicle-select');

  if (!btn) return;
  btn.addEventListener('click', async () => {
    const vehicle = vehicleSel.value;
    if (!vehicle) return;
    try {
      const pkg = await apiGet(`/api/packages?vehicle=${vehicle}`);
      renderPackage(pkg, infoEl, vehicle);
    } catch (err) {
      console.error('Fetch package error:', err);
    }
  });
}

function renderPackage(pkg, container, vehicle) {
  container.innerHTML = `
    <h3>Load for ${vehicle.toUpperCase()}</h3>
    <p><strong>Distance:</strong> ${pkg.distance} miles</p>
    <p><strong>Weight:</strong> ${pkg.weight} lbs</p>
    <p><strong>Commodity:</strong> ${pkg.commodity}</p>
    <p><strong>Rate:</strong> $${pkg.rate}/mile</p>
    <button id="accept-btn">Accept</button>
    <button id="decline-btn">Decline</button>
  `;

  document.getElementById('accept-btn').addEventListener('click', () => handleAccept(pkg));
  document.getElementById('decline-btn').addEventListener('click', () => container.innerHTML = '');
}

async function handleAccept(pkg) {
  try {
    await apiPost('/api/accept', pkg);
    alert('Load accepted!');
  } catch (err) {
    console.error('Accept error:', err);
  }
}

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

async function apiPost(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

function serializeForm(form) {
  return Array.from(form.elements)
    .filter(el => el.name)
    .reduce((obj, el) => ({ ...obj, [el.name]: el.value }), {});
}