import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async executeTask(taskDescription: string, data: any, additionalContext?: string): Promise<string[]> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `Jesteś asystentem AI, który wykonuje zadania na podstawie otrzymanych danych.
        
WAŻNE ZASADY:
1. Wykonaj dokładnie to, o co prosi zadanie
2. Jeśli zadanie zawiera wiele pytań, odpowiedz na każde z osobna
3. Każdą odpowiedź umieść w nowej linii
4. Jeśli zadanie wymaga obliczeń, wykonaj je dokładnie
5. Jeśli zadanie wymaga analizy tekstu, przeanalizuj go dokładnie
6. Jeśli zadanie wymaga ekstrakcji informacji, wyciągnij tylko to, o co prosi zadanie
7. Odpowiedź powinna być zwięzła i konkretna
8. Nie dodawaj dodatkowych wyjaśnień, chyba że zadanie o to prosi
9. NIGDY nie próbuj pobierać zawartości z URL-i - nie masz takiej możliwości`
      },
      {
        role: "user",
        content: additionalContext 
          ? `ZADANIE: ${taskDescription}

DANE DO PRZETWORZENIA:
${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}

DODATKOWY KONTEKST ARTYKUŁU (nie próbuj pobierać żadnych URL-i, wykorzystaj ten tekst):
${additionalContext}

Wykonaj zadanie na podstawie danych i dodatkowego kontekstu artykułu. Jeśli jest wiele pytań, odpowiedz na każde w osobnej linii. Nie powtarzaj pytania. Podaj samą odpowiedź bądź odpowiedzi. Nie dodawaj dodatkowych wyjaśnień.`
          : `ZADANIE: ${taskDescription}

DANE DO PRZETWORZENIA:
${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}

Wykonaj zadanie i podaj wynik. Jeśli jest wiele pytań, odpowiedz na każde w osobnej linii. Nie powtarzaj pytania. Podaj samą odpowiedź bądź odpowiedzi. Nie dodawaj dodatkowych wyjaśnień.`
      }
    ];

    const response = await this.openai.chat.completions.create({
      messages,
      model: "gpt-4o",
      temperature: 0,
      max_tokens: 2000
    });


    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    console.log('content ', content)

    // Parsujemy odpowiedź na tablicę - każda linia to osobna odpowiedź
    const answers = content.trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    console.log('parsed answers:', answers);
    
    return answers;
  }

  async executeTaskWithJson(taskDescription: string, data: any): Promise<any> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `Jesteś asystentem AI, który wykonuje zadania na podstawie otrzymanych danych.
        Odpowiedź ZAWSZE podaj w formacie JSON.
        
WAŻNE ZASADY:
1. Wykonaj dokładnie to, o co prosi zadanie
2. Odpowiedź MUSI być poprawnym JSON-em
3. Jeśli zadanie wymaga obliczeń, wykonaj je dokładnie
4. Jeśli zadanie wymaga analizy tekstu, przeanalizuj go dokładnie
5. Jeśli zadanie wymaga ekstrakcji informacji, wyciągnij tylko to, o co prosi zadanie
6. Odpowiedź powinna być zwięzła i konkretna`
      },
      {
        role: "user",
        content: `ZADANIE: ${taskDescription}

DANE DO PRZETWORZENIA:
${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}

Wykonaj zadanie i podaj wynik w formacie JSON.`
      }
    ];

    const response = await this.openai.chat.completions.create({
      messages,
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      console.error('Response content:', content);
      throw new Error('Failed to parse JSON response from OpenAI');
    }
  }
} 