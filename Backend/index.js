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

app.post('/groups', verifyToken, async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user.userId;

  if (!name) {
    return res.status(400).json({ error: 'Group name is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO project_groups (name, description, created_by)
       VALUES ($1, $2, $3)
       RETURNING id, name, description`,
      [name, description || null, userId]
    );

    const group = result.rows[0];

    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role)
       VALUES ($1, $2, 'admin')`,
      [group.id, userId]
    );

    res.status(201).json({ message: 'Group created successfully', group });
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(409).json({ error: 'A group with this name already exists.' });
    } else {
      res.status(500).json({ error: 'Failed to create group.' });
    }
  }
});

app.get('/groups/:id', verifyToken, async (req, res) => {
  const groupId = req.params.id;

  try {
    const groupResult = await pool.query(
      'SELECT id, name, description FROM project_groups WHERE id = $1',
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found.' });
    }

    const group = groupResult.rows[0];

    const membersResult = await pool.query(
      `SELECT u.id, u.username, gm.role
       FROM group_members gm
       JOIN users u ON u.id = gm.user_id
       WHERE gm.group_id = $1`,
      [groupId]
    );

    group.members = membersResult.rows;

    res.json(group);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch group details.' });
  }
});

app.get('/groups', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM project_groups ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch groups.' });
  }
});


const PORT = process.env.PORT;
app.listen(PORT, () =>{
    console.log(`Server running on http://localhost:${PORT}`);
});