import { useEffect, useState } from "react";
import Navbar from "./components/Navbar.jsx";
import UploadResume from "./components/UploadResume.jsx";
import AtsAndMissingCheck from "./components/AtsAndMissingCheck.jsx";
import VoiceInterview from "./components/VoiceInterview.jsx";
import FinalReportDashboard from "./components/FinalReportDashboard.jsx";
import ProgressTracking from "./components/ProgressTracking.jsx";
import {
  getSessionId,
  getCachedResumeData,
  fetchResumeForSession,
  clearSession
} from "./api/client.js";

export default function App() {
  const [activeTab, setActiveTab] = useState("upload"); // upload | ats | interview | report | history
  const [resumeData, setResumeData] = useState(null);
  const [sessionId, setSessionId] = useState(() => getSessionId());
  const [interviewReport, setInterviewReport] = useState(null);
  const [interviewAnswers, setInterviewAnswers] = useState([]);
  const [recovering, setRecovering] = useState(true);

  // Recover session on load
  useEffect(() => {
    async function recover() {
      const savedId = getSessionId();
      setSessionId(savedId);
      if (!savedId) {
        setRecovering(false);
        return;
      }
      try {
        const fromBackend = await fetchResumeForSession(savedId);
        if (fromBackend) {
          setResumeData(fromBackend.resumeData);
          setSessionId(fromBackend.sessionId || savedId);
          if (fromBackend.interview?.report) {
            setInterviewReport(fromBackend.interview.report);
            setInterviewAnswers(fromBackend.interview.answers || []);
            setActiveTab("report");
          } else if (fromBackend.resumeData) {
            setActiveTab("ats");
          }
        } else {
          const cached = getCachedResumeData();
          if (cached) {
            setResumeData(cached);
            setActiveTab("ats");
          }
        }
      } catch (e) {
        console.warn("Session recovery error:", e);
      } finally {
        setRecovering(false);
      }
    }
    recover();
  }, []);

  function handleResumeAnalyzed(result) {
    setSessionId(result.sessionId);
    setResumeData(result.resumeData);
    setActiveTab("ats");
  }

  function handleProceedToInterview() {
    setActiveTab("interview");
  }

  function handleInterviewCompleted(completionData) {
    if (completionData.report) {
      setInterviewReport(completionData.report);
    }
    if (completionData.answers) {
      setInterviewAnswers(completionData.answers);
    }
    setActiveTab("report");
  }

  function handleReset() {
    clearSession();
    setSessionId(null);
    setResumeData(null);
    setInterviewReport(null);
    setInterviewAnswers([]);
    setActiveTab("upload");
  }

  const sessionData = {
    sessionId,
    resumeData,
    interviewReport,
    hasCompletedInterview: !!interviewReport
  };

  return (
    <div className="min-h-screen bg-paper text-ink font-sans flex flex-col selection:bg-brand-rust selection:text-white">
      {/* Sticky Navigation */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        sessionData={sessionData}
        onReset={handleReset}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {recovering ? (
          <div className="max-w-md mx-auto py-20 text-center space-y-3 glass-card rounded-2xl border border-line">
            <div className="flex justify-center gap-1.5 items-center h-8">
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
            </div>
            <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
              Restoring Assessment Session…
            </p>
          </div>
        ) : (
          <>
            {activeTab === "upload" && (
              <UploadResume
                onAnalyzed={handleResumeAnalyzed}
                initialRole={resumeData?.targetRole || ""}
                initialJd={resumeData?.jobDescription || ""}
              />
            )}

            {activeTab === "ats" && resumeData && (
              <AtsAndMissingCheck
                resumeData={resumeData}
                sessionId={sessionId}
                onProceedToInterview={handleProceedToInterview}
                onUpdateResumeData={setResumeData}
              />
            )}

            {activeTab === "interview" && resumeData && (
              <VoiceInterview
                resumeData={resumeData}
                sessionId={sessionId}
                existingAnswers={interviewAnswers}
                onInterviewCompleted={handleInterviewCompleted}
              />
            )}

            {activeTab === "report" && (
              <FinalReportDashboard
                report={interviewReport}
                answers={interviewAnswers}
                resumeData={resumeData}
                onRetakeInterview={() => setActiveTab("interview")}
                onViewHistory={() => setActiveTab("history")}
              />
            )}

            {activeTab === "history" && (
              <ProgressTracking
                onStartNew={handleReset}
                onResumeSession={() => {
                  if (interviewReport) setActiveTab("report");
                  else if (resumeData) setActiveTab("ats");
                  else setActiveTab("upload");
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Modern Minimal Footer */}
      <footer className="border-t border-line py-6 text-center text-xs text-slate-500 font-sans print:hidden">
        <p>
          AI Interview Platform • Real-Time Voice Synthesis & Speech Recognition • ATS & Semantic JD Diagnostics
        </p>
      </footer>
    </div>
  );
}
