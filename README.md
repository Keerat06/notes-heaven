# Notes Heaven

## Overview
**Notes Heaven** is a clean, student-focused full-stack note-taking web application designed for organizing, searching, and revising college coursework and technical topics (such as DAA, DBMS, Operating Systems, and Web Development). Built strictly with native web technologies on the frontend (HTML, CSS, Vanilla JavaScript) and a lightweight Node.js/Express/MongoDB backend with JWT authentication and bcrypt password hashing.

---

## Features
- **Student Authentication**: Secure account registration and login using bcrypt password hashing and JSON Web Tokens (JWT) stored in `localStorage`.
- **Complete Note Lifecycle**: Create, view, edit, soft-delete, restore, and permanently delete notes.
- **Image & Diagram Attachments**: Attach diagrams, lecture slide screenshots, or graphs to notes via direct image URL or local file upload (converted to Base64 data URL) with live preview.
- **Strict User Isolation**: Every note is strictly bound to its creator's user ID in MongoDB, preventing cross-user unauthorized access.
- **Priority Organization**: Pin important exam revision notes to the top and star favorites for instant access.
- **Soft Delete & Trash Management**: Deleting a note moves it safely to the Trash Bin (`deleted: true`), allowing easy restoration or permanent deletion with user confirmation.
- **Search, Filter & Sorting**: Instant real-time search across note titles, contents, subjects, and tags, with subject filters and multiple sorting options (recently updated, oldest, alphabetical A-Z and Z-A).
- **Dynamic Real-Time Dashboard**: Live statistics calculated directly from the database for active notes, favorites, pinned notes, subject counts, and recent revisions.
- **Dark / Light Mode**: Theme switching with CSS variables (`--background`, `--card`, `--text`, `--muted`, `--border`, `--accent`) persisted in `localStorage`.
- **Polished UX**: Smooth loading states, toast notifications, empty states with helpful guidance, delete confirmations, and responsive mobile sidebar navigation.

---

## Tech Stack
- **Frontend**: HTML5, CSS3 (Vanilla CSS with Custom Variables), Vanilla JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose ODM
- **Security & Authentication**: JSON Web Tokens (`jsonwebtoken`), Password Hashing (`bcryptjs`), CORS, Dotenv

---

## Project Structure
```
notesHeaven2/
├── middleware/
│   └── auth.js           # JWT authentication & route protection middleware
├── models/
│   ├── User.js           # Mongoose User schema
│   └── Note.js           # Mongoose Note schema
├── public/
│   ├── css/
│   │   └── style.css     # CSS custom properties, themes & responsive layouts
│   ├── js/
│   │   ├── auth.js       # Login & registration forms validation and submission
│   │   ├── common.js     # Shared Auth state, API fetch helper, theme toggle, toasts
│   │   ├── dashboard.js  # Live stats loading and dashboard metrics rendering
│   │   └── notes.js      # Notes catalog filtering, search, sorting & note editor form
│   ├── dashboard.html    # User overview & live metrics
│   ├── editor.html       # Note creation & editing interface
│   ├── favorites.html    # Starred notes view
│   ├── index.html        # Landing page
│   ├── login.html        # Sign-in page
│   ├── notes.html        # All active notes with search & filters
│   ├── pinned.html       # Pinned notes view
│   ├── register.html     # Registration page
│   └── trash.html        # Deleted notes bin with restore & purge
├── routes/
│   ├── auth.js           # Authentication API endpoints
│   └── notes.js          # Notes CRUD & management API endpoints
├── .env                  # Environment configuration
├── package.json          # Node.js project manifest & scripts
├── README.md             # Project documentation
└── server.js             # Express application & static file server
```

---

## How Authentication Works
1. **Registration Flow (`POST /api/auth/register`)**:
   - The user fills out the registration form (`name`, `email`, `password`).
   - The frontend sends a `POST` request with JSON payload to `/api/auth/register`.
   - The backend validates all inputs (ensures email is unique, password is >= 6 chars).
   - The password is securely hashed with `bcryptjs` using a salt work factor of 10.
   - A new `User` document is saved to MongoDB.
   - Starter notes are automatically seeded for the new user.
   - A signed JWT token is returned containing the user's ID, name, and email.
   - The frontend stores the token in `localStorage` (`nh_token`) and user data in `nh_user`.

2. **Login Flow (`POST /api/auth/login`)**:
   - The user inputs their email and password.
   - The backend finds the user document by email.
   - `bcrypt.compare(password, user.password)` verifies credentials against the stored hash.
   - Upon verification, a fresh JWT is generated and returned to the frontend.
   - The frontend stores the token in `localStorage` and redirects to `/dashboard.html`.

