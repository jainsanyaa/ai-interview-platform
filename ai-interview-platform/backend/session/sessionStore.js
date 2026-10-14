// In-memory session store. No database — sessions live in a Map keyed by sessionId.
// Each session holds: resumeData, questions[], answers[], interview status/timing.
// Sessions auto-expire after INACTIVITY_TIMEOUT_MS of no activity to avoid memory leaks.

const sessions = new Map();
const sessionHistory = []; // Track completed diagnostic and interview sessions

const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

function createSession(sessionId) {
  const session = {
    sessionId,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    resumeData: null, // { rawText, parsedJson, atsScore, atsBreakdown, missingCheck, jdMatch, suggestions }
    interview: {
      status: "not_started", // not_started | in_progress | completed
      startedAt: null,
      endedAt: null,
      questions: [],
      answers: [],
      report: null
    }
  };
  sessions.set(sessionId, session);
  return session;
}

function getSession(sessionId) {
  const session = sessions.get(sessionId);
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
  return session;
}

function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

function addHistoryEntry(entry) {
  // Keep newest at front, cap at 30 items
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

// Sweep expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActiveAt > INACTIVITY_TIMEOUT_MS) {
      sessions.delete(id);
    }
  }
}, 10 * 60 * 1000); // check every 10 min

export {
  createSession,
  getSession,
  getOrCreateSession,
  updateSession,
  deleteSession,
  addHistoryEntry,
  getHistory
};
