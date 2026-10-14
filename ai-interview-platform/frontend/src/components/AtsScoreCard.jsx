import { useEffect, useMemo, useState } from "react";
import { generateInterviewQuestions } from "../api/client.js";

const CATEGORY_LABELS = {
  skillsMatch: "Skills match",
  keywordOptimization: "Keyword optimization",
  formatting: "Formatting",
  experienceRelevance: "Experience relevance",
  resumeStructure: "Resume structure"
};

function ScoreBar({ label, value }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between font-mono text-xs uppercase tracking-widest text-slate mb-1">
        <span>{label}</span>
        <span>{value}/100</span>
      </div>
      <div className="h-2 bg-line rounded-full overflow-hidden">
        <div
          className="h-full bg-rust rounded-full transition-all duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export default function AtsScoreCard({ resumeData, sessionId, onReset }) {
  const {
    atsScore,
    atsBreakdown,
    strengths = [],
    weaknesses = [],
    suggestions = [],
    parsedJson,
    atsScoringFailed
  } = resumeData;
  const [questions, setQuestions] = useState([]);
  const [questionsError, setQuestionsError] = useState("");
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(20 * 60);

  useEffect(() => {
    let isMounted = true;

    async function loadQuestions() {
      if (!sessionId) return;
      try {
        const nextQuestions = await generateInterviewQuestions(sessionId);
        if (isMounted) setQuestions(nextQuestions);
      } catch (err) {
        if (isMounted) {
          setQuestionsError(err.message || "Unable to generate interview questions right now.");
        }
      }
    }

    loadQuestions();
    return () => {
      isMounted = false;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!interviewStarted) return;

    const intervalId = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [interviewStarted, currentQuestionIndex]);

  const currentQuestion = questions[currentQuestionIndex] || null;

  const timeLabel = useMemo(() => {
    const minutes = Math.floor(timeRemaining / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (timeRemaining % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timeRemaining]);

  function startInterview() {
    setCurrentQuestionIndex(0);
    setTimeRemaining(20 * 60);
    setInterviewStarted(true);
  }

  function handleNextQuestion() {
    if (currentQuestionIndex >= questions.length - 1) {
      setInterviewStarted(false);
      setCurrentQuestionIndex(0);
      return;
    }
    setCurrentQuestionIndex((prev) => prev + 1);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="font-display text-3xl text-ink">Diagnostics report</h2>
        <button
          onClick={onReset}
          className="font-mono text-xs uppercase tracking-widest text-slate hover:text-rust"
        >
          Upload another
        </button>
      </div>

      {atsScoringFailed ? (
        <p className="font-body text-sm text-rust mb-6">
          We parsed your resume but couldn't complete ATS scoring right now. Your resume data below
          is still accurate — try again shortly for a full score.
        </p>
      ) : (
        <>
          <div className="border border-line rounded-sm p-6 bg-white/50 mb-6">
            <div className="flex items-end gap-3 mb-6">
              <span className="font-display text-6xl text-ink leading-none">{atsScore}</span>
              <span className="font-mono text-sm text-slate mb-1">/ 100 ATS Score</span>
            </div>
            {atsBreakdown &&
              Object.entries(atsBreakdown).map(([key, value]) => (
                <ScoreBar key={key} label={CATEGORY_LABELS[key] || key} value={value} />
              ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="border border-line rounded-sm p-4 bg-moss/5">
              <h3 className="font-mono text-xs uppercase tracking-widest text-moss mb-2">
                Strengths
              </h3>
              <ul className="font-body text-sm text-ink space-y-1 list-disc list-inside">
                {strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="border border-line rounded-sm p-4 bg-rust/5">
              <h3 className="font-mono text-xs uppercase tracking-widest text-rust mb-2">
                Weaknesses
              </h3>
              <ul className="font-body text-sm text-ink space-y-1 list-disc list-inside">
                {weaknesses.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border border-line rounded-sm p-4 bg-white/50 mb-6">
            <h3 className="font-mono text-xs uppercase tracking-widest text-slate mb-2">
              Suggestions
            </h3>
            <ul className="font-body text-sm text-ink space-y-1 list-disc list-inside">
              {suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      <div className="border border-line rounded-sm p-4 bg-white/50 mb-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-slate mb-3">
          Extracted resume data
        </h3>
        <div className="font-body text-sm text-ink space-y-2">
          {parsedJson?.skills?.length > 0 && (
            <p>
              <span className="text-slate">Skills: </span>
              {parsedJson.skills.join(", ")}
            </p>
          )}
          {parsedJson?.projects?.length > 0 && (
            <p>
              <span className="text-slate">Projects: </span>
              {parsedJson.projects.map((p) => p.title).join(", ")}
            </p>
          )}
          {parsedJson?.workExperience?.length > 0 && (
            <p>
              <span className="text-slate">Experience: </span>
              {parsedJson.workExperience.map((w) => `${w.role} @ ${w.company}`).join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="border border-line rounded-sm p-4 bg-white/50">
        <h3 className="font-mono text-xs uppercase tracking-widest text-slate mb-3">
          AI HR interview
        </h3>

        {questionsError ? (
          <p className="font-body text-sm text-rust">{questionsError}</p>
        ) : questions.length > 0 ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-3 rounded-sm border border-line bg-paper p-3">
              <span className="font-mono text-xs uppercase tracking-widest text-slate">
                {interviewStarted
                  ? `Question ${Math.min(currentQuestionIndex + 1, questions.length)} of ${questions.length}`
                  : `${questions.length} questions prepared`}
              </span>
              <span className="font-display text-lg text-ink">{timeLabel}</span>
            </div>

            {interviewStarted && currentQuestion ? (
              <div className="space-y-4">
                <p className="font-mono text-xs uppercase tracking-widest text-rust">HR interview</p>
                <p className="font-body text-lg text-ink leading-relaxed">{currentQuestion}</p>
                <div className="flex gap-3">
                  <button
                    onClick={handleNextQuestion}
                    className="bg-ink text-paper font-display text-sm px-4 py-2 rounded-sm hover:bg-rust transition-colors"
                  >
                    {currentQuestionIndex >= questions.length - 1 ? "Finish interview" : "Next question"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="font-body text-sm text-ink">
                  A 20-minute mock interview will ask you one question at a time, based on your resume and experience.
                </p>
                <button
                  onClick={startInterview}
                  className="bg-ink text-paper font-display text-sm px-4 py-2 rounded-sm hover:bg-rust transition-colors"
                >
                  Start 20-minute interview
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="font-body text-sm text-slate">Generating questions from your resume…</p>
        )}
      </div>
    </div>
  );
}
