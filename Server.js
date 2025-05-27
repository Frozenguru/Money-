const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
app.use(express.json());
app.use(express.static('public'));

let mpesaCreds = {};

app.post('/api/credentials', (req, res) => {
  mpesaCreds = req.body;
  res.json({ message: 'Credentials saved successfully.' });
});

app.post('/api/stk-push', async (req, res) => {
  const { phone, amount } = req.body;
  const { shortcode, passkey, consumerKey, consumerSecret } = mpesaCreds;

  if (!consumerKey) return res.status(400).json({ message: 'M-Pesa credentials not set' });

  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenRes = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const accessToken = tokenRes.data.access_token;
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

    const stkRes = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: 'https://example.com/callback',
        AccountReference: 'TinnyHostDemo',
        TransactionDesc: 'Demo Payment'
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    res.json({ message: 'STK Push sent!', data: stkRes.data });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to send STK push.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
