import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  RotateCcw,
  Target,
  Award,
  Zap,
  TrendingUp,
  Loader2,
  ChevronDown,
  Printer,
  ChevronUp,
} from "lucide-react";
import Button from "./ui/Button";
import { extractTextFromFile } from "../lib/fileParser";
import ResumePdfViewerModal, { OptimizedResumeData } from "./ResumePdfViewerModal";
import { callOpenRouterAI } from "../lib/openrouter";

interface AtsOptimizerProps { selectedModel?: string; }

interface AtsScoreBreakdown {
  hardSkills: number;
  experience: number;
  keywordDensity: number;
  relevance: number;
}

interface JdSummary {
  roleTitle: string;
  experienceLevel: string;
  topHardSkills: string[];
  keyResponsibilities: string[];
}

interface KeywordAnalysis {
  matchedKeywords: string[];
  missingKeywords: string[];
  weakKeywords: string[];
}

interface BulletImprovement {
  original: string;
  improved: string;
  keywordsAdded: string[];
}

interface AtsAnalysisResult {
  atsScore: number;
  matchGrade: string;
  scoreBreakdown: AtsScoreBreakdown;
  jdSummary: JdSummary;
  keywordAnalysis: KeywordAnalysis;
  tailoredSummary: string;
  bulletImprovements: BulletImprovement[];
  recommendedSkillsToAdd: string[];
  atsTips: string[];
  optimizedResume?: OptimizedResumeData;
  error?: boolean;
  message?: string;
}

const SAMPLE_JD = `Role: Senior Full-Stack Engineer
Company: CloudScale Technologies
Location: Remote / New York, NY

About the Role:
We are looking for a Senior Full-Stack Engineer with 4+ years of experience to lead the development of our high-throughput cloud management platform. You will design, build, and deploy distributed microservices and intuitive user interfaces.

Requirements:
- 4+ years of professional software engineering experience.
- Strong proficiency in TypeScript, React, Next.js, and Tailwind CSS.
- In-depth backend experience with Node.js, Express, and REST/GraphQL APIs.
- Experience with relational databases (PostgreSQL) and caching (Redis).
- Hands-on cloud infrastructure experience with AWS (ECS, S3, Lambda) and Docker.
- Proven track record with CI/CD pipelines (GitHub Actions) and unit/integration testing (Jest, Cypress).
- Strong understanding of microservices architecture, scalability, and system design.
- Excellent communication skills and ability to mentor junior engineers.`;

const SAMPLE_RESUME = `Alex Morgan
Software Engineer | alex.morgan@email.com | github.com/alexmorgan | linkedin.com/in/alexmorgan

PROFESSIONAL SUMMARY:
Full Stack Developer with 4 years of experience building web applications using JavaScript, React, and Node.js. Dedicated to writing clean code and improving user experiences.

TECHNICAL SKILLS:
- Languages: JavaScript, Python, HTML5, CSS3, SQL
- Frameworks & Libraries: React, Node.js, Express, Redux, Bootstrap
- Tools: Git, GitHub, VS Code, Postman, Webpack
- Databases: MongoDB, MySQL

WORK EXPERIENCE:
Software Engineer | Nexa Solutions (2022 - Present)
- Developed customer-facing web applications using React and Node.js.
- Built REST API endpoints to support internal business operations.
- Collaborated with product designers to implement responsive UI features.
- Reduced database query times by adding indexes to MySQL tables.
- Wrote basic unit tests for backend services.

Junior Developer | Apex Apps (2020 - 2022)
- Maintained legacy JavaScript and PHP applications.
- Fixed bugs and resolved customer-reported UI glitches.
- Participated in weekly agile sprints and code reviews.`;

