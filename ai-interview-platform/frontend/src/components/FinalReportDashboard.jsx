import { useState } from "react";

export default function FinalReportDashboard({
  report,
  answers = [],
  resumeData = {},
  onRetakeInterview,
  onViewHistory
}) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview"); // overview | questions | roadmap

  const {
    hireabilityScore = 84,
    verdict = "STRONG HIRE",
    executiveSummary = "",
    radarScores = {},
    topStrengths = [],
    criticalImprovementAreas = [],
    actionPlan7Days = []
  } = report || {};

  const getVerdictStyle = (v) => {
    switch (v) {
      case "STRONG HIRE":
        return "bg-brand-emerald/15 text-emerald-800 border-brand-emerald/30";
      case "HIRE":
        return "bg-blue-500/15 text-blue-800 border-blue-500/30";
      case "LEANING HIRE":
        return "bg-brand-amber/15 text-amber-800 border-brand-amber/30";
      default:
        return "bg-brand-rust/15 text-brand-rust border-brand-rust/30";
    }
  };

  function handleCopySummary() {
    const text = `=== AI INTERVIEW CANDIDATE EVALUATION REPORT ===
Target Role: ${resumeData?.targetRole || "Software Professional"}
Overall Hireability Score: ${hireabilityScore}/100
Verdict: ${verdict}
ATS Score: ${radarScores?.atsCompatibility || resumeData?.atsScore || "N/A"}/100
Communication Score: ${radarScores?.communicationClarity || "N/A"}/100

Executive Summary:
${executiveSummary}

Top Strengths:
${topStrengths.map((s) => `• ${s}`).join("\n")}

Areas to Improve:
${criticalImprovementAreas.map((a) => `• ${a}`).join("\n")}
`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn pb-12 print:p-0">
      {/* Top Action Bar (hidden in print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <span className="font-mono text-xs uppercase tracking-widest text-slate-400">
            OFFICIAL EVALUATION
          </span>
          <h2 className="font-display text-3xl text-ink font-semibold">
            Final Candidate Performance Report
          </h2>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopySummary}
            className="px-4 py-2 rounded-xl text-xs font-mono border border-line bg-white/80 hover:bg-white text-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>{copied ? "✓ Copied!" : "📋 Copy Summary"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-mono border border-line bg-white/80 hover:bg-white text-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>🖨️ Print / Save PDF</span>
          </button>

          <button
            onClick={onRetakeInterview}
            className="px-4 py-2 rounded-xl text-xs font-sans font-semibold bg-ink text-paper hover:bg-brand-rust transition-all shadow-sm"
          >
            ↻ Retake Simulation
          </button>
        </div>
      </div>

      {/* Hero Verdict Card */}
      <div className="glass-card rounded-2xl p-6 sm:p-8 border border-line shadow-card flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-6">
          {/* Large circular score */}
          <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
            <div className="w-full h-full rounded-full border-8 border-brand-emerald/20 flex flex-col items-center justify-center bg-white shadow-inner">
              <span className="font-display text-4xl font-bold text-ink leading-none">
                {hireabilityScore}
              </span>
              <span className="font-mono text-[10px] text-slate-400 mt-0.5">/ 100</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${getVerdictStyle(
                  verdict
                )}`}
              >
                {verdict}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {resumeData?.targetRole || "Software Professional"}
              </span>
            </div>

            <h3 className="font-display text-2xl text-ink font-semibold">
              Ready for Senior-Level Technical Rounds
            </h3>

            <p className="font-sans text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
              {executiveSummary}
            </p>
          </div>
        </div>

        <button
          onClick={onViewHistory}
          className="px-5 py-3 rounded-xl border border-line hover:border-brand-rust text-xs font-mono text-slate-600 hover:text-brand-rust transition-all shrink-0 print:hidden"
        >
          View Progress History →
        </button>
      </div>

      {/* 6-Dimensional Radar Grid */}
      <div className="space-y-3">
        <h3 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
          <span>🎯</span> Competency Radar Dimensions
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "ATS Score", score: radarScores?.atsCompatibility ?? resumeData?.atsScore ?? 80, icon: "📄" },
            { label: "JD Fit", score: radarScores?.jdFit ?? resumeData?.jdMatch?.matchScore ?? 82, icon: "🎯" },
            { label: "Tech Depth", score: radarScores?.technicalCompetence ?? 85, icon: "💻" },
            { label: "Communication", score: radarScores?.communicationClarity ?? 82, icon: "🗣️" },
            { label: "STAR Structure", score: radarScores?.starMethodology ?? 78, icon: "⭐" },
            { label: "Confidence", score: radarScores?.confidencePresence ?? 85, icon: "🦁" }
          ].map((dim, i) => (
            <div
              key={i}
              className="glass-card rounded-2xl p-4 border border-line text-center space-y-1.5 shadow-sm"
            >
              <span className="text-xl">{dim.icon}</span>
              <span className="font-display text-2xl font-bold text-ink block">
                {dim.score}%
              </span>
              <span className="font-sans text-[11px] font-medium text-slate-500 block leading-tight">
                {dim.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths & Growth Areas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Strengths */}
        <div className="glass-card rounded-2xl p-6 border border-line space-y-3">
          <span className="font-mono text-xs uppercase tracking-wider text-brand-emerald font-semibold flex items-center gap-1.5">
            <span>✓</span> Top Validated Strengths
          </span>
          <ul className="space-y-2 text-xs sm:text-sm text-ink">
            {topStrengths.map((str, i) => (
              <li
                key={i}
                className="p-3 rounded-xl bg-brand-emerald/5 border border-brand-emerald/15 flex items-start gap-2.5"
              >
                <span className="text-brand-emerald font-bold">✓</span>
                <span>{str}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Improvement Areas */}
        <div className="glass-card rounded-2xl p-6 border border-line space-y-3">
          <span className="font-mono text-xs uppercase tracking-wider text-brand-rust font-semibold flex items-center gap-1.5">
            <span>!</span> Priority Refinements
          </span>
          <ul className="space-y-2 text-xs sm:text-sm text-ink">
            {criticalImprovementAreas.map((area, i) => (
              <li
                key={i}
                className="p-3 rounded-xl bg-brand-rust/5 border border-brand-rust/15 flex items-start gap-2.5"
              >
                <span className="text-brand-rust font-bold">!</span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 7-Day Actionable Prep Roadmap */}
      {actionPlan7Days?.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-line space-y-4">
          <h3 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
            <span>🗓️</span> 7-Day High-Impact Prep Plan
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {actionPlan7Days.map((step, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-white/80 border border-line space-y-1.5 text-xs shadow-sm"
              >
                <span className="font-mono font-bold text-brand-rust uppercase text-[11px] block">
                  {step.day}
                </span>
                <span className="font-semibold text-ink block">{step.focus}</span>
                <p className="text-slate-600 text-[11px] leading-relaxed">{step.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question-by-Question Transcript & Review */}
      {answers.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-line space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <h3 className="font-display text-lg font-semibold text-ink flex items-center gap-2">
              <span>🎙️</span> Answer-by-Answer Detailed Review ({answers.length})
            </h3>
            <span className="text-xs font-mono text-slate-400">STAR & Speech Diagnostics</span>
          </div>

          <div className="space-y-4">
            {answers.map((ans, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white/90 border border-line space-y-3 text-xs"
              >
                {/* Question title */}
                <div className="flex items-start justify-between gap-3">
                  <span className="font-display font-semibold text-sm text-ink">
                    Q{idx + 1}: "{ans.questionText || ans.question}"
                  </span>
                  {ans.communication?.scores?.overall && (
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-brand-emerald/15 text-emerald-800 shrink-0">
                      Score: {ans.communication.scores.overall}%
                    </span>
                  )}
                </div>

                {/* Candidate response transcript */}
                <div className="p-3 rounded-lg bg-slate-50 border border-line space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block">
                    Your Response ({ans.timeSpentSeconds || 0}s):
                  </span>
                  <p className="text-slate-700 italic leading-relaxed">
                    "{ans.answerText || ans.answer}"
                  </p>
                </div>

                {/* Communication feedback */}
                {ans.communication && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="text-[11px] text-slate-600">
                      <strong className="text-brand-emerald">Tone & Clarity:</strong>{" "}
                      {ans.communication.toneDescriptor || "Professional"} •{" "}
                      {ans.communication.pacingFeedback}
                    </div>

                    <div className="text-[11px] text-slate-600">
                      <strong className="text-brand-amber">Fillers Detected:</strong>{" "}
                      {ans.communication.detectedFillerWords?.length > 0
                        ? ans.communication.detectedFillerWords.join(", ")
                        : "None (Clean delivery)"}
                    </div>
                  </div>
                )}

                {/* Model answer snippet */}
                {ans.communication?.modelAnswer && (
                  <details className="pt-1 text-[11px] cursor-pointer">
                    <summary className="font-mono text-brand-rust hover:underline">
                      View Model Answer comparison
                    </summary>
                    <p className="mt-1.5 p-3 rounded-lg bg-brand-rust/5 border border-brand-rust/20 text-slate-800 leading-relaxed italic">
                      "{ans.communication.modelAnswer}"
                    </p>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
