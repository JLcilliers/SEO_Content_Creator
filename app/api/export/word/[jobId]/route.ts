/**
 * Export SEO content to Word document
 */

import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/queue';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, convertInchesToTwip } from 'docx';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    // Get job from database
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status !== 'completed' || !job.result) {
      return NextResponse.json({ error: 'Job not completed yet' }, { status: 400 });
    }

    const { metaTitle, metaDescription, contentMarkdown, faqRaw } = job.result;

    // Parse markdown content into paragraphs
    const lines = contentMarkdown.split('\n');
    const docChildren: any[] = [];

    // Add meta title
    docChildren.push(
      new Paragraph({
        text: 'Meta Title',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: metaTitle,
        spacing: { after: 400 },
      })
    );

    // Add meta description
    docChildren.push(
      new Paragraph({
        text: 'Meta Description',
        heading: HeadingLevel.HEADING_2,
        spacing: { after: 200 },
      }),
      new Paragraph({
        text: metaDescription,
        spacing: { after: 400 },
      })
    );

    // Add main content heading
    docChildren.push(
      new Paragraph({
        text: 'SEO Content',
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 400 },
      })
    );

    // Process markdown content
    for (const line of lines) {
      if (!line.trim()) {
        docChildren.push(new Paragraph({ text: '' }));
        continue;
      }

      // Handle headings
      if (line.startsWith('# ')) {
        docChildren.push(
          new Paragraph({
            text: line.substring(2),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          })
        );
      } else if (line.startsWith('## ')) {
        docChildren.push(
          new Paragraph({
            text: line.substring(3),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 },
          })
        );
      } else if (line.startsWith('### ')) {
        docChildren.push(
          new Paragraph({
            text: line.substring(4),
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 },
          })
        );
      }
      // Handle bullet points
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        docChildren.push(
          new Paragraph({
            text: line.substring(2),
            bullet: { level: 0 },
            spacing: { after: 100 },
          })
        );
      }
      // Handle numbered lists
      else if (/^\d+\.\s/.test(line)) {
        docChildren.push(
          new Paragraph({
            text: line.replace(/^\d+\.\s/, ''),
            numbering: { reference: 'default-numbering', level: 0 },
            spacing: { after: 100 },
          })
        );
      }
      // Regular paragraphs
      else {
        // Handle bold **text**
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const textRuns = parts.map((part) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRun({
              text: part.substring(2, part.length - 2),
              bold: true,
            });
          }
          return new TextRun({ text: part });
        });

        docChildren.push(
          new Paragraph({
            children: textRuns,
            spacing: { after: 200 },
          })
        );
      }
    }

    // Add FAQ section if available
    if (faqRaw && faqRaw.trim()) {
      docChildren.push(
        new Paragraph({
          text: 'Frequently Asked Questions',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 600, after: 400 },
        })
      );

      const faqLines = faqRaw.split('\n');
      for (const line of faqLines) {
        if (!line.trim()) continue;

        if (line.startsWith('Q:')) {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({ text: 'Q: ', bold: true }),
                new TextRun({ text: line.substring(2).trim() }),
              ],
              spacing: { before: 200, after: 100 },
            })
          );
        } else if (line.startsWith('A:')) {
          docChildren.push(
            new Paragraph({
              text: line.substring(2).trim(),
              spacing: { after: 200 },
            })
          );
        }
      }
    }

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          children: docChildren,
        },
      ],
    });

    // Generate buffer
    const { Packer } = await import('docx');
    const buffer = await Packer.toBuffer(doc);

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="seo-content-${jobId}.docx"`,
      },
    });
  } catch (error) {
    console.error('[Export] Error generating Word document:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate Word document',
      },
      { status: 500 }
    );
  }
}
