require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'default-secret-change-me';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client/dist')));

// Database Setup
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT
  )`);

    // Progress table
    db.run(`CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    exercise_key TEXT,
    day_id TEXT,
    date_completed TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, exercise_key, day_id)
  )`);
});

// Middleware to verify token
const authenticate = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Failed to authenticate token' });
        req.userId = decoded.id;
        next();
    });
};

// Routes

// Register
app.post('/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const hash = bcrypt.hashSync(password, 8);

    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            return res.status(500).json({ error: 'Database error' });
        }
        const token = jwt.sign({ id: this.lastID }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, userId: this.lastID, username });
    });
});

// Login
app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, userId: user.id, username });
    });
});

// Get Progress
app.get('/api/progress', authenticate, (req, res) => {
    db.all('SELECT exercise_key, day_id FROM progress WHERE user_id = ?', [req.userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        // Transform to { pushups: ['p11', 'p12'], ... }
        const progress = {};
        rows.forEach(row => {
            if (!progress[row.exercise_key]) progress[row.exercise_key] = [];
            progress[row.exercise_key].push(row.day_id);
        });
        res.json(progress);
    });
});

// Save Progress
app.post('/api/progress', authenticate, (req, res) => {
    const { exerciseKey, dayId } = req.body;
    const date = new Date().toISOString();

    db.run('INSERT OR IGNORE INTO progress (user_id, exercise_key, day_id, date_completed) VALUES (?, ?, ?, ?)',
        [req.userId, exerciseKey, dayId, date],
        function (err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true });
        }
    );
});

// Catch-all for React Router (only serves if build exists)
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../client/dist/index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.send('API Server Running. Client not built yet.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
