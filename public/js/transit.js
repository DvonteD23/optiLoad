// public/js/transit.js

document.addEventListener('DOMContentLoaded', () => {
  // Find the button and the balance span in the nav
  const deliveredBtn = document.getElementById('delivered-button');
  const navBalance   = document.getElementById('balance');

  if (!deliveredBtn) {
    console.error('transit.js delivered-button element not found');
    return;
  }

  const shipmentId = deliveredBtn.dataset.id;
  if (!shipmentId) {
    console.error('transit.js data-id missing on delivered-button');
    return;
  }

  deliveredBtn.addEventListener('click', async () => {
    try {
      // Send the PUT to update status → delivered
      const res = await fetch(`/api/shipments/${shipmentId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'delivered' })
      });

      const data = await res.json();
      console.log('transit.js response data:', data);

      if (!res.ok) {
        return alert(`Error completing delivery: ${data.msg || 'Unknown error'}`);
      }

      // Update the navbar balance if provided
      if (typeof data.balance === 'number') {
        navBalance.textContent = `Balance: $${data.balance.toFixed(2)}`;
      } else {
        console.warn('transit.js balance is not a number:', data.balance);
      }

      alert('Delivery confirmed! Your balance has been updated.');
      window.location.href = '/dashboard';

    } catch (err) {
      console.error('transit.js fetch error:', err);
      alert('Error completing delivery. Please try again.');
    }
  });
});
