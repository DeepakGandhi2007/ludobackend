const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const twilio = require('twilio');  // Twilio to send OTP
const admin = require('firebase-admin'); // Firebase Admin SDK

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize Firebase Admin SDK
const serviceAccount = require('./serviceAccountKey.json');  // Your Firebase service account key
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Twilio Client Setup

const accountSid = 'AC000e32d8a2f02c0098aeddac0bb0ae1c';
const authToken = '0b5504c74abbc76ec2882bd1142518fd';
const client = require('twilio')(accountSid, authToken);
// Temporary in-memory OTP store
let otpStore = {}; 

// Route to send OTP
app.post('/send-otp', async (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).send({ message: "Phone number is required" });
  }

  try {
    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    // Store OTP temporarily
    otpStore[phone] = otp;

    // Send OTP using Twilio
    await client.messages.create({
        body: `Your Verification Code ${otp}`,
        to: phone, // Replace with the recipient's phone number
        from: '+15187206438', // Replace with your Twilio phone number
      })
      .then(message => console.log(message.sid))
      .catch(error => console.error(error));

    res.send({
      success: true,
      message: 'OTP sent successfully',
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).send({ message: 'Failed to send OTP' });
  }
});

// Route to verify OTP
app.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;

  console.log(otp);

  if (!otpStore[phone]) {
    return res.status(400).send({ message: 'OTP expired or not requested' });
  }

  if (otpStore[phone] === parseInt(otp)) {
    // OTP is correct, delete OTP from store
    delete otpStore[phone];

    try {
      // Check if the user exists in Firebase Auth
      let userRecord;
      try {
        // Try to get user by phone number from Firebase
        userRecord = await admin.auth().getUserByPhoneNumber(phone);
      } catch (error) {
        // If user doesn't exist, create a new user in Firebase
        userRecord = await admin.auth().createUser({
          phoneNumber: phone,
        });
      }

      // Send success response with user details
      res.send({
        success: true,
        message: 'OTP verified successfully',
        user: {
          uid: userRecord.uid,
          phone: userRecord.phoneNumber,
        },
      });
    } catch (error) {
      console.error('Error with Firebase Authentication:', error);
      res.status(500).send({ message: 'Failed to authenticate user' });
    }
  } else {
    res.status(400).send({ message: 'Invalid OTP' });
  }
});

// Start the server
app.listen(6969, () => {
  console.log('Server running on http://localhost:6969');
});
