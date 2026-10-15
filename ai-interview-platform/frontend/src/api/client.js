const SESSION_KEY = "aiInterviewSessionId";
const RESUME_DATA_KEY = "aiInterviewResumeData";
const HISTORY_KEY = "aiInterviewProgressHistory";
const inFlightSessionFetches = new Map();

function getSessionId() {
  return localStorage.getItem(SESSION_KEY);
}

function setSessionId(id) {
  if (id) {
    localStorage.setItem(SESSION_KEY, id);
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function getCachedResumeData() {
  const raw = localStorage.getItem(RESUME_DATA_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setCachedResumeData(data) {
  if (data) {
    localStorage.setItem(RESUME_DATA_KEY, JSON.stringify(data));
  } else {
    localStorage.removeItem(RESUME_DATA_KEY);
  }
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(RESUME_DATA_KEY);
}

function getLocalHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalHistoryEntry(entry) {
  try {
    const history = getLocalHistory();
    const updated = [
      {
        ...entry,
        timestamp: entry.timestamp || Date.now(),
        id: entry.id || `hist-${Date.now()}`
      },
      ...history.filter((h) => h.id !== entry.id)
    ].slice(0, 25);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
}

async function uploadResume(file, targetRole, jobDescription) {
  const formData = new FormData();
  formData.append("resume", file);
  const existingSessionId = getSessionId();
  if (existingSessionId) formData.append("sessionId", existingSessionId);
  if (targetRole) formData.append("targetRole", targetRole);
  if (jobDescription) formData.append("jobDescription", jobDescription);

  const res = await fetch("/api/resume/upload", {
    method: "POST",
    body: formData
  });

  const data = await res.json();

  if (!res.ok) {
    const error = new Error(data.message || data.error || "UPLOAD_FAILED");
    error.code = data.error;
    throw error;
  }

  setSessionId(data.sessionId);
  setCachedResumeData(data.resumeData);

  // Track initial upload in local history
  saveLocalHistoryEntry({
    id: data.sessionId,
    role: targetRole || "General Candidate",
    atsScore: data.resumeData?.atsScore || 0,
    jdMatchScore: data.resumeData?.jdMatch?.matchScore ?? null,
    hireabilityScore: null,
    verdict: "Resume Analyzed",
    answersCount: 0
  });

  return data;
}

async function matchJobDescription(sessionId, jobDescription) {
  const res = await fetch("/api/resume/match-jd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      jobDescription,
      resumeData: getCachedResumeData()
    })
  });

  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || data.error || "JD_MATCH_FAILED");
    error.code = data.error;
    throw error;
  }
  return data.jdMatch;
}

async function fetchResumeForSession(sessionId) {
  if (!sessionId) return null;

  if (inFlightSessionFetches.has(sessionId)) {
    return inFlightSessionFetches.get(sessionId);
  }

  const request = (async () => {
    try {
      const res = await fetch(`/api/resume/${sessionId}`);

      if (res.status === 404) {
        const cached = getCachedResumeData();
        if (cached) {
          return {
            sessionId,
            resumeData: cached,
            interview: { status: "not_started", questions: [], answers: [] }
          };
        }
        clearSession();
        return null;
      }

      if (!res.ok) {
        const cached = getCachedResumeData();
        return cached
          ? {
              sessionId,
              resumeData: cached,
              interview: { status: "not_started", questions: [], answers: [] }
            }
          : null;
      }

      const data = await res.json();
      setCachedResumeData(data.resumeData);
      return data;
    } catch (e) {
      const cached = getCachedResumeData();
      return cached
        ? {
            sessionId,
            resumeData: cached,
            interview: { status: "not_started", questions: [], answers: [] }
          }
        : null;
    }
  })();

  inFlightSessionFetches.set(sessionId, request);
  try {
    return await request;
  } finally {
    inFlightSessionFetches.delete(sessionId);
  }
}

async function generateInterviewQuestions(sessionId, jobDescription = null) {
  if (!sessionId) return [];

  const res = await fetch("/api/resume/questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      jobDescription,
      resumeData: getCachedResumeData()
    })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.message || data.error || "QUESTION_GENERATION_FAILED");
    error.code = data.error;
    throw error;
  }

  const data = await res.json();
  return data.questions || [];
}

async function analyzeAnswer(sessionId, questionId, questionText, answerText, timeSpentSeconds = 0) {
  const res = await fetch("/api/resume/analyze-answer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      questionId,
      questionText,
      answerText,
      timeSpentSeconds,
      resumeData: getCachedResumeData()
    })
  });

  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || data.error || "ANALYSIS_FAILED");
    error.code = data.error;
    throw error;
  }
  return data;
}

async function completeInterview(sessionId) {
  const res = await fetch("/api/resume/complete-interview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId,
      resumeData: getCachedResumeData()
    })
  });

  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.message || data.error || "COMPLETION_FAILED");
    error.code = data.error;
    throw error;
  }

  // Update local history entry with final report scores
  if (data.report) {
    saveLocalHistoryEntry({
      id: sessionId,
      role: data.resumeData?.targetRole || "General Role",
      atsScore: data.resumeData?.atsScore || 0,
      jdMatchScore: data.resumeData?.jdMatch?.matchScore ?? null,
      hireabilityScore: data.report.hireabilityScore,
      verdict: data.report.verdict,
      answersCount: data.answers?.length || 0
    });
  }

  return data;
}

async function fetchRemoteHistory() {
  try {
    const res = await fetch("/api/resume/history");
    if (res.ok) {
      const data = await res.json();
      return data.history || [];
    }
  } catch (e) {}
  return [];
}

export {
  getSessionId,
  setSessionId,
  getCachedResumeData,
  setCachedResumeData,
  clearSession,
  getLocalHistory,
  saveLocalHistoryEntry,
  uploadResume,
  matchJobDescription,
  fetchResumeForSession,
  generateInterviewQuestions,
  analyzeAnswer,
  completeInterview,
  fetchRemoteHistory
};
