import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getDatabase, ref, onValue } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
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

let characterStats;

// Disable buttons initially
document.getElementById('meleeAttackRollButton').disabled = true;
document.getElementById('meleeDamageRollButton').disabled = true;
document.getElementById('rangedAttackRollButton').disabled = true;
document.getElementById('rangedDamageRollButton').disabled = true;
document.getElementById('healRollButton').disabled = true;
document.getElementById('stealthRollButton').disabled = true;
document.getElementById('perceptionRollButton').disabled = true;


// Get the room code from the URL
function getRoomCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('roomcode');
}

// Initialize Firebase and set up a real-time listener
function initializeAppAndFetchData() {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getDatabase(app);

    auth.onAuthStateChanged((user) => {
        if (user) {
            const roomCode = getRoomCodeFromURL();
            const userId = user.uid;
            const roomRef = ref(db, `rooms/${roomCode}/players/${userId}/characters`);

            // Listen for character data using onValue
            onValue(roomRef, (snapshot) => {
                const character = snapshot.val();
                if (character) {
                    characterStats = {
                        name: character.name,
                        class: character.class,
                        race: character.race,
                        level: character.level,
                        currentHP: character.stats.currentHP,
                        maxHP: character.stats.maxHP,
                        strength: character.stats.strength,
                        dexterity: character.stats.dexterity,
                        constitution: character.stats.constitution,
                        intelligence: character.stats.intelligence,
                        wisdom: character.stats.wisdom,
                        charisma: character.stats.charisma,
                        meleeDamage: character.stats.meleeDamage,
                        rangedDamage: character.stats.rangedDamage,
                        attackStat: character.stats.attackStat,
                        rangedAttackStat: character.stats.rangedAttackStat,
                        levelBonus: character.stats.levelBonus
                    };

                    // Enable buttons once character stats are loaded
                    document.getElementById('meleeAttackRollButton').disabled = false;
                    document.getElementById('meleeDamageRollButton').disabled = false;
                    document.getElementById('rangedAttackRollButton').disabled = false;
                    document.getElementById('rangedDamageRollButton').disabled = false;
                    document.getElementById('healRollButton').disabled = false;
                    document.getElementById('stealthRollButton').disabled = false;
                    document.getElementById('perceptionRollButton').disabled = false;

                    console.log(characterStats); // For debugging, log characterStats
                } else {
                    console.error('Character data is not available.');
                }
            }, (error) => {
                console.error('Failed to fetch character data:', error);
            });
        } else {
            console.error('User is not authenticated');
        }
    });
}

// Roll a dice with a given number of sides
function rollDice(sides) {
    return Math.floor(Math.random() * sides) + 1;
}

// Roll multiple dice with a given number of sides and times
function rollMultipleDice(sides, times) {
    let total = 0;
    for (let i = 0; i < times; i++) {
        total += rollDice(sides);
    }
    return total;
}

// Calculate the modifier for a stat
function getModifier(stat) {
    return Math.floor((stat - 10) / 2);
}

// Perform the melee attack roll
function performMeleeAttackRoll() {
    if (!characterStats) {
        console.error('Character stats are not available.');
        return;
    }

    let total;
    const className = characterStats.class.toLowerCase();
    const proficiencyLevel = 2; // Example proficiency level
    const attackStat = className === 'wizard' || className === 'cleric' ? 'strength' : (className === 'rogue' || className === 'bard' ? 'dexterity' : 'strength');
    
    let roll = rollDice(20); // Roll a d20
    let modifier = getModifier(characterStats[attackStat]); // Get the modifier for the relevant stat
    let attackBonus = modifier + proficiencyLevel; // Add proficiency bonus
    total = roll + attackBonus;

    const enemyAC = 12; // Fixed enemy AC
    let result;
    if (total >= enemyAC) {
        result = `Melee Attack Roll: ${total} - Attack is successful!`;
        document.getElementById('meleeDamageRollButton').style.display = 'inline';
    } else {
        result = `Melee Attack Roll: ${total} - Attack missed.`;
        document.getElementById('meleeDamageRollButton').style.display = 'none';
    }

    document.getElementById('meleeAttackResult').textContent = result;
}

// Perform the melee damage roll
function performMeleeDamageRoll() {
    if (!characterStats) {
        console.error('Character stats are not available.');
        return;
    }

    let total;
    const className = characterStats.class.toLowerCase();
    let damageRoll;

    if (className === 'fighter') {
        damageRoll = rollMultipleDice(6, 2); // Roll 2d6 for a greatsword
        total = damageRoll + getModifier(characterStats.strength);
    } else if (className === 'rogue') {
        damageRoll = rollDice(8); // Roll 1d8 for a rapier
        total = damageRoll + getModifier(characterStats.dexterity);
    } else if (className === 'wizard') {
        damageRoll = rollDice(4); // Roll 1d4 for a dagger
        total = damageRoll + getModifier(characterStats.strength);
    } else if (className === 'cleric') {
        damageRoll = rollDice(6); // Roll 1d6 for a mace
        total = damageRoll + getModifier(characterStats.strength);
    } else if (className === 'bard') {
        damageRoll = rollDice(8); // Roll 1d8 for a rapier
        total = damageRoll + getModifier(characterStats.dexterity);
    }

    document.getElementById('meleeDamageResult').textContent = `Melee Damage Roll: ${total}`;
}

