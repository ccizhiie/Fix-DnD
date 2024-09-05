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
                
                // Check if the player is alive
                const isAlive = stats.currentHP > 0;
                const status = isAlive ? "Alive" : "Dead";

                // Create a player display element
                const playerDiv = document.createElement('div');
                playerDiv.textContent = `${player.email}: HP ${stats.currentHP} (${status})`;
                playerList.appendChild(playerDiv);

                // Add alive players to the turn order
                if (isAlive) {
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
        currentTurnIndex = 0;  // Ensure starting index is set to 0

        updateTurnOrderInDB();
    }).catch((error) => {
        console.error('Error initializing turn order:', error);
    });
}

// Disable or enable action buttons based on player status
function validatePlayerActions(playerId) {
    isPlayerDead(playerId).then(isDead => {
        const meleeButton = document.getElementById('meleeAttackRollButton');
        const rangedButton = document.getElementById('rangedAttackRollButton');

        if (isDead) {
            // Disable buttons if the player is dead
            meleeButton.disabled = true;
            rangedButton.disabled = true;
        } else {
            // Enable buttons if the player is alive
            meleeButton.disabled = false;
            rangedButton.disabled = false;
        }
    });
}

// Ensure buttons are reset at the beginning of each turn
function enablePlayerActions(playerId) {
    const meleeButton = document.getElementById('meleeAttackRollButton');
    const rangedButton = document.getElementById('rangedAttackRollButton');

    meleeButton.disabled = false;
    rangedButton.disabled = false;

    validatePlayerActions(playerId);  // Check if the player is dead or alive and adjust buttons
}

// Get the room code from the URL
function getRoomCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('roomcode');
}

// Update turn order and current index in the database
function updateTurnOrderInDB() {
    console.log('Updating turn order in DB:', { order: turnOrder, currentIndex: currentTurnIndex });
    update(turnRef, {
        order: turnOrder,
        currentIndex: currentTurnIndex
    }).then(() => {
        console.log('Turn order updated in DB.');
    }).catch((error) => {
        console.error('Failed to update turn order in DB:', error);
    });
}

// Handle the next turn
function nextTurn() {
    checkIfGameOver((isGameOver) => {
        if (isGameOver) {
            showVictoryNotification();
        } else {
            onValue(turnRef, (snapshot) => {
                const turnData = snapshot.val();
                if (turnData) {
                    turnOrder = turnData.order;
                    currentTurnIndex = turnData.currentIndex;

                    let validTurnFound = false;
                    while (!validTurnFound) {
                        // Increment the turn index and wrap around if necessary
                        currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
                        
                        // Reset index if it goes out of bounds
                        if (currentTurnIndex >= turnOrder.length) {
                            currentTurnIndex = 0;
                        }
                        
                        const currentTurn = turnOrder[currentTurnIndex];

                        if (currentTurn === 'enemy') {
                            console.log('Enemy’s turn');
                            performEnemyAction();
                            validTurnFound = true;
                        } else {
                            // Check if the player is alive
                            isPlayerDead(currentTurn).then(isDead => {
                                if (!isDead) {
                                    enablePlayerActions(currentTurn);
                                    validatePlayerActions(currentTurn);  // Validate button states
                                    validTurnFound = true;
                                } else {
                                    validatePlayerActions(currentTurn);  // Disable buttons for dead players
                                }
                            });
                        }
                    }

                    // Update turn order index in the database
                    updateTurnOrderInDB();
                }
            }, { onlyOnce: true });
        }
    });
}



// Check if a player is dead
async function isPlayerDead(playerId) {
    return new Promise((resolve) => {
        onValue(ref(db, `rooms/${roomCode}/players/${playerId}/characters/stats/currentHP`), (snapshot) => {
            const hp = snapshot.val();
            resolve(hp <= 0);
        }, { onlyOnce: true });
    });
}

// Rebuild turn order if needed
function rebuildTurnOrder() {
    console.log('Rebuilding turn order.');
    turnOrder = insertEnemyTurns(turnOrder);
    currentTurnIndex = 0; // Reset to the start
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

// Perform enemy action (attack a player)
function performEnemyAction() {
    onValue(playersRef, (snapshot) => {
        const players = snapshot.val();
        if (players) {
            const alivePlayers = Object.keys(players).filter(playerId => players[playerId].characters.stats.currentHP > 0);
            if (alivePlayers.length > 0) {
                const playerId = alivePlayers[0];
                const damage = 7; // Set fixed damage value for testing
                const newHP = Math.max(0, players[playerId].characters.stats.currentHP - damage);
                
                update(ref(db, `rooms/${roomCode}/players/${playerId}/characters/stats`), { currentHP: newHP }).then(() => {
                    console.log(`Enemy attacked ${players[playerId].email}, dealt ${damage} damage, new HP: ${newHP}`);
                    
                    // After the enemy's turn, go to the next turn
                    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;  // Advance the turn index
                    updateTurnOrderInDB();
                }).catch(error => {
                    console.error('Error updating player HP:', error);
                });
            } else {
                // No alive players found, check if the game is over
                checkIfGameOver(isGameOver => {
                    if (isGameOver) {
                        showVictoryNotification();
                    }
                });
            }
        }
    }, { onlyOnce: true });
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

// // Function to handle the Leave button click
// function handleLeaveClick() {
// }

// document.getElementById('leaveButton').addEventListener('click', () => {
//     const roomCode = new URLSearchParams(window.location.search).get('roomCode');
//     const userId = auth.currentUser.uid;
//     const roomRef = ref(db, 'rooms/' + roomCode + '/players/' + userId);

//     // Remove the player from the room
//     remove(roomRef).then(() => {
//         console.log('Player removed successfully.');
//         checkAndDeleteRoomIfEmpty(roomCode);
//     }).catch(error => {
//         console.error('Failed to leave room:', error);
//     });
// })

// Initialize the game
displayHealthData();
initializeTurnOrder();