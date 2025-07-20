import { OpenAIService } from './OpenAIService';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type OpenAI from "openai";

interface CensureResponse {
  task: string;
  apikey: string;
  answer: string;
}

export class CensureService {
  private openaiService: OpenAIService;
  private readonly API_KEY = "97ad060a-008e-40cc-8012-f8cbaaa3968e";
  private readonly DATA_URL = `https://c3ntrala.ag3nts.org/data/${this.API_KEY}/cenzura.txt`;
  private readonly REPORT_URL = "https://c3ntrala.ag3nts.org/report";

  constructor() {
    this.openaiService = new OpenAIService();
  }

  private async fetchTextData(): Promise<string> {
    try {
      console.log('📥 Pobieranie danych z:', this.DATA_URL);
      const response = await fetch(this.DATA_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      console.log('✅ Pomyślnie pobrano dane');
      console.log('📄 Oryginalny tekst:');
      console.log(text);
      return text;
    } catch (error) {
      console.error('❌ Błąd podczas pobierania danych:', error);
      throw error;
    }
  }

  private async censorText(text: string): Promise<string> {
    try {
      console.log('\n🔒 Rozpoczęcie procesu cenzurowania...');
      
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `Jesteś ekspertem w cenzurowaniu danych osobowych. Twoim zadaniem jest zamienić określone informacje na słowo "CENZURA".

Zasady cenzurowania:
1. Imię i nazwisko (razem, np. "Jan Nowak" -> "CENZURA")
2. Wiek (np. "32" -> "CENZURA")  
3. Miasto (np. "Wrocław" -> "CENZURA")
4. Ulica i numer domu (razem, np. "ul. Szeroka 18" -> "ul. CENZURA")

PRZYKŁAD:
Tekst: Podejrzany nazywa się Tomasz Kaczmarek. Jest zameldowany w Poznaniu, ul. Konwaliowa 18. Ma 25 lat.
Odpowiedź: Podejrzany nazywa się CENZURA. Jest zameldowany w CENZURA, ul. CENZURA. Ma CENZURA lat.

Zwróć TYLKO scenzurowany tekst, bez dodatkowych komentarzy czy wyjaśnień.`
        },
        {
          role: "user",
          content: text
        }
      ];

      const response = await this.openaiService.completion(messages, "gpt-4") as OpenAI.Chat.Completions.ChatCompletion;
      
      const censoredText = response.choices[0]?.message?.content?.trim();
      
      if (!censoredText) {
        throw new Error('Nie otrzymano odpowiedzi od modelu LLM');
      }

      console.log('✅ Tekst został scenzurowany');
      console.log('🔒 Scenzurowany tekst:');
      console.log(censoredText);
      
      return censoredText;
    } catch (error) {
      console.error('❌ Błąd podczas cenzurowania:', error);
      throw error;
    }
  }

  private async submitReport(censoredText: string): Promise<any> {
    try {
      console.log('\n📤 Wysyłanie raportu...');
      
      const payload: CensureResponse = {
        task: "CENZURA",
        apikey: this.API_KEY,
        answer: censoredText
      };

      console.log('📦 Dane do wysłania:');
      console.log(JSON.stringify(payload, null, 2));

      const response = await fetch(this.REPORT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Raport został pomyślnie wysłany');
      console.log('📋 Odpowiedź serwera:');
      console.log(JSON.stringify(result, null, 2));
      
      return result;
    } catch (error) {
      console.error('❌ Błąd podczas wysyłania raportu:', error);
      throw error;
    }
  }

  async processCensure(): Promise<any> {
    try {
      console.log('\n🚀 Rozpoczęcie procesu cenzurowania...');
      console.log('═══════════════════════════════════════════════════════════════════════════════');

      // Krok 1: Pobierz dane
      const originalText = await this.fetchTextData();

      // Krok 2: Scenzuruj tekst
      const censoredText = await this.censorText(originalText);

      // Krok 3: Wyślij raport
      const result = await this.submitReport(censoredText);

      console.log('\n🎉 Proces cenzurowania zakończony pomyślnie!');
      console.log('═══════════════════════════════════════════════════════════════════════════════');

      return {
        success: true,
        originalText,
        censoredText,
        serverResponse: result
      };
    } catch (error) {
      console.error('❌ Błąd w procesie cenzurowania:', error);
      throw error;
    }
  }
} 