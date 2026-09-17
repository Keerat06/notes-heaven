# Notes Heaven

## Overview
A lightweight full-stack student note-taking web application built with HTML, CSS, Vanilla JavaScript, Express, and MongoDB.

## Features
- **User Authentication**: Sign up and login using bcrypt password hashing and JWT authentication.
- **Note Management**: Create, edit, soft-delete, restore, and permanently delete study notes.
- **Image Attachments**: Attach diagrams and screenshots via image URL or local file upload.
- **Organization**: Star favorites, pin notes to the top, and filter by subject.
- **Search & Sort**: Instant search by title/content/tags and sort by date or title.
- **Trash Bin**: Safely stores soft-deleted notes until restored or purged.
- **Dashboard**: Live statistics for total notes, favorites, pinned notes, and subjects.
- **Theme Support**: Dark and light modes via CSS variables persisted in `localStorage`.

## Tech Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB, Mongoose
- **Auth**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs`

## Project Structure
```
notesHeaven2/
├── middleware/
│   └── auth.js         # JWT verification middleware
├── models/
│   ├── User.js         # User model
│   └── Note.js         # Note model
├── public/
│   ├── css/style.css   # Main stylesheet & themes
│   ├── js/
│   │   ├── auth.js     # Login & registration logic
│   │   ├── common.js   # Auth helpers, theme & toasts
│   │   ├── dashboard.js# Stats rendering
│   │   └── notes.js    # Notes CRUD & editor logic
│   ├── dashboard.html  # Dashboard page
│   ├── editor.html     # Note editor page
│   ├── favorites.html  # Starred notes page
│   ├── index.html      # Landing page
│   ├── login.html      # Login page
│   ├── notes.html      # All notes page
│   ├── pinned.html     # Pinned notes page
│   ├── register.html   # Sign up page
│   └── trash.html      # Trash bin page
├── routes/
│   ├── auth.js         # Auth routes
│   └── notes.js        # Notes API routes
├── package.json        # Dependencies & scripts
└── server.js           # Server entry point
```

## How Authentication Works
1. **Register**: User submits credentials $\rightarrow$ password hashed with bcrypt $\rightarrow$ user saved in MongoDB $\rightarrow$ server returns signed JWT.
2. **Login**: User submits credentials $\rightarrow$ bcrypt compares password $\rightarrow$ server returns signed JWT.
3. **Session**: JWT is stored in `localStorage` (`nh_token`) and sent via `Authorization: Bearer <token>` header on protected requests.
4. **Protection**: `auth.js` middleware validates token and extracts `req.user`. Unauthenticated requests receive `401 Unauthorized`.
5. **Logout**: Removes JWT from `localStorage` and redirects to `/login.html`.

## How Notes Work
1. **Create/Edit**: Forms submit note payload (`title`, `content`, `subject`, `tags`, `imageUrl`, `pinned`, `favorite`) to `/api/notes`.
2. **Ownership**: Notes are automatically tied to `req.user.id`. Queries verify both note ID and user ID (`{ _id, user: req.user.id }`).
3. **Soft Delete**: Deleting a note sets `deleted: true`. Trashed notes only appear in the Trash view.
4. **Restore/Purge**: Notes can be restored (`deleted: false`) or permanently deleted from the database.

## API Endpoints

### Auth Routes (`/api/auth`)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user | No |
| `POST` | `/api/auth/login` | Log in user | No |
| `GET` | `/api/auth/me` | Get current user | Yes |

### Notes Routes (`/api/notes`)
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/notes` | Get user notes (supports filters) | Yes |
| `GET` | `/api/notes/stats` | Get dashboard statistics | Yes |
| `GET` | `/api/notes/:id` | Get single note by ID | Yes |
| `POST` | `/api/notes` | Create new note | Yes |
| `PUT` | `/api/notes/:id` | Update note | Yes |
| `PATCH` | `/api/notes/:id/favorite` | Toggle favorite status | Yes |
| `PATCH` | `/api/notes/:id/pin` | Toggle pin status | Yes |
| `PATCH` | `/api/notes/:id/restore` | Restore note from trash | Yes |
| `DELETE` | `/api/notes/:id` | Soft delete note (move to trash) | Yes |
| `DELETE` | `/api/notes/:id/permanent` | Permanently delete note | Yes |
| `DELETE` | `/api/notes/trash/empty` | Empty all trashed notes | Yes |

## Database Models

### User (`models/User.js`)
- `name` (String, required)
- `email` (String, required, unique)
- `password` (String, required)
- `createdAt` (Date)

### Note (`models/Note.js`)
- `title` (String, required)
- `content` (String, required)
- `subject` (String, default: 'General')
- `tags` ([String])
- `imageUrl` (String, default: '')
- `favorite` (Boolean, default: false)
- `pinned` (Boolean, default: false)
- `deleted` (Boolean, default: false)
- `user` (ObjectId, ref: 'User', required)
- `createdAt` & `updatedAt` (Date)

## How to Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/notesheaven
   JWT_SECRET=notesheaven_super_secret_jwt_key_2026
   ```
3. Start the application:
   ```bash
   npm start
   ```
4. Open `http://localhost:5000` in your browser.

## Environment Variables
- `PORT`: Server port (default: `5000`)
- `MONGO_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT signing

## Future Improvements
- Markdown rendering & code syntax highlighting.
- Export notes to PDF or Markdown.
- Shareable read-only note links.
