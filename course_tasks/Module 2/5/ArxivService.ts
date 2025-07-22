import { parse } from 'node-html-parser';
import TurndownService from 'turndown';
import * as fs from 'fs';
import * as path from 'path';
import { OpenAIService } from './OpenAIService';

export interface ProcessedArticle {
  title: string;
  content: string;
  images: Array<{
    url: string;
    description: string;
    caption?: string;
  }>;
  audios: Array<{
    url: string;
    transcription: string;
  }>;
}

export interface ArxivAnswer {
  "01": string;
  "02": string;
  "03": string;
  "04": string;
  "05": string;
}



export class ArxivService {
  private openAIService: OpenAIService;
  private turndownService: TurndownService;
  private baseUrl: string = 'https://c3ntrala.ag3nts.org/dane/';

  constructor() {
    this.openAIService = new OpenAIService();
    this.turndownService = new TurndownService();
    
    // Konfiguracja Turndown dla lepszej konwersji
    this.turndownService.addRule('removeEmptyElements', {
      filter: (node) => {
        return node.nodeName === 'P' && !node.textContent?.trim();
      },
      replacement: () => ''
    });

    // Usuń tagi style i script
    this.turndownService.addRule('removeStyleAndScript', {
      filter: ['style', 'script'],
      replacement: () => ''
    });

    // Usuń komentarze CSS
    this.turndownService.addRule('removeCSSComments', {
      filter: (node) => {
        return node.nodeType === 8; // Comment node
      },
      replacement: () => ''
    });
  }

