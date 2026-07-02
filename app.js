let socket;
let editor;
let isLocalChange = false;

const backendUrl = "http://localhost:5000";

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const editorScreen = document.getElementById('editor-screen');
const joinBtn = document.getElementById('join-btn');
const usernameInput = document.getElementById('username-input');
const roomInput = document.getElementById('room-input');
const currentRoomIdDisplay = document.getElementById('current-room-id');
const userList = document.getElementById('user-list');

// Initialize Monaco Editor using AMD loader
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });

joinBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const roomId = roomInput.value.trim();

    if (!username || !roomId) return alert("Please fill out all fields!");

    // Connect to WebSocket Server
    socket = io(backendUrl);

    require(['vs/editor/editor.main'], function () {
        // Initialize the Monaco editor container
        editor = monaco.editor.create(document.getElementById('monaco-editor-root'), {
            value: '',
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true
        });

        // Track local edits and push modifications to server
        editor.onDidChangeModelContent(() => {
            if (!isLocalChange) {
                const currentCode = editor.getValue();
                socket.emit('code_change', { roomId, code: currentCode });
            }
        });

        // Set up WebSockets event bindings
        setupSocketEvents(roomId, username);
    });
});

function setupSocketEvents(roomId, username) {
    socket.emit('join_room', { roomId, username });

    socket.on('init_code', (initialCode) => {
        isLocalChange = true;
        editor.setValue(initialCode);
        isLocalChange = false;
        
        // Swap UI Screens
        authScreen.classList.add('hidden');
        editorScreen.classList.remove('hidden');
        currentRoomIdDisplay.innerText = roomId;
    });

    socket.on('code_update', (updatedCode) => {
        isLocalChange = true;
        const position = editor.getPosition(); // Track cursor position
        editor.setValue(updatedCode);
        editor.setPosition(position);          // Restore cursor position
        isLocalChange = false;
    });

    socket.on('user_joined', ({ users }) => {
        updateUsersSidebar(users);
    });

    socket.on('user_left', ({ users }) => {
        updateUsersSidebar(users);
    });
}

function updateUsersSidebar(users) {
    userList.innerHTML = '';
    users.forEach(user => {
        const li = document.createElement('li');
        li.textContent = `🟢 ${user.username}`;
        userList.appendChild(li);
    });
}