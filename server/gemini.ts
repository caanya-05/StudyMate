import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import type { Schema } from '@google/genai';
import type { GeneratedStudyMaterial, StudyFormatId } from '../src/types/study.ts';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your Gemini API key in Settings > Secrets.'
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildDynamicResponseSchema(formats: StudyFormatId[]): Schema {
  const properties: Record<string, Schema> = {};
  const required: string[] = [];

  if (formats.includes('detailedNotes')) {
    required.push('detailedNotes');
    properties.detailedNotes = {
      type: Type.OBJECT,
      description: 'Comprehensive, structured academic study notes.',
      properties: {
        overview: {
          type: Type.STRING,
          description: 'A clear 2-3 sentence framing overview of the chapter material.',
        },
        sections: {
          type: Type.ARRAY,
          description: 'Logical topic-by-topic study note sections (3 to 6 sections).',
          items: {
            type: Type.OBJECT,
            properties: {
              heading: { type: Type.STRING, description: 'Clear topic heading.' },
              keyConcept: {
                type: Type.STRING,
                description: 'Core takeaway sentence for this section.',
              },
              explanation: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Detailed bullet points explaining mechanisms, theory, and context.',
              },
              examples: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Concrete examples or applications from the source text.',
              },
              importantTerms: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    term: { type: Type.STRING },
                    definition: { type: Type.STRING },
                  },
                  required: ['term', 'definition'],
                },
              },
            },
            required: ['heading', 'keyConcept', 'explanation', 'examples', 'importantTerms'],
          },
        },
      },
      required: ['overview', 'sections'],
    };
  }

  if (formats.includes('shortNotes')) {
    required.push('shortNotes');
    properties.shortNotes = {
      type: Type.OBJECT,
      description: 'High-yield, rapid-revision bullet notes and memory hooks.',
      properties: {
        title: { type: Type.STRING, description: 'Short revision title.' },
        bullets: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '8 to 14 crisp, high-impact revision bullets.',
        },
        memoryHooks: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '3 to 5 mnemonics, analogies, or quick recall cues.',
        },
      },
      required: ['title', 'bullets', 'memoryHooks'],
    };
  }

  if (formats.includes('summary')) {
    required.push('summary');
    properties.summary = {
      type: Type.OBJECT,
      description: 'Cohesive executive summary of the selected chapters.',
      properties: {
        headline: { type: Type.STRING, description: 'Single-sentence thesis of the material.' },
        paragraphs: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '2 to 4 well-crafted summary paragraphs.',
        },
        takeaways: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '4 to 6 essential concluding takeaways.',
        },
      },
      required: ['headline', 'paragraphs', 'takeaways'],
    };
  }

  const questionAnswerItemSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING, description: 'Exam-style question.' },
      answer: { type: Type.STRING, description: 'Complete model answer appropriate to mark weight.' },
      keyPoints: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'Marking scheme bullet points examiners look for.',
      },
    },
    required: ['question', 'answer', 'keyPoints'],
  };

  if (formats.includes('twoMarkQuestions')) {
    required.push('twoMarkQuestions');
    properties.twoMarkQuestions = {
      type: Type.ARRAY,
      description: '5 concise 2-mark exam questions with crisp 2-3 sentence answers.',
      items: questionAnswerItemSchema,
    };
  }

  if (formats.includes('fiveMarkQuestions')) {
    required.push('fiveMarkQuestions');
    properties.fiveMarkQuestions = {
      type: Type.ARRAY,
      description: '4 medium-depth 5-mark exam questions with structured paragraph answers.',
      items: questionAnswerItemSchema,
    };
  }

  if (formats.includes('tenMarkQuestions')) {
    required.push('tenMarkQuestions');
    properties.tenMarkQuestions = {
      type: Type.ARRAY,
      description: '3 comprehensive 10-mark essay/analytical questions with thorough multi-part answers.',
      items: questionAnswerItemSchema,
    };
  }

  if (formats.includes('mcqs')) {
    required.push('mcqs');
    properties.mcqs = {
      type: Type.ARRAY,
      description: '6 to 8 multiple-choice questions testing conceptual understanding.',
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Exactly 4 distinct answer choices.',
          },
          correctIndex: {
            type: Type.INTEGER,
            description: 'Zero-based index (0, 1, 2, or 3) of the correct option.',
          },
          explanation: {
            type: Type.STRING,
            description: 'Brief explanation of why the correct option is right.',
          },
        },
        required: ['question', 'options', 'correctIndex', 'explanation'],
      },
    };
  }

  if (formats.includes('flashcards')) {
    required.push('flashcards');
    properties.flashcards = {
      type: Type.ARRAY,
      description: '8 to 12 active-recall flashcards.',
      items: {
        type: Type.OBJECT,
        properties: {
          front: { type: Type.STRING, description: 'Clear prompt, concept, or question on the front.' },
          back: { type: Type.STRING, description: 'Concise, accurate answer or definition on the back.' },
          hint: { type: Type.STRING, description: 'Optional subtle recall cue.' },
        },
        required: ['front', 'back', 'hint'],
      },
    };
  }

  return {
    type: Type.OBJECT,
    properties,
    required,
  };
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient = /429|503|500|RESOURCE_EXHAUSTED|UNAVAILABLE|timeout/i.test(msg);
      if (!isTransient || attempt === maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 900 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

export async function generateStudyMaterial(params: {
  chapterTitle: string;
  sourceText: string;
  formats: StudyFormatId[];
}): Promise<GeneratedStudyMaterial> {
  const ai = getAiClient();

  const maxChars = 120000;
  const trimmedSource =
    params.sourceText.length > maxChars
      ? `${params.sourceText.slice(0, maxChars)}\n\n[Source truncated due to length]`
      : params.sourceText;

  const formatLabels: Record<StudyFormatId, string> = {
    detailedNotes: 'Detailed Notes (deep structured topic breakdowns, examples, and key terms)',
    shortNotes: 'Short Notes (rapid revision bullet points and memory hooks)',
    summary: 'Summary (cohesive synthesis and core takeaways)',
    twoMarkQuestions: '2-Mark Questions (5 short-answer questions with crisp 2-3 sentence answers and key marking points)',
    fiveMarkQuestions: '5-Mark Questions (4 medium-length questions with well-structured answers and 4-5 key marking points)',
    tenMarkQuestions: '10-Mark Questions (3 comprehensive essay/analytical questions with thorough multi-paragraph answers and 6+ key marking points)',
    mcqs: 'MCQs (6-8 conceptual multiple-choice questions with 4 options each, 0-based correctIndex, and clear explanations)',
    flashcards: 'Flashcards (8-12 active-recall front/back/hint study cards)',
  };

  const requestedList = params.formats.map((f) => `- ${formatLabels[f]}`).join('\n');

  const prompt = `Analyze the following study material and generate the requested educational resources strictly grounded in the provided text.

Selected Chapter(s): ${params.chapterTitle}

Requested Formats:
${requestedList}

Guidelines:
- Be accurate, thorough, and strictly faithful to the source material.
- For 2-mark questions, keep answers crisp (2-3 sentences).
- For 5-mark questions, provide medium-depth explanations (~100-140 words).
- For 10-mark questions, provide rich, structured analytical answers (~200-300 words).
- For MCQs, ensure exactly 4 options per question and verify correctIndex is an integer from 0 to 3.
- Do not include markdown syntax characters like ** or ## inside JSON strings; write clean, natural academic prose.

Study Material Text:
"""
${trimmedSource}
"""`;

  const responseSchema = buildDynamicResponseSchema(params.formats);

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an expert academic tutor and curriculum designer. Produce crystal-clear, well-organized, exam-ready study materials tailored to the exact requested formats.',
        responseMimeType: 'application/json',
        responseSchema,
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
      },
    })
  );

  const jsonText = (response.text ?? '{}').trim();
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText) as Record<string, unknown>;
  } catch {
    throw new Error('Gemini returned an unexpected format. Please try generating again.');
  }

  return {
    chapterTitle: params.chapterTitle,
    generatedAt: new Date().toISOString(),
    selectedFormats: params.formats,
    ...(parsed as Omit<GeneratedStudyMaterial, 'chapterTitle' | 'generatedAt' | 'selectedFormats'>),
  };
}
