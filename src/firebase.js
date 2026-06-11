import { initializeApp } from "firebase/app";

// Your web app's new Firebase configuration from the console
const firebaseConfig = {
  apiKey: "AIzaSyDmgH1YVTbQj2GRmdnLB2nIb1j5W6CYOYU",
  authDomain: "ai-chat-summarizer-a4b81.firebaseapp.com",
  projectId: "ai-chat-summarizer-a4b81",
  storageBucket: "ai-chat-summarizer-a4b81.firebasestorage.app",
  messagingSenderId: "228970201916",
  appId: "1:228970201916:web:7e38020cd3b053ef5fd439",
  measurementId: "G-GESVRP00NX"
};

// Initialize Firebase & Export
export const app = initializeApp(firebaseConfig);
