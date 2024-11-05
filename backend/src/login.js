const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');


const app = express();
const PORT = 5000;
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.use(express.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

const userSchema = new mongoose.Schema({
    googleId: String,
    email: String,
    name: String,
    //Maybe other fields 
  });

const User = mongoose.model('User', userSchema);


//HTML
//<script src="https://accounts.google.com/gsi/client" async defer></script>

//<div id="g_id_onload"
//     data-client_id="YOUR_GOOGLE_CLIENT_ID"
//     data-callback="handleCredentialResponse"
//     data-auto_prompt="false">
//</div>
//<div class="g_id_signin" data-type="standard"></div>


function handleCredentialResponse(response) {
    const token = response.credential;
    fetch('/auth/google', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token })
    })
    .then(response => response.json())
    .then(data => {
        console.log(data);  // Successful login
    })
    .catch(error => console.error('Error:', error));
}



app.post('/auth/google', async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const { identity, email, name } = payload;
        
        let user = await User.findOne({ googleId: identity });
        if (!user) {
            user = await User.create({ googleId: identity, email, name });
        }

        const jwtToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '2h' });

        res.cookie('token', jwtToken, {httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 3600000});
        res.json({ message: 'User authenticated', token: jwtToken, user });
    } catch (error) {
        res.status(400).json({ error: 'Invalid Google token' });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


app.post('/auth/refresh', (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) return res.sendStatus(401);

    jwt.verify(refreshToken, process.env.REFRESH_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        const newToken = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 900000 
        });
        res.json({ message: 'Token refreshed' });
    });
});


function authenticateToken(req, res, next) {
    const token = req.cookies.token; 

    if (!token) return res.sendStatus(401); 

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);

        req.user = user;
        next();
    });
}



//This is for routes that require auth
app.get('/api/protected', authenticateToken, (req, res) => {
    // This code runs if the token is valid
    res.json({ message: 'Access to protected data granted', user: req.user });
});


app.post('/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
});

//GOOGLE_CLIENT_ID=
//MONGO_URI=
//JWT_SECRET=
//REFRESH_SECRET=
