import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getDatabase, ref, onValue, update, get, set } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
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
            turnOrder = []; // Reset the turnOrder array

            for (const playerId in players) {
                const player = players[playerId];
                const character = player.characters;
                const stats = character.stats;
                
                const isAlive = stats.currentHP > 0;
                const status = isAlive ? "Alive" : "Dead";

                // Create a player display element
                const playerDiv = document.createElement('div');
                playerDiv.textContent = `${player.email}: HP ${stats.currentHP} (${status})`;
                playerList.appendChild(playerDiv);

                if (isAlive) {
                    turnOrder.push(playerId);
                }
            }
            
            // Insert enemy turns after each player's turn
            turnOrder = insertEnemyTurns(turnOrder);
            console.log('Initial Turn Order:', turnOrder); // Debugging line
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

        update(turnRef, {
            order: turnOrder,
            currentIndex: currentTurnIndex
        }).then(() => {
            console.log('Turn order initialized.');
        }).catch((error) => {
            console.error('Error initializing turn order:', error);
        });
    }).catch((error) => {
        console.error('Error initializing turn order:', error);
    });
}

// Disable or enable action buttons based on player status
function validatePlayerActions(playerId) {
    // const meleeButton = document.getElementById('meleeAttackRollButton');
    // const rangedButton = document.getElementById('rangedAttackRollButton');
    // const savingThrowButton = document.getElementById('savingThrowButton');

    onValue(ref(db, `rooms/${roomCode}/players/${playerId}/characters/stats/currentHP`), (snapshot) => {
        const currentHP = snapshot.val();
        if (currentHP <= 0) {
            // Disable buttons and show saving throw button if the player is dead
            document.getElementById('meleeAttackRollButton').disabled = true;
            document.getElementById('rangedAttackRollButton').disabled = true;
            document.getElementById('savingThrowButton').style.display = 'inline';
        } else {
            // Enable buttons if the player is alive
            document.getElementById('meleeAttackRollButton').disabled = false;
            document.getElementById('rangedAttackRollButton').disabled = false;
            document.getElementById('savingThrowButton').style.display = 'none';
        }
    }, { onlyOnce: true });
}

// Ensure buttons are reset at the beginning of each turn
function enablePlayerActions(playerId) {
    // const meleeButton = document.getElementById('meleeAttackRollButton');
    // const rangedButton = document.getElementById('rangedAttackRollButton');

    document.getElementById('meleeAttackRollButton').disabled = false;
    document.getElementById('rangedAttackRollButton').disabled = false;

    validatePlayerActions(playerId);  // Check if the player is dead or alive and adjust buttons
}

// Function to handle the saving throw logic
function handleSavingThrow(playerID, playerMaxHPRef, playerHPRef) {
    // Prompt the player to roll a d20 for a saving throw
    const rollResult = rollD20(); // Assume rollD20() is a function that simulates a d20 roll

    if (rollResult >= 11) {
        // Successful saving throw
        console.log(`Player ${playerID} succeeded the saving throw with a roll of ${rollResult}! Restoring to max HP.`);

        // Fetch the player's max HP and restore it
        onValue(playerMaxHPRef, (maxHPSnapshot) => {
            const maxHP = maxHPSnapshot.val();
            set(playerHPRef, maxHP); // Restore current HP to max HP

            console.log(`Player ${playerID} HP restored to ${maxHP}.`);

            // Update the turn order after the player is revived
            updateTurnOrderInDB();
        }, { onlyOnce: true });
    } else {
        // Failed saving throw
        console.log(`Player ${playerID} failed the saving throw with a roll of ${rollResult}. They remain dead.`);
        
        // Skip the turn and continue to find the next valid turn
        nextTurn();
    }
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
            return; // Exit if the game is over
        }

        // Fetch the current turn data from Firebase
        onValue(turnRef, (snapshot) => {
            const turnData = snapshot.val();
            if (turnData) {
                turnOrder = turnData.order;
                currentTurnIndex = turnData.currentIndex;

                // Function to find the next valid turn
                const findNextValidTurn = () => {
                    const nextIndex = (currentTurnIndex + 1) % turnOrder.length;
                    const nextTurn = turnOrder[nextIndex];

                    // Update index in Firebase to the next turn
                    currentTurnIndex = nextIndex; 
                    set(ref(db, `rooms/${roomCode}/turn/currentIndex`), currentTurnIndex);

                    if (nextTurn === 'enemy') {
                        console.log('Enemy’s turn');
                        performEnemyAction(); // Perform enemy action
                    } else {
                        // Handle player's turn
                        const playerHPRef = ref(db, `rooms/${roomCode}/players/${nextTurn}/characters/stats/currentHP`);
                        const playerMaxHPRef = ref(db, `rooms/${roomCode}/players/${nextTurn}/characters/stats/maxHP`);

                        onValue(playerHPRef, (hpSnapshot) => {
                            const currentHP = hpSnapshot.val();

                            if (currentHP > 0) {
                                // Player is alive, enable their actions
                                console.log(`Player ${nextTurn}'s turn. HP: ${currentHP}`);
                                enablePlayerActions(nextTurn);
                                validatePlayerActions(nextTurn);
                            } else {
                                // Player is dead, check if they can perform a saving throw
                                console.log(`Player ${nextTurn} is dead, checking for saving throws...`);
                                handleSavingThrow(nextTurn, playerMaxHPRef, playerHPRef);
                            }
                        }, { onlyOnce: true });
                    }
                };

                findNextValidTurn();
            }
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
                const damage = 6; // Set fixed damage value for testing
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

function restorePlayerTurn(playerId, nextIndex) {
    // Add the player back to the turn order
    turnOrder.splice(nextIndex, 0, playerId);

    // Also need to restore the next enemy turn
    turnOrder.splice(nextIndex + 1, 0, 'enemy');

    // Remove from deadPlayers
    const deadPlayersRef = ref(db, `rooms/${roomCode}/turn/deadPlayers`);
    update(deadPlayersRef, { [playerId]: null }).then(() => {
        console.log(`Removed player ${playerId} from deadPlayers list.`);
        updateTurnOrderInDB();
    }).catch((error) => {
        console.error('Failed to update deadPlayers list:', error);
    });
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

// Initialize and display health data when the page loads
document.addEventListener('DOMContentLoaded', () => {
    displayHealthData();
    initializeTurnOrder();

    // Event listener for saving throw button
    document.getElementById('savingThrowButton').addEventListener('click', () => {
        const playerId = auth.currentUser.uid; // Function to get current player ID
        if (playerId) {
            handleSavingThrow(playerId);
        }
    });
});