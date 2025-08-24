import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletion } from "openai/resources/chat/completions";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async completion(config: {
    messages: ChatCompletionMessageParam[],
    model?: string,
    temperature?: number,
    jsonMode?: boolean,
    maxTokens?: number
  }): Promise<OpenAI.Chat.Completions.ChatCompletion> {
    const { messages, model = "gpt-4o", jsonMode = false, maxTokens = 4096, temperature = 0 } = config;
    
    const requestConfig: any = {
      messages,
      model,
      response_format: jsonMode ? { type: "json_object" } : { type: "text" },
      max_tokens: maxTokens,
      temperature
    };

    const chatCompletion = await this.openai.chat.completions.create(requestConfig);
    return chatCompletion;
  }

  parseJsonResponse<T>(response: ChatCompletion): T | { error: string, result: boolean } {
    try {
      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Invalid response structure');
      }
      const parsedContent = JSON.parse(content);
      return parsedContent;
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      return { error: 'Failed to process response', result: false };
    }
  }

  async analyzeQuestion(question: string): Promise<{
    location: string,
    needsPeople: boolean,
    needsCoordinates: boolean,
    strategy: string
  }> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `Jesteś ekspertem w analizie zadań GPS. Przeanalizuj pytanie i określ:
1. Jakie miasto/lokalizacja jest kluczowa w pytaniu
2. Czy potrzebujesz listy osób z danego miejsca
3. Czy potrzebujesz współrzędnych GPS
4. Jaka jest strategia rozwiązania

Odpowiedź w formacie JSON:
{
  "location": "NAZWA_MIASTA",
  "needsPeople": true/false,
  "needsCoordinates": true/false,
  "strategy": "opis strategii"
}`
      },
      {
        role: "user",
        content: question
      }
    ];

    const response = await this.completion({
      messages,
      model: "gpt-4o",
      jsonMode: true,
      maxTokens: 500
    });

    return this.parseJsonResponse<{
      location: string,
      needsPeople: boolean,
      needsCoordinates: boolean,
      strategy: string
    }>(response) as {
      location: string,
      needsPeople: boolean,
      needsCoordinates: boolean,
      strategy: string
    };
  }

  async generateDatabaseQueries(tableStructure: string): Promise<{
    exploratory: string[],
    specific: string[]
  }> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `Jesteś ekspertem SQL. Na podstawie struktury bazy danych wygeneruj zapytania:
1. exploratory - zapytania eksploracyjne do zrozumienia struktury i danych
2. specific - zapytania do znalezienia konkretnych informacji o lokalizacjach GPS

Odpowiedź w formacie JSON:
{
  "exploratory": ["SELECT ...", "SHOW TABLES", ...],
  "specific": ["SELECT ...", ...]
}`
      },
      {
        role: "user",
        content: `Struktura bazy danych:\n${tableStructure}\n\nPotrzebuję znaleźć współrzędne GPS osób w konkretnej lokalizacji, ale bez Barbary.`
      }
    ];

    const response = await this.completion({
      messages,
      model: "gpt-4o",
      jsonMode: true,
      maxTokens: 1000
    });

    return this.parseJsonResponse<{
      exploratory: string[],
      specific: string[]
    }>(response) as {
      exploratory: string[],
      specific: string[]
    };
  }
} 