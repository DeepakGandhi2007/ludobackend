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
app.post('/verify-otp', (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).send({ message: 'Phone and OTP are required' });
  }

  if (otpStore[phone] && otpStore[phone] === parseInt(otp)) {
    delete otpStore[phone]; // OTP used, remove it
    res.send({ success: true, message: 'OTP verified successfully' });
  } else {
    res.status(400).send({ message: 'Invalid or expired OTP' });
  }
});

// Start the server
app.listen(6969, () => {
  console.log('Server running on http://localhost:6969');
});
