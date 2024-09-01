import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getDatabase, ref, onValue, update, set } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

// Firebase configuration
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

const roomCode = getRoomCodeFromURL();
const roomRef = ref(db, `rooms/${roomCode}`);
const enemyRef = ref(db, `rooms/${roomCode}/enemy`);
const playersRef = ref(db, `rooms/${roomCode}/players`);
const turnRef = ref(db, `rooms/${roomCode}/turn`);

let turnOrder = [];
let currentTurnIndex = 0;

// Dice rolling functions
function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

function rollMultipleDice(sides, numberOfRolls) {
    let total = 0;
    for (let i = 0; i < numberOfRolls; i++) {
        total += rollDie(sides);
    }
    return total;
}

// Fetch and display enemy and player HP
function displayHealthData() {
    onValue(enemyRef, (snapshot) => {
        const enemy = snapshot.val();
        if (enemy) {
            document.getElementById('enemyName').textContent = enemy.name;
            document.getElementById('enemyHP').textContent = `HP: ${enemy.stats.currentHP}`;
        }
    });

    onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        if (players) {
            const playerList = document.getElementById('playerList');
            playerList.innerHTML = '';
            turnOrder = [];
            for (const playerId in players) {
                const player = players[playerId];
                const character = player.characters;  // Access character data
                const stats = character.stats;  // Access stats, including currentHP
                
                if (stats.currentHP > 0) {  // Check if player is alive
                    const playerDiv = document.createElement('div');
                    playerDiv.textContent = `${player.email}: HP ${stats.currentHP}`;  // Display player email and current HP
                    playerList.appendChild(playerDiv);
                    turnOrder.push(playerId);
                }
            }
            // Add enemy turns in between players
            turnOrder = insertEnemyTurns(turnOrder);
            updateTurnOrderInDB();
        }
    });
}

// Add enemy turns after every player's turn
function insertEnemyTurns(order) {
    const extendedOrder = [];
    for (let i = 0; i < order.length; i++) {
        extendedOrder.push(order[i]);
        extendedOrder.push('enemy');  // Insert enemy turn after each player
    }
    return extendedOrder;
}

// Get the room code from the URL
function getRoomCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('roomcode');
}

function updateTurnOrderInDB() {
    set(turnRef, {
        order: turnOrder,
        currentIndex: currentTurnIndex
    }).then(() => {
        console.log('Turn order updated in DB.');
    }).catch((error) => {
        console.error('Failed to update turn order in DB:', error);
    });
}

function nextTurn() {
    checkIfGameOver((isGameOver) => {
        if (isGameOver) {
            showVictoryNotification();
        } else {
            onValue(turnRef, (snapshot) => {
                const turnData = snapshot.val();
                if (turnData) {
                    currentTurnIndex = turnData.currentIndex;
                    turnOrder = turnData.order;
                    const currentTurn = turnOrder[currentTurnIndex];
                    console.log(`Current turn: ${currentTurn}`);  // Debug logging

                    if (currentTurn === 'enemy') {
                        console.log('Enemy’s turn');  // Debug logging
                        performEnemyAction();
                    } else {
                        enablePlayerActions(currentTurn);
                    }

                    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
                    updateTurnOrderInDB();
                }
            }, { onlyOnce: true });
        }
    });
}

function rebuildTurnOrder() {
    console.log('Rebuilding turn order.');
    turnOrder = insertEnemyTurns(turnOrder);
    updateTurnOrderInDB();
}

// Check if the game is over (enemy HP reaches 0)
function checkIfGameOver(callback) {
    onValue(enemyRef, (snapshot) => {
        const enemy = snapshot.val();
        if (enemy) {
            const isGameOver = enemy.stats.currentHP <= 0;
            callback(isGameOver);
        } else {
            callback(false);  // No enemy data found, game is not over
        }
    });
}

// Show victory notification
function showVictoryNotification() {
    console.log('Victory condition met');  // Debug logging
    document.getElementById('victoryNotification').style.display = 'block';
    document.getElementById('leaveButton').style.display = 'inline';
}

// Perform enemy action (attack a player)
function performEnemyAction() {
    onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        if (players) {
            const alivePlayers = Object.keys(players).filter(playerId => players[playerId].characters.stats.currentHP > 0);
            if (alivePlayers.length > 0) {
                // Select the first alive player
                const playerId = alivePlayers[0];
                const newHP = Math.max(0, players[playerId].characters.stats.currentHP - rollDie(10)); // Randomized damage (e.g., d10)
                
                update(ref(db, `rooms/${roomCode}/players/${playerId}/characters/stats`), { currentHP: newHP }).then(() => {
                    console.log(`Enemy attacked ${players[playerId].email}, new HP: ${newHP}`);
                    nextTurn();  // Proceed to the next turn
                });
            }
        }
    }, { onlyOnce: true });
}

// Enable player actions
function enablePlayerActions(playerId) {
    const userId = auth.currentUser.uid;

    if (userId === playerId) {
        document.getElementById('attackButton').disabled = false;
        document.getElementById('rangedAttackButton').disabled = false;
    }
}

// Handle player attack (melee)
document.getElementById('meleeAttackRollButton').addEventListener('click', () => {
    document.getElementById('meleeAttackRollButton').disabled = true;
    const attackRoll = rollDie(20); // d20 roll for attack

    // Assume AC 15 for the enemy
    if (attackRoll >= 10) {
        // Successful attack, proceed to damage roll
        const damageRoll = rollMultipleDice(6, 2); // Example: 2d6 for a greatsword
        updateEnemyHP(damageRoll);
    } else {
        console.log('Melee attack missed!');
        nextTurn();  // Missed attack, proceed to the next turn
    }
});

// Handle player ranged attack
document.getElementById('rangedAttackRollButton').addEventListener('click', () => {
    document.getElementById('rangedAttackRollButton').disabled = true;
    const attackRoll = rollDie(20); // d20 roll for attack

    if (attackRoll >= 10) {
        // Successful attack
        const damageRoll = rollMultipleDice(8, 1); // Example: 1d8 for a bow
        updateEnemyHP(damageRoll);
    } else {
        console.log('Ranged attack missed!');
        nextTurn();  // Missed attack, proceed to the next turn
    }
});

// Function to handle the Leave button click
document.getElementById('leaveButton').addEventListener('click', () => {
    const roomCode = new URLSearchParams(window.location.search).get('roomcode');
    const userId = auth.currentUser.uid;
    const roomRef = ref(db, 'rooms/' + roomCode + '/players/' + userId);

    // Remove the player from the room
    remove(roomRef).then(() => {
        console.log('Player removed successfully.');
        checkAndDeleteRoomIfEmpty(roomCode);
    }).catch(error => {
        console.error('Failed to leave room:', error);
    });
})

// Update enemy HP after player attack
function updateEnemyHP(damage) {
    onValue(enemyRef, (snapshot) => {
        const enemy = snapshot.val();
        if (enemy) {
            const newHP = Math.max(0, enemy.stats.currentHP - damage);  // Apply damage
            update(ref(db, `rooms/${roomCode}/enemy/stats`), { currentHP: newHP }).then(() => {
                console.log(`Player dealt ${damage} damage to the enemy, new HP: ${newHP}`);
                nextTurn();  // Proceed to the next turn
            });
        }
    }, { onlyOnce: true });
}

// Initialize the game
displayHealthData();
nextTurn();
