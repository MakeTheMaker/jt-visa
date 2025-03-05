const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, addDoc } = require('firebase/firestore');

// Firebase configuration with API key from environment variable
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY, // Set in Netlify dashboard
  authDomain: "jtmerkit.firebaseapp.com",
  projectId: "jtmerkit",
  storageBucket: "jtmerkit.firebasestorage.app",
  messagingSenderId: "200535246101",
  appId: "1:200535246101:web:3f493e3f08c8d3da77951c",
  measurementId: "G-SE7YN3P2NT"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

exports.handler = async (event, context) => {
  try {
    const method = event.httpMethod;
    const path = event.path.split('/').pop(); // e.g., "load" or "save"

    if (method === 'GET' && path === 'load') {
      // Load high scores
      const querySnapshot = await getDocs(collection(db, 'highscores'));
      const scores = querySnapshot.docs.map(doc => doc.data());
      return {
        statusCode: 200,
        body: JSON.stringify(scores),
      };
    } else if (method === 'POST' && path === 'save') {
      // Save high score
      const body = JSON.parse(event.body);
      await addDoc(collection(db, 'highscores'), body);
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Score saved" }),
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid request" }),
      };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" }),
    };
  }
};
