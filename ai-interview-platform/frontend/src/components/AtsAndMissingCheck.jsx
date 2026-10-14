import { useState } from "react";
import { matchJobDescription } from "../api/client.js";

const CATEGORY_LABELS = {
  skillsMatch: "Skills match",
  keywordOptimization: "Keyword optimization",
  formatting: "Formatting & scanability",
  experienceRelevance: "Experience relevance",
  resumeStructure: "Resume structure",
  impactMetrics: "Quantifiable impact metrics"
};

function CircularScore({ score, label, size = 120, stroke = 10, color = "#D94826" }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-slate-200"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            fill="transparent"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display font-bold text-3xl text-ink leading-none">{score}</span>
          <span className="font-mono text-[10px] text-slate-400 mt-0.5">/ 100</span>
        </div>
      </div>
      {label && <span className="font-sans font-medium text-xs text-slate-600 mt-2">{label}</span>}
    </div>
  );
}

function ScoreProgressBar({ label, value }) {
  const getColor = (v) => {
    if (v >= 80) return "bg-brand-emerald";
    if (v >= 65) return "bg-brand-rust";
    return "bg-brand-amber";
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between font-mono text-xs text-slate-600">
        <span className="font-sans text-xs font-medium text-ink">{label}</span>
        <span className="font-semibold">{value}/100</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(value)} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function AtsAndMissingCheck({
  resumeData,
  sessionId,
  onProceedToInterview,
  onUpdateResumeData
}) {
  const {
    atsScore = 75,
    atsBreakdown = {},
    strengths = [],
    weaknesses = [],
    suggestions = [],
    missingCheck = {},
    jdMatch: initialJdMatch = null,
    targetRole,
    parsedJson = {}
  } = resumeData;

  const [jdMatch, setJdMatch] = useState(initialJdMatch);
  const [jdText, setJdText] = useState("");
  const [showJdBox, setShowJdBox] = useState(!initialJdMatch);
  const [matchingJd, setMatchingJd] = useState(false);
  const [checklist, setChecklist] = useState(() => {
    return (missingCheck?.actionChecklist || []).map((item, idx) => ({
      ...item,
      id: item.id || `item-${idx}`,
      done: false
    }));
  });

  const toggleChecklistItem = (id) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  async function handleRunJdMatch() {
    if (!jdText.trim() || !sessionId) return;
    setMatchingJd(true);
    try {
      const matchResult = await matchJobDescription(sessionId, jdText.trim());
      setJdMatch(matchResult);
      if (onUpdateResumeData) {
        onUpdateResumeData({
          ...resumeData,
          jobDescription: jdText.trim(),
          jdMatch: matchResult
        });
      }
      setShowJdBox(false);
    } catch (err) {
      alert("Error matching Job Description: " + err.message);
    } finally {
      setMatchingJd(false);
    }
  }

  const missingSections = missingCheck?.missingSections || [];
  const missingContact = missingCheck?.missingContactInfo || [];
  const metricsCheck = missingCheck?.quantifiableMetricsCheck || null;
  const redFlags = missingCheck?.redFlags || [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Top Banner / Hero */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-line shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <CircularScore
            score={atsScore}
            size={130}
            stroke={11}
            color={atsScore >= 80 ? "#10B981" : atsScore >= 65 ? "#D94826" : "#F59E0B"}
          />
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-brand-rust/10 text-brand-rust">
              <span>ATS AUDIT RESULT</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-ink font-semibold">
              {atsScore >= 85
                ? "Highly ATS-Optimized"
                : atsScore >= 70
                ? "Solid Foundation — Needs Fine-Tuning"
                : "Critical ATS Gaps Detected"}
            </h2>
            <p className="font-sans text-xs sm:text-sm text-slate-600 max-w-lg">
              Evaluated across Greenhouse, Lever, and Workday parsing standards
              {targetRole ? ` for "${targetRole}"` : ""}.
            </p>
          </div>
        </div>

        <button
          onClick={onProceedToInterview}
          className="w-full md:w-auto px-6 py-3.5 rounded-xl bg-ink text-paper font-sans font-semibold text-sm hover:bg-brand-rust transition-all shadow-md flex items-center justify-center gap-2 shrink-0"
        >
          <span>Start Voice Mock Interview</span>
          <span>→</span>
        </button>
      </div>

      {/* Grid: ATS Breakdown & Missing Check */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ATS Dimension Breakdown */}
        <div className="glass-card rounded-2xl p-6 border border-line space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
              <span>📊</span> ATS Dimension Breakdown
            </h3>
            <span className="font-mono text-xs text-slate-400">Target: 80%+</span>
          </div>

          <div className="space-y-3.5 pt-2">
            {atsBreakdown &&
              Object.entries(atsBreakdown).map(([key, value]) => (
                <ScoreProgressBar
                  key={key}
                  label={CATEGORY_LABELS[key] || key}
                  value={value}
                />
              ))}
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-line">
            <div className="p-3 rounded-xl bg-brand-emerald/5 border border-brand-emerald/15 space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-brand-emerald font-semibold block">
                ✓ Key Strengths
              </span>
              <ul className="text-xs text-ink space-y-1 list-disc list-inside">
                {strengths.slice(0, 3).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-brand-rust/5 border border-brand-rust/15 space-y-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-brand-rust font-semibold block">
                ! ATS Risks
              </span>
              <ul className="text-xs text-ink space-y-1 list-disc list-inside">
                {weaknesses.slice(0, 3).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Missing Check Audit */}
        <div className="glass-card rounded-2xl p-6 border border-line space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
              <span>🔍</span> Missing Checks & Audit
            </h3>
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-brand-amber/15 text-brand-amber">
              Critical Check
            </span>
          </div>

          {/* Missing Sections */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-medium">
              Missing Resume Sections
            </span>
            {missingSections.length > 0 ? (
              <div className="space-y-1.5">
                {missingSections.map((sec, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs flex items-start justify-between gap-2"
                  >
                    <div>
                      <span className="font-semibold text-ink">{sec.name}</span>
                      <p className="text-slate-600 text-[11px] mt-0.5">{sec.explanation}</p>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        sec.criticality === "HIGH"
                          ? "bg-brand-rust text-white"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {sec.criticality}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-brand-emerald flex items-center gap-1.5 font-medium">
                <span>✓</span> All standard resume sections (Experience, Education, Skills, Projects) detected!
              </p>
            )}
          </div>

          {/* Missing Contact Info */}
          <div className="space-y-1.5 pt-2 border-t border-line">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-medium">
              Contact & Profile Links Check
            </span>
            {missingContact.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {missingContact.map((c, i) => (
                  <span
                    key={i}
                    className="text-xs px-2.5 py-1 rounded-full bg-brand-rust/10 text-brand-rust font-sans font-medium"
                  >
                    Missing: {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-brand-emerald font-medium">
                ✓ Full contact info & professional links detected.
              </p>
            )}
          </div>

          {/* Quantifiable Impact Metrics Check */}
          {metricsCheck && (
            <div className="space-y-2 pt-2 border-t border-line">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-medium">
                  Quantifiable Metrics Audit
                </span>
                <span className="font-mono text-xs font-bold text-ink">
                  {metricsCheck.metricsScore}/100
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-line">
                {metricsCheck.recommendation}
              </p>
            </div>
          )}

          {/* Red flags */}
          {redFlags.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-line">
              <span className="text-xs font-mono uppercase tracking-wider text-brand-rust font-semibold">
                Formatting Red Flags
              </span>
              {redFlags.map((rf, i) => (
                <div key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-brand-rust">⚠</span>
                  <span>
                    <strong>{rf.flag}:</strong> {rf.fix}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Checklist */}
      {checklist.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-line space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink flex items-center gap-2">
              <span>✅</span> Recommended Resume Fixes Checklist
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {checklist.filter((c) => c.done).length} of {checklist.length} completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleChecklistItem(item.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                  item.done
                    ? "bg-brand-emerald/5 border-brand-emerald/30 line-through text-slate-400"
                    : "bg-white/80 border-line hover:border-slate-400 text-ink"
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => toggleChecklistItem(item.id)}
                  className="mt-0.5 rounded text-brand-emerald focus:ring-brand-emerald"
                />
                <div className="flex-1 text-xs">
                  <p className="font-medium">{item.task}</p>
                  <span className="text-[10px] font-mono text-slate-400 uppercase mt-0.5 inline-block">
                    Impact: {item.impact}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job Description (JD) Matching Card */}
      <div className="glass-card rounded-2xl p-6 border border-line space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-xl font-semibold text-ink">
                Job Description (JD) Semantic Matching
              </h3>
              {jdMatch && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-brand-emerald/10 text-brand-emerald">
                  {jdMatch.matchTier}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Analyze how well your resume matches a target job posting before you apply.
            </p>
          </div>

          <button
            onClick={() => setShowJdBox(!showJdBox)}
            className="text-xs font-mono text-brand-rust hover:underline self-start sm:self-auto"
          >
            {showJdBox ? "Hide JD Box" : jdMatch ? "↻ Re-match with another JD" : "+ Paste a Job Description"}
          </button>
        </div>

        {/* Input box to add/change JD */}
        {showJdBox && (
          <div className="space-y-3 bg-white/70 p-4 rounded-xl border border-line animate-fadeIn">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-600 block">
              Paste Target Job Posting / Requirements
            </label>
            <textarea
              rows={4}
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste the target job description text here..."
              className="w-full border border-line bg-white rounded-lg p-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand-rust/30"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleRunJdMatch}
                disabled={!jdText.trim() || matchingJd}
                className="px-4 py-2 bg-ink text-paper rounded-lg text-xs font-semibold hover:bg-brand-rust disabled:opacity-50"
              >
                {matchingJd ? "Matching JD with AI…" : "Calculate JD Match %"}
              </button>
            </div>
          </div>
        )}

        {/* JD Match Results Display */}
        {jdMatch ? (
          <div className="space-y-6">
            {/* Match Score & Alignment */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/80 border border-line text-center">
                <span className="font-mono text-xs uppercase tracking-wider text-slate-400 block mb-1">
                  JD Match Score
                </span>
                <span className="font-display text-4xl font-bold text-ink">
                  {jdMatch.matchScore}%
                </span>
                <span className="text-[11px] font-sans text-brand-emerald font-semibold block mt-1">
                  {jdMatch.matchTier}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/80 border border-line text-center">
                <span className="font-mono text-xs uppercase tracking-wider text-slate-400 block mb-1">
                  Target Role Fit
                </span>
                <span className="font-display text-lg font-semibold text-ink line-clamp-1">
                  {jdMatch.targetTitle || targetRole || "Software Role"}
                </span>
                <span className="text-[11px] font-sans text-slate-500 block mt-1">
                  Experience Alignment: {jdMatch.experienceAlignment?.score || 85}%
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/80 border border-line text-center">
                <span className="font-mono text-xs uppercase tracking-wider text-slate-400 block mb-1">
                  Matched Skills
                </span>
                <span className="font-display text-4xl font-bold text-brand-emerald">
                  {jdMatch.matchedSkills?.length || 0}
                </span>
                <span className="text-[11px] font-sans text-slate-500 block mt-1">
                  Missing required: {jdMatch.missingRequiredSkills?.length || 0}
                </span>
              </div>
            </div>

            {/* Keyword Pill Cloud */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Matched Skills */}
              <div className="p-4 rounded-xl bg-brand-emerald/5 border border-brand-emerald/15 space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-brand-emerald font-semibold block">
                  ✓ Matched Core Skills & Keywords ({jdMatch.matchedSkills?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(jdMatch.matchedSkills || []).map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full text-xs font-sans font-medium bg-brand-emerald/15 text-emerald-800"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="p-4 rounded-xl bg-brand-rust/5 border border-brand-rust/15 space-y-2">
                <span className="text-xs font-mono uppercase tracking-wider text-brand-rust font-semibold block">
                  ! Missing Required Skills ({jdMatch.missingRequiredSkills?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(jdMatch.missingRequiredSkills || []).map((skill, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full text-xs font-sans font-medium bg-brand-rust/15 text-brand-rust"
                    >
                      +{skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Tailoring Recommendations */}
            {jdMatch.tailoringTips?.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-500 font-semibold block">
                  Step-by-Step Tailoring Recommendations for this JD
                </span>
                <div className="space-y-2">
                  {jdMatch.tailoringTips.map((tip, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-white/70 border border-line text-xs space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink font-mono uppercase tracking-wider text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                          {tip.section}
                        </span>
                        <span className="text-slate-700 font-medium">{tip.advice}</span>
                      </div>
                      {tip.example && (
                        <p className="text-slate-500 italic pl-2 border-l-2 border-brand-rust/30">
                          Example: "{tip.example}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-line rounded-xl space-y-2">
            <p className="text-xs text-slate-500">
              Paste a Job Description above to see exact keyword match percentages and missing skill gaps.
            </p>
          </div>
        )}
      </div>

      {/* Floating Bottom Nav */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onProceedToInterview}
          className="px-8 py-4 rounded-xl bg-ink text-paper font-sans font-semibold text-base hover:bg-brand-rust shadow-glow transition-all flex items-center gap-3"
        >
          <span>Proceed to Voice Mock Interview</span>
          <span className="text-xl">🎙️</span>
        </button>
      </div>
    </div>
  );
}
