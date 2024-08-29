import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getDatabase, ref, onValue, update, get, remove } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
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

// Listen to changes in the room
if (roomCode) {
    const roomRef = ref(db, 'rooms/' + roomCode);

    onValue(roomRef, (snapshot) => {
        const roomData = snapshot.val();
        const players = roomData.players || {};
        const hostId = roomData.host;

        const playerList = document.getElementById('player-list');
        playerList.innerHTML = ''; // Clear existing list

        // Sort the players list, placing the Room Master (host) at the top
        const sortedPlayers = Object.entries(players).sort(([idA], [idB]) => (idA === hostId ? -1 : 1));

        for (const [playerId, playerData] of sortedPlayers) {
            const playerItem = document.createElement('div');

            if (playerId === hostId) {
                playerItem.textContent = `${playerData.email || 'No email'} (Room Master)`;
            } else {
                playerItem.textContent = `${playerData.email || 'No email'} (${playerData.ready ? 'Ready' : 'Not Ready'})`;
            }

            playerList.appendChild(playerItem);
        }

        const startGameBtn = document.getElementById('start-game');
        const readyBtn = document.getElementById('ready-btn');
        const unreadyBtn = document.getElementById('unready-btn');
        const leaveBtn = document.getElementById('leave-btn'); // Leave button

        const currentUserId = auth.currentUser.uid;

        // Show the start game button only for the host
        if (currentUserId === roomData.host) {
            startGameBtn.style.display = 'block';
        } else {
            startGameBtn.style.display = 'none';
        }

        // Listen for game start status and redirect all players
        if (roomData.status === 'started') {
            window.location.href = 'generate.html?roomCode=' + roomCode;
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

        // Add event listeners
        readyBtn.addEventListener('click', handleReadyClick);
        unreadyBtn.addEventListener('click', handleUnreadyClick);
        leaveBtn.addEventListener('click', handleLeaveClick);

        if (startGameBtn.style.display === 'block') {
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

// Function to handle the Leave button click
function handleLeaveClick() {
    const roomCode = new URLSearchParams(window.location.search).get('roomCode');
    const userId = auth.currentUser.uid;
    const roomRef = ref(db, 'rooms/' + roomCode + '/players/' + userId);

    // Remove the player from the room
    remove(roomRef).then(() => {
        console.log('Player removed successfully.');
        checkAndDeleteRoomIfEmpty(roomCode);
    }).catch(error => {
        console.error('Failed to leave room:', error);
    });
}

// Function to check and delete room if empty
function checkAndDeleteRoomIfEmpty(roomCode) {
    const roomRef = ref(db, 'rooms/' + roomCode);

    get(roomRef).then(snapshot => {
        const roomData = snapshot.val();
        const players = roomData.players || {};

        if (Object.keys(players).length === 0) {
            // If there are no players, delete the room
            remove(roomRef)
                .then(() => {
                    console.log('Room deleted successfully.');
                    window.location.href = 'main.html'; // Redirect to the main page after deleting the room
                })
                .catch(error => {
                    console.error('Error deleting room:', error);
                });
        }
    }).catch(error => {
        console.error('Error fetching room data:', error);
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
            // Mark the game as started in the database
            update(roomRef, { status: 'started' }).catch(error => {
                console.error('Failed to update game status:', error);
            });
        }
    }).catch(error => {
        console.error('Error fetching room data:', error);
    });
}
