import cors from 'cors';
import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NOTES_FILE = path.join(__dirname, 'data', 'notes.json');

const app = express();
const PORT = Number.parseInt(process.env.PORT || '3001', 10);

app.use(cors());
app.use(express.json({ limit: '1mb' }));

function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function sanitizeNote(note) {
  const nowIso = new Date().toISOString();
  return {
    id: typeof note?.id === 'string' && note.id ? note.id : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    content: typeof note?.content === 'string' ? note.content.slice(0, 300) : '',
    color: isHexColor(note?.color) ? note.color : '#fff9c4',
    authorNickname: typeof note?.authorNickname === 'string' ? note.authorNickname.slice(0, 32) : '',
    createdAt: typeof note?.createdAt === 'string' ? note.createdAt : nowIso,
    updatedAt: typeof note?.updatedAt === 'string' ? note.updatedAt : nowIso,
  };
}

async function ensureStore() {
  await fs.mkdir(path.dirname(NOTES_FILE), { recursive: true });
  try {
    await fs.access(NOTES_FILE);
  } catch {
    await fs.writeFile(NOTES_FILE, JSON.stringify({ notes: [] }, null, 2), 'utf8');
  }
}

async function readNotes() {
  await ensureStore();
  try {
    const raw = await fs.readFile(NOTES_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.notes)) {
      return [];
    }
    return parsed.notes.map(sanitizeNote);
  } catch {
    return [];
  }
}

async function writeNotes(notes) {
  await ensureStore();
  await fs.writeFile(NOTES_FILE, JSON.stringify({ notes }, null, 2), 'utf8');
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/notes', async (_req, res) => {
  const notes = await readNotes();
  notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json({ notes });
});

app.post('/api/notes', async (req, res) => {
  const payload = req.body || {};
  const now = new Date().toISOString();
  const note = sanitizeNote({
    id: payload.id,
    content: payload.content,
    color: payload.color,
    authorNickname: payload.authorNickname,
    createdAt: now,
    updatedAt: now,
  });

  const notes = await readNotes();
  notes.unshift(note);
  await writeNotes(notes);
  res.status(201).json({ note });
});

app.patch('/api/notes/:id', async (req, res) => {
  const { id } = req.params;
  const notes = await readNotes();
  const index = notes.findIndex((note) => note.id === id);

  if (index < 0) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }

  const current = notes[index];
  const nextContent = typeof req.body?.content === 'string' ? req.body.content.slice(0, 300) : current.content;
  const nextColor = isHexColor(req.body?.color) ? req.body.color : current.color;
  const incomingAuthor = typeof req.body?.authorNickname === 'string' ? req.body.authorNickname.slice(0, 32) : '';
  const nextAuthorNickname = current.authorNickname || incomingAuthor;
  const changed = nextContent !== current.content || nextColor !== current.color;

  const updated = {
    ...current,
    content: nextContent,
    color: nextColor,
    authorNickname: nextAuthorNickname,
    updatedAt: changed ? new Date().toISOString() : current.updatedAt,
  };

  notes[index] = sanitizeNote(updated);
  await writeNotes(notes);
  res.json({ note: notes[index] });
});

app.delete('/api/notes/:id', async (req, res) => {
  const { id } = req.params;
  const notes = await readNotes();
  const next = notes.filter((note) => note.id !== id);

  if (next.length === notes.length) {
    res.status(404).json({ error: 'Note not found' });
    return;
  }

  await writeNotes(next);
  res.status(204).send();
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Shared note server running on http://localhost:${PORT}`);
});
