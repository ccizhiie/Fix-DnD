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


document.getElementById('enter-code').addEventListener('click', function() {
    const code = document.getElementById('room-code').value;
    console.log('roomcode= ' + code)
    joinRoom(code);
});

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
                    // Construct the URL with the room code
                    const redirectUrl = `lobby.html?roomCode=` + roomCode;
                    window.location.href = redirectUrl;
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