  async downloadHtml(): Promise<string> {
    console.log('📄 Pobieranie pliku HTML...');
    try {
      const response = await fetch(`${this.baseUrl}arxiv-draft.html`, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      console.log('✅ HTML pobrany pomyślnie');
      return html;
    } catch (error) {
      console.error('❌ Błąd pobierania HTML:', error);
      throw new Error('Nie udało się pobrać pliku HTML');
    }
  }

  async downloadQuestions(): Promise<string[]> {
    console.log('❓ Pobieranie pytań...');
    try {
      const response = await fetch('https://c3ntrala.ag3nts.org/data/97ad060a-008e-40cc-8012-f8cbaaa3968e/arxiv.txt', {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      const questions = text.split('\n').filter((line: string) => line.trim());
      console.log(`✅ Pobrano ${questions.length} pytań`);
      return questions;
    } catch (error) {
      console.error('❌ Błąd pobierania pytań:', error);
      throw new Error('Nie udało się pobrać pytań');
    }
  }

  async downloadFile(url: string): Promise<Buffer> {
    try {
      // Jeśli URL jest relatywny, dodaj bazowy URL
      const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      console.log(`⬇️ Pobieranie: ${fullUrl}`);
      
      const response = await fetch(fullUrl, {
        method: 'GET'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error(`❌ Błąd pobierania pliku ${url}:`, error);
      throw new Error(`Nie udało się pobrać pliku: ${url}`);
    }
  }

  async processImages(html: string): Promise<Array<{url: string, description: string, caption?: string}>> {
    console.log('🖼️ Przetwarzanie obrazów...');
    const root = parse(html);
    const images: Array<{url: string, description: string, caption?: string}> = [];

    const imageElements = root.querySelectorAll('img');
    console.log(`Znaleziono ${imageElements.length} obrazów`);

    for (let i = 0; i < imageElements.length; i++) {
      const img = imageElements[i];
      const src = img.getAttribute('src');
      
      if (!src) continue;

      try {
        // Pobierz obraz
        const imageBuffer = await this.downloadFile(src);
        
        // Znajdź podpis
        let caption = '';
        const parent = img.parentNode;
        let figcaption = '';
        
        if (parent && parent.tagName === 'FIGURE') {
          const figcaptionElement = parent.querySelector('figcaption');
          if (figcaptionElement) {
            figcaption = figcaptionElement.text.trim();
          }
        }
        
        const alt = img.getAttribute('alt') || '';
        const title = img.getAttribute('title') || '';
        
        caption = figcaption || alt || title || '';

        // Wygeneruj opis używając Vision
        const prompt = `Opisz dokładnie co widzisz na tym obrazie. ${caption ? `Kontekst: ${caption}` : ''}. Skup się na szczegółach naukowych i technicznych.`;
        
        let description: string;
        try {
          description = await this.openAIService.analyzeImage(imageBuffer, prompt, false);
        } catch (error: any) {
          if (error?.status === 429 || error?.message?.includes('Rate limit')) {
            console.warn(`🔄 Rate limit przy analizie obrazu, używam gpt-4o-mini...`);
            description = await this.openAIService.analyzeImage(imageBuffer, prompt, true);
          } else {
            throw error;
          }
        }

        images.push({
          url: src,
          description: description,
          caption: caption
        });

        console.log(`✅ Przetworzono obraz ${i + 1}/${imageElements.length}: ${src}`);
      } catch (error) {
        console.error(`❌ Błąd przetwarzania obrazu ${src}:`, error);
      }
    }

    return images;
  }

  async processAudios(html: string): Promise<Array<{url: string, transcription: string}>> {
    console.log('🔊 Przetwarzanie plików audio...');
    const root = parse(html);
    const audios: Array<{url: string, transcription: string}> = [];

    // Znajdź wszystkie linki do plików MP3
    const audioLinks = root.querySelectorAll('a[href$=".mp3"], audio source[src$=".mp3"], audio[src$=".mp3"]');
    console.log(`Znaleziono ${audioLinks.length} plików audio`);

    for (let i = 0; i < audioLinks.length; i++) {
      const element = audioLinks[i];
      const src = element.getAttribute('href') || element.getAttribute('src');
      
      if (!src) continue;

      try {
        // Pobierz plik audio
        const audioBuffer = await this.downloadFile(src);
        
        // Transkrypcja
        let transcription: string;
        try {
          transcription = await this.openAIService.transcribe(audioBuffer);
        } catch (openaiError) {
          console.log('Próba transkrypcji z Groq...');
          transcription = await this.openAIService.transcribeGroq(audioBuffer);
        }

        audios.push({
          url: src,
          transcription: transcription
        });

        console.log(`✅ Przetworzono audio ${i + 1}/${audioLinks.length}: ${src}`);
      } catch (error) {
        console.error(`❌ Błąd przetwarzania audio ${src}:`, error);
      }
    }

    return audios;
  }

  private cleanHtml(html: string): string {
    // Usuń tagi <style> i <script> wraz z zawartością (case insensitive)
    let cleaned = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    
    // Usuń komentarze HTML
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    
    // Usuń komentarze CSS które mogą być w tekście
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Usuń style inline z tagów HTML
    cleaned = cleaned.replace(/\sstyle\s*=\s*["'][^"']*["']/gi, '');
    
    // Usuń class i id attributes które mogą zawierać referencje do CSS
    cleaned = cleaned.replace(/\sclass\s*=\s*["'][^"']*["']/gi, '');
    cleaned = cleaned.replace(/\sid\s*=\s*["'][^"']*["']/gi, '');
    
    return cleaned;
  }

  private cleanMarkdown(markdown: string): string {
    // TYLKO usuń CSS - NIE zmieniaj treści tekstowej!
    let cleaned = markdown;
    
    // Usuń komentarze CSS 
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    cleaned = cleaned.replace(/\\\/\*[\s\S]*?\*\\\//g, '');
    
    // Usuń bloki CSS (bardzo ostrożnie)
    cleaned = cleaned.replace(/\{[^}]*(?:margin|padding|font-family|background|color|width|height|display|position|border)[^}]*\}/g, '');
    
    // Usuń TYLKO nadmiar pustych linii (nie zmieniaj spacji w tekście!)
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    return cleaned.trim();
  }

  async processArticle(): Promise<ProcessedArticle> {
    console.log('🚀 Rozpoczynam przetwarzanie artykułu...');

    // Pobierz HTML
    let html = await this.downloadHtml();
    
    // Wyczyść HTML z tagów style i script (NIE ZMIENIAJ TREŚCI!)
    html = this.cleanHtml(html);
    
    // Wyciągnij tytuł
    const root = parse(html);
    const titleElement = root.querySelector('title') || root.querySelector('h1');
    const title = titleElement?.text || 'Artykuł ArXiv';

    // Przetwórz obrazy i audio równolegle
    const [images, audios] = await Promise.all([
      this.processImages(html),
      this.processAudios(html)
    ]);

    // NAJPIERW konwertuj HTML na Markdown (BEZ zmian w treści)
    const markdown = this.turndownService.turndown(html);

    // POTEM zamień referencje do obrazów i audio w Markdown
    let processedMarkdown = markdown;

    // Zamień obrazy w Markdown
    images.forEach(imageData => {
      const imageName = imageData.url.split('/').pop() || imageData.url;
      
      // Znajdź różne formaty referencji do tego obrazu w markdown
      const patterns = [
        new RegExp(`!\\[([^\\]]*)\\]\\([^)]*${imageName}[^)]*\\)`, 'gi'),
        new RegExp(`<img[^>]*src="[^"]*${imageName}"[^>]*>`, 'gi'),
        new RegExp(`\\[([^\\]]*)\\]\\([^)]*${imageName}[^)]*\\)`, 'gi')
      ];

      patterns.forEach(pattern => {
        let replacement = `\n\n---\n**🖼️ OBRAZ:** ${imageName}\n`;
        if (imageData.caption) {
          replacement += `**Podpis:** ${imageData.caption}\n\n`;
        }
        replacement += `**Opis:** ${imageData.description}\n---\n\n`;
        
        processedMarkdown = processedMarkdown.replace(pattern, replacement);
      });
    });

    // Zamień audio w Markdown  
    audios.forEach(audioData => {
      const audioName = audioData.url.split('/').pop() || audioData.url;
      
      // Znajdź różne formaty referencji do tego audio w markdown
      const patterns = [
        new RegExp(`\\[([^\\]]*)\\]\\([^)]*${audioName}[^)]*\\)`, 'gi'),
        new RegExp(`<a[^>]*href="[^"]*${audioName}"[^>]*>([^<]*)</a>`, 'gi'),
        new RegExp(`<audio[^>]*src="[^"]*${audioName}"[^>]*>`, 'gi')
      ];

      patterns.forEach(pattern => {
        const replacement = `\n\n---\n**🔊 AUDIO:** ${audioName}\n\n**Transkrypcja:** ${audioData.transcription}\n---\n\n`;
        processedMarkdown = processedMarkdown.replace(pattern, replacement);
      });
    });

    // Czyść markdown TYLKO z CSS (NIE ZMIENIAJ TREŚCI TEKSTOWEJ!)
    const cleanMarkdown = this.cleanMarkdown(processedMarkdown);

    console.log('✅ Artykuł przetworzony pomyślnie');

    return {
      title,
      content: cleanMarkdown,
      images,
      audios
    };
  }

  async answerQuestions(article: ProcessedArticle, questions: string[]): Promise<ArxivAnswer> {
    console.log('💬 Odpowiadam na pytania...');
    console.log(`📄 Kontekst ma ${article.content.length} znaków`);
    
    const context = `Tytuł: ${article.title}\n\n${article.content}`;
    const answers: ArxivAnswer = {
      "01": "",
      "02": "",
      "03": "",
      "04": "",
      "05": ""
    };

    console.log(`❓ Mam ${questions.length} pytań do przetworzenia:`);
    questions.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.substring(0, 100)}${q.length > 100 ? '...' : ''}`);
    });

    for (let i = 0; i < Math.min(questions.length, 5); i++) {
      const questionNumber = String(i + 1).padStart(2, '0') as keyof ArxivAnswer;
      const question = questions[i];
      
      console.log(`\n🤔 Przetwarzam pytanie ${questionNumber}: ${question.substring(0, 100)}...`);
      
      try {
        // Przygotuj ulepszoną wersję pytania z instrukcjami
        // const enhancedQuestion = this.enhanceQuestion(question, context);
        
        let answer = await this.openAIService.answerQuestion(question, context, 'fallback');
        
        // Walidacja odpowiedzi
        if (!answer || answer.trim() === '') {
          console.warn(`⚠️ Pusta odpowiedź od LLM dla pytania ${questionNumber}`);
          answers[questionNumber] = "Brak odpowiedzi";
        } else {
          // Przetwórz odpowiedź - krótkość i zwięzłość
          answer = this.processAnswer(answer.trim(), question, context);
          
          answers[questionNumber] = answer;
          console.log(`✅ Odpowiedź ${questionNumber}: ${answer.substring(0, 150)}${answer.length > 150 ? '...' : ''}`);
        }
      } catch (error) {
        console.error(`❌ Błąd odpowiadania na pytanie ${questionNumber}:`, error);
        answers[questionNumber] = "Błąd odpowiedzi";
      }
    }

    // Końcowa walidacja przed zwróceniem
    console.log('\n📋 Podsumowanie odpowiedzi:');
    Object.entries(answers).forEach(([key, value]) => {
      const status = value && value.trim() ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${value ? value.substring(0, 100) : 'BRAK'}${value && value.length > 100 ? '...' : ''}`);
    });

    return answers;
  }



