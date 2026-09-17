const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Note = require('../models/Note');
const authMiddleware = require('../middleware/auth');

// Sample starter notes for new students
const SAMPLE_NOTES = [
  {
    title: 'DAA: Time Complexity & Master Theorem',
    subject: 'DAA',
    tags: ['algorithms', 'time-complexity', 'master-theorem', 'recursion'],
    favorite: true,
    pinned: true,
    content: `Master Theorem provides asymptotic bounds for recurrence relations of the form:
T(n) = a * T(n/b) + f(n) where a >= 1 and b > 1.

Case 1: If f(n) = O(n^(log_b(a) - ε)), then T(n) = Θ(n^(log_b(a)))
Case 2: If f(n) = Θ(n^(log_b(a)) * log^k(n)), then T(n) = Θ(n^(log_b(a)) * log^(k+1)(n))
Case 3: If f(n) = Ω(n^(log_b(a) + ε)), and regularity condition holds, then T(n) = Θ(f(n))

Key Examples:
• Merge Sort: T(n) = 2T(n/2) + O(n) => O(n log n)
• Binary Search: T(n) = T(n/2) + O(1) => O(log n)`
  },
  {
    title: 'DBMS: ACID Properties & Normalization',
    subject: 'DBMS',
    tags: ['database', 'acid', 'normalization', 'bcnf', 'sql'],
    favorite: false,
    pinned: true,
    content: `ACID Properties in Database Management Systems:

1. Atomicity: All changes to data are performed as if they are a single operation ("All or nothing").
2. Consistency: Data is in a valid state when a transaction starts and when it ends.
3. Isolation: The intermediate state of a transaction is invisible to other transactions.
4. Durability: After a transaction successfully completes, changes are permanent.

Normalization Summary:
• 1NF: Atomic values (no repeating groups / multi-valued attributes).
• 2NF: 1NF + No partial dependency (non-prime attributes fully dependent on candidate key).
• 3NF: 2NF + No transitive dependency (non-prime attributes not dependent on other non-prime).
• BCNF: For every functional dependency X -> Y, X must be a Super Key.`
  },
  {
    title: 'Operating Systems: Process Synchronization & Deadlocks',
    subject: 'Operating Systems',
    tags: ['os', 'synchronization', 'deadlock', 'mutex', 'semaphores'],
    favorite: true,
    pinned: false,
    content: `Process Synchronization & Deadlock Conditions:

Four Coffman Conditions for Deadlock:
1. Mutual Exclusion: At least one resource must be held in a non-shareable mode.
2. Hold and Wait: A process must be holding a resource and waiting for another.
3. No Preemption: Resources cannot be forcibly taken from a process.
4. Circular Wait: A set of processes waiting for each other in a circular chain.

Handling Techniques:
• Prevention: Invalidate at least one of the 4 Coffman conditions.
• Avoidance: Banker's Algorithm (Safe state check before resource allocation).
• Detection & Recovery: Resource Allocation Graph (RAG) cycle detection and process termination.`
  },
  {
    title: 'Web Development: REST APIs & Asynchronous JavaScript',
    subject: 'Web Development',
    tags: ['javascript', 'rest-api', 'async-await', 'frontend', 'express'],
    favorite: false,
    pinned: false,
    content: `Modern Web Development Essentials:

REST Architecture Principles:
• Stateless: Every request contains all information needed to process it.
• Client-Server separation of concerns.
• Uniform Interface: Standard HTTP methods (GET, POST, PUT, DELETE).
• Resource-oriented URLs (e.g. /api/notes/:id).

Async JavaScript & Promises:
• Promises represent eventual completion (or failure) of an async operation.
• async/await syntax provides cleaner, synchronous-like code flow over chained .then().
• Always use try/catch blocks with async/await for robust error handling.`
  }
];

// Helper: generate JWT
function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'notesheaven_super_secret_jwt_key_2026';
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email },
    secret,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check existing user
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword
    });

    await user.save();

    // Auto-seed starter notes for immediate out-of-the-box experience
    const initialNotes = SAMPLE_NOTES.map(note => ({
      ...note,
      user: user._id
    }));
    await Note.insertMany(initialNotes);

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Notes Heaven.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again later.'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again later.'
    });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    return res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Fetch Me Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error fetching user profile.'
    });
  }
});

module.exports = router;
