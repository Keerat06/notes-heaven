const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const authMiddleware = require('../middleware/auth');

// All notes routes require authentication
router.use(authMiddleware);

// GET /api/notes/stats - Get dashboard metrics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    const totalNotes = await Note.countDocuments({ user: userId, deleted: false });
    const favoriteNotes = await Note.countDocuments({ user: userId, deleted: false, favorite: true });
    const pinnedNotes = await Note.countDocuments({ user: userId, deleted: false, pinned: true });
    const trashNotes = await Note.countDocuments({ user: userId, deleted: true });

    // Distinct subjects with count
    const subjectAggregation = await Note.aggregate([
      { $match: { user: new (require('mongoose').Types.ObjectId)(userId), deleted: false } },
      { $group: { _id: '$subject', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const recentNotes = await Note.find({ user: userId, deleted: false })
      .sort({ updatedAt: -1 })
      .limit(5);

    return res.json({
      success: true,
      stats: {
        total: totalNotes,
        favorites: favoriteNotes,
        pinned: pinnedNotes,
        trash: trashNotes,
        subjectsCount: subjectAggregation.length,
        subjects: subjectAggregation.map(s => ({ name: s._id || 'General', count: s.count })),
        recentNotes
      }
    });
  } catch (error) {
    console.error('Stats Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate note statistics.'
    });
  }
});

// GET /api/notes - Query notes with filters, search, and sorting
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { trash, favorite, pinned, subject, search, sort } = req.query;

    const query = { user: userId };

    // Trash filter: defaults to active (non-deleted) notes unless trash=true
    if (trash === 'true') {
      query.deleted = true;
    } else {
      query.deleted = false;
    }

    // Favorite filter
    if (favorite === 'true') {
      query.favorite = true;
    }

    // Pinned filter
    if (pinned === 'true') {
      query.pinned = true;
    }

    // Subject filter
    if (subject && subject !== 'All') {
      query.subject = subject;
    }

    // Search filter across title, content, tags, and subject
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { content: searchRegex },
        { subject: searchRegex },
        { tags: searchRegex }
      ];
    }

    // Sorting
    let sortQuery = { pinned: -1, updatedAt: -1 };
    if (sort === 'oldest') {
      sortQuery = { updatedAt: 1 };
    } else if (sort === 'title_asc') {
      sortQuery = { title: 1 };
    } else if (sort === 'title_desc') {
      sortQuery = { title: -1 };
    } else if (sort === 'latest') {
      sortQuery = { pinned: -1, updatedAt: -1 };
    }

    const notes = await Note.find(query).sort(sortQuery);

    return res.json({
      success: true,
      count: notes.length,
      notes
    });
  } catch (error) {
    console.error('Get Notes Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notes.'
    });
  }
});

// GET /api/notes/:id - Get a single note
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.'
      });
    }

    return res.json({
      success: true,
      note
    });
  } catch (error) {
    console.error('Get Single Note Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve note.'
    });
  }
});

// POST /api/notes - Create a new note
router.post('/', async (req, res) => {
  try {
    const { title, content, subject, tags, favorite, pinned } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note title is required.'
      });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required.'
      });
    }

    // Process tags
    let processedTags = [];
    if (Array.isArray(tags)) {
      processedTags = tags.map(t => String(t).trim()).filter(Boolean);
    } else if (typeof tags === 'string') {
      processedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    const newNote = new Note({
      title: title.trim(),
      content: content.trim(),
      subject: (subject && subject.trim()) || 'General',
      tags: processedTags,
      favorite: Boolean(favorite),
      pinned: Boolean(pinned),
      deleted: false,
      user: req.user.id
    });

    await newNote.save();

    return res.status(201).json({
      success: true,
      message: 'Note created successfully!',
      note: newNote
    });
  } catch (error) {
    console.error('Create Note Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create note.'
    });
  }
});

// PUT /api/notes/:id - Update an existing note
router.put('/:id', async (req, res) => {
  try {
    const { title, content, subject, tags, favorite, pinned, deleted } = req.body;

    const note = await Note.findOne({ _id: req.params.id, user: req.user.id });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.'
      });
    }

    if (title !== undefined) note.title = title.trim();
    if (content !== undefined) note.content = content.trim();
    if (subject !== undefined) note.subject = subject.trim() || 'General';
    if (favorite !== undefined) note.favorite = Boolean(favorite);
    if (pinned !== undefined) note.pinned = Boolean(pinned);
    if (deleted !== undefined) note.deleted = Boolean(deleted);

    if (tags !== undefined) {
      if (Array.isArray(tags)) {
        note.tags = tags.map(t => String(t).trim()).filter(Boolean);
      } else if (typeof tags === 'string') {
        note.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    note.updatedAt = Date.now();
    await note.save();

    return res.json({
      success: true,
      message: 'Note updated successfully!',
      note
    });
  } catch (error) {
    console.error('Update Note Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update note.'
    });
  }
});