  async submitAnswers(answers: ArxivAnswer): Promise<boolean> {
    console.log('📤 Wysyłanie odpowiedzi...');
    
    // Walidacja odpowiedzi
    console.log('🔍 Sprawdzam odpowiedzi przed wysłaniem:');
    let hasEmptyAnswers = false;
    
    Object.entries(answers).forEach(([key, value]) => {
      console.log(`  ${key}: ${value ? (value.length > 100 ? value.substring(0, 100) + '...' : value) : 'BRAK ODPOWIEDZI!'}`);
      
      if (!value || value.trim() === '') {
        console.warn(`⚠️ Pusta odpowiedź dla klucza ${key}!`);
        hasEmptyAnswers = true;
      }
    });

    // Wypełnij puste odpowiedzi domyślnym tekstem
    if (hasEmptyAnswers) {
      console.log('🔧 Wypełniam puste odpowiedzi...');
      Object.keys(answers).forEach((key) => {
        const answerKey = key as keyof ArxivAnswer;
        if (!answers[answerKey] || answers[answerKey].trim() === '') {
          answers[answerKey] = 'Nie znaleziono odpowiedzi w kontekście artykułu';
          console.log(`🔧 Wypełniono ${key}: ${answers[answerKey]}`);
        }
      });
    }

    // Wyślij odpowiedzi z formatem "01", "02", itd.
    return await this.trySubmitWithFormat(answers);
  }

