import { useState, useEffect } from "react";
import { getLocalHistory, fetchRemoteHistory } from "../api/client.js";

export default function ProgressTracking({ onStartNew, onResumeSession }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const local = getLocalHistory();
      const remote = await fetchRemoteHistory();
      // Merge unique entries by ID
      const map = new Map();
      [...local, ...remote].forEach((entry) => {
        if (entry.id) map.set(entry.id, entry);
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
      );
      setHistory(merged);
      setLoading(false);
    }
    load();
  }, []);

  function handleClearHistory() {
    if (confirm("Clear your local assessment history?")) {
      localStorage.removeItem("aiInterviewProgressHistory");
      setHistory([]);
    }
  }

  // Calculate stats
  const totalScans = history.length;
  const atsScores = history.map((h) => h.atsScore).filter(Boolean);
  const hireabilityScores = history.map((h) => h.hireabilityScore).filter(Boolean);

  const avgAts =
    atsScores.length > 0
      ? Math.round(atsScores.reduce((a, b) => a + b, 0) / atsScores.length)
      : 0;
  const peakAts = atsScores.length > 0 ? Math.max(...atsScores) : 0;
  const avgHireability =
    hireabilityScores.length > 0
      ? Math.round(hireabilityScores.reduce((a, b) => a + b, 0) / hireabilityScores.length)
      : 0;

  // Improvement delta between oldest and newest
  const oldestAts = atsScores[atsScores.length - 1] || 0;
  const newestAts = atsScores[0] || 0;
  const atsDelta = oldestAts > 0 ? newestAts - oldestAts : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-brand-rust font-semibold">
            GROWTH & PROGRESS
          </span>
          <h2 className="font-display text-3xl text-ink font-semibold">
            Assessment & Interview Progression
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Track your ATS optimization and mock interview scores across practice attempts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {history.length > 0 && (
            <button
              onClick={handleClearHistory}
              className="text-xs font-mono text-slate-500 hover:text-brand-rust px-3 py-1.5 rounded-lg border border-line"
            >
              Clear History
            </button>
          )}

          <button
            onClick={onStartNew}
            className="px-4 py-2 rounded-xl text-xs font-sans font-semibold bg-ink text-paper hover:bg-brand-rust transition-all shadow-sm"
          >
            + New Assessment
          </button>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-line text-center space-y-1 shadow-sm">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">
            Total Sessions
          </span>
          <span className="font-display text-3xl font-bold text-ink">{totalScans}</span>
          <span className="text-[10px] font-sans text-slate-500 block">Recorded Runs</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-line text-center space-y-1 shadow-sm">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">
            Avg ATS Score
          </span>
          <span className="font-display text-3xl font-bold text-brand-rust">
            {avgAts > 0 ? `${avgAts}%` : "—"}
          </span>
          <span className="text-[10px] font-sans text-slate-500 block">
            Peak: {peakAts > 0 ? `${peakAts}%` : "—"}
          </span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-line text-center space-y-1 shadow-sm">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">
            Interview Readiness
          </span>
          <span className="font-display text-3xl font-bold text-brand-emerald">
            {avgHireability > 0 ? `${avgHireability}%` : "—"}
          </span>
          <span className="text-[10px] font-sans text-slate-500 block">Hireability Index</span>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-line text-center space-y-1 shadow-sm">
          <span className="text-[10px] font-mono uppercase text-slate-400 block">
            ATS Score Delta
          </span>
          <span
            className={`font-display text-3xl font-bold ${
              atsDelta >= 0 ? "text-brand-emerald" : "text-brand-rust"
            }`}
          >
            {atsDelta > 0 ? `+${atsDelta}%` : `${atsDelta}%`}
          </span>
          <span className="text-[10px] font-sans text-slate-500 block">Overall Trajectory</span>
        </div>
      </div>

      {/* Timeline List of Sessions */}
      <div className="glass-card rounded-2xl p-6 border border-line space-y-4 shadow-card">
        <h3 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
          <span>📜</span> Session History Log
        </h3>

        {loading ? (
          <p className="text-xs text-slate-400 font-mono py-8 text-center">
            Loading assessment records…
          </p>
        ) : history.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-line rounded-xl space-y-3">
            <span className="text-3xl block">📋</span>
            <p className="font-display text-base text-ink font-semibold">
              No Past Sessions Recorded Yet
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload your resume and complete a mock interview session to begin tracking your score progression over time.
            </p>
            <button
              onClick={onStartNew}
              className="mt-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-ink text-paper hover:bg-brand-rust transition-all"
            >
              Upload Resume Now
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item, idx) => {
              const dateStr = item.timestamp
                ? new Date(item.timestamp).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                : "Recent";

              return (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-xl bg-white/80 border border-line hover:border-brand-rust/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-sm text-ink">
                        {item.role || "General Assessment"}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                        {item.verdict || "Completed"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono">{dateStr}</p>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* ATS score indicator */}
                    <div className="text-center">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        ATS
                      </span>
                      <span className="font-display text-base font-bold text-ink">
                        {item.atsScore}%
                      </span>
                    </div>

                    {/* JD Match */}
                    <div className="text-center">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        JD Match
                      </span>
                      <span className="font-display text-base font-bold text-brand-emerald">
                        {item.jdMatchScore ? `${item.jdMatchScore}%` : "—"}
                      </span>
                    </div>

                    {/* Hireability */}
                    <div className="text-center">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Hireability
                      </span>
                      <span className="font-display text-base font-bold text-brand-rust">
                        {item.hireabilityScore ? `${item.hireabilityScore}%` : "—"}
                      </span>
                    </div>

                    {/* Qs answered */}
                    <div className="text-center">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Questions
                      </span>
                      <span className="font-mono text-xs font-medium text-slate-600">
                        {item.answersCount || 0}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
