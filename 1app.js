let socket;
let editor;
let isRemoteChange = false; // System lock flag to prevent recursive ping-pong echo loops

const backendUrl = "http://localhost:5000";

const authScreen = document.getElementById('auth-screen');
const editorScreen = document.getElementById('editor-screen');
const joinBtn = document.getElementById('join-btn');
const usernameInput = document.getElementById('username-input');
const roomInput = document.getElementById('room-input');
const currentRoomIdDisplay = document.getElementById('current-room-id');
const userList = document.getElementById('user-list');

// Initialize Monaco Engine using AMD Module architecture
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });

joinBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const roomId = roomInput.value.trim();

    if (!username || !roomId) return alert("Please specify valid room access credentials!");

    // Instantiate high-performance WebSocket connection
    socket = io(backendUrl);

    require(['vs/editor/editor.main'], function () {
        editor = monaco.editor.create(document.getElementById('monaco-editor-root'), {
            value: '',
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 14,
            minimap: { enabled: true },
            cursorBlinking: "smooth"
        });

        // Intercept native keystrokes dynamically
        editor.onDidChangeModelContent((event) => {
            // Prevent pushing changes to the server if the modification came FROM the server
            if (!isRemoteChange) {
                const updatedContent = editor.getValue();
                socket.emit('code_change', { roomId, code: updatedContent });
            }
        });

        setupSocketEvents(roomId, username);
    });
});

function setupSocketEvents(roomId, username) {
    socket.emit('join_room', { roomId, username });

    socket.on('init_code', (initialCode) => {
        isRemoteChange = true;
        editor.setValue(initialCode);
        isRemoteChange = false;
        
        authScreen.classList.add('hidden');
        editorScreen.classList.remove('hidden');
        currentRoomIdDisplay.innerText = roomId;
    });

    // Big Tech Solution: Non-destructive localized text injections
    socket.on('code_update', (updatedCode) => {
        if (editor.getValue() === updatedCode) return;

        isRemoteChange = true;
        
        // Target full range context of the document space
        const model = editor.getModel();
        const fullRange = model.getFullModelRange();
        
        // Senior Dev Pattern: executeEdits patches changes seamlessly.
        // This preserves the local user's undo/redo history stack and stops the cursor from jumping to line 1!
        editor.executeEdits("remote-sync", [{
            range: fullRange,
            text: updatedCode,
            forceMoveMarkers: true // Safely pushes other users' remote cursors out of the way
        }]);

        isRemoteChange = false;
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