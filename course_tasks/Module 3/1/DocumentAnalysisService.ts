import fs from 'fs';
import path from 'path';
import { OpenAIService } from './OpenAIService';

// Zapewnienie dostępności fetch API
if (typeof fetch === 'undefined') {
  const nodeFetch = require('node-fetch');
  global.fetch = nodeFetch;
}

export interface ReportData {
  filename: string;
  content: string;
}

export interface AnalysisResult {
  success: boolean;
  results?: Record<string, string>;
  error?: string;
}

export class DocumentAnalysisService {
  private openAIService: OpenAIService;
  private resourcesPath: string;
  private factsPath: string;

  constructor() {
    this.openAIService = new OpenAIService();
    this.resourcesPath = path.join(__dirname, 'resources');
    this.factsPath = path.join(__dirname, 'resources', 'facts');
  }

  /**
   * Generuje słowa kluczowe dla pojedynczego pliku faktów
   */
  private async generateFactKeywords(factFilename: string, factContent: string): Promise<string> {
    console.log(`🔍 Analizuję fakty: ${factFilename}`);
    
    const messages: any[] = [
      {
        role: "system", 
        content: `Jesteś ekspertem w analizie dokumentów i generowaniu słów kluczowych.

ZADANIE:
Przeanalizuj plik z faktami i wygeneruj listę słów kluczowych w języku polskim.

ZASADY GENEROWANIA SŁÓW KLUCZOWYCH:
1. Słowa kluczowe MUSZĄ być w języku polskim
2. Słowa MUSZĄ być w mianowniku (np. "nauczyciel", "programista", a nie "nauczyciela", "programistów")
3. Słowa oddzielone przecinkami bez spacji (np. słowo1,słowo2,słowo3)

4. KLUCZOWA ZASADA - GRUPOWANIE INFORMACJI O OSOBACH:
   - Jeśli informacja jest powiązana znaczeniowo z konkretną osobą, połącz ją w jedną całość
   - Przykład: "Aleksander Ragowski pracował jako nauczyciel języka angielskiego"
   → SŁOWO KLUCZOWE: "Aleksander Ragowski nauczyciel język angielski"
   - Grupuj w jednym słowie kluczowym: imię + nazwisko + zawód + umiejętności + cechy + działania tej osoby
   - Każda osoba = jedno skupiające słowo kluczowe z wszystkimi jej informacjami
   
5. Uwzględnij wszystkie kluczowe informacje z tekstu:
   - Osoby (jako grupy informacji: "imię nazwisko zawód umiejętności cechy")
   - Miejsca (sektory, miasta, lokalizacje) - jako oddzielne słowa kluczowe
   - Technologie (systemy, urządzenia, oprogramowanie) - jako oddzielne słowa kluczowe
   - Działania (procesy, wydarzenia) - jako oddzielne słowa kluczowe
   - Przedmioty (materiały, narzędzia) - jako oddzielne słowa kluczowe
6. Bądź precyzyjny i kompletny - słowa kluczowe mają reprezentować całą wiedzę z tego pliku
7. Używaj ogólniejszych terminów gdy to zasadne (np. "zwierzęta" dla "dzikiej fauny")`
      },
      {
        role: "user",
        content: `NAZWA PLIKU: ${factFilename}

TREŚĆ FAKTÓW:
${factContent}

ZADANIE: Wygeneruj słowa kluczowe reprezentujące wszystkie kluczowe informacje z tego pliku.

PAMIĘTAJ O GRUPOWANIU:
- Dla każdej osoby: stwórz JEDNO słowo kluczowe zawierające wszystkie jej informacje
- Przykład: jeśli tekst mówi "Barbara Zawadzka jest programistką frontend, zna JavaScript i Python"
  → SŁOWO KLUCZOWE: "Barbara Zawadzka programistka frontend JavaScript Python"
- Inne informacje (miejsca, technologie niezwiązane z osobami) jako oddzielne słowa kluczowe

Zwróć TYLKO listę słów kluczowych oddzielonych przecinkami (bez spacji po przecinkach).

ODPOWIEDŹ (tylko słowa kluczowe):`
      }
    ];

    try {
      const response = await this.openAIService.completion({
        messages,
        model: "gpt-4o",
        maxTokens: 800,
        temperature: 0
      }) as any;

      const keywords = response.choices[0]?.message?.content?.trim() || "";
      console.log(`✅ Wygenerowano słowa kluczowe dla ${factFilename}: ${keywords.substring(0, 100)}...`);
      return keywords;

    } catch (error: any) {
      console.error(`❌ Błąd analizy faktów ${factFilename}:`, error?.message || error);
      throw error;
    }
  }

