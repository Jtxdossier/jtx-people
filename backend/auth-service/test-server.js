const express = require('express');
const app = express();
const PORT = 3005;

app.use(express.json());

app.post('/auth/login', (req, res) => {
    console.log('Login attempt:', req.body);
    
    const { email, password } = req.body;
    
    if (email === 'admin@jtx.com' && password === 'admin123') {
        res.json({
            success: true,
            token: 'test-token-123',
            user: { id: 1, email: email, name: 'Admin' }
        });
    } else {
        res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'Auth Service' });
});

app.listen(PORT, () => {
    console.log('✅ Auth Service running on http://localhost:' + PORT);
});
