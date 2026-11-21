import mammoth from 'mammoth';
import { extractText } from 'unpdf';
import { GoogleGenAI } from '@google/genai';
import type { ChapterInfo, ExtractedDocument } from '../src/types/study.ts';

function normalizeText(raw: string): string {
  return raw
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function makePreview(text: string): string {
  const singleLine = text.replace(/\s+/g, ' ').trim();
  if (singleLine.length <= 140) return singleLine;
  return `${singleLine.slice(0, 137).trimEnd()}...`;
}

function isLikelyTocLine(line: string): boolean {
  if (/\.{3,}\s*\d+\s*$/.test(line)) return true;
  if (/\s{4,}\d{1,4}\s*$/.test(line) && line.length < 90) return true;
  return false;
}

function isHeadingLine(line: string, prevBlank: boolean, nextBlank: boolean): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 3 || trimmed.length > 105) return false;
  if (isLikelyTocLine(trimmed)) return false;

  // Explicit Chapter / Unit / Module / Section / Part / Lesson / Lecture / Topic headers
  if (
    /^(?:chapter|unit|module|section|part|lesson|lecture|week|topic)\s+(?:\d+|[ivxlcdm]+|one|two|three|four|five|six|seven|eight|nine|ten)\b(?:\s*[:.\-–—]\s*.*)?$/i.test(
      trimmed
    )
  ) {
    return true;
  }

  // Markdown H1 / H2
  if (/^#{1,2}\s+\S+/.test(trimmed)) {
    return true;
  }

  // Numbered major section heading e.g. "1. Introduction to Thermodynamics"
  if (
    /^\d{1,2}\.\s+[A-Z][A-Za-z0-9\s,&:'"()\-–—/]{3,85}$/.test(trimmed) &&
    !/[.;!?]$/.test(trimmed) &&
    (prevBlank || nextBlank)
  ) {
    return true;
  }

  // All-caps standalone heading
  if (
    prevBlank &&
    nextBlank &&
    trimmed.length >= 6 &&
    trimmed.length <= 70 &&
    /[A-Z]/.test(trimmed) &&
    trimmed === trimmed.toUpperCase() &&
    !/[.;,!?]$/.test(trimmed) &&
    trimmed.split(/\s+/).length >= 2 &&
    trimmed.split(/\s+/).length <= 10
  ) {
    return true;
  }

  return false;
}

