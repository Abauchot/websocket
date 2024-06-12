const socket = io();

let map;
let markers = {};

/**
 * Initializes a map using the Leaflet library.
 *
 * @return {void} This function does not return a value.
 */
function initMap() {
    map = L.map('map').setView([46.603354, 1.888334], 6);
  
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  }

  /**
 * Updates the position of the user by emitting a socket event with the user's 
 * latitude and longitude coordinates if geolocation is supported by the browser.
 * Otherwise, displays an alert message indicating that geolocation is not supported.
 *
 * @return {void} This function does not return a value.
 */
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

  Object.keys(markers).forEach(id => {
    if (!users.find(user => user.id === id)) {
      map.removeLayer(markers[id]);
      delete markers[id];
    }
  });
});

/**
 * Initializes the map and updates the user's position when the window loads.
 *
 * @return {void} This function does not return a value.
 */
window.onload = () => {
  initMap();
  updatePosition();
};



const localVideo = document.createElement('video');
localVideo.autoplay = true;
document.body.appendChild(localVideo);

const peerConnections = {};
const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localVideo.srcObject = stream;
    socket.emit('joinRoom');

    socket.on('offer', (id, description) => {
      const peerConnection = new RTCPeerConnection(configuration);
      peerConnections[id] = peerConnection;

      peerConnection
        .setRemoteDescription(description)
        .then(() => peerConnection.createAnswer())
        .then(sdp => peerConnection.setLocalDescription(sdp))
        .then(() => {
          socket.emit('answer', id, peerConnection.localDescription);
        });

      peerConnection.ontrack = event => {
        const remoteVideo = document.createElement('video');
        remoteVideo.autoplay = true;
        remoteVideo.srcObject = event.streams[0];
        document.body.appendChild(remoteVideo);
      };

      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    });

    socket.on('answer', (id, description) => {
      peerConnections[id].setRemoteDescription(description);
    });

    socket.on('candidate', (id, candidate) => {
      peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('disconnectPeer', id => {
      peerConnections[id].close();
      delete peerConnections[id];
    });
  });
