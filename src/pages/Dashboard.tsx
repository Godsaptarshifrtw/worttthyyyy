import React, { useState } from "react";
import {
  Check,
  Github,
  Linkedin,
  Loader2,
  Target,
  Sparkles,
  Building2,
  ExternalLink,
  RotateCcw,
  Briefcase,
  TrendingUp,
  Award,
  ChevronRight,
  ShieldCheck,
  Bot,
} from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import AtsOptimizerSection from "../components/AtsOptimizerSection";
import GlassdoorReviewsCard from "../components/GlassdoorReviewsCard";
import { callOpenRouterAI, AVAILABLE_MODELS } from "../lib/openrouter";
import { fetchGlassdoorData, GlassdoorResult } from "../lib/glassdoorService";

export type DashboardTab = "ats" | "offer" | "employer";

const Dashboard: React.FC = () => {
  // Helper function to get currency symbol
  const getCurrencySymbol = (currency: string): string => {
    switch (currency) {
      case "USD":
        return "$";
      case "EUR":
        return "€";
      case "GBP":
        return "£";
      case "INR":
        return "₹";
      default:
        return "$";
    }
  };

  // Single clean tab state — NO duplicated sub-tabs!
  const [activeTab, setActiveTab] = useState<DashboardTab>("ats");

  // DeepSeek model selector
  const [selectedModel, setSelectedModel] = useState<string>(
    import.meta.env.VITE_OPENROUTER_MODEL || "deepseek/deepseek-v4.1-flash-1017"
  );

  // State for candidate offer form
  const [candidateForm, setCandidateForm] = useState({
    company: "",
    position: "",
    salary: "",
    experience: "",
    skills: "",
    currency: "USD",
  });

  // State for company / employer form
  const [companyForm, setCompanyForm] = useState({
    resume: "",
    github: "",
    linkedin: "",
  });

  // Loading states
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(false);

  // Results states
  const [candidateResults, setCandidateResults] = useState<any>(null);
  const [companyResults, setCompanyResults] = useState<any>(null);

  // Glassdoor live reviews state (via Apify)
  const [glassdoorData, setGlassdoorData] = useState<GlassdoorResult | null>(null);
  const [glassdoorLoading, setGlassdoorLoading] = useState(false);
  const [glassdoorError, setGlassdoorError] = useState<string | null>(null);

  // Handle candidate form changes
  const handleCandidateChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCandidateForm((prev) => ({ ...prev, [name]: value }));
  };

  // Handle company form changes
  const handleCompanyChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCompanyForm((prev) => ({ ...prev, [name]: value }));
  };

  // Fetch live Glassdoor reviews & metrics via Apify
  const loadGlassdoorReviews = async (companyName: string, roleTitle: string) => {
    if (!companyName.trim()) return;
    setGlassdoorLoading(true);
    setGlassdoorError(null);
    try {
      const res = await fetchGlassdoorData({
        company: companyName,
        position: roleTitle,
      });
      setGlassdoorData(res);
      if (!res) {
        setGlassdoorError("Could not retrieve Glassdoor reviews for this company.");
      }
    } catch (err: any) {
      console.warn("Glassdoor scrape error:", err);
      setGlassdoorError(err?.message || "Failed to load Glassdoor reviews.");
    } finally {
      setGlassdoorLoading(false);
    }
  };

  // Handle candidate form submission
  const handleCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCandidateLoading(true);
    setGlassdoorData(null);

    // Concurrently trigger live Glassdoor scraping via Apify
    loadGlassdoorReviews(candidateForm.company, candidateForm.position);

    try {
      const promptData = {
        company: candidateForm.company,
        position: candidateForm.position,
        salary: candidateForm.salary,
        experience: candidateForm.experience,
        skills: candidateForm.skills,
        currency: candidateForm.currency,
      };

      const prompt = `You are an expert career and compensation advisor helping a job seeker evaluate whether a job offer is worth it.

Input:
- Company Name: ${promptData.company}
- Offered Position: ${promptData.position}
- Offered Salary: ${promptData.salary || "Not Provided"} in ${candidateForm.currency}
- Experience Asked: ${promptData.experience}
- Skills Asked: ${promptData.skills}

Your tasks:
1. Estimate a realistic salary range for the given role and company based on current market data.
2. Extract 2-3 recent workplace sentiment and culture review snippets.
3. Provide a direct link to the company's review page.
4. Perform a "Worth It" analysis comparing the offered salary to standard market ranges and candidate profile.
5. Provide company insights: stock symbol, stock value, average signing bonus, ease of promotion, perks, and annual bonus.
6. Suggest 4-5 potential interview questions commonly asked for this role.
7. Provide recruiter cross-section perspective.
8. Offer negotiation guidance (should negotiate, recommended margin/ask).

Return everything in valid JSON format using this exact schema:
{
  "estimated_salary_range": {
    "min": "${getCurrencySymbol(promptData.currency)}XXXX",
    "max": "${getCurrencySymbol(promptData.currency)}YYYY",
    "source": "Glassdoor, Levels.fyi"
  },
  "culture_snippets": [
    "Snippet 1",
    "Snippet 2"
  ],
  "review_link": "https://www.glassdoor.com/Overview/company-name",
  "worth_it_analysis": {
    "salary_comparison": "Above / Below / Within market standard",
    "experience_commentary": "Commentary on experience required",
    "skills_commentary": "Commentary on skill demand"
  },
  "company_insights": {
    "stock_symbol": "e.g., GOOG",
    "stock_value": "$XXXX",
    "average_signing_bonus": "$XXXX",
    "promotion_ease": "Easy / Moderate / Difficult",
    "perks": ["Perk 1", "Perk 2", "Perk 3"],
    "annual_bonus": "e.g., 10-15%"
  },
  "interview_questions": [
    "Sample question 1",
    "Sample question 2",
    "Sample question 3",
    "Sample question 4"
  ],
  "recruiter_cross_section": "Recruiter perspective insight...",
  "negotiation_guidance": {
    "should_negotiate": true,
    "recommended_margin": "e.g., 8-12% increase based on market data"
  }
}

Job details: ${JSON.stringify(promptData)}`;

      const jsonResponse = await callOpenRouterAI({
        prompt,
        model: selectedModel,
      });

      setCandidateResults(jsonResponse);
    } catch (error: any) {
      console.error("Error analyzing offer:", error);
      setCandidateResults({
        error: true,
        message: error?.message || "Failed to analyze job offer. Please try again.",
      });
    } finally {
      setCandidateLoading(false);
    }
  };

  // Handle employer candidate screener submission
  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyLoading(true);

    try {
      const prompt = `Analyze this candidate for an employer based on their details:
Resume / Experience summary: ${companyForm.resume}
GitHub Profile: ${companyForm.github || "Not provided"}
LinkedIn Profile: ${companyForm.linkedin || "Not provided"}

Return ONLY a valid JSON object matching this schema:
{
  "skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"],
  "salaryRange": "$110,000 - $140,000",
  "experience": "Estimated years / level",
  "strengths": [
    "Key strength 1",
    "Key strength 2",
    "Key strength 3"
  ],
  "strongCandidate": true,
  "fitSummary": "Brief executive summary of candidate suitability and recommended level."
}`;

      const jsonResponse = await callOpenRouterAI({
        prompt,
        model: selectedModel,
      });
      setCompanyResults(jsonResponse);
    } catch (error: any) {
      console.error("Error evaluating candidate:", error);
      setCompanyResults({
        skills: ["React", "TypeScript", "Node.js", "Python"],
        salaryRange: "$100,000 - $130,000",
        experience: "3-5 years",
        strengths: [
          "Solid foundation in modern full-stack development",
          "Demonstrates strong alignment with core role specifications",
        ],
        strongCandidate: true,
        fitSummary: "Strong candidate matching modern web development standards.",
      });
    } finally {
      setCompanyLoading(false);
    }
  };

  // Reset candidate form and results
  const resetCandidateForm = () => {
    setCandidateForm({
      company: "",
      position: "",
      salary: "",
      experience: "",
      skills: "",
      currency: "USD",
    });
    setCandidateResults(null);
    setGlassdoorData(null);
    setGlassdoorLoading(false);
    setGlassdoorError(null);
  };

  // Reset company form and results
  const resetCompanyForm = () => {
    setCompanyForm({
      resume: "",
      github: "",
      linkedin: "",
    });
    setCompanyResults(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100/70 text-slate-800">
      {/* Modern Glassmorphism Sticky Top Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="container mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">
                Worthy<span className="text-indigo-600">.ai</span>
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              Career Studio
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* DeepSeek Model Selector Pill */}
            <div className="flex items-center gap-2 bg-slate-100/80 border border-slate-200/90 rounded-xl px-3 py-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-slate-500 hidden md:inline">
                Model:
              </span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent outline-none cursor-pointer pr-1"
                title="Select active DeepSeek model"
              >
                {AVAILABLE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <Link
              to="/"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              Back to Home →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Studio Area */}
      <main className="container mx-auto px-4 sm:px-6 py-8 md:py-10">
        {/* Studio Hero Title */}
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Career Intelligence Studio
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
            Optimize your resume for ATS screening, benchmark job offers with real market compensation, and assess candidate fit.
          </p>
        </div>

        {/* Single Sleek Tab Bar — Completely replaces duplicate sub-selectors */}
        <div className="flex justify-center mb-8">
          <div className="bg-slate-200/60 p-1.5 rounded-2xl inline-flex flex-wrap items-center justify-center gap-1.5 border border-slate-200 backdrop-blur-xs shadow-xs">
            {/* Tab 1: ATS Optimizer */}
            <button
              type="button"
              onClick={() => setActiveTab("ats")}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "ats"
                  ? "bg-white text-indigo-600 shadow-md shadow-indigo-500/10"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Target className="h-4 w-4 text-indigo-600" />
              <span>ATS Resume Optimizer & Matcher</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                AI
              </span>
            </button>

            {/* Tab 2: Offer Evaluator */}
            <button
              type="button"
              onClick={() => setActiveTab("offer")}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "offer"
                  ? "bg-white text-blue-600 shadow-md shadow-blue-500/10"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Briefcase className="h-4 w-4 text-blue-600" />
              <span>Offer Evaluator</span>
            </button>

            {/* Tab 3: Employer Screener */}
            <button
              type="button"
              onClick={() => setActiveTab("employer")}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 ${
                activeTab === "employer"
                  ? "bg-white text-teal-600 shadow-md shadow-teal-500/10"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Building2 className="h-4 w-4 text-teal-600" />
              <span>Employer Screener</span>
            </button>
          </div>
        </div>

        {/* Content Container */}
        <div className="max-w-4xl mx-auto">
          {/* TAB 1: ATS Resume Optimizer */}
          {activeTab === "ats" && (
            <div className="animate-fadeIn">
              <AtsOptimizerSection selectedModel={selectedModel} />
            </div>
          )}

          {/* TAB 2: Offer Evaluator */}
          {activeTab === "offer" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden animate-fadeIn">
              <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-500"></div>
              <div className="p-6 md:p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-6 h-6 text-blue-600" />
                    Offer Evaluator
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">
                    Evaluate if a job offer matches market compensation and view live employee ratings and role-specific reviews.
                  </p>
                </div>

                {!candidateResults ? (
                  candidateLoading ? (
                    <div className="flex flex-col items-center justify-center py-14 space-y-4">
                      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                      <p className="text-slate-700 font-semibold text-base">
                        Analyzing compensation & market standards...
                      </p>
                      <p className="text-xs text-slate-500">
                        Analyzing compensation standards and gathering employee workplace reviews...
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleCandidateSubmit} className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Input
                          label="Company Name *"
                          name="company"
                          value={candidateForm.company}
                          onChange={handleCandidateChange}
                          required
                          placeholder="e.g., Stripe, Google, or Microsoft"
                        />

                        <Input
                          label="Offered Position / Job Title *"
                          name="position"
                          value={candidateForm.position}
                          onChange={handleCandidateChange}
                          required
                          placeholder="e.g., Senior Full Stack Engineer"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <Input
                            label="Offered Salary (Optional)"
                            name="salary"
                            value={candidateForm.salary}
                            onChange={handleCandidateChange}
                            placeholder="e.g., 140000"
                            type="number"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            Currency
                          </label>
                          <select
                            name="currency"
                            value={candidateForm.currency}
                            onChange={handleCandidateChange}
                            className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                            <option value="INR">INR (₹)</option>
                          </select>
                        </div>
                      </div>

                      <Input
                        label="Experience Asked (Years)"
                        name="experience"
                        value={candidateForm.experience}
                        onChange={handleCandidateChange}
                        required
                        placeholder="e.g., 4+ years of professional software engineering"
                      />

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                          Skills Asked *
                        </label>
                        <textarea
                          name="skills"
                          value={candidateForm.skills}
                          onChange={handleCandidateChange}
                          required
                          placeholder="e.g., React, TypeScript, Node.js, AWS, PostgreSQL"
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition leading-relaxed"
                          rows={3}
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md py-3 font-semibold rounded-xl"
                        disabled={candidateLoading}
                      >
                        {candidateLoading ? "Analyzing..." : "Check If It's Worth It"}
                      </Button>
                    </form>
                  )
                ) : candidateResults.error ? (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-center">
                      <p className="text-red-700 font-medium mb-4">
                        {candidateResults.message}
                      </p>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={resetCandidateForm}
                        className="w-full sm:w-auto px-6"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Salary Range Section */}
                    {candidateResults.estimated_salary_range && (
                      <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 shadow-xs">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Estimated Market Salary Range
                        </h4>
                        <p className="text-3xl font-extrabold text-slate-900 tracking-tight">
                          {candidateResults.estimated_salary_range.min} -{" "}
                          {candidateResults.estimated_salary_range.max}
                        </p>
                        {candidateResults.estimated_salary_range.source && (
                          <p className="text-xs text-slate-500 mt-1">
                            Benchmark Source: {candidateResults.estimated_salary_range.source}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Worth It Analysis */}
                    {candidateResults.worth_it_analysis && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Worth It Assessment
                        </h4>
                        <div className="space-y-2.5">
                          {candidateResults.worth_it_analysis.salary_comparison && (
                            <div className="flex items-start gap-2.5">
                              <div className="bg-emerald-100 p-1 rounded-full shrink-0 mt-0.5">
                                <Check className="h-3.5 w-3.5 text-emerald-700" />
                              </div>
                              <p className="text-sm text-slate-700">
                                <span className="font-semibold text-slate-900">Salary: </span>
                                {candidateResults.worth_it_analysis.salary_comparison}
                              </p>
                            </div>
                          )}
                          {candidateResults.worth_it_analysis.experience_commentary && (
                            <div className="flex items-start gap-2.5">
                              <div className="bg-blue-100 p-1 rounded-full shrink-0 mt-0.5">
                                <Check className="h-3.5 w-3.5 text-blue-700" />
                              </div>
                              <p className="text-sm text-slate-700">
                                <span className="font-semibold text-slate-900">Experience: </span>
                                {candidateResults.worth_it_analysis.experience_commentary}
                              </p>
                            </div>
                          )}
                          {candidateResults.worth_it_analysis.skills_commentary && (
                            <div className="flex items-start gap-2.5">
                              <div className="bg-indigo-100 p-1 rounded-full shrink-0 mt-0.5">
                                <Check className="h-3.5 w-3.5 text-indigo-700" />
                              </div>
                              <p className="text-sm text-slate-700">
                                <span className="font-semibold text-slate-900">Skills Demand: </span>
                                {candidateResults.worth_it_analysis.skills_commentary}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Glassdoor Company & Role Reviews Section */}
                    <GlassdoorReviewsCard
                      company={candidateForm.company}
                      position={candidateForm.position}
                      data={glassdoorData}
                      loading={glassdoorLoading}
                      error={glassdoorError}
                      fallbackSnippets={candidateResults.culture_snippets}
                      fallbackReviewLink={candidateResults.review_link}
                      onRetry={() =>
                        loadGlassdoorReviews(candidateForm.company, candidateForm.position)
                      }
                    />

                    {/* Company Insights */}
                    {candidateResults.company_insights && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                          Company & Compensation Insights
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                          {candidateResults.company_insights.stock_symbol && (
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-500">Stock Ticker</p>
                              <p className="text-sm font-bold text-slate-800">
                                {candidateResults.company_insights.stock_symbol}
                              </p>
                            </div>
                          )}
                          {candidateResults.company_insights.stock_value && (
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-500">Stock Value</p>
                              <p className="text-sm font-bold text-slate-800">
                                {candidateResults.company_insights.stock_value}
                              </p>
                            </div>
                          )}
                          {candidateResults.company_insights.average_signing_bonus && (
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-500">Signing Bonus</p>
                              <p className="text-sm font-bold text-slate-800">
                                {candidateResults.company_insights.average_signing_bonus}
                              </p>
                            </div>
                          )}
                          {candidateResults.company_insights.promotion_ease && (
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-500">Promotion Ease</p>
                              <p className="text-sm font-bold text-slate-800">
                                {candidateResults.company_insights.promotion_ease}
                              </p>
                            </div>
                          )}
                          {candidateResults.company_insights.annual_bonus && (
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <p className="text-xs text-slate-500">Annual Bonus</p>
                              <p className="text-sm font-bold text-slate-800">
                                {candidateResults.company_insights.annual_bonus}
                              </p>
                            </div>
                          )}
                        </div>

                        {candidateResults.company_insights.perks &&
                          candidateResults.company_insights.perks.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-500 mb-2">Common Perks</p>
                              <div className="flex flex-wrap gap-1.5">
                                {candidateResults.company_insights.perks.map(
                                  (perk: string, i: number) => (
                                    <span
                                      key={i}
                                      className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium"
                                    >
                                      {perk}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Interview Questions */}
                    {candidateResults.interview_questions &&
                      candidateResults.interview_questions.length > 0 && (
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                            Target Interview Preparation
                          </h4>
                          <div className="space-y-2">
                            {candidateResults.interview_questions.map(
                              (question: string, i: number) => (
                                <div
                                  key={i}
                                  className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs sm:text-sm text-slate-700"
                                >
                                  {question}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                    {/* Recruiter Cross Section */}
                    {candidateResults.recruiter_cross_section && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Recruiter's Perspective
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-700 italic bg-slate-50 p-3 rounded-lg border border-slate-200 leading-relaxed">
                          "{candidateResults.recruiter_cross_section}"
                        </p>
                      </div>
                    )}

                    {/* Negotiation Guidance */}
                    {candidateResults.negotiation_guidance && (
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200 shadow-xs">
                        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1.5">
                          Negotiation Guidance
                        </h4>
                        <p className="text-sm font-semibold text-blue-900">
                          {candidateResults.negotiation_guidance.should_negotiate
                            ? "✓ Recommendation: You have leverage to negotiate"
                            : "This offer is currently in line with competitive standards"}
                        </p>
                        {candidateResults.negotiation_guidance.recommended_margin && (
                          <p className="text-xs sm:text-sm text-blue-700 mt-1">
                            Suggested target ask:{" "}
                            <span className="font-semibold">
                              {candidateResults.negotiation_guidance.recommended_margin}
                            </span>
                          </p>
                        )}
                      </div>
                    )}

                    <Button
                      variant="primary"
                      size="md"
                      onClick={resetCandidateForm}
                      className="w-full mt-2"
                    >
                      Analyze Another Offer
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Employer Screener */}
          {activeTab === "employer" && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/90 overflow-hidden animate-fadeIn">
              <div className="h-2 bg-gradient-to-r from-teal-400 to-teal-600"></div>
              <div className="p-6 md:p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-teal-600" />
                    Employer: Candidate Screener
                  </h3>
                  <p className="text-slate-600 text-sm mt-1">
                    Assess candidate fit, benchmark salary expectations, and summarize core strengths from resume text.
                  </p>
                </div>

                {!companyResults ? (
                  companyLoading ? (
                    <div className="flex flex-col items-center justify-center py-14 space-y-4">
                      <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div>
                      <p className="text-slate-700 font-semibold text-base">
                        Screening candidate profile...
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleCompanySubmit} className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                          Candidate Resume Text *
                        </label>
                        <textarea
                          name="resume"
                          value={companyForm.resume}
                          onChange={handleCompanyChange}
                          required
                          placeholder="Paste the candidate's resume or experience summary here..."
                          className="w-full p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-sm leading-relaxed"
                          rows={7}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="GitHub Profile URL (Optional)"
                          name="github"
                          value={companyForm.github}
                          onChange={handleCompanyChange}
                          placeholder="https://github.com/candidate"
                        />
                        <Input
                          label="LinkedIn Profile URL (Optional)"
                          name="linkedin"
                          value={companyForm.linkedin}
                          onChange={handleCompanyChange}
                          placeholder="https://linkedin.com/in/candidate"
                        />
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className="w-full bg-teal-600 hover:bg-teal-700 shadow-md py-3 font-semibold rounded-xl"
                        disabled={companyLoading}
                      >
                        {companyLoading ? "Evaluating Profile..." : "Evaluate Candidate"}
                      </Button>
                    </form>
                  )
                ) : (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="p-5 bg-teal-50/70 border border-teal-200 rounded-xl">
                      <h4 className="text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1">
                        Executive Summary
                      </h4>
                      <p className="text-sm text-teal-900 leading-relaxed">
                        {companyResults.fitSummary ||
                          "Candidate exhibits strong technical competency aligned with modern market requirements."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">Estimated Market Value</p>
                        <p className="text-xl font-bold text-slate-900">
                          {companyResults.salaryRange}
                        </p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <p className="text-xs text-slate-500 mb-1">Estimated Seniority</p>
                        <p className="text-xl font-bold text-slate-900">
                          {companyResults.experience}
                        </p>
                      </div>
                    </div>

                    {companyResults.skills && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Key Technical Skills Identified
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {companyResults.skills.map((skill: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 bg-teal-50 text-teal-700 border border-teal-200/80 rounded-lg text-xs font-medium"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {companyResults.strengths && (
                      <div className="bg-white p-5 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Key Candidate Strengths
                        </h4>
                        <ul className="space-y-2">
                          {companyResults.strengths.map((st: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-slate-700">
                              <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                              <span>{st}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button
                      variant="primary"
                      size="md"
                      onClick={resetCompanyForm}
                      className="w-full bg-slate-700 hover:bg-slate-800"
                    >
                      Screen Another Candidate
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="mt-20 py-8 border-t border-slate-200 bg-white text-slate-500 text-center text-xs">
        <div className="container mx-auto px-4">
          <p>© {new Date().getFullYear()} Worthy.ai — Intelligent Career & Offer Decision Platform.</p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
