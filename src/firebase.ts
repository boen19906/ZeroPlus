// Import the functions you need from the SDKs you want to use
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";        // Firebase Authentication
import { getFirestore } from "firebase/firestore";  // Firestore Database
import { getStorage } from "firebase/storage";   // Firebase Storage
import { getMessaging } from "firebase/messaging"; // Firebase Messaging (if using)


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_WTHBhX-k63ZFpqazq_YAGBcc90ySU4Q",
  authDomain: "zeroplus-viet.firebaseapp.com",
  projectId: "zeroplus-viet",
  storageBucket: "zeroplus-viet.appspot.com",
  messagingSenderId: "788416648238",
  appId: "1:788416648238:web:fefab749c317a459073bbf"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services you plan to use
const auth = getAuth(app);           // For user authentication
const db = getFirestore(app);        // For Firestore database
const storage = getStorage(app);     // For Firebase Storage (uploading files)
const messaging = getMessaging(app); // For Firebase Cloud Messaging (if needed)

// Export the services to use in your app
export { auth, db, storage, messaging };
