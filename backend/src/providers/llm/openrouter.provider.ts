import { BaseOpenAICompatibleProvider } from './openai-compatible.base.js';

export class OpenRouterProvider extends BaseOpenAICompatibleProvider {
  constructor(apiKey: string, model: string = 'meta-llama/llama-3.2-3b-instruct:free') {
    super({
      providerName: 'OpenRouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey,
      model,
      timeoutMs: 12000
    });
  }
}