// DELETE /api/notes/trash/empty - Permanently empty trash
router.delete('/trash/empty', async (req, res) => {
  try {
    const result = await Note.deleteMany({ user: req.user.id, deleted: true });
    return res.json({
      success: true,
      message: `Trash emptied. ${result.deletedCount} notes permanently removed.`
    });
  } catch (error) {
    console.error('Empty Trash Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to empty trash.'
    });
  }
});

// DELETE /api/notes/:id - Move to trash or permanently delete
router.delete('/:id', async (req, res) => {
  try {
    const { permanent } = req.query;
    const note = await Note.findOne({ _id: req.params.id, user: req.user.id });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found.'
      });
    }

    if (permanent === 'true' || note.deleted) {
      // Permanent removal
      await Note.findByIdAndDelete(req.params.id);
      return res.json({
        success: true,
        message: 'Note permanently deleted.'
      });
    } else {
      // Soft delete: move to trash
      note.deleted = true;
      note.pinned = false; // unpin on delete
      await note.save();
      return res.json({
        success: true,
        message: 'Note moved to trash.'
      });
    }
  } catch (error) {
    console.error('Delete Note Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete note.'
    });
  }
});

// POST /api/notes/seed - Seed sample notes manually
router.post('/seed', async (req, res) => {
  try {
    const sampleNotes = [
      {
        title: 'DAA: Dynamic Programming vs Greedy Algorithms',
        subject: 'DAA',
        tags: ['algorithms', 'dp', 'greedy', 'optimization'],
        favorite: true,
        pinned: true,
        content: `Comparison of Algorithm Paradigms:

1. Dynamic Programming (DP):
- Used when subproblems overlap and problem exhibits optimal substructure.
- Solves every subproblem once and stores result (Memoization / Tabulation).
- Examples: 0/1 Knapsack, Longest Common Subsequence (LCS), Floyd-Warshall.

2. Greedy Approach:
- Makes the locally optimal choice at each stage with hope of finding global optimum.
- Never reconsiders choices made.
- Examples: Fractional Knapsack, Dijkstra's Algorithm, Kruskal's & Prim's MST.`
      },
      {
        title: 'DBMS: SQL Joins, Indexing & B-Trees',
        subject: 'DBMS',
        tags: ['database', 'sql', 'indexes', 'b-trees'],
        favorite: true,
        pinned: false,
        content: `Indexing in Relational Databases:

• Primary Index: Built on ordered key fields.
• Secondary Index: Built on non-key or unordered fields.
• B+ Trees: Self-balancing tree data structure that keeps data sorted and allows searches, sequential access, insertions, and deletions in logarithmic time (O(log n)).

Join Types:
- INNER JOIN: Returns matching records from both tables.
- LEFT (OUTER) JOIN: Returns all records from left table and matching from right.
- FULL OUTER JOIN: Returns all records when there is a match in either table.`
      },
      {
        title: 'Operating Systems: Virtual Memory & Paging',
        subject: 'Operating Systems',
        tags: ['os', 'virtual-memory', 'paging', 'tlb'],
        favorite: false,
        pinned: true,
        content: `Memory Management Concepts:

• Virtual Memory: Separation of user logical memory from physical memory.
• Page Fault: Trap raised by hardware when a program accesses a page that is mapped in address space, but not loaded in physical RAM.
• Page Replacement Algorithms:
  1. FIFO: Replace oldest page.
  2. Optimal: Replace page that will not be used for longest time in future.
  3. LRU (Least Recently Used): Replace page unused for longest time in past.`
      },
      {
        title: 'Web Development: Full-Stack Express & MongoDB Architecture',
        subject: 'Web Development',
        tags: ['express', 'mongodb', 'node', 'architecture'],
        favorite: false,
        pinned: false,
        content: `Full-Stack Architecture Best Practices:

• Models: Define data schemas and validation using Mongoose.
• Routes: Express router handling HTTP requests and status codes.
• Middleware: Functions executing before routes (e.g. JWT Auth, CORS, JSON parser).
• Static Assets: Express serves HTML, CSS, and Vanilla JS from public directory.`
      }
    ];

    const notesToInsert = sampleNotes.map(n => ({
      ...n,
      user: req.user.id
    }));

    await Note.insertMany(notesToInsert);

    return res.status(201).json({
      success: true,
      message: 'Sample notes seeded successfully!'
    });
  } catch (error) {
    console.error('Seed Notes Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to seed sample notes.'
    });
  }
});

module.exports = router;
