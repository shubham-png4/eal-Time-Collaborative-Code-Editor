const { Server } = require('socket.io');

let io;
const activeRooms = {}; // High-performance in-memory room bucket

const initSocket = (server) => {
    io = new Server(server, {
        // High-End Big Tech Feature: Connection State Recovery
        // Automatically buffers packets during micro-disconnections (e.g., cell tower switching or brief Wi-Fi drops)
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000, // Retain session for 2 minutes
            skipMiddlewares: true
        },
        cors: {
            origin: "*", 
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        // If the socket successfully recovered its session state after a drop
        if (socket.recovered) {
            console.log(`⚡ Session successfully recovered for Socket: ${socket.id}`);
            return;
        }

        console.log(`📡 Client connected: ${socket.id}`);

        socket.on('join_room', ({ roomId, username }) => {
            socket.join(roomId);
            
            if (!activeRooms[roomId]) {
                activeRooms[roomId] = {
                    code: `// Scalable Real-Time Workspace: ${roomId}\nfunction init() {\n    console.log("System operational.");\n}`,
                    users: []
                };
            }

            // Evict old dead connections belonging to the same username if they exist
            activeRooms[roomId].users = activeRooms[roomId].users.filter(u => u.username !== username);
            activeRooms[roomId].users.push({ id: socket.id, username });

            // Push current stable state back to the newly authenticated container
            socket.emit('init_code', activeRooms[roomId].code);

            // Sync structural roster across the entire cluster namespace
            io.to(roomId).emit('user_joined', { 
                username, 
                users: activeRooms[roomId].users 
            });
        });

        // Optimized event handler for localized delta edits
        socket.on('code_change', ({ roomId, code }) => {
            if (activeRooms[roomId]) {
                activeRooms[roomId].code = code;
                // Broadcast updates strictly to other clients in the room to avoid echoes
                socket.to(roomId).emit('code_update', code);
            }
        });

        socket.on('disconnecting', () => {
            socket.rooms.forEach((roomId) => {
                if (activeRooms[roomId]) {
                    activeRooms[roomId].users = activeRooms[roomId].users.filter(u => u.id !== socket.id);
                    io.to(roomId).emit('user_left', { 
                        id: socket.id, 
                        users: activeRooms[roomId].users 
                    });
                    
                    // Memory garbage collection: Clear room allocation if empty
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

module.exports = { initSocket };