  private async trySubmitWithFormat(answers: ArxivAnswer): Promise<boolean> {
    const payload = {
      task: "arxiv",
      apikey: "97ad060a-008e-40cc-8012-f8cbaaa3968e",
      answer: answers
    };

    console.log(`📦 Wysyłam odpowiedzi w formacie z zerami (01, 02, ...):`);
    console.log(JSON.stringify(payload, null, 2));

    try {
      const response = await fetch('https://c3ntrala.ag3nts.org/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log(`📡 Response status: ${response.status}`);
      const headerObj: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headerObj[key] = value;
      });
      console.log(`📡 Response headers:`, headerObj);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Response error body:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Odpowiedzi wysłane pomyślnie:`, result);
      return true;
    } catch (error) {
      console.error('❌ Błąd wysyłania odpowiedzi:', error);
      return false;
    }
  }

  async saveProcessedArticle(article: ProcessedArticle): Promise<void> {
    const filename = path.join(__dirname, 'processed_article.md');
    
    // Obrazy i audio są już wstawione w odpowiednich miejscach w article.content
    // podczas processArticle(), więc nie duplikujemy ich na końcu
    let content = `# ${article.title}\n\n`;
    content += article.content;
    
    // Dodaj tylko statystyki na końcu (opcjonalnie)
    if (article.images.length > 0 || article.audios.length > 0) {
      content += '\n\n---\n\n';
      content += `**Statystyki przetwarzania:**\n`;
      if (article.images.length > 0) {
        content += `- Przetworzono ${article.images.length} obrazów\n`;
      }
      if (article.audios.length > 0) {
        content += `- Przetworzono ${article.audios.length} plików audio\n`;
      }
    }

    fs.writeFileSync(filename, content, 'utf8');
    console.log(`📁 Zapisano przetworzony artykuł: ${filename}`);
    console.log(`📊 Artykuł zawiera ${article.images.length} obrazów i ${article.audios.length} plików audio wstawionych w kontekście`);
  }

  async generateAcronymGlossary(content: string): Promise<string> {
    console.log('📚 Generuję słowniczek skrótów...');
    
    const prompt = `Przeanalizuj poniższy tekst naukowy i stwórz słowniczek wszystkich skrótów i akronimów występujących w tekście.

INSTRUKCJE:
1. Znajdź wszystkie skróty/akronimy (np. LLM, AGI, BNW, RAG, DNA, itp.)
2. Dla każdego skrótu znajdź jego pełne rozwinięcie w tekście
3. Przedstaw wynik w formacie: "SKRÓT - pełne rozwinięcie"
4. Posortuj alfabetycznie
5. Uwzględnij tylko te skróty, które rzeczywiście występują w tekście
6. Nie dodawaj skrótów, które nie mają jasnego rozwinięcia w tekście

TEKST DO ANALIZY:
${content}

SŁOWNICZEK SKRÓTÓW (format: SKRÓT - rozwinięcie):`;

    try {
      const glossary = await this.openAIService.answerQuestion(prompt, content, 'standard');
      console.log('✅ Słowniczek skrótów wygenerowany');
      return glossary;
    } catch (error) {
      console.error('❌ Błąd generowania słowniczka:', error);
      return 'Nie udało się wygenerować słowniczka skrótów.';
    }
  }

