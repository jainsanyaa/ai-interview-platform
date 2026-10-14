const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

// Strips markdown code fences if the model wraps JSON in ```json ... ```
function cleanJson(text) {
  return text.replace(/```json\s*|```\s*/g, "").trim();
}

const FALLBACK_MODELS = [
  process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b"
];

async function callClaudeJson(systemPrompt, userPrompt, maxTokens = 1800) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_GROQ_API_KEY");
  }

  let lastError = null;

  for (const modelToTry of FALLBACK_MODELS) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelToTry,
          max_tokens: maxTokens,
          temperature: 0.1,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        if (response.status === 429) {
          // Wait 2s and try next model
          await new Promise(r => setTimeout(r, 2000));
          lastError = new Error(`GROQ_RATE_LIMITED_${modelToTry}`);
          continue;
        }
        throw new Error(`GROQ_API_ERROR: ${response.status} ${errorBody.slice(0, 500)}`);
      }

      const payload = await response.json();
      const text = payload?.choices?.[0]?.message?.content;
      if (!text) continue;

      try {
        return JSON.parse(cleanJson(text));
      } catch (e) {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      }
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("ALL_GROQ_MODELS_FAILED");
}

// 1. Extracts structured resume data from raw resume text
async function extractResumeStructuredData(rawText) {
  const systemPrompt = `You are a world-class resume parsing engine. Extract structured information from the resume text provided.
Return ONLY valid JSON, no markdown fences, no preamble, no explanation. Match this exact schema:

{
  "name": string | null,
  "contact": {
    "email": string | null,
    "phone": string | null,
    "linkedin": string | null,
    "github": string | null,
    "location": string | null
  },
  "summary": string | null,
  "education": [{ "degree": string, "institution": string, "year": string | null }],
  "skills": [string],
  "workExperience": [{ "role": string, "company": string, "duration": string | null, "description": string }],
  "projects": [{ "title": string, "description": string, "technologies": [string] }],
  "certifications": [string],
  "achievements": [string]
}

If a section is missing from the resume, return an empty array or null for it. Never invent information not present in the resume text.`;

  const userPrompt = `Resume text:\n\n${rawText}`;
  return callClaudeJson(systemPrompt, userPrompt, 3000);
}

// 2. Produces an ATS-style score and breakdown for the resume
async function scoreResumeATS(rawText, parsedJson, targetRole = null) {
  const systemPrompt = `You are an enterprise ATS (Applicant Tracking System) audit engine like Greenhouse, Lever, and Workday. Assess the resume text for how well it would score in real ATS parsing${
    targetRole ? ` for a "${targetRole}" role` : ""
  }.
Return ONLY valid JSON, no markdown fences, no preamble. Match this exact schema:

{
  "overallScore": number (0-100),
  "breakdown": {
    "skillsMatch": number (0-100),
    "keywordOptimization": number (0-100),
    "formatting": number (0-100),
    "experienceRelevance": number (0-100),
    "resumeStructure": number (0-100),
    "impactMetrics": number (0-100)
  },
  "strengths": [string],
  "weaknesses": [string],
  "suggestions": [string]
}

Be specific and actionable in suggestions. Base scores only on the actual content provided.`;

  const userPrompt = `Resume text:\n\n${rawText}\n\nParsed structured data:\n\n${JSON.stringify(
    parsedJson,
    null,
    2
  )}`;

  return callClaudeJson(systemPrompt, userPrompt, 2000);
}

// 3. Performs comprehensive Missing Check diagnostics
async function analyzeMissingChecks(rawText, parsedJson) {
  const systemPrompt = `You are an expert resume reviewer and ATS recruiter. Audit this resume for critical missing sections, contact information gaps, lack of quantifiable impact metrics, and ATS parsing red flags.
Return ONLY valid JSON, no markdown fences. Match this exact schema:

{
  "missingScore": number (0-100, where 100 means nothing critical is missing),
  "missingSections": [
    { "name": string, "criticality": "HIGH" | "MEDIUM" | "LOW", "explanation": string }
  ],
  "missingContactInfo": [string],
  "quantifiableMetricsCheck": {
    "hasMetrics": boolean,
    "metricsScore": number (0-100),
    "detectedMetrics": [string],
    "missingImpactAreas": [string],
    "recommendation": string
  },
  "redFlags": [
    { "flag": string, "severity": "HIGH" | "MEDIUM" | "LOW", "fix": string }
  ],
  "actionChecklist": [
    { "id": string, "task": string, "impact": "High" | "Medium", "done": boolean }
  ]
}`;

  const userPrompt = `Resume text:\n\n${rawText}\n\nParsed data:\n\n${JSON.stringify(parsedJson, null, 2)}`;
  return callClaudeJson(systemPrompt, userPrompt, 2500);
}

