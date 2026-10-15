import fs from "fs";
import path from "path";
import os from "os";

// In-memory session store with /tmp persistence for serverless compatibility.
const sessions = new Map();
let sessionHistory = [];

const SESSIONS_DIR = path.join(os.tmpdir(), "ai_interview_sessions");
try {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
} catch (e) {
  // Ignore filesystem errors in restricted environments
}

function saveToDisk(sessionId, session) {
  try {
    const file = path.join(SESSIONS_DIR, `${sessionId}.json`);
    fs.writeFileSync(file, JSON.stringify(session), "utf8");
  } catch (e) {}
}

function loadFromDisk(sessionId) {
  try {
    const file = path.join(SESSIONS_DIR, `${sessionId}.json`);
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      return data;
    }
  } catch (e) {}
  return null;
}

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

function createSession(sessionId) {
  const session = {
    sessionId,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    resumeData: null,
    interview: {
      status: "not_started",
      startedAt: null,
      endedAt: null,
      questions: [],
      answers: [],
      report: null
    }
  };
  sessions.set(sessionId, session);
  saveToDisk(sessionId, session);
  return session;
}

function getSession(sessionId) {
  if (!sessionId) return null;
  let session = sessions.get(sessionId);
  if (!session) {
    session = loadFromDisk(sessionId);
    if (session) {
      sessions.set(sessionId, session);
    }
  }
  if (!session) return null;
  session.lastActiveAt = Date.now();
  return session;
}

function getOrCreateSession(sessionId) {
  return getSession(sessionId) || createSession(sessionId);
}

function updateSession(sessionId, patch) {
  const session = getSession(sessionId);
  if (!session) return null;
  Object.assign(session, patch);
  session.lastActiveAt = Date.now();
  saveToDisk(sessionId, session);
  return session;
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
  try {
    const file = path.join(SESSIONS_DIR, `${sessionId}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch (e) {}
}

function addHistoryEntry(entry) {
  sessionHistory.unshift({
    id: entry.sessionId || Date.now().toString(),
    timestamp: Date.now(),
    role: entry.role || "General Role",
    atsScore: entry.atsScore || 0,
    jdMatchScore: entry.jdMatchScore ?? null,
    hireabilityScore: entry.hireabilityScore ?? null,
    verdict: entry.verdict || "Completed",
    answersCount: entry.answersCount || 0
  });
  if (sessionHistory.length > 30) sessionHistory.pop();
}

function getHistory() {
  return sessionHistory;
}

// Sweep expired sessions periodically without blocking serverless exit
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActiveAt > INACTIVITY_TIMEOUT_MS) {
      deleteSession(id);
    }
  }
}, 10 * 60 * 1000);
if (cleanupInterval.unref) cleanupInterval.unref();

export {
  createSession,
  getSession,
  getOrCreateSession,
  updateSession,
  deleteSession,
  addHistoryEntry,
  getHistory
};
