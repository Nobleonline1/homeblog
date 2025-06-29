// server.js

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json'); // Replace with your actual Firebase service account file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://<your-firebase-project-id>.firebaseio.com'
});

const db = admin.firestore();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Create a new apartment listing
app.post('/api/listings', async (req, res) => {
  try {
    const data = req.body;
    const docRef = await db.collection('listings').add(data);
    res.status(201).send({ id: docRef.id });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Get all apartment listings
app.get('/api/listings', async (req, res) => {
  try {
    const snapshot = await db.collection('listings').get();
    const listings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.send(listings);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// User registration (simplified)
app.post('/api/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userRecord = await admin.auth().createUser({ email, password });
    res.send({ uid: userRecord.uid });
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
