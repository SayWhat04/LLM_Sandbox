import { OpenAIService } from './OpenAIService';
import { WebScrapingService } from './WebScrapingService';
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type OpenAI from "openai";

export class TaskService {
  private openaiService: OpenAIService;
  private webScrapingService: WebScrapingService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.webScrapingService = new WebScrapingService();
  }

  private formatHtmlResponse(htmlContent: string): void {
    console.log('════════════════════════════════════════════════════════════════════════════════');
    console.log('🎯 HTML RESPONSE FROM SERVER:');
    console.log('════════════════════════════════════════════════════════════════════════════════');
    
    // Basic HTML formatting for console
    const formatted = htmlContent
      .replace(/<h1[^>]*>/gi, '\n📋 ')
      .replace(/<\/h1>/gi, '\n')
      .replace(/<h2[^>]*>/gi, '\n📌 ')
      .replace(/<\/h2>/gi, '\n')
      .replace(/<h3[^>]*>/gi, '\n🔹 ')
      .replace(/<\/h3>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n📄 ')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<strong[^>]*>/gi, '💪 ')
      .replace(/<\/strong>/gi, '')
      .replace(/<em[^>]*>/gi, '✨ ')
      .replace(/<\/em>/gi, '')
      .replace(/<div[^>]*>/gi, '\n📦 ')
      .replace(/<\/div>/gi, '\n')
      .replace(/<span[^>]*>/gi, '🏷️ ')
      .replace(/<\/span>/gi, '')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>/gi, '🔗 Link: $1 - ')
      .replace(/<\/a>/gi, '')
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n/g, '\n') // Remove extra empty lines
      .trim();

    console.log(formatted);
    console.log('════════════════════════════════════════════════════════════════════════════════');
    
    // Also log raw HTML for debugging if needed
    console.log('\n🔍 Raw HTML (first 500 chars):');
    console.log(htmlContent.substring(0, 500) + (htmlContent.length > 500 ? '...' : ''));
  }

  async processTask(targetUrl: string): Promise<any> {
    try {
      console.log('\n🔄 STARTING TASK PROCESS');
      console.log('═══════════════════════════════════════════════════════════════════════════════');
      console.log(`1. 🌐 Fetching question from: ${targetUrl}`);
      
      // Step 1: Fetch the question from the webpage
      const question = await this.webScrapingService.fetchQuestion(targetUrl);
      console.log(`📝 Question found: ${question}`);

      // Step 2: Send question to LLM
      console.log('2. 🤖 Sending question to LLM...');
      const messages: ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: 'You are a precise assistant that answers questions about dates. When asked about a date or year, respond with ONLY the year number (e.g., "1939"). Do not provide full sentences, explanations, or additional context. Just the year.'
        },
        {
          role: 'user',
          content: question
        }
      ];

      const completion = await this.openaiService.completion(messages, "gpt-4o", false);
      const response = completion as OpenAI.Chat.Completions.ChatCompletion;
      const answer = response.choices[0]?.message?.content || '';
      
      console.log(`💬 LLM Answer: ${answer}`);

      // Step 3: Format response as JSON
      const responseData = {
        username: "tester",
        password: "574e112a",
        answer: answer
      };

      console.log('3. 📦 Formatted response:');
      console.log(JSON.stringify(responseData, null, 2));

      // Step 4: Post the answer back to the website
      console.log('4. 🌐 Posting answer back to website...');
      const postResult = await this.webScrapingService.postAnswer(targetUrl, responseData);
      
      console.log('\n✅ Task completed successfully!');
      console.log('🎯 Response from server:');
      this.formatHtmlResponse(postResult);

      return {
        success: true,
        question,
        answer,
        serverResponse: postResult
      };

    } catch (error) {
      console.error('\n❌ Error processing task:');
      console.error('═══════════════════════════════════════════════════════════════════════════════');
      console.error(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 