import { useState, useEffect, useRef } from "react";
import {
  generateInterviewQuestions,
  analyzeAnswer,
  completeInterview
} from "../api/client.js";

export default function VoiceInterview({
  resumeData,
  sessionId,
  onInterviewCompleted,
  existingAnswers = []
}) {
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Voice output (TTS) state
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [autoSpeakQuestion, setAutoSpeakQuestion] = useState(true);

  // Candidate voice input (STT) state
  const [isRecording, setIsRecording] = useState(false);
  const [candidateAnswer, setCandidateAnswer] = useState("");
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(true);

  // Communication analysis state
  const [analyzingAnswer, setAnalyzingAnswer] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [answersHistory, setAnswersHistory] = useState(existingAnswers);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  // Timers
  const [timeRemaining, setTimeRemaining] = useState(20 * 60);
  const [questionSeconds, setQuestionSeconds] = useState(0);

  const recognitionRef = useRef(null);
  const isSpeechActiveRef = useRef(false);

  // Load questions on mount
  useEffect(() => {
    let isMounted = true;
    async function load() {
      if (!sessionId) return;
      try {
        const list = await generateInterviewQuestions(sessionId, resumeData?.jobDescription);
        if (isMounted) {
          // Normalize questions to objects if strings were returned
          const formatted = list.map((q, idx) =>
            typeof q === "string"
              ? {
                  id: `q-${idx + 1}`,
                  question: q,
                  category: idx % 2 === 0 ? "Technical Architecture" : "Behavioral (STAR)",
                  context: "Candidate experience evaluation"
                }
              : q
          );
          setQuestions(formatted);
          setLoadingQuestions(false);
        }
      } catch (err) {
        if (isMounted) {
          setLoadingQuestions(false);
        }
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [sessionId, resumeData?.jobDescription]);

  // Setup SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechRecognitionSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        }
      }
      if (finalTranscript) {
        setCandidateAnswer((prev) => (prev ? prev.trim() + " " + finalTranscript : finalTranscript));
      }
    };

    recognition.onerror = (event) => {
      console.warn("Speech recognition error:", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
      setQuestionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIdx]);

  const currentQ = questions[currentIdx] || null;

  // Speak question automatically when question changes
  useEffect(() => {
    if (currentQ && autoSpeakQuestion) {
      speakText(currentQ.question);
    }
    setCandidateAnswer("");
    setCurrentAnalysis(null);
    setShowModelAnswer(false);
    setQuestionSeconds(0);
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [currentIdx, currentQ]);

  // Text-To-Speech Function
  function speakText(text) {
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice =
      voices.find((v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha"))) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    window.speechSynthesis?.cancel();
    setIsAiSpeaking(false);
  }

  // Toggle Voice Recording
  function toggleRecording() {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      stopSpeaking(); // stop AI speaking when user starts answering
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.warn("Could not start recognition:", e);
      }
    }
  }

  // Submit Answer for Communication Analysis
  async function handleSubmitAnswer() {
    if (!candidateAnswer.trim() || !currentQ || analyzingAnswer) return;

    // Stop recording if running
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    setAnalyzingAnswer(true);
    try {
      const result = await analyzeAnswer(
        sessionId,
        currentQ.id || `q-${currentIdx + 1}`,
        currentQ.question,
        candidateAnswer.trim(),
        questionSeconds
      );

      setCurrentAnalysis(result.communication);
      setAnswersHistory((prev) => [
        ...prev.filter((a) => a.questionId !== result.questionId),
        {
          questionId: result.questionId,
          questionText: currentQ.question,
          answerText: candidateAnswer.trim(),
          communication: result.communication,
          timeSpentSeconds: questionSeconds
        }
      ]);
    } catch (err) {
      alert("Error analyzing answer: " + err.message);
    } finally {
      setAnalyzingAnswer(false);
    }
  }

  // Move to next question or complete
  async function handleNextQuestion() {
    stopSpeaking();
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      // Completed last question -> finalize interview report
      await handleFinishInterview();
    }
  }

  async function handleFinishInterview() {
    stopSpeaking();
    setAnalyzingAnswer(true);
    try {
      const finalReport = await completeInterview(sessionId);
      if (onInterviewCompleted) {
        onInterviewCompleted(finalReport);
      }
    } catch (err) {
      alert("Error finalizing interview: " + err.message);
    } finally {
      setAnalyzingAnswer(false);
    }
  }

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  if (loadingQuestions) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4 glass-card rounded-2xl border border-line">
        <div className="flex justify-center gap-1.5 items-center h-10">
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
          <span className="wave-bar" />
        </div>
        <h3 className="font-display text-xl font-semibold text-ink">
          Crafting Tailored Interview Questions…
        </h3>
        <p className="text-xs text-slate-500 font-sans max-w-md mx-auto">
          Analyzing your resume projects, tools, and target job description to build a realistic 20-minute simulation.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Interview Header & Status */}
      <div className="glass-card rounded-2xl p-4 sm:p-6 border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-ink text-paper flex items-center justify-center font-bold text-xl shadow-md">
              AI
            </div>
            {isAiSpeaking && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-rust rounded-full animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-base text-ink">
                Technical Recruiter & Hiring Manager
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-brand-emerald/10 text-brand-emerald font-semibold">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans">
              Role: {resumeData?.targetRole || "Software Engineer"} • Question {currentIdx + 1} of{" "}
              {questions.length}
            </p>
          </div>
        </div>

        {/* Master Clock & Controls */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="text-right">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
              Interview Clock
            </span>
            <span className="font-mono text-base font-bold text-ink">
              {formatTimer(timeRemaining)}
            </span>
          </div>

          <button
            onClick={handleFinishInterview}
            className="text-xs font-mono px-3 py-1.5 rounded-lg border border-line hover:border-brand-rust text-slate-600 hover:text-brand-rust transition-all"
          >
            Finish Early & View Report
          </button>
        </div>
      </div>

      {/* AI Interviewer Question Box */}
      <div className="glass-card-dark rounded-2xl p-6 sm:p-8 text-paper space-y-4 shadow-xl relative overflow-hidden">
        {/* Subtle glowing ambient backdrop */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-brand-rust/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-brand-rust font-semibold bg-brand-rust/20 px-2.5 py-1 rounded-full border border-brand-rust/30">
            {currentQ?.category || "Interview Question"}
          </span>

          {/* Audio TTS Controls */}
          <div className="flex items-center gap-2">
            {/* Animated Soundwave when speaking */}
            {isAiSpeaking && (
              <div className="flex items-center gap-1 mr-2 h-6">
                <span className="wave-bar !bg-brand-rust" />
                <span className="wave-bar !bg-brand-rust" />
                <span className="wave-bar !bg-brand-rust" />
                <span className="wave-bar !bg-brand-rust" />
              </div>
            )}

            <button
              onClick={() => (isAiSpeaking ? stopSpeaking() : speakText(currentQ?.question))}
              className="px-3 py-1 rounded-lg text-xs font-mono bg-white/10 hover:bg-white/20 transition-all flex items-center gap-1.5"
              title="Read Question Aloud"
            >
              <span>{isAiSpeaking ? "⏸ Stop Audio" : "🔊 Listen"}</span>
            </button>

            <select
              value={speechRate}
              onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
              className="bg-white/10 hover:bg-white/20 text-[11px] font-mono rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="0.85" className="text-black">0.85x</option>
              <option value="1.0" className="text-black">1.0x</option>
              <option value="1.2" className="text-black">1.2x</option>
            </select>
          </div>
        </div>

        {/* The Question Text */}
        <p className="font-display text-xl sm:text-2xl text-paper font-medium leading-relaxed tracking-tight">
          "{currentQ?.question}"
        </p>

        {currentQ?.context && (
          <p className="text-xs font-sans text-slate-400 italic">
            Objective: {currentQ.context}
          </p>
        )}
      </div>

      {/* Candidate Response Workspace */}
      <div className="glass-card rounded-2xl p-6 border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🎙️</span>
            <h4 className="font-display text-base font-semibold text-ink">
              Your Response
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              ({formatTimer(questionSeconds)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            {speechRecognitionSupported ? (
              <button
                onClick={toggleRecording}
                className={`px-4 py-2 rounded-xl text-xs font-sans font-semibold transition-all flex items-center gap-2 shadow-sm ${
                  isRecording
                    ? "bg-brand-rust text-white mic-recording"
                    : "bg-slate-100 hover:bg-slate-200 text-ink"
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-current" />
                <span>{isRecording ? "Listening… (Click to Pause)" : "Record with Voice (STT)"}</span>
              </button>
            ) : (
              <span className="text-xs text-slate-400">
                (Voice recording unsupported on this browser; type answer below)
              </span>
            )}
          </div>
        </div>

        {/* Live Transcript / Textarea */}
        <div className="relative">
          <textarea
            rows={5}
            value={candidateAnswer}
            onChange={(e) => setCandidateAnswer(e.target.value)}
            placeholder={
              isRecording
                ? "Listening to your voice… speak clearly into your microphone..."
                : "Click 'Record with Voice' to speak your answer, or type your response here..."
            }
            className={`w-full border rounded-xl p-4 font-sans text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-rust/30 transition-all leading-relaxed ${
              isRecording
                ? "border-brand-rust/50 bg-brand-rust/[0.02]"
                : "border-line bg-white/90"
            }`}
          />

          {isRecording && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded bg-brand-rust text-white text-[10px] font-mono font-bold animate-pulse">
              <span>● REC</span>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500 font-mono">
            {candidateAnswer.trim() ? `${candidateAnswer.trim().split(/\s+/).length} words` : "0 words"}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmitAnswer}
              disabled={!candidateAnswer.trim() || analyzingAnswer}
              className="px-5 py-2.5 rounded-xl bg-ink text-paper text-xs font-sans font-semibold hover:bg-brand-rust disabled:opacity-40 transition-all flex items-center gap-2 shadow-md"
            >
              {analyzingAnswer ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-paper" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Analyzing Communication…</span>
                </>
              ) : (
                <>
                  <span>Analyze Communication & Tone</span>
                  <span>✨</span>
                </>
              )}
            </button>

            {currentAnalysis && (
              <button
                onClick={handleNextQuestion}
                className="px-5 py-2.5 rounded-xl bg-brand-emerald text-white text-xs font-sans font-semibold hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-md"
              >
                <span>{currentIdx < questions.length - 1 ? "Next Question" : "Finish & View Report"}</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Communication Analysis Card */}
      {currentAnalysis && (
        <div className="glass-card rounded-2xl p-6 border border-brand-emerald/30 shadow-card space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📊</span>
              <h4 className="font-display text-lg font-semibold text-ink">
                Communication & Content Analysis
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-brand-emerald/10 text-brand-emerald">
                Overall: {currentAnalysis.scores?.overall || 80}/100
              </span>
              <span className="text-xs font-mono text-slate-500">
                Tone: {currentAnalysis.toneDescriptor || "Professional"}
              </span>
            </div>
          </div>

          {/* Metric Meters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white/80 border border-line text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Clarity
              </span>
              <span className="font-display text-2xl font-bold text-ink">
                {currentAnalysis.scores?.clarity || 85}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-line text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Confidence
              </span>
              <span className="font-display text-2xl font-bold text-brand-rust">
                {currentAnalysis.scores?.confidence || 80}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-line text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                STAR Structure
              </span>
              <span className="font-display text-2xl font-bold text-ink">
                {currentAnalysis.scores?.starStructure || 75}%
              </span>
            </div>

            <div className="p-3 rounded-xl bg-white/80 border border-line text-center">
              <span className="text-[10px] font-mono uppercase text-slate-400 block">
                Filler Words
              </span>
              <span className="font-display text-2xl font-bold text-brand-amber">
                {currentAnalysis.fillerCount || currentAnalysis.detectedFillerWords?.length || 0}
              </span>
            </div>
          </div>

          {/* Filler Word Pill Cloud */}
          {currentAnalysis.detectedFillerWords?.length > 0 && (
            <div className="p-3 rounded-xl bg-brand-amber/10 border border-brand-amber/20 text-xs">
              <span className="font-semibold text-amber-900 font-mono text-[11px] uppercase tracking-wider block mb-1">
                Detected Verbal Fillers ({currentAnalysis.detectedFillerWords.length}):
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {currentAnalysis.detectedFillerWords.map((word, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded bg-amber-200/60 text-amber-900 font-mono text-xs font-medium"
                  >
                    "{word}"
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-amber-800 mt-1.5">
                Pro tip: Pause silently for 1 second instead of using verbal filler sounds when gathering thoughts.
              </p>
            </div>
          )}

          {/* STAR Method Breakdown */}
          {currentAnalysis.starAnalysis && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-line space-y-2 text-xs">
              <span className="font-mono text-xs uppercase tracking-wider text-slate-500 font-semibold block">
                STAR Method Alignment
              </span>
              <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
                <div
                  className={`p-1.5 rounded ${
                    currentAnalysis.starAnalysis.situationPresent
                      ? "bg-brand-emerald/15 text-emerald-800 font-bold"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  Situation {currentAnalysis.starAnalysis.situationPresent ? "✓" : "✗"}
                </div>
                <div
                  className={`p-1.5 rounded ${
                    currentAnalysis.starAnalysis.taskPresent
                      ? "bg-brand-emerald/15 text-emerald-800 font-bold"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  Task {currentAnalysis.starAnalysis.taskPresent ? "✓" : "✗"}
                </div>
                <div
                  className={`p-1.5 rounded ${
                    currentAnalysis.starAnalysis.actionPresent
                      ? "bg-brand-emerald/15 text-emerald-800 font-bold"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  Action {currentAnalysis.starAnalysis.actionPresent ? "✓" : "✗"}
                </div>
                <div
                  className={`p-1.5 rounded ${
                    currentAnalysis.starAnalysis.resultPresent
                      ? "bg-brand-emerald/15 text-emerald-800 font-bold"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  Result {currentAnalysis.starAnalysis.resultPresent ? "✓" : "✗"}
                </div>
              </div>
              <p className="text-slate-600 text-xs">
                {currentAnalysis.starAnalysis.feedback}
              </p>
            </div>
          )}

          {/* Coaching Strengths & Improvements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-brand-emerald/5 border border-brand-emerald/15 space-y-1">
              <span className="font-mono text-brand-emerald font-semibold uppercase text-[11px]">
                ✓ Answer Strengths
              </span>
              <ul className="list-disc list-inside space-y-1 text-ink">
                {(currentAnalysis.strengths || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-xl bg-brand-rust/5 border border-brand-rust/15 space-y-1">
              <span className="font-mono text-brand-rust font-semibold uppercase text-[11px]">
                ! Refinement Area
              </span>
              <ul className="list-disc list-inside space-y-1 text-ink">
                {(currentAnalysis.improvementPoints || []).map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Model Answer Drawer */}
          {currentAnalysis.modelAnswer && (
            <div className="pt-2 border-t border-line">
              <button
                onClick={() => setShowModelAnswer(!showModelAnswer)}
                className="text-xs font-mono text-brand-rust font-semibold hover:underline flex items-center gap-1.5"
              >
                <span>{showModelAnswer ? "Hide Model Answer" : "💡 Reveal Top 1% Model Answer"}</span>
              </button>

              {showModelAnswer && (
                <div className="mt-3 p-4 rounded-xl bg-white border border-line shadow-sm space-y-2 animate-fadeIn">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                    Exemplary Benchmark Response:
                  </span>
                  <p className="text-xs text-ink font-sans leading-relaxed italic bg-slate-50 p-3 rounded-lg border border-line">
                    "{currentAnalysis.modelAnswer}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation to next question */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleNextQuestion}
              className="px-6 py-3 rounded-xl bg-ink text-paper font-sans font-semibold text-xs hover:bg-brand-rust transition-all flex items-center gap-2 shadow-md"
            >
              <span>{currentIdx < questions.length - 1 ? "Next Question →" : "View Final Report →"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