// 4. Job Description Matching (JD Matcher)
async function matchJobDescription(rawText, parsedJson, jobDescription) {
  const systemPrompt = `You are an AI Talent Acquisition Matchmaker and ATS Keyword Evaluator.
Compare the candidate's resume with the target Job Description (JD).
Return ONLY valid JSON matching this exact schema:

{
  "matchScore": number (0-100),
  "matchTier": string ("Exceptional Fit" | "Strong Fit" | "Moderate Fit" | "Low Match"),
  "targetTitle": string,
  "matchedSkills": [string],
  "missingRequiredSkills": [string],
  "missingBonusSkills": [string],
  "experienceAlignment": {
    "score": number (0-100),
    "analysis": string
  },
  "keywordDensity": {
    "resumeCount": number,
    "jdKeyTerms": [string]
  },
  "tailoringTips": [
    { "section": string, "advice": string, "example": string }
  ]
}

Be strict and realistic: look for hard skills, certifications, tech stack, and responsibilities mentioned in the JD that are absent from the resume.`;

  const userPrompt = `JOB DESCRIPTION:\n\n${jobDescription}\n\nCANDIDATE RESUME TEXT:\n\n${rawText}\n\nPARSED DATA:\n\n${JSON.stringify(parsedJson, null, 2)}`;
  return callClaudeJson(systemPrompt, userPrompt, 2500);
}

// 5. Generates tailored interview questions (incorporating JD when available)
async function generateInterviewQuestions(rawText, parsedJson, targetRole = null, jobDescription = null) {
  const systemPrompt = `You are an elite senior technical and HR interviewer.
Create 8 to 10 deeply personalized, high-caliber interview questions grounded in the candidate's actual projects, experience, technologies, and target role${
    jobDescription ? " and the provided Job Description" : ""
  }.
Return ONLY valid JSON with this exact schema:

{
  "questions": [
    {
      "id": string,
      "category": "Project Deep-Dive" | "Technical Architecture" | "Behavioral (STAR)" | "Problem Solving" | "Role Alignment",
      "question": string,
      "context": string,
      "expectedKeyPoints": [string]
    }
  ]
}

Each question should:
- Directly cite specific items from their resume (project names, tools, transitions)
- Ask "how" and "why" questions rather than simple yes/no
- Include realistic behavioral prompts requiring STAR method answers`;

  const userPrompt = `Role: ${targetRole || "Software Professional"}\n\n${
    jobDescription ? `Job Description:\n${jobDescription}\n\n` : ""
  }Resume text:\n\n${rawText}\n\nParsed data:\n\n${JSON.stringify(parsedJson, null, 2)}`;

  try {
    const payload = await callClaudeJson(systemPrompt, userPrompt, 2500);
    if (Array.isArray(payload?.questions) && payload.questions.length > 0) {
      return payload.questions;
    }
  } catch (e) {
    console.warn("Failed to generate structured questions, returning fallback questions:", e.message);
  }

  // Graceful fallback
  return [
    {
      id: "q1",
      category: "Project Deep-Dive",
      question: "Could you walk me through the most technically challenging project on your resume, detailing the architecture and key tradeoffs you navigated?",
      context: "Evaluation of system design and technical ownership",
      expectedKeyPoints: ["Architecture diagram/structure", "Specific tech choices", "Trade-offs and resolution"]
    },
    {
      id: "q2",
      category: "Technical Architecture",
      question: "Looking at your skills and experience, how did you ensure scalability, test coverage, and reliability in your deployments?",
      context: "Production readiness and engineering hygiene",
      expectedKeyPoints: ["Testing methodology", "CI/CD or monitoring", "Scalability bottlenecks addressed"]
    },
    {
      id: "q3",
      category: "Behavioral (STAR)",
      question: "Tell me about a time when a critical requirement changed midway or a production bug occurred. How did you handle communication and deliver the solution?",
      context: "Assessing crisis management and STAR method execution",
      expectedKeyPoints: ["Situation context", "Action taken", "Measurable result"]
    },
    {
      id: "q4",
      category: "Problem Solving",
      question: "If you were given a legacy service or bottleneck with poor response times, what structured profiling and debugging steps would you undertake?",
      context: "Troubleshooting methodology and analytical rigor",
      expectedKeyPoints: ["Root-cause analysis", "Metrics/telemetry", "Step-by-step fix"]
    },
    {
      id: "q5",
      category: "Role Alignment",
      question: "Why does this target position align with your career trajectory, and what unique value will you bring to our team from day one?",
      context: "Motivation, culture fit, and immediate team contribution",
      expectedKeyPoints: ["Alignment with role", "Specific unique skill", "Long-term enthusiasm"]
    }
  ];
}

