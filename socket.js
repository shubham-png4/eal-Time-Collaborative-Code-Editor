const { Server } = require('socket.io');

let io;
const activeRooms = {}; // Persistent in-memory store for active room states

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // In production, restrict this to your frontend domain
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`📡 Client connected: ${socket.id}`);

        // Handle room joining
        socket.on('join_room', ({ roomId, username }) => {
            socket.join(roomId);
            
            // Initialize room if it doesn't exist
            if (!activeRooms[roomId]) {
                activeRooms[roomId] = {
                    code: `// Connected to Room: ${roomId}\nfunction main() {\n    console.log("Collaborative session active!");\n}`,
                    users: []
                };
            }

            // Prevent duplicate tracking of the same socket connection
            activeRooms[roomId].users = activeRooms[roomId].users.filter(u => u.id !== socket.id);
            activeRooms[roomId].users.push({ id: socket.id, username });

            // Sync current state to the joining user
            socket.emit('init_code', activeRooms[roomId].code);

            // Broadcast updated roster to room members
            io.to(roomId).emit('user_joined', { 
                username, 
                users: activeRooms[roomId].users 
            });
        });

        // Handle real-time keystroke document synchronization
        socket.on('code_change', ({ roomId, code }) => {
            if (activeRooms[roomId]) {
                activeRooms[roomId].code = code;
                // Broadcast updates strictly to other clients in the room
                socket.to(roomId).emit('code_update', code);
            }
        });

        // Handle disconnection clean up
        socket.on('disconnecting', () => {
            socket.rooms.forEach((roomId) => {
                if (activeRooms[roomId]) {
                    activeRooms[roomId].users = activeRooms[roomId].users.filter(u => u.id !== socket.id);
                    io.to(roomId).emit('user_left', { 
                        id: socket.id, 
                        users: activeRooms[roomId].users 
                    });
                    
                    // Optional: Clean up memory if room becomes empty
                    if (activeRooms[roomId].users.length === 0) {
                        delete activeRooms[roomId];
                    }
                }
            });
            console.log(`🔌 Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

const getIo = () => {
    if (!io) {
        throw new Error("Socket.io has not been initialized yet!");
    }
    return io;
};

module.exports = { initSocket, getIo };