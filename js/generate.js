import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { getDatabase, ref, update, onValue } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
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

// Base character stats
const baseStats = {
    strength: 20,
    dexterity: 14,
    constitution: 12,
    intelligence: 10,
    wisdom: 10,
    charisma: 8,
    currentHP: 0,
    maxHP: 0,
};

// Class and race-specific bonuses
const classBonuses = {
    fighter: { attackStat: 'strength', meleeDamage: '2d6', rangedAttackStat: 'strength', rangedDamage: '1d8' },
    rogue: { attackStat: 'dexterity', meleeDamage: '1d8', rangedAttackStat: 'dexterity', rangedDamage: '1d6' },
    wizard: { attackStat: 'intelligence', meleeDamage: '1d4', rangedAttackStat: 'intelligence', rangedDamage: '1d10' },
    cleric: { attackStat: 'wisdom', meleeDamage: '1d6', rangedAttackStat: 'wisdom', rangedDamage: '1d8' },
};

const raceBonuses = {
    human: { strength: 1, dexterity: 1, constitution: 1, intelligence: 1, wisdom: 1, charisma: 1 },
    dwarf: { constitution: 2 },
    elf: { dexterity: 2 },
    'half-elf': { charisma: 2, strength: 1, dexterity: 1 },
};

// Function to calculate proficiency bonus
function proficiencyBonus(level) {
    if (level >= 1 && level <= 4) return 2;
    if (level >= 5 && level <= 8) return 3;
    if (level >= 9 && level <= 12) return 4;
    if (level >= 13 && level <= 16) return 5;
    return 6;
}

// Get roomCode from the URL
function getRoomCodeFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('roomCode');
}

// Function to generate and store character
function generateCharacter() {
    const roomCode = getRoomCodeFromURL();

    if (!roomCode) {
        console.error('Room code is missing or invalid.');
        return;
    }

    const name = document.getElementById('cName').value;
    const className = document.getElementById('cClass').value;
    const raceName = document.getElementById('cRace').value;
    const level = parseInt(document.getElementById('cLevel').value);

    // Base stats
    let stats = { ...baseStats };

    // Apply race bonuses
    if (raceBonuses[raceName]) {
        for (const [key, value] of Object.entries(raceBonuses[raceName])) {
            stats[key] += value;
        }
    }

    // Apply class-specific stats
    const classBonus = classBonuses[className];
    stats.attackStat = classBonus.attackStat;
    stats.meleeDamage = classBonus.meleeDamage;
    stats.rangedAttackStat = classBonus.rangedAttackStat;
    stats.rangedDamage = classBonus.rangedDamage;
    stats.levelBonus = proficiencyBonus(level);

    // Calculate HP
    stats.maxHP = classBonus.attackStat === 'strength' ? 10 + stats.constitution : 6 + stats.constitution;
    stats.currentHP = stats.maxHP;

    // Store character in Firebase under rooms/{roomCode}/players/{userId}
    const userId = auth.currentUser.uid;
    const characterData = {
        name: name,
        class: className,
        race: raceName,
        level: level,
        stats: stats,
        goStatus: true, // Player is ready
    };

    const playerRef = ref(db, `rooms/${roomCode}/players/${userId}/characters`);
    update(playerRef, characterData).then(() => {
        console.log('Character data updated in rooms database.');
        checkAllPlayersGoStatus(roomCode);
    }).catch((error) => {
        console.error('Error updating character data:', error);
    });
}

// Function to check if all players' goStatus is true
function checkAllPlayersGoStatus(roomCode) {
    const roomRef = ref(db, `rooms/${roomCode}/players`);

    onValue(roomRef, (snapshot) => {
        const players = snapshot.val();
        if (players) {
            const allReady = Object.values(players).every(player => player.characters && player.characters.goStatus === true);

            if (allReady) {
                setTimeout(() => {
                    window.location.href = "dice.html?roomcode=" + roomCode;
                }, 3000); // Wait 3 seconds before redirecting
            }
        }
    });
}

// Add event listener to the "Go" button
document.getElementById('go-btn').addEventListener('click', () => {
    generateCharacter();
});
