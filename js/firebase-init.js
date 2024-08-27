import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// Your web app's Firebase configuration
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);