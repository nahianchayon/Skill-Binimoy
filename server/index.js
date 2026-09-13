import express from "express";
import cors from "cors";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 8081;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

app.use(cors());
app.use(express.json());

// Ensure no overly restrictive CSP is sent (some dev servers inject one),
// so the client can load scripts/styles when served from this server.
app.use((req, res, next) => {
  res.removeHeader("Content-Security-Policy");
  next();
});

const dbFile = path.resolve(process.cwd(), "server", "db.json");
const dir = path.dirname(dbFile);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const adapter = new JSONFile(dbFile);
const db = new Low(adapter);

async function initDb() {
  await db.read();
  db.data ||= { users: [], mentors: [], nextMentorId: 1, nextUserId: 1 };
  const existing = db.data.users.find((u) => u.email === "admin@demo.com");
  if (!existing) {
    const hash = await bcrypt.hash("password", 10);
    db.data.users.push({
      id: db.data.nextUserId++,
      email: "admin@demo.com",
      password: hash,
      name: "Admin Demo",
    });
    await db.write();
    console.log("Seeded admin@demo.com (password: password)");
  }
}
initDb();

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: "8h",
  });
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: "Missing authorization header" });
  const parts = auth.split(" ");
  if (parts.length !== 2) return res.status(401).json({ message: "Invalid authorization header" });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });
  await db.read();
  const user = db.data.users.find((u) => u.email === email);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Invalid credentials" });
  const token = generateToken(user);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

app.get("/api/dashboard", authMiddleware, async (req, res) => {
  await db.read();
  const count = db.data.mentors.length;
  res.json({ mentorsCount: count, user: req.user });
});

// CRUD for mentors
app.get("/api/mentors", authMiddleware, async (req, res) => {
  await db.read();
  const rows = [...db.data.mentors].sort((a, b) => b.id - a.id);
  res.json(rows);
});

app.get("/api/mentors/:id", authMiddleware, async (req, res) => {
  await db.read();
  const row = db.data.mentors.find((m) => String(m.id) === String(req.params.id));
  if (!row) return res.status(404).json({ message: "Not found" });
  res.json(row);
});

app.post("/api/mentors", authMiddleware, async (req, res) => {
  const { name, bio, subject } = req.body || {};
  if (!name) return res.status(400).json({ message: "Name is required" });
  await db.read();
  const newMentor = { id: db.data.nextMentorId++, name, bio: bio || "", subject: subject || "" };
  db.data.mentors.push(newMentor);
  await db.write();
  res.status(201).json(newMentor);
});

app.put("/api/mentors/:id", authMiddleware, async (req, res) => {
  const { name, bio, subject } = req.body || {};
  const id = String(req.params.id);
  await db.read();
  const idx = db.data.mentors.findIndex((m) => String(m.id) === id);
  if (idx === -1) return res.status(404).json({ message: "Not found" });
  const exists = db.data.mentors[idx];
  const updated = {
    ...exists,
    name: name || exists.name,
    bio: bio || exists.bio,
    subject: subject || exists.subject,
  };
  db.data.mentors[idx] = updated;
  await db.write();
  res.json(updated);
});

app.delete("/api/mentors/:id", authMiddleware, async (req, res) => {
  const id = String(req.params.id);
  await db.read();
  const before = db.data.mentors.length;
  db.data.mentors = db.data.mentors.filter((m) => String(m.id) !== id);
  if (db.data.mentors.length === before) return res.status(404).json({ message: "Not found" });
  await db.write();
  res.json({ success: true });
});

const HOST = process.env.HOST || "0.0.0.0";
const server = app.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
});

// Serve built frontend (if present) so the app can run from one host/port
// Resolve `dist/client` relative to this file so the server works regardless of CWD.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "..", "dist", "client");
console.log("Client dist path:", clientDist, "exists:", fs.existsSync(clientDist));
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    // Only serve index.html for non-API GET requests
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      if (err) next();
    });
  });
}
