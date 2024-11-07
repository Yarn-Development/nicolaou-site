
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.REACT_APP_GOOGLE_CLIENT_ID);
const User = require('../models/User');
module.exports = function(app){
    app.post('/auth/google', async (req, res) => {
        const { token } = req.body;

        try {
            console.log(process.env.REACT_APP_GOOGLE_CLIENT_ID);
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: process.env.REACT_APP_GOOGLE_CLIENT_ID
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
};
