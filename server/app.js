const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

let users = [];

app.post('/api/position', (req, res) => {
  const { id, position } = req.body;
  const user = users.find(u => u.id === id);
  if (user) {
    user.position = position;
  } else {
    users.push({ id, position });
  }
  io.emit('updatePositions', users); // Envoyer les positions mises à jour à tous les clients
  res.sendStatus(200);
});

app.get('/api/positions', (req, res) => {
  res.json(users);
});

io.on('connection', (socket) => {
  console.log('Nouvelle connexion client');

  // Envoyer les positions actuelles au nouveau client
  socket.emit('updatePositions', users);

  socket.on('updatePosition', (pos) => {
    const user = users.find(u => u.id === socket.id);
    if (user) {
      user.position = pos;
    } else {
      users.push({ id: socket.id, position: pos });
    }
    io.emit('updatePositions', users);
  });

  socket.on('disconnect', () => {
    users = users.filter(u => u.id !== socket.id);
    io.emit('updatePositions', users);
    console.log('Client déconnecté');
  });
});

server.listen(port, () => {
  console.log(`Serveur en écoute sur http://localhost:${port}`);
});
