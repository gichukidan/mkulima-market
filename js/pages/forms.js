(function(){
  function appendMessage(text, isError){
    var block = document.getElementById('formStatus');
    if (!block) return;
    block.textContent = text;
    block.style.color = isError ? '#b42318' : '#164B35';
    block.style.display = 'block';
  }

  function handleFetch(url, payload, successMessage){
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    }).then(async function (res) {
      const data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }
      appendMessage(successMessage, false);
      return data;
    });
  }

  const sellerForm = document.getElementById('sellerForm');
  if (sellerForm) {
    sellerForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const formData = new FormData(sellerForm);
      const payload = {
        title: formData.get('title'),
        commodity: formData.get('commodity'),
        grade: formData.get('grade'),
        quantityKg: Number(formData.get('quantityKg')),
        pricePerKg: Number(formData.get('pricePerKg')),
        unit: formData.get('unit'),
        location: formData.get('location'),
        description: formData.get('description'),
        status: formData.get('status')
      };

      handleFetch('/api/listings', payload, 'Listing created successfully.')
        .then(function () { sellerForm.reset(); })
        .catch(function (error) { appendMessage(error.message, true); });
    });
  }

  const transporterForm = document.getElementById('transporterForm');
  if (transporterForm) {
    transporterForm.addEventListener('submit', function (event) {
      event.preventDefault();
      const formData = new FormData(transporterForm);
      const payload = {
        routeName: formData.get('routeName'),
        origin: formData.get('origin'),
        destination: formData.get('destination'),
        vehicle: formData.get('vehicle'),
        capacityKg: Number(formData.get('capacityKg')),
        rate: Number(formData.get('rate')),
        serviceDays: formData.get('serviceDays'),
        description: formData.get('description')
      };

      handleFetch('/api/routes', payload, 'Transport route created successfully.')
        .then(function () { transporterForm.reset(); })
        .catch(function (error) { appendMessage(error.message, true); });
    });
  }
})();