// 6. Analyzes candidate's communication, tone, filler words, STAR adherence & provides model answer
async function analyzeAnswerCommunication(questionText, answerText, targetRole = null) {
  // Baseline local filler word detection for precision
  const fillerRegex = /\b(um|uh|er|ah|like|you know|basically|actually|literally|sort of|kind of|i mean)\b/gi;
  const fillerMatches = answerText.match(fillerRegex) || [];
  const fillerCount = fillerMatches.length;
  const words = answerText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const systemPrompt = `You are an executive speech coach and senior hiring manager.
Analyze the candidate's spoken or typed answer to the interview question.
Assess communication clarity, confidence, conciseness, structural adherence (STAR method where relevant), and technical depth.
Return ONLY valid JSON with this exact schema:

{
  "scores": {
    "overall": number (0-100),
    "clarity": number (0-100),
    "confidence": number (0-100),
    "starStructure": number (0-100),
    "relevance": number (0-100)
  },
  "toneDescriptor": string (e.g. "Authoritative & Articulate", "Conversational but Verbose", "Direct & Concise", "Hesitant"),
  "detectedFillerWords": [string],
  "pacingFeedback": string,
  "starAnalysis": {
    "situationPresent": boolean,
    "taskPresent": boolean,
    "actionPresent": boolean,
    "resultPresent": boolean,
    "feedback": string
  },
  "strengths": [string],
  "improvementPoints": [string],
  "modelAnswer": string
}

Model answer should be a concise (120-180 words), masterclass response showcasing how a top 1% candidate answers this question with impact and quantifiable results.`;

  const userPrompt = `Target Role: ${targetRole || "Software Professional"}\nQuestion: "${questionText}"\nCandidate Answer (${wordCount} words):\n"${answerText}"`;

  try {
    const aiAnalysis = await callClaudeJson(systemPrompt, userPrompt, 2200);
    // Merge local detected fillers for completeness
    const uniqueFillers = Array.from(new Set([...(aiAnalysis.detectedFillerWords || []), ...fillerMatches.map(w => w.toLowerCase())]));
    aiAnalysis.detectedFillerWords = uniqueFillers;
    aiAnalysis.wordCount = wordCount;
    aiAnalysis.fillerCount = fillerCount;
    return aiAnalysis;
  } catch (err) {
    console.error("Communication analysis AI error, using fallback:", err.message);
    return {
      scores: {
        overall: wordCount > 40 ? 78 : 55,
        clarity: 75,
        confidence: 70,
        starStructure: 65,
        relevance: 80
      },
      toneDescriptor: wordCount > 30 ? "Professional & Direct" : "Brief",
      detectedFillerWords: Array.from(new Set(fillerMatches.map(w => w.toLowerCase()))),
      wordCount,
      fillerCount,
      pacingFeedback: wordCount < 30 ? "Answer is quite brief; expand on specific steps taken." : "Good answer length and articulation.",
      starAnalysis: {
        situationPresent: true,
        taskPresent: true,
        actionPresent: true,
        resultPresent: wordCount > 50,
        feedback: "Try highlighting concrete measurable metrics in your final result."
      },
      strengths: ["Clear focus on the question context", "Professional vocabulary"],
      improvementPoints: ["Incorporate specific percentages or numbers for greater impact", "Reduce verbal hesitation"],
      modelAnswer: `In my previous role, I addressed this directly by first establishing clear milestones. I led the technical implementation, collaborating closely with cross-functional stakeholders to mitigate risk. As a result, we delivered the feature two weeks ahead of schedule with zero critical defects and improved operational efficiency by 25%.`
    };
  }
}

