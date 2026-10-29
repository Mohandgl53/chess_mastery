import { BaseOpenAICompatibleProvider } from './openai-compatible.base.js';

export class OllamaProvider extends BaseOpenAICompatibleProvider {
  constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3.2') {
    super({
      providerName: 'Ollama',
      baseUrl: `${baseUrl.replace(/\/+$/, '')}/v1`,
      model,
      timeoutMs: 15000
    });
  }
}
