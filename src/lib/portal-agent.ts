'use server';

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { getProjectsByClient } from './project-store';
import { getInvoicesByClient } from './invoice-store';
import { getPortalMessages } from './portal-messages';
import { getAgentMemoryForClient } from './portal-agent-memory';
import { isContractorDocument } from './document-source';

export type AgentReply = {
  body: string;
  reasoning: string;
  citedSources: string[];
  memorySummary: string;
  artifactRefs: string[];
};

export type AgentInput = {
  clientId: string;
  clientName: string;
  query: string;
  /** Raw file content of client-attached file — 1-time context only */
  attachmentContext?: { filename: string; text: string } | null;
};

const CONSTRUCTION_KNOWLEDGE = `
## Chimera Enterprise — Construction Domain Knowledge

### Safety & Compliance
All active sites require daily safety checks, documented hazard assessments, and PPE compliance. Any structural modification requires permit sign-off before proceeding. Fire and electrical rough-ins must pass inspection before drywall. Safety incidents must be reported within 24 hours.

### Critical Path Management
Critical path items are flagged in the milestone list. A delay in any critical-path milestone cascades to the project end date. Mitigation options include parallel scheduling of non-dependent trades, overtime (with change order), or scope deferral. Chimera notifies clients within 48 hours of any critical-path risk.

### Change Orders
Any scope addition or substitution requires a written change order approved by both Chimera project manager and client before work proceeds. Verbal approvals are not binding. Change orders typically add 5–15% overhead. Budget contingency (usually 10–15% of contract value) is recommended for all projects.

### Client Communication
Progress updates are provided weekly via the portal. Critical issues trigger an immediate message. All budget variances >5% require written acknowledgment. Project sign-off requires client walkthrough and punch-list completion. Final holdback (typically 10%) is released after deficiency resolution period.
`.trim();

function readContractorDocuments(): string {
  const uploadsDir = path.join(process.cwd(), '.data', 'uploads');
  if (!fs.existsSync(uploadsDir)) return '';

  const files = fs.readdirSync(uploadsDir).filter(f => {
    try {
      return isContractorDocument(f);
    } catch { return true; } // default to contractor if metadata missing
  });

  if (files.length === 0) return '';

  const entries = files.map(f => {
    const displayName = f.replace(/^\d+-/, '');
    const stats = fs.statSync(path.join(uploadsDir, f));
    const sizeKb = Math.round(stats.size / 1024);
    // Attempt to read text content (works for .txt; PDFs/images return raw binary hint)
    let snippet = '';
    if (f.match(/\.(txt|md|csv)$/i)) {
      try {
        snippet = '\nContent:\n' + fs.readFileSync(path.join(uploadsDir, f), 'utf-8').slice(0, 2000);
      } catch { /* skip */ }
    }
    return `- ${displayName} (${sizeKb} KB, uploaded ${stats.mtime.toLocaleDateString()})${snippet}`;
  });

  return `## Contractor Documents on File\n${entries.join('\n')}`;
}

function buildSystemPrompt(
  clientName: string,
  projectContext: string,
  invoiceContext: string,
  contractorDocs: string,
  memoryContext: string,
): string {
  return `You are the Chimera Enterprise Project Management Agent. You assist renovation clients with clear, professional, and warm communication about their projects.

Your role:
- Answer questions about project status, timelines, milestones, and budget using the client's actual data
- Reference specific milestones, amounts, and dates when available
- Be direct and human — avoid corporate jargon
- If you don't know something, say so and offer to escalate to the project team

${CONSTRUCTION_KNOWLEDGE}

${contractorDocs}

## Client Profile
Name: ${clientName}

${projectContext}

${invoiceContext}

${memoryContext}

Respond conversationally. Keep answers focused and useful. Do not add a "Sources:" footer.`.trim();
}

async function buildProjectContext(clientId: string): Promise<{ text: string; refs: string[] }> {
  const projects = await getProjectsByClient(clientId);
  if (projects.length === 0) return { text: '## Projects\nNo active projects found.', refs: [] };

  const refs: string[] = [];
  const lines = projects.map(p => {
    refs.push(p.id);
    const milestones = p.milestones
      .map(m => `    - ${m.title}: ${m.completed ? 'completed' : 'pending'}${m.dueDate ? ` (due ${m.dueDate.slice(0, 10)})` : ''}`)
      .join('\n');
    const budget = p.budget
      ? `Budget: $${p.budget.allocated.toLocaleString()} | Spent: $${p.budget.spent.toLocaleString()} | Remaining: $${(p.budget.allocated - p.budget.spent).toLocaleString()}`
      : 'Budget: not set';
    return `### Project: ${p.name} (${p.status})\n${budget}\nMilestones:\n${milestones}`;
  });

  return { text: `## Projects\n${lines.join('\n\n')}`, refs };
}

