import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyACmqBFpU86prbUS-rjFRFS09kw0VtoFU0",
  authDomain: "trainticketing-3f1d0.firebaseapp.com",
  projectId: "trainticketing-3f1d0",
  storageBucket: "trainticketing-3f1d0.appspot.com",
  messagingSenderId: "812992380394",
  appId: "1:812992380394:web:1115150f4f0a825b6a8693",
  measurementId: "G-XXHNSNM9B6"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
