/**
 * Robust file text extractor for PDF, DOCX, TXT, MD, etc.
 * Preserves lines, paragraphs, bullets, and all sections.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // 1. Plain text formats (.txt, .md, .csv, .json)
  if (
    fileType.startsWith("text/") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md") ||
    fileName.endsWith(".csv") ||
    fileName.endsWith(".json")
  ) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || "");
      reader.onerror = () => reject(new Error("Failed to read text file."));
      reader.readAsText(file);
    });
  }

  // 2. PDF files (.pdf)
  if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
    return extractTextFromPdf(file);
  }

  // 3. Word Documents (.docx)
  if (
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    return extractTextFromDocx(file);
  }

  // Fallback to text reader
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = () =>
      reject(new Error("Unsupported file format. Please paste your resume text directly."));
    reader.readAsText(file);
  });
}

/**
 * Extracts line-aware text from PDF using PDF.js.
 * Tracks vertical coordinates so sections, jobs, and bullet points
 * are not squashed into a single line.
 */
async function extractTextFromPdf(file: File): Promise<string> {
  if (!(window as any).pdfjsLib) {
    await loadScript(
      "pdfjs-script",
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
    );
  }

  const pdfjsLib = (window as any).pdfjsLib;
  if (!pdfjsLib) {
    throw new Error("PDF parser could not be loaded. Please copy and paste your resume text.");
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  let fullDocumentText = "";

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    if (!items || items.length === 0) continue;

    let pageText = "";
    let lastY: number | null = null;
    let lastX: number | null = null;

    for (const item of items) {
      if (!item.str && !item.hasEOL) continue;

      const currentY = item.transform ? item.transform[5] : null;
      const currentX = item.transform ? item.transform[4] : null;

      if (lastY !== null && currentY !== null) {
        const yDiff = Math.abs(currentY - lastY);
        // Vertical displacement indicates new line or new section
        if (yDiff > 13) {
          pageText += "\n\n";
        } else if (yDiff > 3 || item.hasEOL) {
          pageText += "\n";
        } else if (
          lastX !== null &&
          currentX !== null &&
          currentX - lastX > 12 &&
          !pageText.endsWith(" ") &&
          !pageText.endsWith("\n")
        ) {
          pageText += "   "; // Column gap
        } else if (
          pageText &&
          !pageText.endsWith(" ") &&
          !pageText.endsWith("\n")
        ) {
          pageText += " ";
        }
      }

      pageText += item.str || "";
      if (currentY !== null) lastY = currentY;
      if (currentX !== null) lastX = currentX + (item.width || 0);
    }

    fullDocumentText += pageText.trim() + "\n\n";
  }

  const result = fullDocumentText.trim();
  if (!result) {
    throw new Error(
      "No text could be extracted from this PDF (it may be a scanned image or protected). Please copy and paste the text."
    );
  }

  return result;
}

/**
 * Extracts text from DOCX files by reading word/document.xml with JSZip
 */
async function extractTextFromDocx(file: File): Promise<string> {
  if (!(window as any).JSZip) {
    await loadScript(
      "jszip-script",
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
    );
  }

  const JSZip = (window as any).JSZip;
  if (!JSZip) {
    throw new Error("DOCX parser could not be loaded. Please copy and paste your resume text.");
  }

  const zip = await JSZip.loadAsync(file);
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Invalid Word document structure. Please paste text directly.");
  }

  const xmlText = await docXmlFile.async("string");
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "application/xml");

  // Each <w:p> is a paragraph
  const paragraphs = xmlDoc.getElementsByTagName("w:p");
  let extracted = "";

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const textNodes = p.getElementsByTagName("w:t");
    let pText = "";
    for (let j = 0; j < textNodes.length; j++) {
      pText += textNodes[j].textContent || "";
    }
    if (pText.trim()) {
      extracted += pText.trim() + "\n";
    }
  }

  return extracted.trim();
}

function loadScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error(`Failed to load parser library from ${src}.`));
    document.head.appendChild(script);
  });
}