  async addGlossaryToAbstract(content: string, glossary: string): Promise<string> {
    console.log('📝 Dodaję słowniczek do abstraktu...');
    
    // Znajdź sekcję "Abstrakt" i dodaj słowniczek po niej
    const abstractPattern = /^(Abstrakt\s*\n-{2,}\n)([\s\S]*?)(?=\n\n[A-Z])/m;
    const match = content.match(abstractPattern);
    
    if (match) {
      const beforeAbstract = content.substring(0, match.index!);
      const abstractHeader = match[1];
      const abstractContent = match[2];
      const afterAbstract = content.substring(match.index! + match[0].length);
      
      const modifiedContent = beforeAbstract + abstractHeader + abstractContent + 
        '\n\n**Słowniczek skrótów:**\n\n' + glossary + '\n' + afterAbstract;
      
      console.log('✅ Słowniczek dodany do abstraktu');
      return modifiedContent;
    } else {
      console.warn('⚠️ Nie znaleziono sekcji Abstrakt, dodaję słowniczek na końcu');
      return content + '\n\n---\n\n**Słowniczek skrótów:**\n\n' + glossary + '\n';
    }
  }

  async saveProcessedArticleWithGlossary(article: ProcessedArticle): Promise<void> {
    console.log('💾 Zapisuję artykuł ze słowniczkiem skrótów...');
    
    const filename = path.join(__dirname, 'processed_article.md');
    
    // Przygotuj podstawową zawartość
    let content = `# ${article.title}\n\n`;
    content += article.content;
    
    // Dodaj statystyki na końcu (opcjonalnie)
    if (article.images.length > 0 || article.audios.length > 0) {
      content += '\n\n---\n\n';
      content += `**Statystyki przetwarzania:**\n`;
      if (article.images.length > 0) {
        content += `- Przetworzono ${article.images.length} obrazów\n`;
      }
      if (article.audios.length > 0) {
        content += `- Przetworzono ${article.audios.length} plików audio\n`;
      }
    }

    // Wygeneruj słowniczek skrótów
    const glossary = await this.generateAcronymGlossary(content);
    
    console.log(glossary)
    // Dodaj słowniczek do abstraktu
    const contentWithGlossary = await this.addGlossaryToAbstract(content, glossary);

    // Zapisz zmodyfikowany plik
    fs.writeFileSync(filename, contentWithGlossary, 'utf8');
    console.log(`📁 Zapisano przetworzony artykuł ze słowniczkiem: ${filename}`);
    console.log(`📊 Artykuł zawiera ${article.images.length} obrazów, ${article.audios.length} plików audio i słowniczek skrótów`);
  }

  private enhanceQuestion(question: string, context: string): string {
    // Analizuj czy pytanie zawiera skróty/akronimy
    const acronyms = this.findAcronyms(question);
    
    let enhanced = question;
    
    if (acronyms.length > 0) {
      // Znajdź rozwinięcia skrótów w kontekście
      const expansions = this.findAcronymExpansions(acronyms, context);
      if (expansions.length > 0) {
        enhanced += `\n\nUWAGA: Przy odpowiedzi weź pod uwagę znalezione rozwinięcia skrótów: ${expansions.join(', ')}`;
      }
    }
    
    // Dodaj instrukcje dla krótkiej odpowiedzi
    enhanced += `\n\nInstrukcje: Odpowiedz BARDZO KRÓTKO i PRECYZYJNIE. Maksymalnie 1-2 zdania. Podaj tylko najistotniejszą informację bez dodatkowych wyjaśnień.`;
    
    return enhanced;
  }

