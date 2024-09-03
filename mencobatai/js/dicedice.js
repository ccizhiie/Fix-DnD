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
        currentTurnIndex = 0;  // Ensure starting index is set to 0

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

                    // Loop until a valid player or enemy is found
                    let validTurnFound = false;
                    while (!validTurnFound) {
                        currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
                        const currentTurn = turnOrder[currentTurnIndex];

                        if (currentTurn === 'enemy') {
                            console.log('Enemy’s turn');
                            performEnemyAction();
                            validTurnFound = true; // Exit the loop as we have found the enemy’s turn
                        } else {
                            // Check if the player is alive
                            isPlayerDead(currentTurn).then(isDead => {
                                if (!isDead) {
                                    enablePlayerActions(currentTurn);
                                    validTurnFound = true; // Exit the loop as we have found a valid player
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
                const damage = 3; // Set fixed damage value for testing
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

    if (attackRoll >= 3) {
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

    if (attackRoll >= 3) {
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
