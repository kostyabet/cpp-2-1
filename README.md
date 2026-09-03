# Lab 1 — Task board (SSR)

A simple web application with **server-side rendering**: a task list with
completion status, filtering by status, an expected due date, and the ability to
attach files to each task.

The server sends ready-made HTML to the client; all data is submitted through
**form submissions** (`multipart/form-data` and `urlencoded`).

## Stack

- **Node.js**
- **Express** — web server and routing
- **EJS** — server-side templates (SSR)
- **Multer** — handling file attachments
- Data storage — a JSON file (`data/tasks.json`); files live in `uploads/`

## Run

```bash
npm install
npm start
```

The app will be available at `http://localhost:3000`.

For development with auto-reload:

```bash
npm run dev
```

## Features

- ➕ Create a task: title, description, status, due date, files
- 🏷️ Three statuses: "To do", "In progress", "Done"
- 🗂️ Kanban board with drag-and-drop to change status
- 📅 Expected due date + overdue highlighting
- 📎 Attach multiple files to a task (up to 10 MB each), image thumbnails + lightbox
- ✏️ Edit a task and change its status
- 🗑️ Delete a task (together with its files)

## Project structure

```
server.js            — Express app and routes
src/store.js         — task storage (JSON file)
views/index.ejs      — server-side page template
public/css/style.css — styles
public/js/app.js     — client-side drag-and-drop, file preview, lightbox
data/tasks.json      — task database (created automatically)
uploads/             — uploaded files
```

## Routes

| Method | Path                  | Description                       |
|--------|-----------------------|-----------------------------------|
| GET    | `/`                   | Task board (`?status=` filter)    |
| POST   | `/tasks`              | Create a task                     |
| POST   | `/tasks/:id/update`   | Edit a task                       |
| POST   | `/tasks/:id/status`   | Quickly change status             |
| POST   | `/tasks/:id/delete`   | Delete a task                     |
