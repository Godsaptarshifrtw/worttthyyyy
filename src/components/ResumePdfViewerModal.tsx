import React, { useState, useRef } from "react";
import {
  X,
  Printer,
  Download,
  FileText,
  Check,
  Copy,
  Edit3,
  Eye,
  Sparkles,
  CheckCircle2,
  Code,
  ExternalLink,
} from "lucide-react";
import Button from "./ui/Button";
import { generateLatexResumeCode } from "../lib/latexResumeGenerator";

export interface OptimizedResumeData {
  fullName: string;
  headline: string;
  contact: {
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    website?: string;
  };
  summary: string;
  skillCategories: {
    name: string;
    skills: string[];
  }[];
  experience: {
    title: string;
    company: string;
    location: string;
    dates: string;
    bullets: string[];
  }[];
  education: {
    degree: string;
    school: string;
    dates: string;
    gpa?: string;
  }[];
  certifications?: string[];
  latexCode?: string;
}

interface ResumePdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: OptimizedResumeData;
  keywordsAdded: string[];
  atsScore: number;
  targetRole: string;
}

export const ResumePdfViewerModal: React.FC<ResumePdfViewerModalProps> = ({
  isOpen,
  onClose,
  resumeData: initialData,
  keywordsAdded,
  atsScore,
  targetRole,
}) => {
  const [data, setData] = useState<OptimizedResumeData>(initialData);
  const [activeView, setActiveView] = useState<"latex-typeset" | "latex-code">("latex-typeset");
  const [highlightKeywords, setHighlightKeywords] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedLatex, setCopiedLatex] = useState(false);

  // Generate the LaTeX source code
  const [latexSource, setLatexSource] = useState<string>(() => {
    return initialData.latexCode || generateLatexResumeCode(initialData, targetRole);
  });

  const resumeRef = useRef<HTMLDivElement>(null);
  const overleafFormRef = useRef<HTMLFormElement>(null);

  if (!isOpen) return null;

  // Print as PDF
  const handlePrintPdf = () => {
    setActiveView("latex-typeset");
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Open in Overleaf
  const handleOpenInOverleaf = () => {
    if (overleafFormRef.current) {
      overleafFormRef.current.submit();
    }
  };

  // Download .tex file
  const handleDownloadTex = () => {
    const blob = new Blob([latexSource], { type: "text/x-tex;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(data.fullName || "Resume").replace(/\s+/g, "_")}_ATS_Optimized.tex`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export as Word (.doc)
  const handleExportWord = () => {
    const resumeElement = resumeRef.current;
    if (!resumeElement) return;

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${data.fullName || "Resume"} - ATS Optimized</title>
        <style>
          body { font-family: 'Times New Roman', Times, serif; font-size: 10.5pt; line-height: 1.35; color: #000; margin: 0.5in; }
          h1 { font-size: 18pt; text-align: center; margin-bottom: 2pt; text-transform: uppercase; font-weight: bold; }
          .headline { font-size: 11pt; text-align: center; font-style: italic; margin-bottom: 4pt; }
          .contact { font-size: 9pt; text-align: center; margin-bottom: 12pt; color: #333; }
          h2 { font-size: 11pt; border-bottom: 1pt solid #000; padding-bottom: 1pt; margin-top: 10pt; margin-bottom: 4pt; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5pt; }
          .job-title { font-weight: bold; font-size: 10pt; }
          .job-meta { display: flex; justify-content: space-between; font-size: 9.5pt; }
          ul { margin: 2pt 0 6pt 16pt; padding: 0; }
          li { margin-bottom: 2pt; font-size: 9.5pt; }
        </style>
      </head>
      <body>
        ${resumeElement.innerHTML}
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + htmlContent], {
      type: "application/msword;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(data.fullName || "Resume").replace(/\s+/g, "_")}_ATS_Optimized.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy LaTeX Source
  const handleCopyLatex = () => {
    navigator.clipboard.writeText(latexSource);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  // Helper to render text with keyword highlights
  const renderTextWithHighlights = (text: string) => {
    if (!highlightKeywords || !keywordsAdded || keywordsAdded.length === 0 || !text) {
      return text;
    }

    const escapedKeywords = keywordsAdded
      .filter((k) => k && k.length > 1)
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    if (escapedKeywords.length === 0) return text;

    const regex = new RegExp(`\\b(${escapedKeywords.join("|")})\\b`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) => {
      const isKeyword = keywordsAdded.some(
        (k) => k.toLowerCase() === part.toLowerCase()
      );
      if (isKeyword) {
        return (
          <mark
            key={i}
            className="bg-emerald-100 text-emerald-900 font-semibold px-0.5 rounded mx-0.5 no-print"
            title="Incorporated from JD"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Hidden Overleaf form */}
      <form
        ref={overleafFormRef}
        action="https://www.overleaf.com/docs"
        method="POST"
        target="_blank"
        className="hidden"
      >
        <input type="hidden" name="snip" value={latexSource} />
      </form>

      {/* Main Container */}
      <div className="bg-slate-100 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] flex flex-col overflow-hidden border border-slate-300 print:border-none print:shadow-none print:max-h-none print:max-w-none print:w-full print:bg-white print:rounded-none">
        {/* Top Control Bar (Hidden during print) */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg text-purple-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                  ATS Resume (LaTeX Typeset & Source)
                </h3>
                <span className="text-2xs font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                  {atsScore}% ATS Match
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Preserves all original sections & bullet points, enriched with target JD keywords.
              </p>
            </div>
          </div>

          {/* View Switcher Tabs */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100">
            <button
              type="button"
              onClick={() => setActiveView("latex-typeset")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                activeView === "latex-typeset"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>LaTeX Typeset CV</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("latex-code")}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all ${
                activeView === "latex-code"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Code className="h-3.5 w-3.5" />
              <span>LaTeX Source (.tex)</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Open in Overleaf button */}
            <button
              type="button"
              onClick={handleOpenInOverleaf}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
              title="Open directly in Overleaf online LaTeX editor"
            >
              <ExternalLink className="h-3.5 w-3.5 text-emerald-600" />
              <span>Open in Overleaf</span>
            </button>

            {/* Download .tex */}
            <button
              type="button"
              onClick={handleDownloadTex}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-1.5"
              title="Download LaTeX source code file"
            >
              <Download className="h-3.5 w-3.5" />
              <span>.tex file</span>
            </button>

            {/* Copy LaTeX code */}
            <button
              type="button"
              onClick={handleCopyLatex}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-1.5"
            >
              {copiedLatex ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copy LaTeX</span>
                </>
              )}
            </button>

            {/* Word export */}
            <button
              type="button"
              onClick={handleExportWord}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium flex items-center gap-1.5"
            >
              <span>Word (.doc)</span>
            </button>

            {/* Print / Download PDF */}
            <Button
              type="button"
              size="sm"
              onClick={handlePrintPdf}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </Button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Highlight notification bar (Hidden during print) */}
        {activeView === "latex-typeset" && (
          <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-800 no-print">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>
                Formatted in standard <strong>Overleaf LaTeX Style</strong> with 100% ATS score compatibility. Green highlights indicate target keywords added from the JD.
              </span>
            </span>
            <button
              type="button"
              onClick={() => setHighlightKeywords(!highlightKeywords)}
              className="text-2xs uppercase font-bold text-emerald-700 hover:underline flex-shrink-0 ml-2"
            >
              {highlightKeywords ? "Hide Highlights" : "Show Highlights"}
            </button>
          </div>
        )}

        {/* Body Content */}
        {activeView === "latex-typeset" ? (
          /* LaTeX Typeset Visual Preview */
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-slate-300/60 print:p-0 print:bg-white print:overflow-visible">
            {/* The LaTeX Document Container */}
            <div
              id="printable-resume"
              ref={resumeRef}
              className="bg-white shadow-2xl max-w-[820px] w-full p-8 sm:p-14 rounded-sm border border-slate-300 print:shadow-none print:border-none print:p-0 print:w-full print:max-w-none text-black"
              style={{
                fontFamily:
                  '"Latin Modern Roman", "Computer Modern", "Times New Roman", Times, serif',
                fontSize: "10pt",
                lineHeight: "1.35",
                letterSpacing: "0.01em",
              }}
            >
              {/* Header: Name and Contacts */}
              <div className="text-center pb-3 mb-3">
                <h1
                  className="text-2xl sm:text-3xl font-bold tracking-wider uppercase text-black"
                  style={{ fontFamily: '"Latin Modern Roman", "Times New Roman", serif' }}
                >
                  {data.fullName || "Candidate Name"}
                </h1>
                {targetRole && (
                  <div className="text-xs italic text-slate-700 mt-1">
                    {renderTextWithHighlights(targetRole)}
                  </div>
                )}
                <div className="text-xs text-slate-800 mt-1.5 flex flex-wrap justify-center items-center gap-x-2 gap-y-1">
                  {data.contact.email && <span>{data.contact.email}</span>}
                  {data.contact.phone && <span>$|$ {data.contact.phone}</span>}
                  {data.contact.location && <span>$|$ {data.contact.location}</span>}
                  {data.contact.linkedin && <span>$|$ {data.contact.linkedin}</span>}
                  {data.contact.github && <span>$|$ {data.contact.github}</span>}
                  {data.contact.website && <span>$|$ {data.contact.website}</span>}
                </div>
              </div>

              {/* Summary */}
              {data.summary && (
                <section className="mb-4">
                  <h2
                    className="text-xs font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-1.5"
                    style={{ fontVariant: "small-caps" }}
                  >
                    Professional Summary
                  </h2>
                  <p className="text-xs text-black leading-relaxed text-justify">
                    {renderTextWithHighlights(data.summary)}
                  </p>
                </section>
              )}

              {/* Technical Skills */}
              {data.skillCategories && data.skillCategories.length > 0 && (
                <section className="mb-4">
                  <h2
                    className="text-xs font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-1.5"
                    style={{ fontVariant: "small-caps" }}
                  >
                    Technical Skills
                  </h2>
                  <div className="space-y-1 text-xs text-black">
                    {data.skillCategories.map((cat, idx) => (
                      <div key={idx} className="flex">
                        <span className="font-bold w-40 flex-shrink-0 text-black">
                          {cat.name}:
                        </span>
                        <span className="flex-1">
                          {renderTextWithHighlights(cat.skills.join(", "))}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Experience */}
              {data.experience && data.experience.length > 0 && (
                <section className="mb-4">
                  <h2
                    className="text-xs font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-2"
                    style={{ fontVariant: "small-caps" }}
                  >
                    Work Experience
                  </h2>
                  <div className="space-y-3.5">
                    {data.experience.map((exp, idx) => (
                      <div key={idx}>
                        {/* Line 1: Title and Dates (LaTeX \hfill alignment) */}
                        <div className="flex justify-between items-baseline text-xs font-bold text-black">
                          <span>{renderTextWithHighlights(exp.title)}</span>
                          <span className="font-normal text-xs">{exp.dates}</span>
                        </div>
                        {/* Line 2: Company and Location */}
                        <div className="flex justify-between items-baseline text-xs italic text-slate-800 mb-1">
                          <span>{exp.company}</span>
                          <span className="not-italic text-xs">{exp.location}</span>
                        </div>
                        {/* Bullets: classic LaTeX itemize */}
                        <ul className="list-disc list-outside pl-4 space-y-1 text-xs text-black leading-normal">
                          {exp.bullets.map((bullet, bIdx) => (
                            <li key={bIdx}>{renderTextWithHighlights(bullet)}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Education */}
              {data.education && data.education.length > 0 && (
                <section className="mb-4">
                  <h2
                    className="text-xs font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-1.5"
                    style={{ fontVariant: "small-caps" }}
                  >
                    Education
                  </h2>
                  <div className="space-y-2">
                    {data.education.map((edu, idx) => (
                      <div key={idx} className="text-xs">
                        <div className="flex justify-between items-baseline font-bold text-black">
                          <span>{edu.school}</span>
                          <span className="font-normal text-xs">{edu.dates}</span>
                        </div>
                        <div className="text-xs italic text-slate-800">
                          {edu.degree}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Certifications */}
              {data.certifications && data.certifications.length > 0 && (
                <section className="mb-3">
                  <h2
                    className="text-xs font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 mb-1.5"
                    style={{ fontVariant: "small-caps" }}
                  >
                    Certifications & Credentials
                  </h2>
                  <ul className="list-disc list-outside pl-4 text-xs text-black space-y-0.5">
                    {data.certifications.map((cert, idx) => (
                      <li key={idx}>{renderTextWithHighlights(cert)}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        ) : (
          /* LaTeX Code Editor View */
          <div className="flex-1 overflow-hidden flex flex-col p-4 bg-slate-900 text-slate-200">
            <div className="flex justify-between items-center mb-2 px-2">
              <span className="text-xs font-mono text-emerald-400">
                // LaTeX Source (.tex) - Ready for Overleaf, TeXShop, or pdflatex
              </span>
              <button
                type="button"
                onClick={handleCopyLatex}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded border border-slate-700 flex items-center gap-1.5"
              >
                {copiedLatex ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              value={latexSource}
              onChange={(e) => setLatexSource(e.target.value)}
              className="flex-1 w-full bg-slate-950 font-mono text-xs text-emerald-300 p-4 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none overflow-y-auto leading-relaxed shadow-inner"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* Print CSS Styles injected dynamically */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-resume, #printable-resume * {
            visibility: visible !important;
          }
          #printable-resume {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
          mark {
            background-color: transparent !important;
            color: inherit !important;
            font-weight: normal !important;
          }
        }
      `}</style>
    </div>
  );
};

export default ResumePdfViewerModal;
