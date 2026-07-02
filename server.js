const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // In production, replace with your specific frontend URL
        methods: ["GET", "POST"]
    }
});

// Mock database to track active rooms and their current code state
const rooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a specific collaboration room
    socket.on('join_room', ({ roomId, username }) => {
        socket.join(roomId);
        
        // Initialize room if it doesn't exist
        if (!rooms[roomId]) {
            rooms[roomId] = {
                code: `// Welcome to Room ${roomId}\nfunction init() {\n    console.log("Hello, World!");\n}`,
                users: []
            };
        }

        // Add user to room list
        rooms[roomId].users.push({ id: socket.id, username });

        // Send the current code state to the newly joined user
        socket.emit('init_code', rooms[roomId].code);

        // Notify everyone else in the room
        io.to(roomId).emit('user_joined', { username, users: rooms[roomId].users });
        console.log(`${username} joined room: ${roomId}`);
    });

    // Handle real-time code modifications
    socket.on('code_change', ({ roomId, code }) => {
        if (rooms[roomId]) {
            rooms[roomId].code = code;
            // Broadcast changes to everyone else in the room
            socket.to(roomId).emit('code_update', code);
        }
    });

    // Handle user disconnects
    socket.on('disconnecting', () => {
        const roomsActive = socket.rooms;
        roomsActive.forEach((roomId) => {
            if (rooms[roomId]) {
                rooms[roomId].users = rooms[roomId].users.filter(u => u.id !== socket.id);
                io.to(roomId).emit('user_left', { id: socket.id, users: rooms[roomId].users });
            }
        });
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Collaborative server running on port ${PORT}`);
});