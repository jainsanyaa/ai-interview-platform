import { useState, useRef } from "react";
import { uploadResume } from "../api/client.js";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const POPULAR_ROLES = [
  "Full Stack Developer",
  "Frontend Engineer",
  "Backend / Node.js Engineer",
  "Data Scientist / AI Engineer",
  "DevOps / Cloud Specialist",
  "Product Manager"
];

const SAMPLE_JD = `Role: Senior Full Stack Engineer
Key Responsibilities:
- Design and build scalable REST and GraphQL APIs using Node.js and PostgreSQL.
- Develop interactive, high-performance web applications using React, TypeScript, and modern CSS.
- Optimize database queries, caching strategies (Redis), and cloud deployment pipelines (Docker, AWS).
- Collaborate in agile sprints, write clean unit and integration tests (Jest), and mentor junior teammates.

Requirements:
- 3+ years of production experience with JavaScript/TypeScript, React, Node.js, and relational databases.
- Experience with Docker, CI/CD pipelines, Git, and cloud services (AWS or GCP).
- Strong communication, proactive problem solving, and ability to articulate architectural decisions.`;

export default function UploadResume({ onAnalyzed, initialRole = "", initialJd = "" }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState(initialRole);
  const [jobDescription, setJobDescription] = useState(initialJd);
  const [includeJd, setIncludeJd] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | analyzing | error
  const [analysisStep, setAnalysisStep] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef(null);

  function validateAndSetFile(candidate) {
    setErrorMessage("");
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setErrorMessage("Only PDF and DOCX files are supported.");
      return;
    }
    if (candidate.size > 5 * 1024 * 1024) {
      setErrorMessage("File is too large. Max size is 5MB.");
      return;
    }
    setFile(candidate);
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetFile(e.dataTransfer.files?.[0]);
  }

  async function handleAnalyze() {
    if (!file) return;
    setStatus("analyzing");
    setErrorMessage("");

    setAnalysisStep("Extracting document text layer…");
    const stepTimer = setTimeout(() => {
      setAnalysisStep("Auditing ATS keyword density & missing sections…");
    }, 1500);

    const stepTimer2 = setTimeout(() => {
      if (includeJd && jobDescription.trim()) {
        setAnalysisStep("Computing Job Description semantic alignment & skill gaps…");
      } else {
        setAnalysisStep("Finalizing diagnostic scores & recommendations…");
      }
    }, 3500);

    try {
      const finalJd = includeJd && jobDescription.trim() ? jobDescription.trim() : null;
      const result = await uploadResume(file, targetRole.trim() || null, finalJd);
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      setStatus("idle");
      onAnalyzed(result);
    } catch (err) {
      clearTimeout(stepTimer);
      clearTimeout(stepTimer2);
      setStatus("error");
      setErrorMessage(
        err.message || "Something went wrong analyzing your resume. Please try again."
      );
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
      {/* Intro Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-rust/10 border border-brand-rust/20 text-brand-rust text-xs font-mono font-medium">
          <span>AI-POWERED RECRUITING DIAGNOSTICS</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl text-ink font-semibold tracking-tight">
          Benchmark Your Resume & Ace the Mock Interview
        </h1>
        <p className="font-sans text-slate-600 text-sm sm:text-base max-w-xl mx-auto">
          Get an instant enterprise-grade ATS audit, missing critical section checks, Job Description
          alignment, and personalized voice mock interview.
        </p>
      </div>

      {/* Main Upload Card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 shadow-card border border-line">
        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative overflow-hidden rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? "border-brand-rust bg-brand-rust/5 scale-[1.01]"
              : file
              ? "border-brand-emerald bg-brand-emerald/5"
              : "border-slate-300 hover:border-brand-rust/60 bg-white/60 hover:bg-white"
          }`}
        >
          {status === "analyzing" && <div className="scan-line" />}
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(e) => validateAndSetFile(e.target.files?.[0])}
          />

          <div className="flex flex-col items-center justify-center space-y-2">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-transform ${
                file ? "bg-brand-emerald/20 text-brand-emerald" : "bg-slate-100 text-slate-500"
              }`}
            >
              {file ? "✓" : "📄"}
            </div>

            <div>
              <p className="font-display text-xl text-ink font-semibold">
                {file ? file.name : "Upload your resume (PDF or DOCX)"}
              </p>
              <p className="font-mono text-xs uppercase tracking-wider text-slate-400 mt-1">
                {file
                  ? `${(file.size / 1024).toFixed(0)} KB • Click to choose a different file`
                  : "Drag & drop file here, or click to browse (up to 5MB)"}
              </p>
            </div>
          </div>
        </div>

        {/* Target Role & JD Options */}
        <div className="mt-6 space-y-5">
          {/* Target Role */}
          <div>
            <label className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-slate-600 mb-1.5">
              <span>Target Role (Recommended)</span>
              <span className="text-[10px] text-slate-400">Tailors ATS keywords & questions</span>
            </label>
            <input
              type="text"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="e.g. Senior Full Stack Engineer"
              className="w-full border border-line bg-white/90 rounded-xl px-4 py-2.5 font-sans text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-rust/30 focus:border-brand-rust transition-all"
            />

            {/* Quick Role Suggestions */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {POPULAR_ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setTargetRole(role)}
                  className={`text-[11px] font-sans px-2.5 py-1 rounded-full border transition-all ${
                    targetRole === role
                      ? "bg-ink text-paper border-ink"
                      : "bg-white/60 text-slate-600 border-line hover:border-slate-400"
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Job Description Toggle */}
          <div className="pt-2 border-t border-line">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeJdCheckbox"
                  checked={includeJd}
                  onChange={(e) => setIncludeJd(e.target.checked)}
                  className="w-4 h-4 text-brand-rust rounded border-line focus:ring-brand-rust"
                />
                <label
                  htmlFor="includeJdCheckbox"
                  className="font-sans text-sm font-semibold text-ink cursor-pointer"
                >
                  Match with a Specific Job Description (JD)
                </label>
              </div>

              {includeJd && (
                <button
                  type="button"
                  onClick={() => setJobDescription(SAMPLE_JD)}
                  className="text-xs font-mono text-brand-rust hover:underline"
                >
                  + Use Sample JD
                </button>
              )}
            </div>

            {includeJd && (
              <div className="mt-3 animate-fadeIn">
                <textarea
                  rows={5}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target job description or paste requirements here to evaluate semantic match % and missing skill gaps..."
                  className="w-full border border-line bg-white/90 rounded-xl p-3.5 font-sans text-xs text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-rust/30 focus:border-brand-rust transition-all leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-brand-rust/10 border border-brand-rust/20 text-brand-rust text-xs font-sans flex items-start gap-2">
            <span className="font-bold text-sm">⚠</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleAnalyze}
          disabled={!file || status === "analyzing"}
          className="mt-6 w-full bg-ink text-paper font-sans font-semibold text-base py-3.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-brand-rust active:scale-[0.99] transition-all duration-200 shadow-md flex items-center justify-center gap-2"
        >
          {status === "analyzing" ? (
            <>
              <svg className="animate-spin h-5 w-5 text-paper" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>{analysisStep || "Analyzing resume diagnostics…"}</span>
            </>
          ) : (
            <>
              <span>Run Comprehensive Diagnostics</span>
              <span>→</span>
            </>
          )}
        </button>
      </div>

      {/* Feature Highlights Footer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-xl glass-card border border-line">
          <div className="text-xl mb-1">🎯</div>
          <h3 className="font-sans font-semibold text-xs text-ink">ATS & Missing Audit</h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Detect missing sections, contact info gaps, and lack of quantifiable metric achievements.
          </p>
        </div>

        <div className="p-4 rounded-xl glass-card border border-line">
          <div className="text-xl mb-1">🔍</div>
          <h3 className="font-sans font-semibold text-xs text-ink">JD Semantic Matcher</h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Uncover exact matched keywords vs missing required skills before recruiters review.
          </p>
        </div>

        <div className="p-4 rounded-xl glass-card border border-line">
          <div className="text-xl mb-1">🎙️</div>
          <h3 className="font-sans font-semibold text-xs text-ink">Voice AI Recruiter</h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Speak answers out loud; receive instant feedback on confidence, filler words, and STAR structure.
          </p>
        </div>
      </div>
    </div>
  );
}