export const AtsOptimizerSection: React.FC<AtsOptimizerProps> = ({ selectedModel = "deepseek/deepseek-v4.1-flash-1017" }) => {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [results, setResults] = useState<AtsAnalysisResult | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedBulletIndex, setCopiedBulletIndex] = useState<number | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    jdSummary: true,
    keywords: true,
    summary: true,
    bullets: true,
    skills: true,
    tips: true,
  });

  const jdFileInputRef = useRef<HTMLInputElement>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handlers
  const handleJdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoadingStep("Reading Job Description file...");
      const text = await extractTextFromFile(file);
      setJobDescription(text);
    } catch (err: any) {
      alert(err.message || "Failed to read file.");
    } finally {
      setLoadingStep("");
      if (jdFileInputRef.current) jdFileInputRef.current.value = "";
    }
  };

  const handleResumeFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoadingStep("Reading Resume file...");
      const text = await extractTextFromFile(file);
      setResumeText(text);
    } catch (err: any) {
      alert(err.message || "Failed to read file.");
    } finally {
      setLoadingStep("");
      if (resumeFileInputRef.current) resumeFileInputRef.current.value = "";
    }
  };

  const loadSampleData = () => {
    setJobDescription(SAMPLE_JD);
    setResumeText(SAMPLE_RESUME);
  };

  const resetAll = () => {
    setJobDescription("");
    setResumeText("");
    setResults(null);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = (text: string, type: "summary" | number) => {
    navigator.clipboard.writeText(text);
    if (type === "summary") {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } else {
      setCopiedBulletIndex(type);
      setTimeout(() => setCopiedBulletIndex(null), 2000);
    }
  };

  // Submit & Analyze with OpenRouter DeepSeek
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobDescription.trim() || !resumeText.trim()) {
      alert("Please provide both the Job Description and your Resume.");
      return;
    }

    setLoading(true);
    setLoadingStep("Parsing Job Description & Analyzing Resume with DeepSeek...");

    try {
      const prompt = `You are a world-class Applicant Tracking System (ATS) optimization specialist and executive resume writer.
Analyze this candidate's resume against the target job description.

JOB DESCRIPTION:
\"\"\"
${jobDescription}
\"\"\"

CANDIDATE RESUME:
\"\"\"
${resumeText}
\"\"\"

Your tasks:
1. Parse the JD: Extract Target Role, Experience Level, top Hard Skills, and Key Responsibilities.
2. Calculate a realistic ATS Match Score (0 to 100) and Match Grade (e.g., 'Strong Match (85-100)', 'Good Match (70-84)', 'Moderate Match (50-69)', 'Low Match (<50)').
3. Provide score breakdown: hardSkills (0-100), experience (0-100), keywordDensity (0-100), relevance (0-100).
4. Perform Keyword Gap Analysis:
   - matchedKeywords: list of important skills/keywords found in both.
   - missingKeywords: critical keywords in the JD missing from the resume.
   - weakKeywords: keywords mentioned weakly or without metrics.
5. Write a Tailored Professional Summary: A compelling 3-4 sentence resume summary aligned with the JD.
6. Provide 3-4 specific Bullet Point Improvements: Take 3-4 original bullets from the resume and rewrite them into high-impact, ATS-optimized bullets with active verbs, quantified results/metrics, and missing JD keywords seamlessly integrated.
7. List Recommended Skills To Add/Highlight in the resume skills section.
8. Provide 3 actionable ATS Formatting and Strategy Tips tailored to this role.

Also build a COMPLETE, polished, professional, ATS-compliant resume incorporating all missing keywords, improved bullets, and tailored summary.

Respond ONLY with a valid, parseable JSON object matching this schema:
{
  "atsScore": 78,
  "matchGrade": "Good Match",
  "scoreBreakdown": {
    "hardSkills": 75,
    "experience": 85,
    "keywordDensity": 70,
    "relevance": 82
  },
  "jdSummary": {
    "roleTitle": "Extracted Role Title",
    "experienceLevel": "e.g. 4+ years",
    "topHardSkills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"],
    "keyResponsibilities": ["Responsibility 1", "Responsibility 2", "Responsibility 3"]
  },
  "keywordAnalysis": {
    "matchedKeywords": ["Keyword 1", "Keyword 2", "Keyword 3"],
    "missingKeywords": ["Missing Keyword 1", "Missing Keyword 2", "Missing Keyword 3"],
    "weakKeywords": ["Weak Keyword 1", "Weak Keyword 2"]
  },
  "tailoredSummary": "A highly customized professional summary for the top of the resume...",
  "bulletImprovements": [
    {
      "original": "Original bullet from the resume",
      "improved": "Optimized bullet incorporating JD keywords and quantified metrics",
      "keywordsAdded": ["Keyword A", "Keyword B"]
    }
  ],
  "recommendedSkillsToAdd": ["Skill A", "Skill B", "Skill C", "Skill D"],
  "atsTips": [
    "Actionable ATS tip 1",
    "Actionable ATS tip 2",
    "Actionable ATS tip 3"
  ],
  "optimizedResume": {
    "fullName": "Candidate Full Name from resume",
    "headline": "Target Role Title aligning with JD",
    "contact": {
      "email": "candidate email from resume",
      "phone": "phone number",
      "location": "City, State or Remote",
      "linkedin": "linkedin profile url",
      "github": "github profile url"
    },
    "summary": "Full tailored professional summary integrating target keywords",
    "skillCategories": [
      {
        "name": "Languages & Core",
        "skills": ["TypeScript", "JavaScript", "Python"]
      },
      {
        "name": "Frameworks & Cloud",
        "skills": ["React", "Node.js", "AWS", "Docker", "PostgreSQL"]
      },
      {
        "name": "Methodologies & Tools",
        "skills": ["CI/CD", "Git", "REST/GraphQL APIs", "Agile"]
      }
    ],
    "experience": [
      {
        "title": "Software Engineer",
        "company": "Company Name",
        "location": "Location",
        "dates": "Dates",
        "bullets": [
          "Quantified high-impact bullet incorporating JD keywords...",
          "Second strong achievement bullet..."
        ]
      }
    ],
    "education": [
      {
        "degree": "Degree and Major",
        "school": "University or Institution",
        "dates": "Graduation Date or Range"
      }
    ],
    "certifications": ["Cert 1 (optional)"]
  }
}`;

      const response = await callOpenRouterAI({
        prompt,
        model: selectedModel,
      });

      // Ensure optimizedResume exists with robust fallback
      if (!response.optimizedResume) {
        response.optimizedResume = buildFallbackResume(resumeText, response);
      }

      setResults(response);
    } catch (error: any) {
      console.error("ATS optimization error:", error);
      setResults({
        atsScore: 0,
        matchGrade: "Analysis Failed",
        scoreBreakdown: {
          hardSkills: 0,
          experience: 0,
          keywordDensity: 0,
          relevance: 0,
        },
        jdSummary: {
          roleTitle: "Unknown",
          experienceLevel: "Unknown",
          topHardSkills: [],
          keyResponsibilities: [],
        },
        keywordAnalysis: {
          matchedKeywords: [],
          missingKeywords: [],
          weakKeywords: [],
        },
        tailoredSummary: "",
        bulletImprovements: [],
        recommendedSkillsToAdd: [],
        atsTips: [],
        error: true,
        message:
          error?.message ||
          "Failed to process ATS analysis. Please check your OpenRouter API key and prompt.",
      });
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 65) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-rose-600 bg-rose-50 border-rose-200";
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 65) return "bg-blue-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500"></div>

      <div className="p-6 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-100 rounded-lg text-purple-600">
                <Target className="h-6 w-6" />
              </span>
              <h3 className="text-2xl font-bold text-slate-800">
                ATS Resume Optimizer & JD Matcher
              </h3>
            </div>
            <p className="text-slate-600 text-sm mt-1">
              Upload or paste a Job Description and your Resume to get an instant
              ATS score, identify keyword gaps, and receive tailored resume
              enhancements.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadSampleData}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              Load Sample Data
            </button>
            {(jobDescription || resumeText || results) && (
              <button
                type="button"
                onClick={resetAll}
                className="text-xs font-medium px-2.5 py-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAnalyze} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Job Description Input */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Target Job Description (JD) *
                </label>
                <button
                  type="button"
                  onClick={() => jdFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-all shadow-xs"
                >
                  <Upload className="h-3 w-3" />
                  Upload PDF / TXT
                </button>
                <input
                  type="file"
                  ref={jdFileInputRef}
                  onChange={handleJdFileUpload}
                  accept=".pdf,.txt,.md"
                  className="hidden"
                />
              </div>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={9}
                required
                placeholder="Paste the target job description here, or click 'Upload PDF / TXT' above..."
                className="w-full text-sm font-sans leading-relaxed p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 text-slate-800 placeholder-slate-400 resize-none transition-all outline-none"
              />
              <div className="text-right mt-1">
                <span className="text-xs text-slate-400">
                  {jobDescription.length} characters
                </span>
              </div>
            </div>

            {/* Resume Input */}
            <div className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-blue-600" />
                  Your Current Resume *
                </label>
                <button
                  type="button"
                  onClick={() => resumeFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-all shadow-xs"
                >
                  <Upload className="h-3 w-3" />
                  Upload PDF / TXT
                </button>
                <input
                  type="file"
                  ref={resumeFileInputRef}
                  onChange={handleResumeFileUpload}
                  accept=".pdf,.txt,.md"
                  className="hidden"
                />
              </div>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                rows={9}
                required
                placeholder="Paste your resume text here, or click 'Upload PDF / TXT' above..."
                className="w-full text-sm font-sans leading-relaxed p-3.5 bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-slate-800 placeholder-slate-400 resize-none transition-all outline-none"
              />
              <div className="text-right mt-1">
                <span className="text-xs text-slate-400">
                  {resumeText.length} characters
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Powered by{" "}
              <span className="font-semibold text-slate-700">
                {selectedModel}
              </span>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Analyzing ATS Match...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  <span>Calculate ATS Score & Optimize</span>
                </div>
              )}
            </Button>
          </div>
        </form>

        {/* Loading Progress */}
        {loading && (
          <div className="mt-8 p-6 bg-purple-50/70 border border-purple-100 rounded-xl text-center space-y-3">
            <Loader2 className="h-8 w-8 text-purple-600 animate-spin mx-auto" />
            <h4 className="text-base font-semibold text-purple-900">
              Evaluating Resume Against Job Description
            </h4>
            <p className="text-sm text-purple-700">{loadingStep}</p>
          </div>
        )}

        {/* Error Notification */}
        {results?.error && (
          <div className="mt-8 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-semibold text-rose-800">
                Analysis Encountered an Error
              </h5>
              <p className="text-sm text-rose-600 mt-1">{results.message}</p>
            </div>
          </div>
        )}

        {/* Results Presentation */}
        {results && !results.error && (
          <div className="mt-10 space-y-8 animate-in fade-in duration-500">
            {/* Header / Score Banner */}
            <div className="p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl text-white shadow-xl">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                <div className="text-center lg:text-left space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                    <Award className="h-3.5 w-3.5" /> ATS Match Evaluation
                  </div>
                  <h4 className="text-2xl sm:text-3xl font-bold">
                    Target Role: {results.jdSummary.roleTitle || "Target Position"}
                  </h4>
                  <p className="text-indigo-200 text-sm max-w-xl">
                    Experience Requirement:{" "}
                    <span className="font-semibold text-white">
                      {results.jdSummary.experienceLevel}
                    </span>
                  </p>
                </div>

                {/* ATS Circle Gauge */}
                <div className="flex items-center gap-5 bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/15">
                  <div className="relative flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border-4 border-indigo-400/30 flex items-center justify-center">
                      <span className="text-3xl font-extrabold text-white">
                        {results.atsScore}
                      </span>
                      <span className="text-xs text-indigo-300 font-semibold absolute top-3 right-2">
                        %
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-indigo-200 font-medium">
                      ATS Match Score
                    </div>
                    <div className="text-lg font-bold text-white mt-0.5">
                      {results.matchGrade}
                    </div>
                    <div className="text-xs text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Ready for Tailoring
                    </div>
                  </div>
                </div>
              </div>

              {/* Score Breakdown Bars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
                <div>
                  <div className="flex justify-between text-xs text-indigo-200 mb-1">
                    <span>Hard Skills</span>
                    <span className="font-semibold text-white">
                      {results.scoreBreakdown?.hardSkills || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressBarColor(
                        results.scoreBreakdown?.hardSkills || 0
                      )}`}
                      style={{
                        width: `${results.scoreBreakdown?.hardSkills || 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-indigo-200 mb-1">
                    <span>Experience Fit</span>
                    <span className="font-semibold text-white">
                      {results.scoreBreakdown?.experience || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressBarColor(
                        results.scoreBreakdown?.experience || 0
                      )}`}
                      style={{
                        width: `${results.scoreBreakdown?.experience || 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-indigo-200 mb-1">
                    <span>Keyword Density</span>
                    <span className="font-semibold text-white">
                      {results.scoreBreakdown?.keywordDensity || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressBarColor(
                        results.scoreBreakdown?.keywordDensity || 0
                      )}`}
                      style={{
                        width: `${
                          results.scoreBreakdown?.keywordDensity || 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-indigo-200 mb-1">
                    <span>Relevance</span>
                    <span className="font-semibold text-white">
                      {results.scoreBreakdown?.relevance || 0}%
                    </span>
                  </div>
                  <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressBarColor(
                        results.scoreBreakdown?.relevance || 0
                      )}`}
                      style={{
                        width: `${results.scoreBreakdown?.relevance || 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Download New Optimized PDF Banner */}
            <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-blue-700 p-5 rounded-2xl text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-purple-400/30">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm border border-white/20 flex-shrink-0">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold">
                      ATS Resume Ready (LaTeX Typeset & Overleaf .tex)
                    </h4>
                    <span className="text-2xs bg-emerald-400 text-slate-900 font-extrabold px-2 py-0.5 rounded-full uppercase">
                      Keywords Added
                    </span>
                  </div>
                  <p className="text-xs text-purple-100 mt-0.5">
                    Formatted in clean single-column ATS layout with missing keywords seamlessly integrated into your summary, skills, and experience bullets.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
                <Button
                  type="button"
                  onClick={() => setIsPdfModalOpen(true)}
                  className="w-full sm:w-auto bg-white text-purple-800 hover:bg-purple-50 font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2"
                >
                  <Printer className="h-4 w-4 text-purple-700" />
                  <span>Preview LaTeX CV & Download PDF</span>
                </Button>
              </div>
            </div>

            {/* Keyword Comparison Analysis */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div
                onClick={() => toggleSection("keywords")}
                className="p-5 bg-slate-50 flex justify-between items-center cursor-pointer select-none border-b border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-indigo-600" />
                  <h4 className="font-bold text-slate-800">
                    Keyword Match & Gap Analysis
                  </h4>
                </div>
                {expandedSections.keywords ? (
                  <ChevronUp className="h-5 w-5 text-slate-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-500" />
                )}
              </div>

              {expandedSections.keywords && (
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white">
                  {/* Matched Keywords */}
                  <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <div className="flex items-center gap-2 mb-3 text-emerald-800 font-semibold text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Matched Keywords in Resume ({results.keywordAnalysis.matchedKeywords.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {results.keywordAnalysis.matchedKeywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-white border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium shadow-2xs"
                        >
                          {kw}
                        </span>
                      ))}
                      {results.keywordAnalysis.matchedKeywords.length === 0 && (
                        <span className="text-xs text-slate-400 italic">
                          No exact matching keywords found.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Missing Keywords */}
                  <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                    <div className="flex items-center gap-2 mb-3 text-rose-800 font-semibold text-sm">
                      <XCircle className="h-4 w-4 text-rose-600" />
                      Missing Critical Keywords from JD ({results.keywordAnalysis.missingKeywords.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {results.keywordAnalysis.missingKeywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-white border border-rose-200 text-rose-800 rounded-lg text-xs font-semibold shadow-2xs"
                        >
                          + {kw}
                        </span>
                      ))}
                      {results.keywordAnalysis.missingKeywords.length === 0 && (
                        <span className="text-xs text-emerald-600 italic">
                          No critical missing keywords!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tailored Professional Summary */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div
                onClick={() => toggleSection("summary")}
                className="p-5 bg-slate-50 flex justify-between items-center cursor-pointer select-none border-b border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h4 className="font-bold text-slate-800">
                    Optimized Resume Summary (Tailored for this JD)
                  </h4>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(results.tailoredSummary, "summary");
                    }}
                    className="text-xs px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-md text-slate-700 font-medium flex items-center gap-1 shadow-2xs"
                  >
                    {copiedSummary ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-slate-500" />
                        Copy Summary
                      </>
                    )}
                  </button>
                  {expandedSections.summary ? (
                    <ChevronUp className="h-5 w-5 text-slate-500" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  )}
                </div>
              </div>

              {expandedSections.summary && (
                <div className="p-6 bg-white">
                  <p className="text-slate-700 leading-relaxed text-sm bg-purple-50/30 p-4 rounded-xl border border-purple-100 font-medium">
                    {results.tailoredSummary}
                  </p>
                  <p className="text-xs text-slate-400 mt-2 italic">
                    Tip: Replace or update your current resume summary with this
                    tailored version to align with the ATS filter.
                  </p>
                </div>
              )}
            </div>

            {/* Experience Bullet Improvements */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div
                onClick={() => toggleSection("bullets")}
                className="p-5 bg-slate-50 flex justify-between items-center cursor-pointer select-none border-b border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-indigo-600" />
                  <h4 className="font-bold text-slate-800">
                    High-Impact Bullet Point Enhancements (Before → After)
                  </h4>
                </div>
                {expandedSections.bullets ? (
                  <ChevronUp className="h-5 w-5 text-slate-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-500" />
                )}
              </div>

              {expandedSections.bullets && (
                <div className="p-6 space-y-4 bg-white">
                  {results.bulletImprovements.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-3"
                    >
                      {/* Original */}
                      <div className="text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-wider">
                          Original:
                        </span>
                        <p className="text-slate-600 line-through mt-0.5 font-mono">
                          {item.original}
                        </p>
                      </div>

                      {/* Improved */}
                      <div className="text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                            Optimized with JD Keywords & Impact:
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.improved, idx)}
                            className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
                          >
                            {copiedBulletIndex === idx ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-600">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-slate-900 font-medium bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
                          {item.improved}
                        </p>
                      </div>

                      {/* Keywords Added */}
                      {item.keywordsAdded && item.keywordsAdded.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-2xs font-semibold text-indigo-700 uppercase">
                            Keywords Incorporated:
                          </span>
                          {item.keywordsAdded.map((kw, kIdx) => (
                            <span
                              key={kIdx}
                              className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded text-2xs font-medium"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recommended Skills to Add */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div
                onClick={() => toggleSection("skills")}
                className="p-5 bg-slate-50 flex justify-between items-center cursor-pointer select-none border-b border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  <h4 className="font-bold text-slate-800">
                    Recommended Skills to Highlight in Technical Skills Section
                  </h4>
                </div>
                {expandedSections.skills ? (
                  <ChevronUp className="h-5 w-5 text-slate-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-500" />
                )}
              </div>

              {expandedSections.skills && (
                <div className="p-6 bg-white">
                  <div className="flex flex-wrap gap-2.5">
                    {results.recommendedSkillsToAdd.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                      >
                        <Zap className="h-3.5 w-3.5 text-amber-600" />
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ATS Strategy Tips */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div
                onClick={() => toggleSection("tips")}
                className="p-5 bg-slate-50 flex justify-between items-center cursor-pointer select-none border-b border-slate-200 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                  <h4 className="font-bold text-slate-800">
                    ATS Strategy & Formatting Advice
                  </h4>
                </div>
                {expandedSections.tips ? (
                  <ChevronUp className="h-5 w-5 text-slate-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-500" />
                )}
              </div>

              {expandedSections.tips && (
                <div className="p-6 bg-white">
                  <ul className="space-y-2.5">
                    {results.atsTips.map((tip, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-sm text-slate-700"
                      >
                        <span className="p-1 bg-blue-100 text-blue-700 rounded-full flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3" />
                        </span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* PDF Resume Viewer & Downloader Modal */}
      {results && results.optimizedResume && (
        <ResumePdfViewerModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          resumeData={results.optimizedResume}
          keywordsAdded={results.keywordAnalysis?.missingKeywords || []}
          atsScore={results.atsScore}
          targetRole={results.jdSummary?.roleTitle || "Target Role"}
        />
      )}
    </div>
  );
};


function buildFallbackResume(rawResume: string, analysis: any): OptimizedResumeData {
  const lines = rawResume.split("\n").map((l: string) => l.trim()).filter(Boolean);
  const name = lines[0] || "Candidate";

  // Try to parse multiple experience entries from resume text
  const experienceEntries: { title: string; company: string; location: string; dates: string; bullets: string[] }[] = [];
  
  // Look for company/date patterns or bullet points
  let currentJob: { title: string; company: string; location: string; dates: string; bullets: string[] } | null = null;
  const bulletImprovements = analysis.bulletImprovements || [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isBullet = line.startsWith("-") || line.startsWith("•") || line.startsWith("*") || /^[0-9]+./.test(line);
    const dateMatch = line.match(/(20\d\d|19\d\d)\s*(-|–|to|until)\s*(present|current|20\d\d)/i);

    if (dateMatch && !isBullet) {
      if (currentJob) {
        experienceEntries.push(currentJob);
      }
      const parts = line.split(/[|•–-]/).map(p => p.trim());
      currentJob = {
        title: parts[0] || analysis.jdSummary?.roleTitle || "Software Engineer",
        company: parts[1] || "Enterprise Company",
        location: "Remote",
        dates: dateMatch[0],
        bullets: []
      };
    } else if (isBullet && currentJob) {
      currentJob.bullets.push(line.replace(/^[-•*\d.]+\s*/, ""));
    }
  }

  if (currentJob) {
    experienceEntries.push(currentJob);
  }

  // If no structured jobs detected, build from bulletImprovements
  if (experienceEntries.length === 0) {
    experienceEntries.push({
      title: analysis.jdSummary?.roleTitle || "Senior Software Engineer",
      company: "Technology Solutions",
      location: "Remote",
      dates: "2021 - Present",
      bullets: bulletImprovements.length > 0 
        ? bulletImprovements.map((b: any) => b.improved)
        : [
            "Architected scalable microservices and robust full-stack applications.",
            "Integrated high-performance data processing pipelines, reducing latency by 35%."
          ]
    });
  }

  return {
    fullName: name,
    headline: analysis.jdSummary?.roleTitle || "Software Engineer",
    contact: {
      email: rawResume.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || "candidate@email.com",
      phone: rawResume.match(/[\d-().+\s]{10,}/)?.[0]?.trim() || "(555) 123-4567",
      location: "Open to Remote / Relocation",
      linkedin: "linkedin.com/in/" + name.toLowerCase().replace(/\s+/g, ""),
      github: "github.com/" + name.toLowerCase().replace(/\s+/g, ""),
    },
    summary:
      analysis.tailoredSummary ||
      "Results-driven software engineer with extensive background in developing robust applications, collaborating cross-functionally, and implementing modern technical architectures.",
    skillCategories: [
      {
        name: "Languages & Frameworks",
        skills: [
          ...(analysis.keywordAnalysis?.matchedKeywords || []),
          ...(analysis.keywordAnalysis?.missingKeywords || []),
        ].slice(0, 10),
      },
      {
        name: "Developer Tools & Cloud",
        skills: analysis.recommendedSkillsToAdd || ["Docker", "AWS", "CI/CD", "Git"],
      },
    ],
    experience: experienceEntries,
    education: [
      {
        degree: "Bachelor of Science in Computer Science",
        school: "Accredited University",
        dates: "2018 - 2022",
      },
    ],
    certifications: []
  };
}

export default AtsOptimizerSection;
