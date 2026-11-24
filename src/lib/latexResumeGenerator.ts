import { OptimizedResumeData } from "../components/ResumePdfViewerModal";

/**
 * Escapes reserved LaTeX characters
 */
export function escapeLatex(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

/**
 * Generates an ATS-compliant, compile-ready LaTeX document
 * formatted with the popular industry-standard template (Jake's Resume / Overleaf standard).
 */
export function generateLatexResumeCode(
  data: OptimizedResumeData,
  targetRole?: string
): string {
  const name = escapeLatex(data.fullName || "Candidate Name");
  const headline = escapeLatex(targetRole || data.headline || "");

  const contacts: string[] = [];
  if (data.contact.email) {
    contacts.push(`\\href{mailto:${data.contact.email}}{${escapeLatex(data.contact.email)}}`);
  }
  if (data.contact.phone) {
    contacts.push(escapeLatex(data.contact.phone));
  }
  if (data.contact.location) {
    contacts.push(escapeLatex(data.contact.location));
  }
  if (data.contact.linkedin) {
    const url = data.contact.linkedin.startsWith("http")
      ? data.contact.linkedin
      : `https://${data.contact.linkedin}`;
    contacts.push(`\\href{${url}}{${escapeLatex(data.contact.linkedin.replace(/^https?:\/\//, ""))}}`);
  }
  if (data.contact.github) {
    const url = data.contact.github.startsWith("http")
      ? data.contact.github
      : `https://${data.contact.github}`;
    contacts.push(`\\href{${url}}{${escapeLatex(data.contact.github.replace(/^https?:\/\//, ""))}}`);
  }
  if (data.contact.website) {
    const url = data.contact.website.startsWith("http")
      ? data.contact.website
      : `https://${data.contact.website}`;
    contacts.push(`\\href{${url}}{${escapeLatex(data.contact.website.replace(/^https?:\/\//, ""))}}`);
  }

  let code = `%-------------------------
% ATS-Optimized Resume in LaTeX
% Built for maximum ATS compatibility (Workday, Greenhouse, Taleo, Lever)
% Compatible with Overleaf, pdflatex, and xelatex
%------------------------

\\documentclass[letterpaper,10pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage[left=0.55in,right=0.55in,top=0.55in,bottom=0.55in]{geometry}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-4pt}]

% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-1pt}\\item
    \\begin{tabular*}{0.98\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-5pt}
}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=0.15in, label={\\textbullet}]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------------------------
\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{2pt}
    ${headline ? `\\small \\textit{${headline}} \\\\ \\vspace{2pt}` : ""}
    \\small ${contacts.join(" $|$ ")}
\\end{center}

`;

  // Summary
  if (data.summary) {
    code += `%-----------SUMMARY-----------
\\section{Professional Summary}
\\small{
  ${escapeLatex(data.summary)}
}

`;
  }

  // Skills
  if (data.skillCategories && data.skillCategories.length > 0) {
    code += `%-----------TECHNICAL SKILLS-----------
\\section{Technical Skills}
\\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
`;
    data.skillCategories.forEach((cat) => {
      const catName = escapeLatex(cat.name);
      const skillsStr = cat.skills.map((s) => escapeLatex(s)).join(", ");
      code += `     \\textbf{${catName}:} {${skillsStr}} \\\\\n`;
    });
    code += `    }}
\\end{itemize}

`;
  }

  // Experience
  if (data.experience && data.experience.length > 0) {
    code += `%-----------EXPERIENCE-----------
\\section{Work Experience}
\\resumeSubHeadingListStart
`;
    data.experience.forEach((exp) => {
      const title = escapeLatex(exp.title);
      const company = escapeLatex(exp.company);
      const location = escapeLatex(exp.location || "Remote");
      const dates = escapeLatex(exp.dates);

      code += `  \\resumeSubheading
    {${title}}{${dates}}
    {${company}}{${location}}
    \\resumeItemListStart
`;
      exp.bullets.forEach((bullet) => {
        code += `      \\resumeItem{${escapeLatex(bullet)}}\n`;
      });
      code += `    \\resumeItemListEnd\n\n`;
    });
    code += `\\resumeSubHeadingListEnd\n\n`;
  }

  // Education
  if (data.education && data.education.length > 0) {
    code += `%-----------EDUCATION-----------
\\section{Education}
\\resumeSubHeadingListStart
`;
    data.education.forEach((edu) => {
      const degree = escapeLatex(edu.degree);
      const school = escapeLatex(edu.school);
      const dates = escapeLatex(edu.dates);

      code += `  \\resumeSubheading
    {${school}}{${dates}}
    {${degree}}{}
`;
    });
    code += `\\resumeSubHeadingListEnd\n\n`;
  }

  // Certifications
  if (data.certifications && data.certifications.length > 0) {
    code += `%-----------CERTIFICATIONS-----------
\\section{Certifications}
\\begin{itemize}[leftmargin=0.15in, label={\\textbullet}]
`;
    data.certifications.forEach((cert) => {
      code += `  \\item \\small{${escapeLatex(cert)}}\n`;
    });
    code += `\\end{itemize}\n\n`;
  }

  code += `\\end{document}\n`;

  return code;
}
