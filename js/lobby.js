import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getDatabase, ref, onValue, update, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyAijQZfI-UPIuxxYLIY7MQmHzKsdUHAkpc",
    authDomain: "dungeonanddragons-12ee8.firebaseapp.com",
    databaseURL: "https://dungeonanddragons-12ee8-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "dungeonanddragons-12ee8",
    storageBucket: "dungeonanddragons-12ee8.appspot.com",
    messagingSenderId: "1010963587070",
    appId: "1:1010963587070:web:bcb761dc0cba09a52d6aaf",
    measurementId: "G-9HVXKJ3NSZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const urlParams = new URLSearchParams(window.location.search);
const roomCode = urlParams.get('roomCode');

if (roomCode) {
    const roomRef = ref(db, 'rooms/' + roomCode);

    onValue(roomRef, (snapshot) => {
        const roomData = snapshot.val();
        const players = roomData.players || {};
        const hostId = roomData.host;

        const playerList = document.getElementById('player-list');
        playerList.innerHTML = ''; // Clear existing list

        for (const [playerId, playerData] of Object.entries(players)) {
            const playerItem = document.createElement('div');

            // Display "Room Master" for host and "Not Ready" for others
            if (playerId === hostId) {
                playerItem.textContent = `${playerData.email || 'No email'} (Room Master)`;
            } else {
                playerItem.textContent = `${playerData.email || 'No email'} (${playerData.ready ? 'Ready' : 'Not Ready'})`;
            }

            playerList.appendChild(playerItem);
        }

        const startGameBtn = document.getElementById('start-game');
        const readyBtn = document.getElementById('ready-btn');
        const unreadyBtn = document.getElementById('unready-btn'); // Add the unready button
        const joinButton = document.getElementById('enter-code'); // Use the existing button ID for joining rooms

        const currentUserId = auth.currentUser.uid;

        // Show the start game button only for the host
        if (currentUserId === roomData.host) {
            startGameBtn.style.display = 'block';
        } else {
            startGameBtn.style.display = 'none';
        }

        // Show the ready and unready buttons based on player's ready status
        if (currentUserId !== roomData.host) {
            if (players[currentUserId] && players[currentUserId].ready) {
                readyBtn.style.display = 'none';
                unreadyBtn.style.display = 'block'; // Show unready button if already ready
            } else {
                readyBtn.style.display = 'block';
                unreadyBtn.style.display = 'none'; // Hide unready button if not ready
            }
        } else {
            readyBtn.style.display = 'none'; // Hide the ready button for the host
            unreadyBtn.style.display = 'none'; // Hide the unready button for the host
        }

        // Check if join button exists before trying to modify it
        if (joinButton) {
            // Disable the "Join Room" button if the room is full
            if (Object.keys(players).length >= 4) {
                joinButton.disabled = true;
                joinButton.style.display = 'none'; // Hide the button if the room is full
            } else {
                joinButton.disabled = false;
                joinButton.style.display = 'block'; // Show the button if the room is not full
            }
        }

        // Add event listener for "Ready" button
        if (readyBtn.style.display === 'block') {
            readyBtn.removeEventListener('click', handleReadyClick); // Remove any existing event listener
            readyBtn.addEventListener('click', handleReadyClick);
        }

        // Add event listener for "Unready" button
        if (unreadyBtn.style.display === 'block') {
            unreadyBtn.removeEventListener('click', handleUnreadyClick); // Remove any existing event listener
            unreadyBtn.addEventListener('click', handleUnreadyClick);
        }

        // Add event listener for "Start Game" button
        if (startGameBtn.style.display === 'block') {
            startGameBtn.removeEventListener('click', handleStartGameClick); // Remove any existing event listener
            startGameBtn.addEventListener('click', handleStartGameClick);
        }
    });
}

// Function to handle the Ready button click
function handleReadyClick() {
    const roomCode = new URLSearchParams(window.location.search).get('roomCode');
    const userId = auth.currentUser.uid;
    const roomRef = ref(db, 'rooms/' + roomCode + '/players/' + userId);

    update(roomRef, { ready: true }).catch(error => {
        console.error('Failed to update ready status:', error);
    });
}

// Function to handle the Unready button click
function handleUnreadyClick() {
    const roomCode = new URLSearchParams(window.location.search).get('roomCode');
    const userId = auth.currentUser.uid;
    const roomRef = ref(db, 'rooms/' + roomCode + '/players/' + userId);

    update(roomRef, { ready: false }).catch(error => {
        console.error('Failed to update unready status:', error);
    });
}

// Function to handle the Start Game button click
function handleStartGameClick() {
    const roomCode = new URLSearchParams(window.location.search).get('roomCode');
    const roomRef = ref(db, 'rooms/' + roomCode);
    
    get(roomRef).then(snapshot => {
        const roomData = snapshot.val();
        const players = roomData.players || {};

        const readyPlayers = Object.values(players).filter(player => player.ready).length;
        
        if (readyPlayers < 3) {
            alert('Not enough players ready to start the game.');
        } else {
            // Start the game logic here
            alert('Game started!');
        }
    }).catch(error => {
        console.error('Error fetching room data:', error);
    });
}
