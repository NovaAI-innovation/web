import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireAdminAuth } from '@/lib/admin-auth';
import { failure, success } from '@/lib/api';

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const VISION_PROMPT = `You are an architectural drawing analyzer. Analyze this hand-drawn or drafted construction schematic.
Extract and return a JSON object with this exact structure:
{
  "title": "descriptive title for the drawing",
  "overview": "1-2 sentence description of the drawing",
  "rooms": [
    { "id": "r1", "label": "Room Name", "x": 0.0, "y": 0.0, "w": 0.4, "h": 0.3, "notes": "" }
  ],
  "dimensions": [
    { "label": "24'-0\"", "axis": "h", "x1": 0.0, "y1": 0.0, "x2": 0.4, "y2": 0.0 }
  ],
  "openings": [
    { "type": "door|window", "wall": "room-id-north|south|east|west", "position": 0.5 }
  ],
  "notes": ["any special notes or annotations from the drawing"]
}
Coordinates are normalized 0-1 within the drawing bounds. axis h=horizontal, v=vertical dimension line.
Return only the JSON, no markdown fences.`;

const SVG_SYSTEM_PROMPT =
  'You are a technical SVG generator for architectural drawings. Output only valid SVG XML, no explanation, no markdown fences.';

function buildSvgUserPrompt(analysisJson: string): string {
  return `Generate a clean, professional architectural schematic SVG from this analysis data.

SVG requirements:
- viewBox="0 0 1200 900", white background (#ffffff)
- Outer border: thin dark gray (#333) rectangle 40px inset on all sides
- Rooms: light gray fill (#f0f0f0), dark (#222) 1.5px stroke, labeled with room name (center, 13px Arial, #333)
- Walls extend to fill the drawing area scaled from the normalized coordinates (drawing area: x 40-960, y 40-760)
- Dimension lines: dashed (#666), 0.8px, with 6px arrowheads at each end, label in 10px Arial (#444) centered above/below the line
- Title block in bottom-right (x 960-1160, y 760-860): white bg, gray border, project title in 14px bold, "CHIMERA ENTERPRISE" in 9px tracking-wide gold (#b8972e), date in 9px gray
- North arrow: simple up-arrow with "N" label at top-right of drawing area (x:920, y:80)
- Scale note: "NOT TO SCALE" at bottom-left in 8px gray

Analysis data:
${analysisJson}`;
}

export async function POST(request: Request) {
  const auth = await requireAdminAuth();
  if (!auth.ok) return auth.response;

  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      failure('INTERNAL_ERROR', 'AI service not configured'),
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(failure('VALIDATION_ERROR', 'Invalid form data'), { status: 400 });
  }

  const imageFile = formData.get('image') as File | null;
  const projectId = (formData.get('projectId') as string | null) ?? undefined;
  const clientId = (formData.get('clientId') as string | null) ?? undefined;
  const notes = (formData.get('notes') as string | null) ?? undefined;

  if (!imageFile) {
    return NextResponse.json(failure('VALIDATION_ERROR', 'No image provided'), { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
    return NextResponse.json(
      failure('VALIDATION_ERROR', 'Unsupported image type. Use JPEG, PNG, or WebP.'),
      { status: 400 },
    );
  }

  if (imageFile.size > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      failure('VALIDATION_ERROR', 'Image too large. Maximum 20MB allowed.'),
      { status: 400 },
    );
  }

  const xai = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });

  // Step 1 — Vision extraction
  let parsedAnalysis: unknown;
  try {
    const imageBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString('base64');
    const dataUrl = `data:${imageFile.type};base64,${base64}`;

    const visionMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: notes ? `${VISION_PROMPT}\n\nAdditional context: ${notes}` : VISION_PROMPT },
          { type: 'image_url', image_url: { url: dataUrl } },
        ],
      },
    ];

    const visionResponse = await xai.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: visionMessages,
    });

    const rawContent = visionResponse.choices[0]?.message?.content ?? '';
    // Strip any accidental markdown fences
    const cleaned = rawContent.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    parsedAnalysis = JSON.parse(cleaned);
  } catch (err) {
    return NextResponse.json(
      failure('INTERNAL_ERROR', `Vision extraction failed: ${err instanceof Error ? err.message : String(err)}`),
      { status: 500 },
    );
  }

  // Step 2 — SVG generation
  let svg: string;
  let title = 'Schematic Drawing';
  try {
    const analysisJson = JSON.stringify(parsedAnalysis, null, 2);
    if (
      parsedAnalysis !== null &&
      typeof parsedAnalysis === 'object' &&
      'title' in parsedAnalysis &&
      typeof (parsedAnalysis as Record<string, unknown>).title === 'string'
    ) {
      title = (parsedAnalysis as Record<string, unknown>).title as string;
    }

    const svgMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SVG_SYSTEM_PROMPT },
      { role: 'user', content: buildSvgUserPrompt(analysisJson) },
    ];

    let svgModel = 'grok-imagine-image-pro';
    let svgResponse: OpenAI.Chat.ChatCompletion;
    try {
      svgResponse = await xai.chat.completions.create({
        model: svgModel,
        messages: svgMessages,
      });
    } catch {
      // Fallback to grok-4-1-fast-non-reasoning
      svgModel = 'grok-4-1-fast-non-reasoning';
      svgResponse = await xai.chat.completions.create({
        model: svgModel,
        messages: svgMessages,
      });
    }

    const rawSvg = svgResponse.choices[0]?.message?.content ?? '';
    // Strip markdown fences if any
    svg = rawSvg.replace(/^```(?:svg|xml)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

    if (!svg.includes('<svg')) {
      throw new Error('Response does not contain valid SVG');
    }
  } catch (err) {
    return NextResponse.json(
      failure('INTERNAL_ERROR', `SVG generation failed: ${err instanceof Error ? err.message : String(err)}`),
      { status: 500 },
    );
  }

  // Suppress unused variable warnings — these are accepted from the form for potential future use
  void projectId;
  void clientId;

  return NextResponse.json(
    success({
      svg,
      title,
      analysisJson: JSON.stringify(parsedAnalysis),
    }),
  );
}
