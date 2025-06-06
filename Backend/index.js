import express from 'express';
import 'dotenv/config'
import cors from 'cors';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import verifyToken from './verifyToken.js';

const pool = new pg.Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const app = express();
app.use(cors());
app.use(express.json());

app.post('/login', async (req, res) => {
    const { userName, password } = req.body;

    if (!userName || !password) {
        return res.status(400).json({ error: 'Username and password are required!' });
    }

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [userName]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/register', async (req, res) => {
    const { userName, password, confirmPassword } = req.body;

    if (!userName || !password || !confirmPassword) {
        return res.status(400).json({ error: 'Username, password and password confirmation are mandatory!' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'The passwords are not identical!' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, parseInt(process.env.SALT));

        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
            [userName, hashedPassword]
        );

        res.status(201).json({ message: 'User registered successfully', userId: result.rows[0].id });
    } catch (err) {
        if (err.code === '23505') {
            res.status(409).json({ error: 'User already exists!' });
        } else {
            console.error(err);
            res.status(500).json({ error: 'Server error' });
        }
    }
});

const PORT = process.env.PORT;
app.listen(PORT, () =>{
    console.log(`Server running on http://localhost:${PORT}`);
});