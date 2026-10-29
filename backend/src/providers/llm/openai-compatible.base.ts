import {
  ILLMProvider,
  RagChunks,
  CoachExplanationContext,
  CoachHintContext,
  CoachChatContext,
  PostGameReviewContext,
  CoachStructuredOutput,
  PostGameStructuredOutput
} from './llm.provider.js';
import {
  buildExplainMovePrompt,
  buildHintPrompt,
  buildChatPrompt,
  buildPostGameReviewPrompt
} from '../../prompts/coach.prompts.js';
import {
  coachStructuredOutputSchema,
  postGameStructuredOutputSchema
} from '../../validators/coach.schemas.js';
import { AppError } from '../../utils/errors.js';

export interface OpenAICompatibleConfig {
  providerName: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  timeoutMs?: number;
}

export abstract class BaseOpenAICompatibleProvider implements ILLMProvider {
  readonly providerName: string;
  protected baseUrl: string;
  protected apiKey?: string;
  protected model: string;
  protected timeoutMs: number;

  constructor(config: OpenAICompatibleConfig) {
    this.providerName = config.providerName;
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.timeoutMs = config.timeoutMs ?? 10000;
  }

  protected async executeChatCompletion(messages: Array<{ role: 'system' | 'user'; content: string }>): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      model: this.model,
      messages,
      temperature: 0.3,
      response_format: { type: 'json_object' }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`[${this.providerName}] HTTP ${response.status}: ${errorText}`);
        if (response.status === 429) {
          throw new AppError(`${this.providerName} rate limit exceeded. Please try again shortly.`, 429, 'LLM_RATE_LIMIT_EXCEEDED');
        }
        throw new AppError(`${this.providerName} service returned HTTP ${response.status}`, 503, 'LLM_UNAVAILABLE');
      }

      const data = await response.json() as any;
      const content = data?.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new AppError(`Empty or missing content in ${this.providerName} response`, 502, 'LLM_INVALID_RESPONSE');
      }

      return content;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (err.name === 'AbortError') {
        throw new AppError(`${this.providerName} request timed out after ${this.timeoutMs}ms`, 504, 'LLM_TIMEOUT');
      }
      throw new AppError(`Failed to connect to ${this.providerName}: ${err.message}`, 503, 'LLM_UNAVAILABLE');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  protected parseJsonContent(rawContent: string): any {
    // Strip markdown code fences if model included them despite json_object mode
    const cleaned = rawContent
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (err: any) {
      throw new AppError(`Failed to parse JSON response from ${this.providerName}: ${err.message}`, 502, 'LLM_MALFORMED_JSON');
    }
  }

  async explainMove(context: CoachExplanationContext, ragChunks?: RagChunks[]): Promise<CoachStructuredOutput> {
    const { system, user } = buildExplainMovePrompt(context, ragChunks);
    const rawContent = await this.executeChatCompletion([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]);
    const parsed = this.parseJsonContent(rawContent);
    const validated = coachStructuredOutputSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn(`[${this.providerName}] Schema mismatch on explainMove:`, validated.error.format());
      return {
        title: parsed.title || `${context.classification} Move`,
        content: parsed.content || `${context.moveSan} was played.`,
        lesson: parsed.lesson,
        suggestedMove: context.bestMove,
        highlightSquares: []
      };
    }
    return validated.data;
  }

  async generateHint(context: CoachHintContext, ragChunks?: RagChunks[]): Promise<CoachStructuredOutput> {
    const { system, user } = buildHintPrompt(context, ragChunks);
    const rawContent = await this.executeChatCompletion([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]);
    const parsed = this.parseJsonContent(rawContent);
    const validated = coachStructuredOutputSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn(`[${this.providerName}] Schema mismatch on generateHint:`, validated.error.format());
      return {
        title: parsed.title || `Level ${context.hintLevel} Hint`,
        content: parsed.content || 'Focus on active piece coordination.',
        lesson: parsed.lesson,
        suggestedMove: context.candidateMoves[0]?.san,
        highlightSquares: []
      };
    }
    return validated.data;
  }

  async answerQuestion(context: CoachChatContext, ragChunks?: RagChunks[]): Promise<CoachStructuredOutput> {
    const { system, user } = buildChatPrompt(context, ragChunks);
    const rawContent = await this.executeChatCompletion([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]);
    const parsed = this.parseJsonContent(rawContent);
    const validated = coachStructuredOutputSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn(`[${this.providerName}] Schema mismatch on answerQuestion:`, validated.error.format());
      return {
        title: parsed.title || 'Coach Answer',
        content: parsed.content || 'Review your piece activity and center control.',
        lesson: parsed.lesson,
        highlightSquares: []
      };
    }
    return validated.data;
  }

  async generatePostGameReview(context: PostGameReviewContext, ragChunks?: RagChunks[]): Promise<PostGameStructuredOutput> {
    const { system, user } = buildPostGameReviewPrompt(context, ragChunks);
    const rawContent = await this.executeChatCompletion([
      { role: 'system', content: system },
      { role: 'user', content: user }
    ]);
    const parsed = this.parseJsonContent(rawContent);
    const validated = postGameStructuredOutputSchema.safeParse(parsed);
    if (!validated.success) {
      console.warn(`[${this.providerName}] Schema mismatch on generatePostGameReview:`, validated.error.format());
      return {
        summary: parsed.summary || 'A competitive game featuring strategic maneuvers in both halves of the board.',
        keyLesson: parsed.keyLesson || 'Always review tactical piece defense before launching pawn breaks.',
        bestMove: parsed.bestMove || 'e4',
        biggestMistake: parsed.biggestMistake,
        phaseReviews: {
          opening: {
            title: 'Opening Phase',
            positivePoints: ['Controlled central squares early'],
            negativePoints: []
          },
          middlegame: {
            title: 'Middlegame Strategy',
            positivePoints: ['Sought active piece placement'],
            negativePoints: []
          },
          endgame: {
            title: 'Endgame Technique',
            positivePoints: ['Maintained king activity'],
            negativePoints: []
          }
        }
      };
    }
    return validated.data;
  }
}
