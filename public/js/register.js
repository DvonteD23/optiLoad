const vehicleTypeEl = document.getElementById('vehicleType');
const vehicleLenEl  = document.getElementById('vehicleLength');

const LENGTHS = {
  cargoVan: [14, 16, 20],
  boxTruck: [16, 20, 26]
};

vehicleTypeEl.addEventListener('change', () => {
  const lenList = LENGTHS[vehicleTypeEl.value] || [];
  vehicleLenEl.innerHTML = lenList
    .map(len => `<option value="${len}">${len} ft</option>`).join('');
});

vehicleTypeEl.dispatchEvent(new Event('change'));
