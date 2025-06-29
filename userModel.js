const db = require('../firebase');

exports.createUser = async (userData) => {
  const userRef = db.collection('users').doc(userData.uid);
  await userRef.set(userData);
  return userRef;
};

exports.getUserById = async (uid) => {
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? doc.data() : null;
};

// models/listingModel.js
exports.createListing = async (listingData) => {
  const listingRef = db.collection('listings').doc();
  await listingRef.set(listingData);
  return listingRef;
};

exports.getAllListings = async () => {
  const snapshot = await db.collection('listings').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// controllers/userController.js
const { createUser, getUserById } = require('../models/userModel');

exports.registerUser = async (req, res) => {
  try {
    const userData = req.body;
    const userRef = await createUser(userData);
    res.status(201).json({ message: 'User registered successfully', userId: userRef.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUser = async (req, res) => {
  try {
    const uid = req.params.uid;
    const user = await getUserById(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// controllers/listingController.js
const { createListing, getAllListings } = require('../models/listingModel');

exports.addListing = async (req, res) => {
  try {
    const listingData = req.body;
    const listingRef = await createListing(listingData);
    res.status(201).json({ message: 'Listing created successfully', listingId: listingRef.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getListings = async (req, res) => {
  try {
    const listings = await getAllListings();
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

router.post('/register', userController.registerUser);
router.get('/:uid', userController.getUser);

module.exports = router;

// routes/listingRoutes.js
const express = require('express');
const router = express.Router();
const listingController = require('../controllers/listingController');

router.post('/add', listingController.addListing);
router.get('/all', listingController.getListings);

module.exports = router;
