import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractDocumentFromBuffer, detectChapters } from './server/extract.ts';
import { generateStudyMaterial } from './server/gemini.ts';
import type { StudyFormatId } from './src/types/study.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALID_FORMATS = new Set<StudyFormatId>([
  'detailedNotes',
  'shortNotes',
  'summary',
  'twoMarkQuestions',
  'fiveMarkQuestions',
  'tenMarkQuestions',
  'mcqs',
  'flashcards',
]);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 25 * 1024 * 1024, // 25 MB
    },
  });

  app.use(express.json({ limit: '10mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/extract', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Please select a PDF, DOCX, or TXT file to upload.' });
        return;
      }

      const extracted = await extractDocumentFromBuffer(req.file.buffer, req.file.originalname);
      res.json(extracted);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to extract text from the document.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/extract-text', (req, res) => {
    try {
      const { text, title } = req.body as { text?: string; title?: string };
      if (!text || typeof text !== 'string' || text.trim().length < 20) {
        res.status(400).json({ error: 'Please paste at least a short paragraph of study text.' });
        return;
      }

      const fileName = (title && title.trim()) || 'Pasted Study Notes.txt';
      const cleaned = text.trim();
      const chapters = detectChapters(cleaned, fileName);
      const totalWords = cleaned.split(/\s+/).filter(Boolean).length;

      res.json({
        fileName,
        fileType: 'txt',
        fileSizeBytes: Buffer.byteLength(cleaned, 'utf-8'),
        totalWords,
        fullText: cleaned,
        chapters,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process pasted text.';
      res.status(400).json({ error: message });
    }
  });

  app.post('/api/generate', async (req, res) => {
    try {
      const { chapterTitle, sourceText, formats } = req.body as {
        chapterTitle?: string;
        sourceText?: string;
        formats?: StudyFormatId[];
      };

      if (!sourceText || typeof sourceText !== 'string' || sourceText.trim().length < 20) {
        res.status(400).json({ error: 'Selected chapter content is too short to generate notes.' });
        return;
      }

      if (!Array.isArray(formats) || formats.length === 0) {
        res.status(400).json({ error: 'Please choose at least one output format to generate.' });
        return;
      }

      const safeFormats = formats.filter((f): f is StudyFormatId => VALID_FORMATS.has(f));
      if (safeFormats.length === 0) {
        res.status(400).json({ error: 'No valid study output formats were selected.' });
        return;
      }

      const result = await generateStudyMaterial({
        chapterTitle: (chapterTitle && chapterTitle.trim()) || 'Selected Study Material',
        sourceText: sourceText.trim(),
        formats: safeFormats,
      });

      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate study notes with Gemini.';
      const status =
        /API_KEY_INVALID|PERMISSION_DENIED|not configured/i.test(message)
          ? 500
          : /RESOURCE_EXHAUSTED|429/i.test(message)
          ? 429
          : 500;
      res.status(status).json({ error: message });
    }
  });

  // Handle Multer errors cleanly
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(400).json({ error: 'File exceeds the 25 MB size limit.' });
          return;
        }
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  );

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Study Notes Generator running on http://localhost:${PORT}`);
  });
}

startServer();