function cleanHeadingTitle(heading: string): string {
  return heading.replace(/^#{1,3}\s+/, '').replace(/\s+/g, ' ').trim();
}

function splitLongDocumentByParagraphs(text: string, fallbackTitle: string): ChapterInfo[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const totalWords = countWords(text);

  if (totalWords <= 1400 || paragraphs.length <= 2) {
    return [
      {
        id: 'chapter-1',
        index: 1,
        title: fallbackTitle,
        content: text,
        wordCount: totalWords,
        charCount: text.length,
        preview: makePreview(text),
      },
    ];
  }

  const targetWordsPerSection = 950;
  const chapters: ChapterInfo[] = [];
  let bucket: string[] = [];
  let bucketWords = 0;

  for (const para of paragraphs) {
    const w = countWords(para);
    if (bucketWords > 0 && bucketWords + w > targetWordsPerSection && bucketWords >= 450) {
      const content = bucket.join('\n\n');
      const idx = chapters.length + 1;
      const firstLine = bucket[0].split('\n')[0].trim();
      const shortLabel =
        firstLine.length > 10 && firstLine.length <= 58 && !/[.!?]$/.test(firstLine)
          ? firstLine
          : `Section ${idx}`;
      chapters.push({
        id: `chapter-${idx}`,
        index: idx,
        title: shortLabel.startsWith('Section') ? shortLabel : `Section ${idx}: ${shortLabel}`,
        content,
        wordCount: countWords(content),
        charCount: content.length,
        preview: makePreview(content),
      });
      bucket = [para];
      bucketWords = w;
    } else {
      bucket.push(para);
      bucketWords += w;
    }
  }

  if (bucket.length > 0) {
    const content = bucket.join('\n\n');
    const idx = chapters.length + 1;
    chapters.push({
      id: `chapter-${idx}`,
      index: idx,
      title: `Section ${idx}`,
      content,
      wordCount: countWords(content),
      charCount: content.length,
      preview: makePreview(content),
    });
  }

  return chapters;
}

export function detectChapters(rawText: string, fileName: string): ChapterInfo[] {
  const text = normalizeText(rawText);
  if (!text) return [];

  const lines = text.split('\n');
  const rawSections: { title: string; lines: string[] }[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevBlank = i === 0 || lines[i - 1].trim() === '';
    const nextBlank = i === lines.length - 1 || lines[i + 1].trim() === '';

    if (isHeadingLine(line, prevBlank, nextBlank)) {
      if (currentLines.length > 0) {
        const body = currentLines.join('\n').trim();
        if (body) {
          rawSections.push({
            title: currentTitle || 'Introduction & Overview',
            lines: currentLines,
          });
        }
      }
      currentTitle = cleanHeadingTitle(line);
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    const body = currentLines.join('\n').trim();
    if (body) {
      rawSections.push({
        title: currentTitle || 'Complete Document',
        lines: currentLines,
      });
    }
  }

  // Merge tiny sections (like stray title headers or TOC entries) into valid chapters
  const filtered: { title: string; content: string }[] = [];
  for (const sec of rawSections) {
    const content = normalizeText(sec.lines.join('\n'));
    const words = countWords(content);
    const tocLinesCount = sec.lines.filter((l) => isLikelyTocLine(l)).length;
    if (tocLinesCount >= 3 && words < 180) {
      continue;
    }

    if (words < 30 && filtered.length > 0) {
      const prev = filtered[filtered.length - 1];
      prev.content = `${prev.content}\n\n${sec.title}\n${content}`.trim();
    } else if (words >= 15) {
      filtered.push({ title: sec.title, content });
    }
  }

  if (filtered.length <= 1) {
    const baseName = fileName.replace(/\.(pdf|docx|txt)$/i, '').replace(/[_-]+/g, ' ').trim();
    const fallbackTitle = filtered[0]?.title && filtered[0].title !== 'Complete Document'
      ? filtered[0].title
      : baseName || 'Chapter 1: Complete Document';
    const fullContent = filtered[0]?.content || text;
    return splitLongDocumentByParagraphs(fullContent, fallbackTitle);
  }

  return filtered.map((sec, idx) => ({
    id: `chapter-${idx + 1}`,
    index: idx + 1,
    title: sec.title,
    content: sec.content,
    wordCount: countWords(sec.content),
    charCount: sec.content.length,
    preview: makePreview(sec.content),
  }));
}

async function fallbackExtractPdfWithGemini(buffer: Buffer): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Could not extract readable text from this PDF (it may be scanned or image-only).');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const response = await ai.models.generateContent({
    model: 'gemini-4-hydrogen',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: buffer.toString('base64'),
          },
        },
        {
          text: 'Extract all readable study text from this PDF document verbatim, preserving chapter headings, section titles, and paragraph breaks. Output plain text only.',
        },
      ],
    },
  });

  return response.text?.trim() || '';
}

export async function extractDocumentFromBuffer(
  buffer: Buffer,
  fileName: string
): Promise<ExtractedDocument> {
  const lower = fileName.toLowerCase();
  let fileType: 'pdf' | 'docx' | 'txt';
  let fullText = '';
  let pageCount: number | undefined;

  if (lower.endsWith('.pdf')) {
    fileType = 'pdf';
    const uint8 = new Uint8Array(buffer);
    const result = await extractText(uint8, { mergePages: false });
    pageCount = result.totalPages;
    const pages = Array.isArray(result.text) ? result.text : [String(result.text || '')];
    fullText = normalizeText(pages.join('\n\n'));

    // Fallback for scanned/image-based PDFs
    if (countWords(fullText) < 25 && buffer.byteLength <= 15 * 1024 * 1024) {
      try {
        const ocrText = await fallbackExtractPdfWithGemini(buffer);
        if (countWords(ocrText) > countWords(fullText)) {
          fullText = normalizeText(ocrText);
        }
      } catch {
        // Keep whatever text was extracted or throw clean error below
      }
    }
  } else if (lower.endsWith('.docx')) {
    fileType = 'docx';
    const htmlResult = await mammoth.convertToHtml({ buffer });
    // Preserve heading boundaries from DOCX styles before extracting text
    const withHeadingMarkers = htmlResult.value
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n\n# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n\n## $1\n\n')
      .replace(/<\/(p|div|li|tr|h3|h4|h5|h6)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    const rawResult = await mammoth.extractRawText({ buffer });
    const candidate = countWords(withHeadingMarkers) >= countWords(rawResult.value) * 0.85
      ? withHeadingMarkers
      : rawResult.value;
    fullText = normalizeText(candidate);
  } else if (lower.endsWith('.txt')) {
    fileType = 'txt';
    fullText = normalizeText(buffer.toString('utf-8'));
  } else {
    throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
  }

  if (!fullText || countWords(fullText) < 5) {
    throw new Error('No readable text could be extracted from this document. Please try another file.');
  }

  const chapters = detectChapters(fullText, fileName);

  return {
    fileName,
    fileType,
    fileSizeBytes: buffer.byteLength,
    pageCount,
    totalWords: countWords(fullText),
    fullText,
    chapters,
  };
}
