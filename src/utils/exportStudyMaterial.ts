import { jsPDF } from 'jspdf';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from 'docx';
import type { GeneratedStudyMaterial, QuestionAnswer } from '../types/study.ts';

function sanitizeFileName(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'study-notes'
  );
}

function sanitizePdfText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '*')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\n\r\t\xA0-\xFF]/g, '');
}

function formatQuestionBlockText(label: string, items: QuestionAnswer[]): string {
  const lines: string[] = [`## ${label}`, ''];
  items.forEach((item, idx) => {
    lines.push(`Q${idx + 1}. ${item.question}`);
    lines.push(`Answer: ${item.answer}`);
    if (item.keyPoints?.length) {
      lines.push('Key Points:');
      item.keyPoints.forEach((pt) => lines.push(`  - ${pt}`));
    }
    lines.push('');
  });
  return lines.join('\n');
}

export function formatStudyMaterialAsText(material: GeneratedStudyMaterial): string {
  const lines: string[] = [
    `SMART STUDY NOTES: ${material.chapterTitle}`,
    `Generated: ${new Date(material.generatedAt).toLocaleString()}`,
    '',
  ];

  if (material.summary) {
    lines.push('## Summary', '');
    lines.push(material.summary.headline, '');
    material.summary.paragraphs.forEach((p) => lines.push(p, ''));
    if (material.summary.takeaways.length) {
      lines.push('Key Takeaways:');
      material.summary.takeaways.forEach((t) => lines.push(`- ${t}`));
      lines.push('');
    }
  }

  if (material.shortNotes) {
    lines.push(`## Short Notes: ${material.shortNotes.title}`, '');
    material.shortNotes.bullets.forEach((b) => lines.push(`- ${b}`));
    lines.push('');
    if (material.shortNotes.memoryHooks.length) {
      lines.push('Memory Hooks:');
      material.shortNotes.memoryHooks.forEach((h) => lines.push(`- ${h}`));
      lines.push('');
    }
  }

  if (material.detailedNotes) {
    lines.push('## Detailed Notes', '');
    lines.push(material.detailedNotes.overview, '');
    material.detailedNotes.sections.forEach((sec, idx) => {
      lines.push(`### ${idx + 1}. ${sec.heading}`);
      lines.push(`Key Concept: ${sec.keyConcept}`);
      sec.explanation.forEach((ex) => lines.push(`- ${ex}`));
      if (sec.examples.length) {
        lines.push('Examples:');
        sec.examples.forEach((e) => lines.push(`  * ${e}`));
      }
      if (sec.importantTerms.length) {
        lines.push('Important Terms:');
        sec.importantTerms.forEach((t) => lines.push(`  * ${t.term}: ${t.definition}`));
      }
      lines.push('');
    });
  }

  if (material.twoMarkQuestions?.length) {
    lines.push(formatQuestionBlockText('2-Mark Questions', material.twoMarkQuestions));
  }
  if (material.fiveMarkQuestions?.length) {
    lines.push(formatQuestionBlockText('5-Mark Questions', material.fiveMarkQuestions));
  }
  if (material.tenMarkQuestions?.length) {
    lines.push(formatQuestionBlockText('10-Mark Questions', material.tenMarkQuestions));
  }

  if (material.mcqs?.length) {
    lines.push('## Multiple Choice Questions (MCQs)', '');
    const letters = ['A', 'B', 'C', 'D'];
    material.mcqs.forEach((q, idx) => {
      lines.push(`${idx + 1}. ${q.question}`);
      q.options.forEach((opt, oi) => {
        lines.push(`   ${letters[oi] ?? oi + 1}) ${opt}`);
      });
      const correctLetter = letters[q.correctIndex] ?? String(q.correctIndex + 1);
      lines.push(`   Correct Answer: ${correctLetter}`);
      lines.push(`   Explanation: ${q.explanation}`);
      lines.push('');
    });
  }

  if (material.flashcards?.length) {
    lines.push('## Flashcards', '');
    material.flashcards.forEach((card, idx) => {
      lines.push(`Card ${idx + 1}`);
      lines.push(`  Front: ${card.front}`);
      lines.push(`  Back: ${card.back}`);
      if (card.hint) lines.push(`  Hint: ${card.hint}`);
      lines.push('');
    });
  }

  return lines.join('\n').trim();
}