  private processAnswer(answer: string, originalQuestion: string, context: string): string {
    // Najpierw podstawowe czyszczenie
    let processed = this.cleanAnswer(answer);
    
    // Usuń zbędne wyjaśnienia i rozwinięcia
    processed = this.makeAnswerConcise(processed);
    
    // Sprawdź czy odpowiedź nie jest za długa
    if (processed.length > 200) {
      processed = this.shortenAnswer(processed);
    }
    
    return processed;
  }

  private findAcronyms(text: string): string[] {
    // Znajdź potencjalne skróty (2-5 wielkich liter)
    const acronymPattern = /\b[A-Z]{2,5}\b/g;
    const matches = text.match(acronymPattern) || [];
    return [...new Set(matches)]; // usuń duplikaty
  }

  private findAcronymExpansions(acronyms: string[], context: string): string[] {
    const expansions: string[] = [];
    
    acronyms.forEach(acronym => {
      // Szukaj wzorców jak "Artificial General Intelligence (AGI)" lub "AGI (Artificial General Intelligence)"
      const patterns = [
        new RegExp(`([A-Z][a-z]+ [A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)\\s*\\(${acronym}\\)`, 'gi'),
        new RegExp(`${acronym}\\s*\\(([A-Z][a-z]+ [A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)\\)`, 'gi'),
        new RegExp(`([A-Z][a-z]+ [A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)(?:\\s+(?:oznacza|to|czyli))\\s+${acronym}`, 'gi'),
        new RegExp(`${acronym}(?:\\s+(?:oznacza|to|czyli))\\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\\s+[A-Z][a-z]+)*)`, 'gi')
      ];
      
      patterns.forEach(pattern => {
        const matches = context.match(pattern);
        if (matches) {
          matches.forEach(match => {
            const expansion = match.replace(new RegExp(`\\b${acronym}\\b|[():]`, 'gi'), '').trim();
            if (expansion && expansion.length > acronym.length) {
              expansions.push(`${acronym} = ${expansion}`);
            }
          });
        }
      });
    });
    
    return [...new Set(expansions)]; // usuń duplikaty
  }

  private cleanAnswer(answer: string): string {
    // Usuń typowe frazesy wprowadzające
    let cleaned = answer.replace(/^(Odpowiedź:|Odpowiedź to:|Na podstawie artykułu:|Zgodnie z artykułem:|W artykule|Według artykułu|Artykuł mówi|Z artykułu wynika)/i, '');
    cleaned = cleaned.replace(/^(jest|to|że|co|jeśli|można|należy|powinien)\s/i, '');
    
    // Usuń niepotrzebne znaki interpunkcyjne na początku
    cleaned = cleaned.replace(/^[:\s\-.,]+/, '');
    
    // Usuń powtarzające się znaki interpunkcyjne
    cleaned = cleaned.replace(/\.{2,}/g, '.');
    cleaned = cleaned.replace(/,{2,}/g, ',');
    
    // Usuń dodatkowe białe znaki
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  private makeAnswerConcise(answer: string): string {
    // Usuń długie wyjaśnienia w nawiasach
    let concise = answer.replace(/\([^)]{30,}\)/g, '');
    
    // Usuń dodatkowe informacje po przecinkach jeśli odpowiedź jest za długa
    if (concise.length > 100) {
      const sentences = concise.split(/[.!?]/);
      if (sentences.length > 1) {
        concise = sentences[0] + (sentences[0].match(/[.!?]$/) ? '' : '.');
      }
    }
    
    // Usuń frazesy typu "co oznacza że", "co sugeruje"
    concise = concise.replace(/,?\s*(co oznacza że|co sugeruje|co wskazuje|co może oznaczać|co prowadzi do)[\s\S]*$/i, '.');
    
    return concise.trim();
  }

  private shortenAnswer(answer: string): string {
    // Podziel na zdania
    const sentences = answer.split(/[.!?]/);
    
    if (sentences.length > 1) {
      // Weź pierwsze zdanie
      let shortened = sentences[0] + '.';
      
      // Jeśli nadal za długie, obetnij do pierwszej istotnej informacji
      if (shortened.length > 150) {
        const parts = shortened.split(/,|;/);
        if (parts.length > 1) {
          shortened = parts[0] + '.';
        }
      }
      
      return shortened;
    }
    
    // Jeśli to jedno zdanie, obetnij do pierwszego przecinka lub średnika
    const parts = answer.split(/,|;/);
    if (parts.length > 1 && parts[0].length > 20) {
      return parts[0] + '.';
    }
    
    return answer;
  }


} 