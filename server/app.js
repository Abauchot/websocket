const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;

// Middleware to parse JSON and serve static files
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

let users = [];

/**
 * Handles incoming POST requests to update a user's position.
 * Adds the user if they don't exist, otherwise updates their position.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {void} This function does not return anything.
 */
app.post('/api/position', (req, res) => {
  const { id, position } = req.body;
  const user = users.find(u => u.id === id);
  if (user) {
    user.position = position;
  } else {
    users.push({ id, position });
  }
  io.emit('updatePositions', users); // Send updated positions to all clients
  res.sendStatus(200);
});

/**
 * Handles incoming GET requests to retrieve all user positions.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @return {void} This function does not return anything.
 */
app.get('/api/positions', (req, res) => {
  res.json(users);
});

// Handle new client connections
io.on('connection', (socket) => {
  console.log('New client connection');

  // Send current positions to the new client
  socket.emit('updatePositions', users);

  /**
   * Updates the user's position when 'updatePosition' event is received.
   *
   * @param {Object} pos - The position object.
   * @return {void} This function does not return anything.
   */
  socket.on('updatePosition', (pos) => {
    const user = users.find(u => u.id === socket.id);
    if (user) {
      user.position = pos;
    } else {
      users.push({ id: socket.id, position: pos });
    }
    io.emit('updatePositions', users);
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    users = users.filter(u => u.id !== socket.id);
    io.emit('updatePositions', users);
    console.log('Client disconnected');
  });

  // Handle WebRTC signaling messages
  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', data);
  });

  socket.on('answer', (data) => {
    socket.broadcast.emit('answer', data);
  });

  socket.on('candidate', (data) => {
    socket.broadcast.emit('candidate', data);
  });
});

// Start the server and listen on the specified port
server.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