3. **Protected API Requests**:
   - Every API request made via `authFetch()` attaches an `Authorization: Bearer <token>` header.
   - The Express middleware `middleware/auth.js` verifies the token with `jwt.verify(token, secret)`.
   - If valid, the decoded user payload is attached to `req.user`. If missing, invalid, or expired, a `401 Unauthorized` response is returned and the frontend redirects the user to `/login.html`.

4. **Logout**:
   - Clears `nh_token` and `nh_user` from `localStorage` and redirects the user to `/login.html`.

---

## How Notes Work
1. **Creation**:
   - Submitted via `/editor.html` (`POST /api/notes`).
   - The backend sets `user: req.user.id`, `deleted: false`, and parses tags and subject.
2. **Retrieval**:
   - `GET /api/notes` retrieves notes strictly matching `{ user: req.user.id, deleted: false }`.
   - Supports query params: `?search=...`, `?subject=...`, `?favorite=true`, `?pinned=true`, `?sort=latest|oldest|title_asc|title_desc`.
3. **Editing**:
   - `PUT /api/notes/:id` updates note fields after verifying both note ID and ownership (`user: req.user.id`).
4. **Favorite & Pin Toggles**:
   - `PATCH /api/notes/:id/favorite` toggles or sets favorite status.
   - `PATCH /api/notes/:id/pin` toggles or sets pinned status.
5. **Soft Delete & Trash**:
   - `DELETE /api/notes/:id` moves the note to trash by setting `deleted: true` and unpinning it.
   - `GET /api/notes?trash=true` retrieves deleted notes.
   - `PATCH /api/notes/:id/restore` restores the note (`deleted: false`).
   - `DELETE /api/notes/:id/permanent` permanently deletes the note document from MongoDB.
   - `DELETE /api/notes/trash/empty` permanently removes all trashed notes for the user.

---

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user & return JWT | No |
| `POST` | `/api/auth/login` | Authenticate user & return JWT | No |
| `GET` | `/api/auth/me` | Fetch currently logged in user profile | Yes |

### Notes (`/api/notes`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/notes` | Get all active notes (supports query filters) | Yes |
| `GET` | `/api/notes/stats` | Get dashboard metrics & counts | Yes |
| `GET` | `/api/notes/:id` | Get a single note by ID | Yes |
| `POST` | `/api/notes` | Create a new note | Yes |
| `PUT` | `/api/notes/:id` | Update an existing note | Yes |
| `PATCH` | `/api/notes/:id/favorite` | Toggle / update favorite status | Yes |
| `PATCH` | `/api/notes/:id/pin` | Toggle / update pin status | Yes |
| `PATCH` | `/api/notes/:id/restore` | Restore note from trash | Yes |
| `DELETE` | `/api/notes/:id` | Soft delete note (move to trash) | Yes |
| `DELETE` | `/api/notes/:id/permanent` | Permanently delete note from database | Yes |
| `DELETE` | `/api/notes/trash/empty` | Empty all trashed notes for user | Yes |
| `POST` | `/api/notes/seed` | Seed sample starter study notes | Yes |

---

## Database Models

### User Schema (`models/User.js`)
```javascript
{
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  createdAt: { type: Date, default: Date.now }
}
```

### Note Schema (`models/Note.js`)
```javascript
{
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  subject: { type: String, default: 'General', trim: true },
  tags: { type: [String], default: [] },
  imageUrl: { type: String, default: '' },
  favorite: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}
```

---

## How to Run

### Prerequisites
- Node.js (v16+)
- MongoDB (Local instance or MongoDB Atlas URI)

### Steps
1. **Clone repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create or verify `.env` in the root directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/notesheaven
   JWT_SECRET=notesheaven_super_secret_jwt_key_2026
   ```

3. **Start the Application**:
   ```bash
   # Production mode
   npm start

   # Development mode with auto-reload
   npm run dev
   ```

4. **Access in Browser**:
   Open **`http://localhost:5000`** in your browser.

---

## Environment Variables
| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | Port number the Express web server listens on | `5000` |
| `MONGO_URI` | MongoDB connection string URI | `mongodb://127.0.0.1:27017/notesheaven` |
| `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens | `notesheaven_super_secret_jwt_key_2026` |

---

## Future Improvements
- Rich text / Markdown preview formatting for code snippets and mathematical formulas.
- Export notes as PDF or Markdown files.
- Note sharing via read-only shared links.
- Note reminders and revision scheduler.