async function buildInvoiceContext(clientId: string): Promise<string> {
  const invoices = await getInvoicesByClient(clientId);
  if (invoices.length === 0) return '## Invoices\nNo invoices on file.';

  const lines = invoices.map(i =>
    `- Invoice ${i.id}: $${i.total.toLocaleString()} — ${i.status}${i.dueDate ? ` (due ${i.dueDate.slice(0, 10)})` : ''}`,
  );
  return `## Invoices\n${lines.join('\n')}`;
}

async function buildConversationHistory(clientId: string): Promise<OpenAI.Chat.ChatCompletionMessageParam[]> {
  const allMessages = await getPortalMessages(clientId);
  const recent = allMessages.slice(-14); // last 14 messages for history

  return recent.map(m => ({
    role: (m.author === 'client' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.body,
  }));
}

async function buildMemoryContext(clientId: string, query: string): Promise<string> {
  // Fetch a wider pool then rank by relevance + recency
  const entries = await getAgentMemoryForClient(clientId, 24);
  if (entries.length === 0) return '';

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  const scored = entries.map(e => {
    const text = `${e.query} ${e.responseSummary}`.toLowerCase();
    let score = 0;
    for (const w of queryWords) {
      if (text.includes(w)) score += 2;
    }
    // Recency bonus — decays by day
    const ageHours = (Date.now() - new Date(e.createdAt).getTime()) / 3_600_000;
    score += Math.max(0, 6 - Math.floor(ageHours / 24));
    return { e, score };
  });

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ e }) => e)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const lines = top.map(
    e => `- [${e.createdAt.slice(0, 10)}] Q: "${e.query.slice(0, 60)}" → ${e.responseSummary.slice(0, 100)}`,
  );
  return `## Conversation Memory (relevant past interactions)\n${lines.join('\n')}`;
}

export async function generatePortalAgentReply(input: AgentInput): Promise<AgentReply> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return {
      body: 'The project management agent is not configured. Please contact the Chimera team directly.',
      reasoning: '',
      citedSources: [],
      memorySummary: input.query.slice(0, 100),
      artifactRefs: [],
    };
  }

  const xai = new OpenAI({ apiKey, baseURL: 'https://api.x.ai/v1' });

  const [projectResult, invoiceContext, contractorDocs, memoryContext, history] = await Promise.all([
    buildProjectContext(input.clientId),
    buildInvoiceContext(input.clientId),
    Promise.resolve(readContractorDocuments()),
    buildMemoryContext(input.clientId, input.query),
    buildConversationHistory(input.clientId),
  ]);

  const systemPrompt = buildSystemPrompt(
    input.clientName,
    projectResult.text,
    invoiceContext,
    contractorDocs,
    memoryContext,
  );

  // Build user turn: conversation history + current query + optional 1-time file context
  const userContent = [
    input.attachmentContext
      ? `[Attached document — reference for this message only]\nFilename: ${input.attachmentContext.filename}\n\n${input.attachmentContext.text.slice(0, 4000)}\n\n---`
      : null,
    input.query,
  ]
    .filter(Boolean)
    .join('\n\n');

  // Conversation history excludes the current message (already in userContent)
  const historyWithoutLast = history.slice(0, -1);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...historyWithoutLast,
    { role: 'user', content: userContent },
  ];

  try {
    const completion = await xai.chat.completions.create({
      model: 'grok-4-1-fast-non-reasoning',
      messages,
    });

    const msg = completion.choices[0]?.message;
    const body = msg?.content ?? 'I encountered an issue generating a response. Please try again.';
    // xAI reasoning models return reasoning_content on the message object
    const reasoning = (msg as unknown as { reasoning_content?: string }).reasoning_content ?? '';

    return {
      body,
      reasoning,
      citedSources: [],
      memorySummary: body.slice(0, 200).replace(/\n/g, ' '),
      artifactRefs: projectResult.refs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      body: `I'm having trouble connecting to the project management system right now. Please try again in a moment or contact the team directly.\n\nError: ${message}`,
      reasoning: '',
      citedSources: [],
      memorySummary: 'Agent error',
      artifactRefs: [],
    };
  }
}
