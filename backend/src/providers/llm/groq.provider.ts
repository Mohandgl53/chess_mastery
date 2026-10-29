import { BaseOpenAICompatibleProvider } from './openai-compatible.base.js';

export class GroqProvider extends BaseOpenAICompatibleProvider {
  constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile') {
    super({
      providerName: 'Groq',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey,
      model,
      timeoutMs: 8000
    });
  }
}
