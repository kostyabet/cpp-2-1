'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');

const store = require('./src/store');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Directory for uploaded files ---
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// --- File upload setup (multer) ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // Keep the original name but add a unique prefix to avoid collisions
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(safeName);
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
});

// Map a multer file object to a storage record
function mapFiles(files) {
  return (files || []).map((f) => ({
    storedName: f.filename,
    originalName: Buffer.from(f.originalname, 'latin1').toString('utf8'),
    size: f.size,
    mime: f.mimetype,
  }));
}

// --- Express configuration ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true })); // parse form data
app.use('/static', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));

// Helpers available in all templates
app.locals.STATUS_LABELS = store.STATUS_LABELS;
app.locals.STATUSES = store.STATUSES;

// --- Routes ---

// Home page: kanban board + filtering by status
app.get('/', (req, res) => {
  const status = req.query.status || '';
  const all = store.getTasks(''); // all tasks, sorted
  // Group tasks by status for the kanban columns
  const columns = store.STATUSES.map((s) => ({
    key: s,
    label: store.STATUS_LABELS[s],
    tasks: all.filter((t) => t.status === s),
  }));
  const stats = store.getStats();
  res.render('index', {
    columns,
    stats,
    activeFilter: status, // if set, show a single column only
    editId: req.query.edit ? Number(req.query.edit) : null,
  });
});

// Create a task (with file attachments)
app.post('/tasks', upload.array('files', 10), (req, res) => {
  const { title, description, status, dueDate } = req.body;
  if (!title || !title.trim()) {
    return res.redirect('/');
  }
  store.createTask({
    title,
    description,
    status,
    dueDate,
    files: mapFiles(req.files),
  });
  res.redirect('/');
});

// Update a task (status, date, text, add files)
app.post('/tasks/:id/update', upload.array('files', 10), (req, res) => {
  const { title, description, status, dueDate } = req.body;
  store.updateTask(req.params.id, {
    title,
    description,
    status,
    dueDate,
    addFiles: mapFiles(req.files),
  });
  res.redirect(backTo(req));
});

// Quick status change (e.g. mark as done)
app.post('/tasks/:id/status', (req, res) => {
  store.updateTask(req.params.id, { status: req.body.status });
  res.redirect(backTo(req));
});

// Delete a task (together with its files)
app.post('/tasks/:id/delete', (req, res) => {
  const task = store.getTask(req.params.id);
  if (task) {
    for (const f of task.files || []) {
      const p = path.join(UPLOAD_DIR, f.storedName);
      fs.existsSync(p) && fs.unlinkSync(p);
    }
    store.deleteTask(req.params.id);
  }
  res.redirect(backTo(req));
});

// Where to return after an action — keep the active filter
function backTo(req) {
  const filter = req.body.returnStatus || '';
  return filter ? `/?status=${encodeURIComponent(filter)}` : '/';
}

// Handle multer errors (e.g. file size exceeded)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).send(`File upload error: ${err.message}`);
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});
