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
app.use('/uploads', express.static('uploads'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

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
        `INSERT INTO group_members (group_id, user_id, role, status)
        VALUES ($1, $2, 'admin', 'active')`,
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
      `SELECT u.id, u.username, gm.role, gm.status
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

app.post('/groups/:id/request', verifyToken, async (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.userId;

  try {
    // Verificăm dacă există deja o cerere sau e membru
    const exists = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'You already requested or are a member.' });
    }

    await pool.query(
      'INSERT INTO group_members (group_id, user_id, role, status) VALUES ($1, $2, $3, $4)',
      [groupId, userId, 'member', 'pending']
    );

    res.json({ message: 'Request to join sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send request.' });
  }
});

app.patch('/groups/:id/approve/:userId', verifyToken, async (req, res) => {
  const groupId = req.params.id;
  const targetUserId = req.params.userId;
  const adminId = req.user.userId;

  try {
    // Verificăm dacă solicitantul este admin
    const adminCheck = await pool.query(
      'SELECT * FROM group_members WHERE group_id = $1 AND user_id = $2 AND role = $3 AND status = $4',
      [groupId, adminId, 'admin', 'active']
    );

    if (adminCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Only group admins can approve requests.' });
    }

    await pool.query(
      `UPDATE group_members SET status = 'active'
       WHERE group_id = $1 AND user_id = $2 AND status = 'pending'`,
      [groupId, targetUserId]
    );

    res.json({ message: 'User approved.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve user.' });
  }
});

app.get('/user/groups', verifyToken, async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await pool.query(
      `SELECT group_id, role, status FROM group_members WHERE user_id = $1`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch memberships.' });
  }
});

app.get('/groups/:id/messages', verifyToken, async (req, res) => {
  const groupId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT m.id, m.content, m.created_at, u.username
       FROM messages m
       JOIN users u ON m.user_id = u.id
       WHERE m.group_id = $1
       ORDER BY m.created_at ASC`,
      [groupId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
});

app.post('/groups/:id/messages', verifyToken, async (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.userId;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Message content is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO messages (group_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at`,
      [groupId, userId, content]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message.' });
  }
});

app.post('/groups/:id/files', verifyToken, upload.single('file'), async (req, res) => {
  const groupId = req.params.id;
  const userId = req.user.userId;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    await pool.query(
      `INSERT INTO group_files (group_id, user_id, filename, original_name)
       VALUES ($1, $2, $3, $4)`,
      [groupId, userId, req.file.filename, req.file.originalname]
    );

    res.status(201).json({ message: 'File uploaded successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save file metadata' });
  }
});

app.get('/groups/:id/files', verifyToken, async (req, res) => {
  const groupId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT f.id, f.original_name, f.filename, f.uploaded_at, u.username
       FROM group_files f
       JOIN users u ON u.id = f.user_id
       WHERE f.group_id = $1
       ORDER BY f.uploaded_at DESC`,
      [groupId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () =>{
    console.log(`Server running on http://localhost:${PORT}`);
});