  /**
   * Przetwarza wszystkie pliki faktów i generuje dla nich słowa kluczowe
   */
  private async preprocessFacts(): Promise<void> {
    console.log('\n🔧 Preprocessing faktów - generowanie słów kluczowych...');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    try {
      const factFiles = fs.readdirSync(this.factsPath)
        .filter(file => file.endsWith('.txt') && !file.endsWith('_keywords.txt'))
        .sort();

      console.log(`📁 Znaleziono ${factFiles.length} plików faktów do przetworzenia`);

      for (let i = 0; i < factFiles.length; i++) {
        const factFile = factFiles[i];
        const keywordsFile = factFile.replace('.txt', '_keywords.txt');
        const keywordsPath = path.join(this.factsPath, keywordsFile);

        // Sprawdź czy plik z słowami kluczowymi już istnieje
        if (fs.existsSync(keywordsPath)) {
          console.log(`⏭️ [${i+1}/${factFiles.length}] Pomijam ${factFile} - słowa kluczowe już istnieją`);
          continue;
        }

        console.log(`🔍 [${i+1}/${factFiles.length}] Przetwarzam: ${factFile}`);
        
        // Wczytaj treść pliku faktów
        const factPath = path.join(this.factsPath, factFile);
        const factContent = fs.readFileSync(factPath, 'utf-8');

        // Wygeneruj słowa kluczowe
        const keywords = await this.generateFactKeywords(factFile, factContent);

        // Zapisz słowa kluczowe do pliku
        fs.writeFileSync(keywordsPath, keywords, 'utf-8');
        console.log(`💾 [${i+1}/${factFiles.length}] Zapisano: ${keywordsFile}`);

        // Krótka przerwa między requestami
        if (i < factFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('✅ Preprocessing faktów zakończony!');
    } catch (error) {
      console.error('❌ Błąd preprocessing faktów:', error);
      throw error;
    }
  }

  /**
   * Wczytuje pliki ze słowami kluczowymi faktów i łączy je w jeden string
   */
  private async loadFactsKeywords(): Promise<string> {
    console.log('📁 Wczytuję słowa kluczowe faktów...');
    
    try {
      const keywordFiles = fs.readdirSync(this.factsPath)
        .filter(file => file.endsWith('_keywords.txt'))
        .sort();

      let allFactsKeywords = '';
      for (const keywordFile of keywordFiles) {
        const keywordPath = path.join(this.factsPath, keywordFile);
        const keywordContent = fs.readFileSync(keywordPath, 'utf-8');
        const originalFactFile = keywordFile.replace('_keywords.txt', '.txt');
        allFactsKeywords += `\n=== ${originalFactFile} (słowa kluczowe) ===\n${keywordContent}\n`;
      }

      console.log(`✅ Wczytano słowa kluczowe z ${keywordFiles.length} plików faktów`);
      return allFactsKeywords;
    } catch (error) {
      console.error('❌ Błąd wczytywania słów kluczowych faktów:', error);
      throw error;
    }
  }

  /**
   * Wczytuje wszystkie pliki raportów
   */
  private async loadAllReports(): Promise<ReportData[]> {
    console.log('📋 Wczytuję pliki raportów...');
    
    try {
      const reportFiles = fs.readdirSync(this.resourcesPath)
        .filter(file => file.startsWith('2024-11-12_report-') && file.endsWith('.txt'))
        .sort(); // sortowanie dla spójności

      const reports: ReportData[] = [];
      for (const reportFile of reportFiles) {
        const reportPath = path.join(this.resourcesPath, reportFile);
        const reportContent = fs.readFileSync(reportPath, 'utf-8');
        reports.push({
          filename: reportFile,
          content: reportContent.trim()
        });
      }

      console.log(`✅ Wczytano ${reports.length} raportów`);
      return reports;
    } catch (error) {
      console.error('❌ Błąd wczytywania raportów:', error);
      throw error;
    }
  }

  /**
   * Analizuje wszystkie dokumenty i generuje słowa kluczowe
   */
  async analyzeAllDocuments(): Promise<AnalysisResult> {
    console.log('\n🚀 Rozpoczynam analizę wszystkich dokumentów...');
    console.log('═══════════════════════════════════════════════════════════════════════════════');

    try {
      // Najpierw preprocessing faktów - wygeneruj słowa kluczowe dla faktów
      await this.preprocessFacts();

      // Wczytaj słowa kluczowe faktów (zamiast pełnych treści)
      const allFactsKeywords = await this.loadFactsKeywords();

      // Wczytaj wszystkie raporty
      const reports = await this.loadAllReports();

      if (reports.length !== 10) {
        throw new Error(`Oczekiwano 10 raportów, znaleziono ${reports.length}`);
      }

      console.log(`\n📊 Będę analizować ${reports.length} raportów...`);

      const results: Record<string, string> = {};

      // Analizuj każdy raport osobno (jak wymagane w specyfikacji)
      for (let i = 0; i < reports.length; i++) {
        const report = reports[i];
        console.log(`\n📋 [${i+1}/10] Analizuję: ${report.filename}`);
        
        try {
          const keywords = await this.openAIService.analyzeDocumentsForKeywords(
            report.content,
            report.filename,
            allFactsKeywords
          );

          results[report.filename] = keywords;
          console.log(`✅ [${i+1}/10] Ukończono: ${report.filename}`);
          
        } catch (error) {
          console.error(`❌ [${i+1}/10] Błąd dla ${report.filename}:`, error);
          throw error;
        }

        // Krótka przerwa między requestami
        if (i < reports.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('\n🎉 Analiza zakończona pomyślnie!');
      console.log('═══════════════════════════════════════════════════════════════════════════════');

      // Wygeneruj finalną odpowiedź i wyślij na endpoint
      const finalAnswer = this.generateFinalAnswer({ success: true, results });
      await this.submitResults(finalAnswer);

      return {
        success: true,
        results
      };

    } catch (error: any) {
      console.error('❌ Błąd podczas analizy dokumentów:', error);
      return {
        success: false,
        error: error?.message || 'Unknown error'
      };
    }
  }

    /**
   * Wysyła wyniki na endpoint centrali
   */
  async submitResults(finalAnswer: any): Promise<any> {
    console.log('\n📤 Wysyłam wyniki na endpoint centrali...');
    console.log('📋 Dane do wysłania:');
    console.log(JSON.stringify(finalAnswer, null, 2));
    
    try {
      const jsonBody = JSON.stringify(finalAnswer);
      console.log(`📏 Rozmiar danych: ${jsonBody.length} znaków`);
      
      const response = await fetch('https://c3ntrala.ag3nts.org/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonBody
      });

      console.log(`📡 Status odpowiedzi: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // Spróbuj odczytać szczegóły błędu z odpowiedzi
        let errorDetails = '';
        try {
          const errorText = await response.text();
          console.log('💬 Odpowiedź serwera przy błędzie:', errorText);
          errorDetails = ` - ${errorText}`;
        } catch (e) {
          console.log('❓ Nie udało się odczytać szczegółów błędu');
        }
        
        throw new Error(`HTTP error! status: ${response.status}${errorDetails}`);
      }

      const result = await response.json();
      console.log('✅ Wyniki wysłane pomyślnie!');
      console.log('📨 Odpowiedź serwera:', result);
      return result;

    } catch (error: any) {
      console.error('❌ Błąd wysyłania wyników:', error?.message || error);
      throw error;
    }
  }

  /**
   * Generuje finalną odpowiedź w wymaganym formacie JSON
   */
  generateFinalAnswer(analysisResult: AnalysisResult): any {
    if (!analysisResult.success || !analysisResult.results) {
      throw new Error('Analysis failed or no results available');
    }

    return {
      task: "dokumenty",
      apikey: "97ad060a-008e-40cc-8012-f8cbaaa3968e",
      answer: analysisResult.results
    };
  }
} 