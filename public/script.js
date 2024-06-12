const socket = io();

let map;
let markers = {};
let localStream;
let peerConnection;
const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
};

/**
 * Initializes the map and sets the initial view to a specific location.
 *
 * @return {void} This function does not return anything.
 */
function initMap() {
  map = L.map('map').setView([46.603354, 1.888334], 6);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

/**
 * A function that updates the position using geolocation if available, and emits the updated position using a socket.
 *
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

  // delete markers that are no longer in the users list
  Object.keys(markers).forEach(id => {
    if (!users.find(user => user.id === id)) {
      map.removeLayer(markers[id]);
      delete markers[id];
    }
  });
});

/**
 * Initializes the map and updates the position of the user when the window loads.
 *
 * @return {void} This function does not return anything.
 */
window.onload = () => {
  initMap();
  updatePosition();
  startVideoConference();
};

/**
 * Starts the video conference by getting the local stream and setting up the peer connection.
 *
 * @return {void} This function does not return anything.
 */
function startVideoConference() {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(async stream => {
      localStream = stream;
      document.getElementById('localVideo').srcObject = localStream;

      peerConnection = new RTCPeerConnection(configuration);
      localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

      peerConnection.ontrack = (event) => {
        document.getElementById('remoteVideo').srcObject = event.streams[0];
      };

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('candidate', event.candidate);
        }
      };

      socket.on('offer', async (offer) => {
        if (!peerConnection.currentRemoteDescription) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          socket.emit('answer', answer);
        }
      });

      socket.on('answer', (answer) => {
        peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      });

      socket.on('candidate', (candidate) => {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      });

      socket.emit('offer', await createOffer());
    })
    .catch(error => {
      console.error('Error accessing media devices.', error);
    });
}

/**
 * Creates an offer for WebRTC peer connection.
 *
 * @return {Promise} A promise that resolves to the created offer.
 */
async function createOffer() {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  return offer;
}
