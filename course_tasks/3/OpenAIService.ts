import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async completion(
    messages: ChatCompletionMessageParam[],
    model: string = "gpt-4",
    stream: boolean = false,
    jsonMode: boolean = false
  ): Promise<OpenAI.Chat.Completions.ChatCompletion | AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
        stream,
        response_format: jsonMode ? { type: "json_object" } : { type: "text" }
      });

      if (stream) {
        return chatCompletion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
      } else {
        return chatCompletion as OpenAI.Chat.Completions.ChatCompletion;
      }
    } catch (error) {
      console.error("Error in OpenAI completion:", error);
      throw error;
    }
  }

  async answerSingleQuestion(question: { question: string; answer: number; test: { q: string; a: string } }): Promise<{ question: string; answer: number; test: { q: string; a: string } }> {
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "Jesteś pomocnym asystentem. Odpowiadasz krótko i konkretnie w formacie JSON."
      },
      {
        role: "user",
        content: `Odpowiedz na pytanie w "test.q" i zastąp "???" w "test.a" odpowiedzią.

${JSON.stringify(question, null, 2)}

Zwróć dokładnie ten sam obiekt, ale z wypełnioną odpowiedzią w "test.a".`
      }
    ];

    try {
      const response = await this.completion(messages, "gpt-4-turbo", false, true) as OpenAI.Chat.Completions.ChatCompletion;
      
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('Brak odpowiedzi z modelu OpenAI');
      }

      console.log(`✅ Answer for "${question.test.q}":`, content);
      const parsedResponse = JSON.parse(content);
      return parsedResponse;
    } catch (error) {
      console.error(`❌ Error answering question "${question.test.q}":`, error);
      throw error;
    }
  }

  async answerQuestions(questions: Array<{ question: string; answer: number; test: { q: string; a: string } }>): Promise<Array<{ question: string; answer: number; test: { q: string; a: string } }>> {
    console.log('🔍 Input questions for OpenAI:', questions.length);
    console.log('🔍 Processing each question individually...');
    
    const answeredQuestions = [];
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`🤖 Processing question ${i + 1}/${questions.length}: "${question.test.q}"`);
      
      try {
        const answeredQuestion = await this.answerSingleQuestion(question);
        answeredQuestions.push(answeredQuestion);
        console.log(`✅ Question ${i + 1} answered successfully`);
      } catch (error) {
        console.error(`❌ Failed to answer question ${i + 1}:`, error);
        throw error;
      }
    }
    
    console.log(`🎉 All ${answeredQuestions.length} questions answered successfully!`);
    return answeredQuestions;
  }
} 