export function downloadStudyMaterialAsPdf(material: GeneratedStudyMaterial): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  let y = 56;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 54) {
      doc.addPage();
      y = 54;
    }
  };

  const addWrappedText = (
    raw: string,
    opts: {
      fontSize?: number;
      bold?: boolean;
      color?: [number, number, number];
      indent?: number;
      lineGap?: number;
      afterGap?: number;
    } = {}
  ) => {
    const fontSize = opts.fontSize ?? 10.5;
    const indent = opts.indent ?? 0;
    const lineGap = opts.lineGap ?? fontSize * 1.45;
    const afterGap = opts.afterGap ?? 6;
    const color = opts.color ?? [15, 41, 66];

    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);

    const clean = sanitizePdfText(raw);
    const wrapped = doc.splitTextToSize(clean, maxWidth - indent) as string[];
    wrapped.forEach((line) => {
      ensureSpace(lineGap + 4);
      doc.text(line, margin + indent, y);
      y += lineGap;
    });
    y += afterGap;
  };

  const addSectionHeader = (title: string) => {
    ensureSpace(36);
    y += 8;
    doc.setDrawColor(186, 230, 253);
    doc.setLineWidth(1);
    doc.line(margin, y - 8, pageWidth - margin, y - 8);
    addWrappedText(title, {
      fontSize: 13.5,
      bold: true,
      color: [2, 132, 199],
      afterGap: 8,
    });
  };

  // Title banner
  addWrappedText('Smart Study Notes Generator', {
    fontSize: 9.5,
    bold: true,
    color: [2, 132, 199],
    afterGap: 2,
  });
  addWrappedText(material.chapterTitle, {
    fontSize: 18,
    bold: true,
    color: [15, 41, 66],
    afterGap: 4,
  });
  addWrappedText(`Generated ${new Date(material.generatedAt).toLocaleDateString()}`, {
    fontSize: 9.5,
    color: [100, 125, 150],
    afterGap: 12,
  });

  if (material.summary) {
    addSectionHeader('Summary');
    addWrappedText(material.summary.headline, { fontSize: 11, bold: true, afterGap: 6 });
    material.summary.paragraphs.forEach((p) => addWrappedText(p, { afterGap: 7 }));
    if (material.summary.takeaways.length) {
      addWrappedText('Key Takeaways:', { bold: true, afterGap: 4 });
      material.summary.takeaways.forEach((t) =>
        addWrappedText(`* ${t}`, { indent: 12, afterGap: 4 })
      );
    }
  }

  if (material.shortNotes) {
    addSectionHeader(`Short Notes: ${material.shortNotes.title}`);
    material.shortNotes.bullets.forEach((b) =>
      addWrappedText(`* ${b}`, { indent: 10, afterGap: 4 })
    );
    if (material.shortNotes.memoryHooks.length) {
      y += 4;
      addWrappedText('Memory Hooks:', { bold: true, afterGap: 4 });
      material.shortNotes.memoryHooks.forEach((h) =>
        addWrappedText(`* ${h}`, { indent: 10, afterGap: 4 })
      );
    }
  }

  if (material.detailedNotes) {
    addSectionHeader('Detailed Notes');
    addWrappedText(material.detailedNotes.overview, { afterGap: 10 });
    material.detailedNotes.sections.forEach((sec, idx) => {
      addWrappedText(`${idx + 1}. ${sec.heading}`, {
        fontSize: 12,
        bold: true,
        color: [15, 41, 66],
        afterGap: 4,
      });
      addWrappedText(`Key Concept: ${sec.keyConcept}`, {
        bold: true,
        color: [3, 105, 161],
        afterGap: 5,
      });
      sec.explanation.forEach((ex) =>
        addWrappedText(`* ${ex}`, { indent: 10, afterGap: 4 })
      );
      if (sec.examples.length) {
        addWrappedText('Examples:', { bold: true, indent: 10, afterGap: 3 });
        sec.examples.forEach((e) =>
          addWrappedText(`- ${e}`, { indent: 20, afterGap: 3 })
        );
      }
      if (sec.importantTerms.length) {
        addWrappedText('Important Terms:', { bold: true, indent: 10, afterGap: 3 });
        sec.importantTerms.forEach((t) =>
          addWrappedText(`${t.term}: ${t.definition}`, { indent: 20, afterGap: 3 })
        );
      }
      y += 6;
    });
  }

  const renderQaSection = (heading: string, items?: QuestionAnswer[]) => {
    if (!items?.length) return;
    addSectionHeader(heading);
    items.forEach((item, idx) => {
      addWrappedText(`Q${idx + 1}. ${item.question}`, { bold: true, afterGap: 4 });
      addWrappedText(`Answer: ${item.answer}`, { indent: 8, afterGap: 4 });
      if (item.keyPoints.length) {
        addWrappedText('Key Marking Points:', {
          fontSize: 9.5,
          bold: true,
          indent: 8,
          color: [75, 100, 125],
          afterGap: 2,
        });
        item.keyPoints.forEach((kp) =>
          addWrappedText(`- ${kp}`, {
            fontSize: 9.5,
            indent: 18,
            color: [75, 100, 125],
            afterGap: 2,
          })
        );
      }
      y += 6;
    });
  };

  renderQaSection('2-Mark Questions', material.twoMarkQuestions);
  renderQaSection('5-Mark Questions', material.fiveMarkQuestions);
  renderQaSection('10-Mark Questions', material.tenMarkQuestions);

  if (material.mcqs?.length) {
    addSectionHeader('Multiple Choice Questions (MCQs)');
    const letters = ['A', 'B', 'C', 'D'];
    material.mcqs.forEach((q, idx) => {
      addWrappedText(`${idx + 1}. ${q.question}`, { bold: true, afterGap: 4 });
      q.options.forEach((opt, oi) => {
        addWrappedText(`${letters[oi] ?? oi + 1}) ${opt}`, { indent: 14, afterGap: 2 });
      });
      const ans = letters[q.correctIndex] ?? String(q.correctIndex + 1);
      addWrappedText(`Answer: ${ans} - ${q.explanation}`, {
        fontSize: 9.5,
        indent: 14,
        color: [3, 105, 161],
        afterGap: 8,
      });
    });
  }

  if (material.flashcards?.length) {
    addSectionHeader('Flashcards');
    material.flashcards.forEach((card, idx) => {
      addWrappedText(`Card ${idx + 1}: ${card.front}`, { bold: true, afterGap: 3 });
      addWrappedText(`Answer: ${card.back}`, { indent: 12, afterGap: 3 });
      if (card.hint) {
        addWrappedText(`Hint: ${card.hint}`, {
          fontSize: 9.5,
          indent: 12,
          color: [75, 100, 125],
          afterGap: 6,
        });
      }
    });
  }

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 140, 160);
    doc.text(
      `Smart Study Notes Generator  |  Page ${p} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 24,
      { align: 'center' }
    );
  }

  doc.save(`${sanitizeFileName(material.chapterTitle)}.pdf`);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function downloadStudyMaterialAsDocx(
  material: GeneratedStudyMaterial
): Promise<void> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'SMART STUDY NOTES GENERATOR',
          bold: true,
          size: 18,
          color: '0284C7',
        }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      text: material.chapterTitle,
      heading: HeadingLevel.TITLE,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated ${new Date(material.generatedAt).toLocaleDateString()}`,
          color: '647D96',
          size: 20,
        }),
      ],
      spacing: { after: 280 },
    })
  );

  const addH1 = (text: string) => {
    children.push(
      new Paragraph({
        text,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 280, after: 120 },
      })
    );
  };

  const addH2 = (text: string) => {
    children.push(
      new Paragraph({
        text,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
      })
    );
  };

  const addBullet = (text: string) => {
    children.push(
      new Paragraph({
        text,
        bullet: { level: 0 },
        spacing: { after: 70 },
      })
    );
  };

  if (material.summary) {
    addH1('Summary');
    children.push(
      new Paragraph({
        children: [new TextRun({ text: material.summary.headline, bold: true })],
        spacing: { after: 120 },
      })
    );
    material.summary.paragraphs.forEach((p) =>
      children.push(new Paragraph({ text: p, spacing: { after: 120 } }))
    );
    if (material.summary.takeaways.length) {
      addH2('Key Takeaways');
      material.summary.takeaways.forEach(addBullet);
    }
  }

  if (material.shortNotes) {
    addH1(`Short Notes: ${material.shortNotes.title}`);
    material.shortNotes.bullets.forEach(addBullet);
    if (material.shortNotes.memoryHooks.length) {
      addH2('Memory Hooks');
      material.shortNotes.memoryHooks.forEach(addBullet);
    }
  }

  if (material.detailedNotes) {
    addH1('Detailed Notes');
    children.push(
      new Paragraph({ text: material.detailedNotes.overview, spacing: { after: 160 } })
    );
    material.detailedNotes.sections.forEach((sec, idx) => {
      addH2(`${idx + 1}. ${sec.heading}`);
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Key Concept: ', bold: true, color: '0284C7' }),
            new TextRun({ text: sec.keyConcept }),
          ],
          spacing: { after: 100 },
        })
      );
      sec.explanation.forEach(addBullet);
      if (sec.examples.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'Examples', bold: true })],
            spacing: { before: 80, after: 60 },
          })
        );
        sec.examples.forEach(addBullet);
      }
      if (sec.importantTerms.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'Important Terms', bold: true })],
            spacing: { before: 80, after: 60 },
          })
        );
        sec.importantTerms.forEach((t) =>
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: `${t.term}: `, bold: true }),
                new TextRun({ text: t.definition }),
              ],
              bullet: { level: 0 },
              spacing: { after: 60 },
            })
          )
        );
      }
    });
  }

  const addQaSection = (title: string, items?: QuestionAnswer[]) => {
    if (!items?.length) return;
    addH1(title);
    items.forEach((item, idx) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Q${idx + 1}. ${item.question}`, bold: true })],
          spacing: { before: 140, after: 60 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Answer: ', bold: true, color: '0284C7' }),
            new TextRun({ text: item.answer }),
          ],
          spacing: { after: 80 },
        })
      );
      if (item.keyPoints.length) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: 'Key Marking Points:', bold: true, size: 20 })],
            spacing: { after: 40 },
          })
        );
        item.keyPoints.forEach(addBullet);
      }
    });
  };

  addQaSection('2-Mark Questions', material.twoMarkQuestions);
  addQaSection('5-Mark Questions', material.fiveMarkQuestions);
  addQaSection('10-Mark Questions', material.tenMarkQuestions);

  if (material.mcqs?.length) {
    addH1('Multiple Choice Questions (MCQs)');
    const letters = ['A', 'B', 'C', 'D'];
    material.mcqs.forEach((q, idx) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${idx + 1}. ${q.question}`, bold: true })],
          spacing: { before: 140, after: 60 },
        })
      );
      q.options.forEach((opt, oi) => {
        children.push(
          new Paragraph({
            text: `${letters[oi] ?? oi + 1}) ${opt}`,
            indent: { left: 360 },
            spacing: { after: 40 },
          })
        );
      });
      const ans = letters[q.correctIndex] ?? String(q.correctIndex + 1);
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Correct Answer: ${ans} — `, bold: true, color: '0284C7' }),
            new TextRun({ text: q.explanation }),
          ],
          indent: { left: 360 },
          spacing: { after: 100 },
        })
      );
    });
  }

  if (material.flashcards?.length) {
    addH1('Flashcards');
    material.flashcards.forEach((card, idx) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `Card ${idx + 1} — Front: `, bold: true, color: '0284C7' }),
            new TextRun({ text: card.front }),
          ],
          spacing: { before: 120, after: 40 },
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Back: ', bold: true }),
            new TextRun({ text: card.back }),
          ],
          indent: { left: 280 },
          spacing: { after: card.hint ? 40 : 100 },
        })
      );
      if (card.hint) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `Hint: ${card.hint}`, italics: true, color: '647D96' }),
            ],
            indent: { left: 280 },
            spacing: { after: 100 },
          })
        );
      }
    });
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          ...children,
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Created with Smart Study Notes Generator',
                size: 18,
                color: '94A3B8',
              }),
            ],
            spacing: { before: 320 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  triggerBlobDownload(blob, `${sanitizeFileName(material.chapterTitle)}.docx`);
}
