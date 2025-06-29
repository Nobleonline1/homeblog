// Project Structure Overview:
// /public          -> Frontend (HTML, CSS3, JS)
// /routes          -> Express route handlers
// /controllers     -> Business logic
// /models          -> Firebase interaction logic
// /views           -> Optional templating engine views (if used)
// app.js           -> Main Express server setup
// firebase.js      -> Firebase admin SDK setup
// paystack.js      -> Paystack integration logic

// app.js (basic setup)
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const firebase = require('./firebase');
const userRoutes = require('./routes/userRoutes');
const listingRoutes = require('./routes/listingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const path = require('path');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/payments', paymentRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// firebase.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://<apartment-8ccc6>.firebaseio.com"
});

const db = admin.firestore();
module.exports = db;

// paystack.js
const axios = require('axios');
const PAYSTACK_SECRET = 'sk_test_xxxxx';

exports.initializePayment = async (formData) => {
  const response = await axios.post('https://api.paystack.co/transaction/initialize', formData, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
};
