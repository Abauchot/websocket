const socket = io();

let map;
let markers = {};

function initMap() {
  map = L.map('map').setView([46.603354, 1.888334], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

function updatePosition() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition((position) => {
      const pos = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      socket.emit('updatePosition', pos);
    });
  } else {
    alert('Geolocation is not supported by this browser.');
  }
}

socket.on('updatePositions', (users) => {
  users.forEach(user => {
    if (!markers[user.id]) {
      markers[user.id] = L.marker(user.position).addTo(map);
    } else {
      markers[user.id].setLatLng(user.position);
    }
  });

  // Supprimer les marqueurs des utilisateurs déconnectés
  Object.keys(markers).forEach(id => {
    if (!users.find(user => user.id === id)) {
      map.removeLayer(markers[id]);
      delete markers[id];
    }
  });
});

window.onload = () => {
  initMap();
  updatePosition();
};
