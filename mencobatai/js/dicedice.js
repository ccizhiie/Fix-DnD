import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getDatabase, ref, onValue, update, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
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

let currentTurnIndex = 0;
let turnOrder = [];

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
                const character = player.characters;
                const stats = character.stats;
                
                if (stats.currentHP > 0) {
                    const playerDiv = document.createElement('div');
                    playerDiv.textContent = `${player.email}: HP ${stats.currentHP}`;
                    playerList.appendChild(playerDiv);
                    turnOrder.push(playerId);
                }
            }
            turnOrder = insertEnemyTurns(turnOrder);
            console.log('Initial Turn Order:', turnOrder);  // Debugging line
        }
    });
}

// Add enemy turns after every player's turn
function insertEnemyTurns(order) {
    const extendedOrder = [];
    for (let i = 0; i < order.length; i++) {
        extendedOrder.push(order[i]);
        extendedOrder.push('enemy');  
    }
    console.log('Extended Turn Order:', extendedOrder);  // Debugging line
    return extendedOrder;
}

// Initialize the turn order and save to Firebase
function initializeTurnOrder() {
    get(playersRef).then((snapshot) => {
        const players = snapshot.val() || {};
        let playerIds = Object.keys(players);

        turnOrder = insertEnemyTurns(playerIds);
        currentTurnIndex = 0;  // Start with the first turn

        updateTurnOrderInDB();
    }).catch((error) => {
        console.error('Error initializing turn order:', error);
    });
}

// Get the room code from the URL
function getRoomCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('roomcode');
}

function updateTurnOrderInDB() {
    update(turnRef, {
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
                    console.log(`Current turn index: ${currentTurnIndex}, Turn: ${currentTurn}`);  

                    if (currentTurn === 'enemy') {
                        console.log('Enemy’s turn');  
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
            callback(false);  
        }
    });
}

// Show victory notification
function showVictoryNotification() {
    console.log('Victory condition met');  
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
                const playerId = alivePlayers[0];
                const newHP = Math.max(0, players[playerId].characters.stats.currentHP - rollMultipleDice(6, 2));
                
                update(ref(db, `rooms/${roomCode}/players/${playerId}/characters/stats`), { currentHP: newHP }).then(() => {
                    console.log(`Enemy attacked ${players[playerId].email}, new HP: ${newHP}`);
                    nextTurn();
                });
            }
        }
    }, { onlyOnce: true });
}

// Update enemy HP after player attack
function updateEnemyHP(damage) {
    onValue(enemyRef, (snapshot) => {
        const enemy = snapshot.val();
        if (enemy) {
            const newHP = Math.max(0, enemy.stats.currentHP - damage);  
            update(ref(db, `rooms/${roomCode}/enemy/stats`), { currentHP: newHP }).then(() => {
                console.log(`Player dealt ${damage} damage to the enemy, new HP: ${newHP}`);
                nextTurn();  
            });
        }
    }, { onlyOnce: true });
}

// Enable player actions
function enablePlayerActions(playerId) {
    const userId = auth.currentUser.uid;

    if (userId === playerId) {
        document.getElementById('attackButton').disabled = false;
        document.getElementById('rangedAttackButton').disabled = false;
        console.log('Player actions enabled for:', playerId);
    } else {
        document.getElementById('attackButton').disabled = true;
        document.getElementById('rangedAttackButton').disabled = true;
        console.log('Player actions disabled for:', playerId);
    }
}

// Handle player attack (melee)
document.getElementById('meleeAttackRollButton').addEventListener('click', () => {
    document.getElementById('meleeAttackRollButton').disabled = true;
    const attackRoll = rollDie(20);

    if (attackRoll >= 10) {
        const damageRoll = rollMultipleDice(6, 2);
        updateEnemyHP(damageRoll);
    } else {
        console.log('Melee attack missed!');
        nextTurn();
    }
});

// Handle player ranged attack
document.getElementById('rangedAttackRollButton').addEventListener('click', () => {
    document.getElementById('rangedAttackRollButton').disabled = true;
    const attackRoll = rollDie(20);

    if (attackRoll >= 10) {
        const damageRoll = rollMultipleDice(8, 1);
        updateEnemyHP(damageRoll);
    } else {
        console.log('Ranged attack missed!');
        nextTurn();
    }
});

// Initialize the game
displayHealthData();
initializeTurnOrder();
