export default function Navbar({ activeTab, onSelectTab, sessionData, onReset }) {
  const steps = [
    { id: "upload", label: "Upload & JD", icon: "📄" },
    { id: "ats", label: "ATS & Missing Check", icon: "🎯", disabled: !sessionData?.resumeData },
    { id: "interview", label: "Voice Interview", icon: "🎙️", disabled: !sessionData?.resumeData },
    { id: "report", label: "Final Report", icon: "📊", disabled: !sessionData?.hasCompletedInterview && !sessionData?.interviewReport },
    { id: "history", label: "Progress History", icon: "📈" }
  ];

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-line px-4 sm:px-8 py-3.5 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center justify-between">
          <div
            onClick={() => onSelectTab("upload")}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-ink text-paper flex items-center justify-center font-display font-bold text-lg shadow-md group-hover:bg-brand-rust transition-colors">
              AI
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-lg text-ink tracking-tight">
                  Interview<span className="text-brand-rust">Pro</span>
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-brand-emerald/10 text-brand-emerald border border-brand-emerald/20">
                  LIVE AI
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-sans hidden sm:block">
                ATS Diagnostics • JD Matcher • Voice Mock Recruiter
              </p>
            </div>
          </div>

          {/* Mobile Reset */}
          {sessionData?.resumeData && (
            <button
              onClick={onReset}
              className="md:hidden text-xs font-mono text-slate-500 hover:text-brand-rust px-2 py-1 rounded border border-line"
            >
              Reset
            </button>
          )}
        </div>

        {/* Stepper Navigation */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {steps.map((step) => {
            const isActive = activeTab === step.id;
            const isDisabled = step.disabled;

            return (
              <button
                key={step.id}
                onClick={() => !isDisabled && onSelectTab(step.id)}
                disabled={isDisabled}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-sans font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-ink text-paper shadow-sm"
                    : isDisabled
                    ? "text-slate-400 opacity-50 cursor-not-allowed"
                    : "text-slate-600 hover:text-ink hover:bg-black/5"
                }`}
              >
                <span className="text-sm">{step.icon}</span>
                <span>{step.label}</span>
                {step.id === "ats" && sessionData?.resumeData?.atsScore && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                      isActive ? "bg-white/20 text-white" : "bg-brand-rust/10 text-brand-rust"
                    }`}
                  >
                    {sessionData.resumeData.atsScore}%
                  </span>
                )}
                {step.id === "report" && sessionData?.interviewReport && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-brand-emerald animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Actions / Candidate Info */}
        <div className="hidden md:flex items-center gap-3">
          {sessionData?.resumeData?.targetRole && (
            <div className="text-right">
              <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                Target Role
              </span>
              <span className="text-xs font-semibold text-ink truncate max-w-[150px] inline-block">
                {sessionData.resumeData.targetRole}
              </span>
            </div>
          )}

          {sessionData?.resumeData && (
            <button
              onClick={onReset}
              className="px-2.5 py-1.5 text-xs font-mono uppercase tracking-wider text-slate-500 hover:text-brand-rust border border-line rounded-lg hover:border-brand-rust/30 transition-all"
              title="Upload new resume or reset session"
            >
              Upload New
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
