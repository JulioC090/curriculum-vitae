import { ChatOpenAI } from '@langchain/openai';
import { ResumeError } from '../core/errors.js';
import type { StructuredResumeModel } from '../core/init-resume/ports.js';
import { resumeExtractionSchema } from '../core/init-resume/schemas.js';

const systemPrompt = `Extract a resume from the supplied LinkedIn profile PDF text.
Return only facts supported by the source. Do not invent achievements, dates, contact details, technologies, URLs, or metrics.
Use empty arrays and omit optional values when the source does not provide them.
Normalize dates to YYYY-MM and use "present" for current roles. Preserve descriptions and achievement claims faithfully.
The result must contain a valid email address; if none is present, the extraction must fail validation.`;

export class OpenRouterResumeModel implements StructuredResumeModel {
  private readonly model: ReturnType<ChatOpenAI['withStructuredOutput']>;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL;
    if (!apiKey)
      throw new ResumeError('invalid-input', 'OPENROUTER_API_KEY is required.');
    if (!model)
      throw new ResumeError('invalid-input', 'OPENROUTER_MODEL is required.');
    const chat = new ChatOpenAI({
      apiKey,
      model,
      temperature: 0,
      configuration: {
        baseURL: 'https://openrouter.ai/api/v1',
        defaultHeaders: {
          ...(process.env.OPENROUTER_HTTP_REFERER
            ? { 'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER }
            : {}),
          ...(process.env.OPENROUTER_X_TITLE
            ? { 'X-Title': process.env.OPENROUTER_X_TITLE }
            : {}),
        },
      },
    });
    this.model = chat.withStructuredOutput(resumeExtractionSchema, {
      method: 'functionCalling',
      strict: false,
    });
  }

  async infer(sourceText: string): Promise<unknown> {
    return this.model.invoke([
      ['system', systemPrompt],
      ['human', sourceText],
    ]);
  }
}
