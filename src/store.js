'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'tasks.json');

// Allowed task statuses
const STATUSES = ['todo', 'in_progress', 'done'];

const STATUS_LABELS = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ seq: 0, tasks: [] }, null, 2));
  }
}

function readDb() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const db = JSON.parse(raw);
    if (!Array.isArray(db.tasks)) db.tasks = [];
    if (typeof db.seq !== 'number') db.seq = db.tasks.length;
    return db;
  } catch (err) {
    // If the file is corrupted, start from a clean state
    return { seq: 0, tasks: [] };
  }
}

function writeDb(db) {
  ensureStorage();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
}

// Return the task list with optional filtering by status
function getTasks(statusFilter) {
  const db = readDb();
  let tasks = db.tasks;
  if (statusFilter && STATUSES.includes(statusFilter)) {
    tasks = tasks.filter((t) => t.status === statusFilter);
  }
  // Unfinished first, then by creation date (newest on top)
  return tasks.slice().sort((a, b) => {
    if (a.status === 'done' && b.status !== 'done') return 1;
    if (a.status !== 'done' && b.status === 'done') return -1;
    return b.createdAt - a.createdAt;
  });
}

function getTask(id) {
  const db = readDb();
  return db.tasks.find((t) => t.id === Number(id)) || null;
}

function createTask({ title, description, status, dueDate, files }) {
  const db = readDb();
  db.seq += 1;
  const task = {
    id: db.seq,
    title: String(title || '').trim(),
    description: String(description || '').trim(),
    status: STATUSES.includes(status) ? status : 'todo',
    dueDate: dueDate || null,
    files: Array.isArray(files) ? files : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  db.tasks.push(task);
  writeDb(db);
  return task;
}

function updateTask(id, patch) {
  const db = readDb();
  const task = db.tasks.find((t) => t.id === Number(id));
  if (!task) return null;

  if (patch.title !== undefined) task.title = String(patch.title).trim();
  if (patch.description !== undefined) task.description = String(patch.description).trim();
  if (patch.status !== undefined && STATUSES.includes(patch.status)) task.status = patch.status;
  if (patch.dueDate !== undefined) task.dueDate = patch.dueDate || null;
  if (Array.isArray(patch.addFiles) && patch.addFiles.length) {
    task.files = task.files.concat(patch.addFiles);
  }
  task.updatedAt = Date.now();
  writeDb(db);
  return task;
}

function deleteTask(id) {
  const db = readDb();
  const idx = db.tasks.findIndex((t) => t.id === Number(id));
  if (idx === -1) return null;
  const [removed] = db.tasks.splice(idx, 1);
  writeDb(db);
  return removed;
}

// Stats for the header/filters
function getStats() {
  const db = readDb();
  const stats = { all: db.tasks.length, todo: 0, in_progress: 0, done: 0 };
  for (const t of db.tasks) {
    if (stats[t.status] !== undefined) stats[t.status] += 1;
  }
  return stats;
}

module.exports = {
  STATUSES,
  STATUS_LABELS,
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getStats,
};
