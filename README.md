# Notes Heaven 📝

A clean, modern, and simple full-stack student note-taking web application built for college coursework and exam preparation.

---

## 🎯 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (No frameworks, pure native web standards)
- **Backend**: Node.js & Express.js
- **Database**: MongoDB & Mongoose
- **Authentication**: JWT (JSON Web Tokens) & bcryptjs password hashing

---

## 📁 Project Structure

```
notes-heaven/
│
├── public/
│   ├── index.html        # Landing page with hero section & feature highlights
│   ├── login.html        # Authentication: User sign in
│   ├── register.html     # Authentication: User registration
│   ├── dashboard.html    # Student dashboard (statistics, subjects, recent notes)
│   ├── notes.html        # Notes catalog with instant search, subject filter & sort
│   ├── editor.html       # Note creator and editor (title, content, tags, pin, favorite)
│   ├── favorites.html    # Dedicated view for starred favorite notes
│   ├── pinned.html       # Dedicated view for pinned exam revision notes
│   ├── trash.html        # Trash bin with note restoration & permanent deletion
│   │
│   ├── css/
│   │   └── style.css     # Responsive design with Light/Dark mode themes
│   │
│   └── js/
│       ├── common.js     # Shared utilities: auth state, theme switcher, API fetcher
│       ├── auth.js       # Client validation and login/register handling
│       ├── dashboard.js  # Dashboard metrics & note cards rendering
│       └── notes.js      # Notes filter, search, sort, and editor forms
│
├── models/
│   ├── User.js           # User schema (name, email, password, createdAt)
│   └── Note.js           # Note schema (title, content, subject, tags, favorite, pinned, deleted, user)
│
├── routes/
│   ├── auth.js           # Auth routes (register, login, me)
│   └── notes.js          # Notes CRUD routes (list, stats, single, create, update, delete, trash)
│
├── middleware/
│   └── auth.js           # JWT authentication middleware
│
├── server.js             # Express application & static file server
├── package.json          # Project metadata and dependencies
└── .env                  # Environment variables
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Verify `.env` has your desired settings:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/notesheaven
JWT_SECRET=notesheaven_super_secret_jwt_key_2026
```

### 3. Start the Application
```bash
npm start
```
For automatic restart during development:
```bash
npm run dev
```

Visit **`http://localhost:5000`** in your browser.

---

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Create account (auto-seeds sample student notes: DAA, DBMS, OS, Web Dev)
- `POST /api/auth/login` - Sign in and receive JWT token
- `GET /api/auth/me` - Get authenticated user profile

### Notes Management (Protected)
- `GET /api/notes` - Retrieve notes with search, subject filter, sort, and trash query parameters
- `GET /api/notes/stats` - Retrieve dashboard counts, subject breakdown, and recent notes
- `GET /api/notes/:id` - Get a single note by ID
- `POST /api/notes` - Create a new note
- `PUT /api/notes/:id` - Update an existing note (or toggle pin/favorite/restore)
- `DELETE /api/notes/:id` - Move note to trash (or delete permanently with `?permanent=true`)
- `DELETE /api/notes/trash/empty` - Permanently remove all trashed notes
- `POST /api/notes/seed` - Load starter sample notes
