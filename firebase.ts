// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // <--- We added this

const firebaseConfig = {
  apiKey: "AIzaSyBl-3_9RMsVeii4gAJQUfYaxPOl1WrKCO0",
  authDomain: "circuit-projects.firebaseapp.com",
  projectId: "circuit-projects",
  storageBucket: "circuit-projects.firebasestorage.app",
  messagingSenderId: "1085139668482",
  appId: "1:1085139668482:web:45fc9cf589ff839e15e11b",
  measurementId: "G-R2J68C19D0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // <--- We export the database to use in App.tsx