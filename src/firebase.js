// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqT6sP7c2BiYxqkrNYGLwkJYYv93AWrcE",
  authDomain: "do-more-4bec0.firebaseapp.com",
  projectId: "do-more-4bec0",
  storageBucket: "do-more-4bec0.firebasestorage.app",
  messagingSenderId: "857545037505",
  appId: "1:857545037505:web:b500e044716f144f9be640"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);