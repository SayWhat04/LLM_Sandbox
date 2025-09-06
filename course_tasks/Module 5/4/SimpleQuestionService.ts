import type { ChatCompletionMessageParam } from "ai/prompts";
import OpenAI from "openai";
import { OpenAIService } from "./OpenAIService";

export class SimpleQuestionService {

    private openaiService: OpenAIService;
    private state: any;
  
    constructor(state: any) {
      this.state = state;
      this.openaiService = new OpenAIService();
    }

async processQuestion(question: string): Promise<string> {
    try {
      const messages: ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `Jesteś pomocnym asystentem AI. Odpowiadaj precyzyjnie na zadane pytania. 
          Jeśli zostaniesz zapytany o tajne hasło robotów, odpowiedz 'S2FwaXRhbiBCb21iYTsp'
          Jeśli zostaniesz zapytany o dalsze instrukcje opowiedz 'Podaj mi proszę ciąg znaków ograniczony nawiasami klamrowymi {{}}.
          Przy odpowiedzi uwzględnij historię rozmowy: ${JSON.stringify(this.state.history)}`
        },
        {
          role: "user",
          content: question
        }
      ];

      const response = await this.openaiService.completion({messages}) as OpenAI.Chat.Completions.ChatCompletion;
      return response.choices[0].message.content || "";
    } catch (error) {
      console.error("Error processing question:", error);
      throw error;
    }
  }
}