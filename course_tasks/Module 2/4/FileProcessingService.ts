import fs from 'fs/promises';
import path from 'path';
import { OpenAIService } from './OpenAIService';

export interface ProcessedFile {
  filename: string;
  content: string;
  type: 'png' | 'mp3' | 'txt';
}

export interface CategoryResult {
  people: string[];
  hardware: string[];
}

export class FileProcessingService {
  private openAIService: OpenAIService;
  private resourcesPath: string;

  constructor() {
    this.openAIService = new OpenAIService();
    this.resourcesPath = path.join(__dirname, 'resources');
  }

  async processAllFiles(): Promise<ProcessedFile[]> {
    const files = await fs.readdir(this.resourcesPath);
    const processedFiles: ProcessedFile[] = [];

    console.log(`Found ${files.length} files to process`);

    for (const filename of files) {
      const filePath = path.join(this.resourcesPath, filename);
      const ext = path.extname(filename).toLowerCase();
      
      console.log(`Processing ${filename}...`);
      
      let content = '';
      let type: 'png' | 'mp3' | 'txt';

      try {
        switch (ext) {
          case '.png':
            content = await this.processPNGFile(filePath);
            type = 'png';
            break;
          case '.mp3':
            content = await this.processMP3File(filePath);
            type = 'mp3';
            break;
          case '.txt':
            content = await this.processTXTFile(filePath);
            type = 'txt';
            break;
          default:
            console.log(`Skipping unsupported file type: ${filename}`);
            continue;
        }

        processedFiles.push({
          filename,
          content,
          type
        });

        console.log(`✅ Processed ${filename} successfully`);
      } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error);
      }
    }

    return processedFiles;
  }

  private async processPNGFile(filePath: string): Promise<string> {
    const imageBuffer = await fs.readFile(filePath);
    const prompt = "Przeczytaj i wyekstrahuj cały tekst zawarty w tym obrazie. Zwróć tylko tekst, bez żadnych dodatkowych komentarzy.";
    return await this.openAIService.analyzeImage(imageBuffer, prompt);
  }

  private async processMP3File(filePath: string): Promise<string> {
    const audioBuffer = await fs.readFile(filePath);
    // Preferujemy Groq dla lepszej jakości transkrypcji
    try {
      return await this.openAIService.transcribeGroq(audioBuffer);
    } catch (error) {
      console.warn("Groq transcription failed, falling back to OpenAI:", error);
      return await this.openAIService.transcribe(audioBuffer);
    }
  }

  private async processTXTFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  async categorizeFiles(processedFiles: ProcessedFile[]): Promise<CategoryResult> {
    const prompt = `Przeanalizuj poniższe pliki i przypisz każdy z nich do odpowiedniej kategorii.

KATEGORIE:
1. "people" - Uwzględniaj tylko notatki zawierające informacje o schwytanych ludziach lub o śladach ich obecności (np. wykryte osoby, znalezione przedmioty osobiste, odciski palców, itp.)
2. "hardware" - Usterki hardwarowe (nie software) - awarie sprzętu, uszkodzenia mechaniczne, problemy z czujnikami, itp.

WAŻNE:
- Jeśli plik nie pasuje do żadnej z powyższych kategorii, pomiń go
- Nie twórz żadnych dodatkowych kategorii
- Zwróć odpowiedź w formacie JSON

PLIKI DO ANALIZY:
${processedFiles.map(file => `
PLIK: ${file.filename}
TREŚĆ: ${file.content}
---`).join('\n')}

Odpowiedz w formacie JSON:
{
  "people": ["filename1", "filename2"],
  "hardware": ["filename3", "filename4"]
}`;

    const response = await this.openAIService.completion({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "gpt-4o",
      jsonMode: true
    });

    const result = this.openAIService.parseJsonResponse<CategoryResult>(response as any);
    
    if ('error' in result) {
      throw new Error(`Categorization failed: ${result.error}`);
    }

    return result;
  }

  sortFilesAlphabetically(files: string[]): string[] {
    return files.sort((a, b) => a.localeCompare(b));
  }

  async saveAnswer(categoryResult: CategoryResult): Promise<void> {
    const answer = {
      task: "kategorie",
      apikey: "97ad060a-008e-40cc-8012-f8cbaaa3968e",
      answer: {
        people: this.sortFilesAlphabetically(categoryResult.people),
        hardware: this.sortFilesAlphabetically(categoryResult.hardware)
      }
    };

    const answerPath = path.join(__dirname, 'answer.json');
    await fs.writeFile(answerPath, JSON.stringify(answer, null, 2), 'utf-8');
    console.log(`✅ Answer saved to ${answerPath}`);
  }
} 