// Perform the ranged attack roll
function performRangedAttackRoll() {
    if (!characterStats) {
        console.error('Character stats are not available.');
        return;
    }

    let total;
    const className = characterStats.class.toLowerCase();
    const proficiencyLevel = 2; // Example proficiency level
    const attackStat = className === 'wizard' || className === 'cleric' ? 'intelligence' : 'dexterity';

    let roll = rollDice(20); // Roll a d20
    let modifier = getModifier(characterStats[attackStat]); // Get the modifier for the relevant stat
    let attackBonus = modifier + proficiencyLevel; // Add proficiency bonus
    total = roll + attackBonus;

    const enemyAC = 12; // Fixed enemy AC
    let result;
    if (total >= enemyAC) {
        result = `Ranged Attack Roll: ${total} - Attack is successful!`;
        document.getElementById('rangedDamageRollButton').style.display = 'inline';
    } else {
        result = `Ranged Attack Roll: ${total} - Attack missed.`;
        document.getElementById('rangedDamageRollButton').style.display = 'none';
    }

    document.getElementById('rangedAttackResult').textContent = result;
}

// Perform the ranged damage roll
function performRangedDamageRoll() {
    if (!characterStats) {
        console.error('Character stats are not available.');
        return;
    }

    let total;
    const className = characterStats.class.toLowerCase();
    let damageRoll;

    if (className === 'wizard') {
        if (characterStats.level >= 3) {
            damageRoll = rollMultipleDice(10, 2); // Roll 2d10 for a firebolt at level 3+
        } else {
            damageRoll = rollDice(10); // Roll 1d10 for a firebolt at level 1
        }
        total = damageRoll + getModifier(characterStats.intelligence);
    } else if (className === 'fighter') {
        damageRoll = rollMultipleDice(6, 2); // Roll 2d6 for a longbow
        total = damageRoll + getModifier(characterStats.dexterity);
    } else if (className === 'rogue') {
        damageRoll = rollDice(8); // Roll 1d8 for a shortbow
        total = damageRoll + getModifier(characterStats.dexterity);
    } else if (className === 'cleric') {
        damageRoll = rollDice(6); // Roll 1d6 for a crossbow
        total = damageRoll + getModifier(characterStats.dexterity);
    } else if (className === 'bard') {
        damageRoll = rollDice(8); // Roll 1d8 for a shortbow
        total = damageRoll + getModifier(characterStats.dexterity);
    }

    document.getElementById('rangedDamageResult').textContent = `Ranged Damage Roll: ${total}`;
}

// Perform a healing roll
function performHealingRoll() {
    if (!characterStats) {
        console.error('Character stats are not available.');
        return;
    }

    const healingRoll = rollMultipleDice(8, characterStats.level); // Roll a number of d8 equal to the character's level
    const total = healingRoll + getModifier(characterStats.wisdom); // Add wisdom modifier to the healing roll
    document.getElementById('healResult').textContent = `Healing Roll: ${total}`;
}

// Perform a stealth roll
function performStealthRoll() {
    if (!characterStats) {
        console.error('Character stats are not available.');
        return;
    }

    const roll = rollDice(20);
    const total = roll + getModifier(characterStats.dexterity);
    document.getElementById('stealthResult').textContent = `Stealth Roll: ${total}`;
}

// Perform a perception roll
function performPerceptionRoll() {
    if (!characterStats) {
        console.error('Character stats are not available.');
        return;
    }

    const roll = rollDice(20);
    const total = roll + getModifier(characterStats.wisdom);
    document.getElementById('perceptionResult').textContent = `Perception Roll: ${total}`;
}

// Initialize the app and fetch character data
initializeAppAndFetchData();

// Attach event listeners to the buttons
document.getElementById('meleeAttackRollButton').addEventListener('click', performMeleeAttackRoll);
document.getElementById('meleeDamageRollButton').addEventListener('click', performMeleeDamageRoll);
document.getElementById('rangedAttackRollButton').addEventListener('click', performRangedAttackRoll);
document.getElementById('rangedDamageRollButton').addEventListener('click', performRangedDamageRoll);
document.getElementById('healRollButton').addEventListener('click', performHealingRoll);
document.getElementById('stealthRollButton').addEventListener('click', performStealthRoll);
document.getElementById('perceptionRollButton').addEventListener('click', performPerceptionRoll);

