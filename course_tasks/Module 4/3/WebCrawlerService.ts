import TurndownService from 'turndown';
import { OpenAIService } from './OpenAIService.js';
import type { ChatCompletion } from "openai/resources/chat/completions";

interface Question {
  question: string;
  id: string;
}

interface NavigationDecision {
  hasAnswer: boolean;
  answer?: string;
  nextLink?: string;
  reasoning: string;
}

export class WebCrawlerService {
  private openaiService: OpenAIService;
  private visitedUrls: Set<string> = new Set();
  private maxDepth: number = 5;
  private turndownService: TurndownService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.turndownService = new TurndownService({
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      emDelimiter: '*',
      strongDelimiter: '**'
    });
  }

  async fetchPageContent(url: string): Promise<string> {
    console.log(`Fetching: ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      return this.convertHtmlToMarkdown(html);
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }

  private convertHtmlToMarkdown(html: string): string {
    // Usuwamy skrypty i style które mogą zawierać pułapki
    const cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    
    return this.turndownService.turndown(cleanHtml);
  }

  private extractLinks(markdown: string): string[] {
    // Wyciągamy linki z markdowna
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const links: string[] = [];
    let match;
    
    while ((match = linkRegex.exec(markdown)) !== null) {
      const url = match[2];
      // Filtrujemy tylko linki do domeny softo.ag3nts.org
      if (url.includes('softo.ag3nts.org') || url.startsWith('/')) {
        links.push(url);
      }
    }
    
    return [...new Set(links)]; // Usuwamy duplikaty
  }

  private makeAbsoluteUrl(url: string, baseUrl: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    if (url.startsWith('/')) {
      const base = new URL(baseUrl);
      return `${base.protocol}//${base.host}${url}`;
    }
    return new URL(url, baseUrl).href;
  }

  async analyzePageForAnswer(markdown: string, question: string): Promise<NavigationDecision> {
    const prompt = `Analizujesz zawartość strony internetowej w formacie Markdown w poszukiwaniu odpowiedzi na konkretne pytanie.

PYTANIE: ${question}

ZAWARTOŚĆ STRONY:
${markdown}

Twoim zadaniem jest:
1. Sprawdzić, czy na tej stronie znajduje się bezpośrednia odpowiedź na pytanie
2. Jeśli TAK - podać konkretną, zwięzłą odpowiedź
3. Jeśli NIE - wskazać jeden najbardziej obiecujący link do dalszej eksploracji

WAŻNE ZASADY:
- Odpowiedź musi być BARDZO ZWIĘZŁA - tylko konkretna informacja (np. email, nazwa, data)
- NIE dodawaj prefiksów typu "Adres email to:" - podaj tylko samą informację
- Jeśli nie ma odpowiedzi, wybierz JEDEN najlepszy link do sprawdzenia

Odpowiedz w formacie JSON:
{
  "hasAnswer": true/false,
  "answer": "konkretna odpowiedź" (tylko jeśli hasAnswer=true),
  "nextLink": "URL do sprawdzenia" (tylko jeśli hasAnswer=false),
  "reasoning": "krótkie uzasadnienie decyzji"
}`;

    try {
      const response = await this.openaiService.completion({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-4o-mini',
        jsonMode: true,
        maxTokens: 500
      }) as ChatCompletion;

      const result = this.openaiService.parseJsonResponse<NavigationDecision>(response);
      
      if ('error' in result) {
        throw new Error('Failed to parse LLM response');
      }
      
      return result;
    } catch (error) {
      console.error('Error analyzing page:', error);
      throw error;
    }
  }

  async searchForAnswer(question: Question, startUrl: string = 'https://softo.ag3nts.org'): Promise<string> {
    console.log(`\n🔍 Searching for answer to question ${question.id}: ${question.question}`);
    
    // Resetujemy odwiedzone URL dla nowego pytania
    this.visitedUrls.clear();
    
    let currentUrl = startUrl;
    let depth = 0;
    
    while (depth < this.maxDepth) {
      if (this.visitedUrls.has(currentUrl)) {
        console.log(`Already visited ${currentUrl}, breaking loop`);
        break;
      }
      
      this.visitedUrls.add(currentUrl);
      console.log(`📄 Analyzing page (depth ${depth}): ${currentUrl}`);
      
      try {
        const markdown = await this.fetchPageContent(currentUrl);
        const decision = await this.analyzePageForAnswer(markdown, question.question);
        
        console.log(`🤖 LLM Decision: ${decision.reasoning}`);
        
        if (decision.hasAnswer && decision.answer) {
          console.log(`✅ Found answer: ${decision.answer}`);
          return decision.answer;
        }
        
        if (decision.nextLink) {
          const nextUrl = this.makeAbsoluteUrl(decision.nextLink, currentUrl);
          console.log(`➡️  Following link: ${nextUrl}`);
          currentUrl = nextUrl;
          depth++;
        } else {
          console.log(`❌ No more links to follow`);
          break;
        }
        
      } catch (error) {
        console.error(`Error processing ${currentUrl}:`, error);
        break;
      }
    }
    
    throw new Error(`Could not find answer for question ${question.id} after ${depth} steps`);
  }
} 