// 7. Generates comprehensive final evaluation report synthesizing all dimensions
async function generateFinalReport(sessionData) {
  const { resumeData, interview } = sessionData;
  const questionsAndAnswers = (interview.answers || []).map(a => ({
    question: a.questionText || a.question,
    answer: a.answerText || a.answer,
    scores: a.communication?.scores
  }));

  const systemPrompt = `You are the VP of Talent and Chief Interview Evaluator.
Synthesize the candidate's complete session data: Resume ATS score, Job Description match, and their answers across all interview questions.
Produce an executive-grade Final Candidate Evaluation Report.
Return ONLY valid JSON matching this exact schema:

{
  "hireabilityScore": number (0-100),
  "verdict": "STRONG HIRE" | "HIRE" | "LEANING HIRE" | "NEEDS PREPARATION",
  "executiveSummary": string,
  "radarScores": {
    "atsCompatibility": number (0-100),
    "jdFit": number (0-100),
    "technicalCompetence": number (0-100),
    "communicationClarity": number (0-100),
    "starMethodology": number (0-100),
    "confidencePresence": number (0-100)
  },
  "topStrengths": [string],
  "criticalImprovementAreas": [string],
  "actionPlan7Days": [
    { "day": string, "focus": string, "action": string }
  ]
}`;

  const userPrompt = `CANDIDATE SESSION SUMMARY:
Target Role: ${resumeData?.targetRole || "General"}
ATS Score: ${resumeData?.atsScore || 75}
JD Match Score: ${resumeData?.jdMatch?.matchScore ?? "N/A"}
Interview Q&A Records:
${JSON.stringify(questionsAndAnswers, null, 2)}
Extracted Skills: ${JSON.stringify(resumeData?.parsedJson?.skills || [])}`;

  try {
    return await callClaudeJson(systemPrompt, userPrompt, 2500);
  } catch (err) {
    console.error("Final report AI error, using fallback report:", err.message);
    const avgComm = Math.round(
      (interview.answers || []).reduce((acc, a) => acc + (a.communication?.scores?.overall || 75), 0) /
        Math.max(1, interview.answers?.length || 1)
    );
    const ats = resumeData?.atsScore || 78;
    const jd = resumeData?.jdMatch?.matchScore || 80;
    const overall = Math.round((ats * 0.35 + jd * 0.25 + avgComm * 0.4));

    return {
      hireabilityScore: overall,
      verdict: overall >= 80 ? "STRONG HIRE" : overall >= 68 ? "HIRE" : "NEEDS PREPARATION",
      executiveSummary: `Candidate demonstrates solid technical grounding with an ATS score of ${ats} and an overall interview performance of ${avgComm}%. Key opportunities lie in articulating quantifiable metrics and tightening STAR methodology.`,
      radarScores: {
        atsCompatibility: ats,
        jdFit: jd,
        technicalCompetence: Math.min(100, Math.round((ats + avgComm) / 2)),
        communicationClarity: avgComm,
        starMethodology: Math.max(50, avgComm - 5),
        confidencePresence: Math.min(95, avgComm + 3)
      },
      topStrengths: [
        "Strong alignment with modern technology stack",
        "Clear and articulate verbal presentation",
        "Relevant hands-on project accomplishments"
      ],
      criticalImprovementAreas: [
        "Quantify outcomes with concrete business metrics (e.g. % speedup, revenue saved)",
        "Structure behavioral answers using strict STAR method (Situation, Task, Action, Result)",
        "Minimize verbal filler words during complex technical deep dives"
      ],
      actionPlan7Days: [
        { day: "Day 1-2", focus: "Resume Optimization", action: "Incorporate missing high-priority ATS keywords and quantify project outcomes." },
        { day: "Day 3-4", focus: "STAR Framework Drills", action: "Draft 5 core behavioral stories focusing on Action and measurable Result." },
        { day: "Day 5-6", focus: "Voice Mock Practice", action: "Record responses under a 2-minute timer to eliminate filler words." },
        { day: "Day 7", focus: "Final Polish", action: "Run a full simulation matching your primary target company's job description." }
      ]
    };
  }
}

export {
  extractResumeStructuredData,
  scoreResumeATS,
  analyzeMissingChecks,
  matchJobDescription,
  generateInterviewQuestions,
  analyzeAnswerCommunication,
  generateFinalReport
};
