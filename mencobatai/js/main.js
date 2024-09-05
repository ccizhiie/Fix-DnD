import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getDatabase, ref, set, update, get, query, orderByChild, equalTo, limitToFirst } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { getAuth, signOut } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

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

document.getElementById('logout-btn').addEventListener('click', () => {
    signOut(auth).then(() => {
        window.location.href = 'login.html'; // Redirect to login page after logout
    }).catch((error) => {
        console.error('Logout Error:', error);
        alert('Logout failed: ' + error.message);
    });
});

document.getElementById('quickplay').addEventListener('click', function() {
    joinRandomRoom();
});

document.getElementById('enter-code').addEventListener('click', function() {
    const code = document.getElementById('room-code').value;
    joinRoom(code);
});

document.getElementById('host-game').addEventListener('click', function() {
    const userId = auth.currentUser.uid;
    const userEmail = auth.currentUser.email; // Get the current user's email
    const roomCode = generateRoomCode();

    if (!userEmail) {
        console.error('User email not found.');
        return;
    }

    set(ref(db, 'rooms/' + roomCode), {
        host: userId,
        players: { 
            [userId]: { 
                email: userEmail // Store the user's email
            } 
        },
        status: 'waiting'
    }).then(() => {
        storeEnemyData(roomCode); // Call storeEnemyData when hosting a game
        window.location.href = 'lobby.html?roomCode=' + roomCode;
    }).catch(error => {
        console.error('Error creating room:', error);
    });
});

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function joinRoom(roomCode) {
    const userId = auth.currentUser.uid;
    const userEmail = auth.currentUser.email; // Get the user's email
    const roomRef = ref(db, 'rooms/' + roomCode);

    get(roomRef).then(snapshot => {
        if (snapshot.exists()) {
            const roomData = snapshot.val();
            const players = roomData.players || {};  // Use existing players or start with an empty object

            if (Object.keys(players).length < 4) { // Check if the room has fewer than 4 players
                // Add the new player to the players object
                players[userId] = {
                    email: userEmail,
                    ready: false
                };

                // Update the players list in the database
                update(roomRef, { players: players }).then(() => {
                    window.location.href = 'lobby.html?roomCode=' + roomCode;
                }).catch(error => {
                    console.error('Failed to join room:', error);
                    alert('Failed to join room.');
                });
            } else {
                // Room is full
                alert('The room is full. Please choose another room.');
            }
        } else {
            console.error('Room not found:', roomCode);
            alert('Room not found.');
        }
    }).catch(error => {
        console.error('Error fetching room:', error);
    });
}

function joinRandomRoom() {
    // Query for rooms with status 'waiting'
    const roomsRef = query(ref(db, 'rooms'), orderByChild('status'), equalTo('waiting'));
    
    get(roomsRef).then(snapshot => {
        if (snapshot.exists()) {
            const availableRooms = [];

            snapshot.forEach(roomSnapshot => {
                const roomData = roomSnapshot.val();
                const players = roomData.players || {};

                // Check if the room has less than 4 players
                if (Object.keys(players).length < 4) {
                    availableRooms.push(roomSnapshot.key);
                }
            });

            if (availableRooms.length > 0) {
                // Join the first available room
                const roomCode = availableRooms[0];
                console.log(`Joining room: ${roomCode}`); // Debugging line
                joinRoom(roomCode);
            } else {
                console.warn('No available rooms with slots found in snapshot.');
                alert('No available rooms with slots.');
            }
        } else {
            console.error('No rooms found with status "waiting".');
            alert('No available rooms with slots.');
        }
    }).catch(error => {
        console.error('Error fetching rooms:', error);
        alert('Error finding available rooms.');
    });
}


function storeEnemyData(roomCode) {
    const enemyRef = ref(db, `rooms/${roomCode}/enemy`);

    const enemyData = {
        name: "Bjornsonn",
        type: "humanoid",
        level: 3,
        stats: {
            currentHP: 28,
            maxHP: 28,
            strength: 16,
            dexterity: 14,
            constitution: 14,
            intelligence: 10,
            wisdom: 12,
            charisma: 8,
            meleeDamage: 8,
            attackStat: "strength",
            levelBonus: 0
        }
    };

    set(enemyRef, enemyData).then(() => {
        console.log('Enemy data stored successfully.');
    }).catch(error => {
        console.error('Error storing enemy data:', error);
    });
}
