# Context - System Zarządzania Długimi Kontekstami

## Opis

**Context** to inteligentny system zarządzania długimi dokumentami i kontekstami w aplikacjach AI. System wykorzystuje innowacyjny mechanizm placeholderów UUID, który pozwala na efektywne referencje do długich treści bez przekraczania limitów tokenów modeli językowych.

## 🎯 Problem i Rozwiązanie

### Problem
- **Limity tokenów**: Modele AI mają ograniczenia w długości kontekstu
- **Kosztowność**: Długie konteksty generują wysokie koszty API  
- **Nieefektywność**: Przesyłanie pełnych dokumentów przy każdym zapytaniu
- **Zarządzanie**: Trudność w organizacji i dostępie do wielu dokumentów

### Rozwiązanie
System **Context** wprowadza mechanizm placeholderów `[[UUID]]`, który:
- Pozwala AI na referencje do dokumentów bez ich pełnego ładowania
- Dynamicznie zastępuje placeholdery treścią po wygenerowaniu odpowiedzi
- Optymalizuje użycie tokenów i koszty API
- Umożliwia zarządzanie biblioteką dokumentów

## 🚀 Główne Funkcjonalności

### 📄 Zarządzanie Dokumentami
- **Ładowanie plików**: Automatyczne wczytywanie dokumentów Markdown
- **System UUID**: Unikalne identyfikatory dla każdego dokumentu
- **Biblioteka treści**: Centralne zarządzanie dostępnymi dokumentami

### 🔗 System Placeholderów
- **Składnia `[[UUID]]`**: Specjalne znaczniki dla referencji
- **Automatyczne zastępowanie**: Dynamiczna podmiana treści
- **Bezpieczne parsowanie**: Walidacja i obsługa błędów

### 🤖 Integracja AI
- **Świadomość dokumentów**: AI wie o dostępnych zasobach
- **Inteligentne referencje**: Model może wybierać odpowiednie dokumenty
- **Naturalne osadzanie**: Płynne włączanie treści w odpowiedzi

## 🛠️ Architektura Systemu

```
📦 Context System
├── 📄 long_context.md    # Przykładowy długi dokument
├── 🎯 app.ts            # Główna logika systemu
├── 🤖 OpenAIService.ts  # Integracja z OpenAI
└── 📚 documents/        # Biblioteka dokumentów (rozszerzalne)
```

## 📋 Wymagania

### Zmienne Środowiskowe
```env
# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key
```

### Zależności
```json
{
  "dependencies": {
    "openai": "^4.x.x",
    "@types/node": "^20.x.x"
  }
}
```

## 🚦 Szybki Start

### Podstawowe Użycie

```typescript
import { join } from "path";
import fs from 'fs/promises';
import { OpenAIService } from "./OpenAIService";

const openAIService = new OpenAIService();

// Ładowanie dokumentu
const documentPath = join(__dirname, 'my_document.md');
const content = await fs.readFile(documentPath, 'utf8');
const documentUuid = 'unique-document-id';

// Rejestr dokumentów
const documents = {
  [documentUuid]: content,
};

// Zapytanie do AI z informacją o dostępnych dokumentach
const completion = await openAIService.completion({
  messages: [
    {
      role: 'system', 
      content: `Możesz używać następujących dokumentów w swoich odpowiedziach 
      używając placeholdera: [[uuid]]

      <available_documents>
      Mój Dokument: ${documentUuid}
      </available_documents>`
    },
    {
      role: 'user', 
      content: 'Pokaż mi zawartość dokumentu'
    }
  ]
});

// Zastąpienie placeholderów prawdziwą treścią
const finalAnswer = completion.choices[0].message.content
  ?.replace(/\[\[([^\]]+)\]\]/g, (match, uuid) => documents[uuid] || match) || '';

console.log(finalAnswer);
```

## 📊 Szczegółowe Funkcjonalności

### 🏗️ Rozbudowany System Dokumentów

```typescript
interface DocumentManager {
  documents: Map<string, DocumentInfo>;
  
  // Ładowanie pojedynczego dokumentu
  loadDocument(path: string): Promise<string>;
  
  // Ładowanie całego katalogu
  loadDirectory(dirPath: string): Promise<void>;
  
  // Dynamiczne dodawanie dokumentów
  addDocument(uuid: string, content: string, metadata?: DocumentMetadata): void;
}

interface DocumentInfo {
  uuid: string;
  content: string;
  title: string;
  path?: string;
  metadata?: DocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

interface DocumentMetadata {
  author?: string;
  tags?: string[];
  category?: string;
  language?: string;
  summary?: string;
}
```

### 🔍 Zaawansowane Wyszukiwanie Dokumentów

```typescript
class ContextService {
  private documents = new Map<string, DocumentInfo>();
  
  // Wyszukiwanie dokumentów po tytule/tagach
  findDocuments(query: string): DocumentInfo[] {
    return Array.from(this.documents.values())
      .filter(doc => 
        doc.title.toLowerCase().includes(query.toLowerCase()) ||
        doc.metadata?.tags?.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );
  }
  
  // Inteligentna sugestia dokumentów
  async suggestDocuments(userQuery: string): Promise<string[]> {
    const relevantDocs = this.findDocuments(userQuery);
    return relevantDocs.map(doc => doc.uuid);
  }
  
  // Budowanie kontekstu systemowego
  buildSystemContext(availableDocuments: string[]): string {
    const docList = availableDocuments
      .map(uuid => {
        const doc = this.documents.get(uuid);
        return doc ? `${doc.title}: ${uuid}` : null;
      })
      .filter(Boolean)
      .join('\n');
      
    return `Dostępne dokumenty:\n${docList}`;
  }
}
```

### 🎨 Zaawansowane Formatowanie Odpowiedzi

```typescript
class ResponseFormatter {
  // Rozbudowane zastępowanie z formatowaniem
  static formatResponse(
    response: string, 
    documents: Map<string, DocumentInfo>,
    options: FormattingOptions = {}
  ): string {
    return response.replace(/\[\[([^\]]+)\]\]/g, (match, uuid) => {
      const doc = documents.get(uuid);
      if (!doc) return match;
      
      switch (options.format) {
        case 'code':
          return `\`\`\`\n${doc.content}\n\`\`\``;
        case 'quote':
          return `> ${doc.content.replace(/\n/g, '\n> ')}`;
        case 'summary':
          return doc.metadata?.summary || doc.content.substring(0, 200) + '...';
        default:
          return doc.content;
      }
    });
  }
  
  // Ekstraktowanie użytych dokumentów
  static extractUsedDocuments(response: string): string[] {
    const matches = response.match(/\[\[([^\]]+)\]\]/g) || [];
    return matches.map(match => match.slice(2, -2));
  }
}

interface FormattingOptions {
  format?: 'plain' | 'code' | 'quote' | 'summary';
  maxLength?: number;
  includeMetadata?: boolean;
}
```

## 🧪 Przykłady Użycia

### Biblioteka Dokumentacji

```typescript
class DocumentationLibrary {
  private contextService = new ContextService();
  private openAIService = new OpenAIService();
  
  async initialize(docsPath: string) {
    // Ładowanie całej biblioteki dokumentacji
    const files = await this.loadMarkdownFiles(docsPath);
    
    for (const file of files) {
      const uuid = this.generateUUID();
      const content = await fs.readFile(file.path, 'utf8');
      
      this.contextService.addDocument(uuid, content, {
        title: file.name,
        category: file.category,
        tags: this.extractTags(content)
      });
    }
  }
  
  async askQuestion(question: string): Promise<string> {
    // Inteligentne wyszukiwanie odpowiednich dokumentów
    const relevantDocs = await this.contextService.suggestDocuments(question);
    const systemContext = this.contextService.buildSystemContext(relevantDocs);
    
    const completion = await this.openAIService.completion({
      messages: [
        {
          role: 'system',
          content: `Jesteś asystentem dokumentacji. ${systemContext}
          
          Zasady używania dokumentów:
          - Używaj placeholdera [[uuid]] aby odwołać się do dokumentów
          - Zawsze podawaj źródło informacji
          - Jeśli nie znajdziesz odpowiedzi w dokumentach, powiedz o tym`
        },
        {
          role: 'user',
          content: question
        }
      ]
    });
    
    // Sformatowanie odpowiedzi z dokumentami
    return ResponseFormatter.formatResponse(
      completion.choices[0].message.content || '',
      this.contextService.documents,
      { format: 'quote', includeMetadata: true }
    );
  }
}
```

### Chatbot z Pamięcią Kontekstu

```typescript
class ContextAwareChatbot {
  private conversationHistory: string[] = [];
  private contextDocuments = new Map<string, string>();
  
  async addContext(filePath: string, title: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf8');
    const uuid = this.generateUUID();
    
    this.contextDocuments.set(uuid, content);
    this.conversationHistory.push(`Dodano dokument: ${title} [${uuid}]`);
    
    return uuid;
  }
  
  async chat(message: string): Promise<string> {
    const availableDocs = Array.from(this.contextDocuments.keys())
      .map(uuid => `Dokument ${uuid}`)
      .join('\n');
    
    const completion = await this.openAIService.completion({
      messages: [
        {
          role: 'system',
          content: `Jesteś chatbotem z dostępem do dokumentów.
          
          Historia rozmowy:
          ${this.conversationHistory.join('\n')}
          
          Dostępne dokumenty:
          ${availableDocs}
          
          Używaj [[uuid]] aby odwołać się do dokumentów.`
        },
        {
          role: 'user',
          content: message
        }
      ]
    });
    
    const response = completion.choices[0].message.content || '';
    const finalResponse = response.replace(
      /\[\[([^\]]+)\]\]/g, 
      (match, uuid) => this.contextDocuments.get(uuid) || match
    );
    
    this.conversationHistory.push(`User: ${message}`);
    this.conversationHistory.push(`Bot: ${response}`);
    
    return finalResponse;
  }
}
```

### System Raportowania

```typescript
class ReportGenerator {
  private templates = new Map<string, string>();
  private dataSources = new Map<string, any>();
  
  async generateReport(templateId: string, query: string): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error('Template not found');
    
    const availableData = Array.from(this.dataSources.keys())
      .map(uuid => `Dane: ${uuid}`)
      .join('\n');
    
    const completion = await this.openAIService.completion({
      messages: [
        {
          role: 'system',
          content: `Generujesz raporty na podstawie szablonu i danych.
          
          Szablon raportu:
          [[${templateId}]]
          
          Dostępne źródła danych:
          ${availableData}
          
          Użyj placeholderów aby wstawić odpowiednie dane do szablonu.`
        },
        {
          role: 'user',
          content: query
        }
      ]
    });
    
    // Zastąpienie placeholderów
    let report = completion.choices[0].message.content || '';
    
    // Najpierw szablony
    report = report.replace(/\[\[([^\]]+)\]\]/g, (match, uuid) => {
      return this.templates.get(uuid) || this.dataSources.get(uuid) || match;
    });
    
    return report;
  }
}
```

## 🔧 Konfiguracja i Dostosowanie

### Ustawienia Systemu

```typescript
interface ContextConfig {
  maxDocuments: number;
  maxDocumentSize: number; // w bajtach
  cacheEnabled: boolean;
  placeholderPattern: RegExp;
  supportedFormats: string[];
  autoloadDirectories: string[];
}

const defaultConfig: ContextConfig = {
  maxDocuments: 1000,
  maxDocumentSize: 10 * 1024 * 1024, // 10MB
  cacheEnabled: true,
  placeholderPattern: /\[\[([^\]]+)\]\]/g,
  supportedFormats: ['.md', '.txt', '.json'],
  autoloadDirectories: ['./docs', './content']
};
```

### Middleware dla Bezpieczeństwa

```typescript
class SecurityMiddleware {
  private allowedUuids = new Set<string>();
  
  validateUuid(uuid: string): boolean {
    return this.allowedUuids.has(uuid) && /^[a-f0-9-]{36}$/.test(uuid);
  }
  
  sanitizeContent(content: string): string {
    // Usuwanie potencjalnie niebezpiecznej treści
    return content
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+="[^"]*"/gi, '');
  }
  
  checkPermissions(uuid: string, userId: string): boolean {
    // Sprawdzanie uprawnień dostępu do dokumentu
    return this.hasAccess(uuid, userId);
  }
}
```

## 📈 Monitorowanie i Metryki

```typescript
class ContextMetrics {
  private usage = new Map<string, number>();
  private performance = new Map<string, number[]>();
  
  trackDocumentUsage(uuid: string) {
    this.usage.set(uuid, (this.usage.get(uuid) || 0) + 1);
  }
  
  trackPerformance(operation: string, duration: number) {
    if (!this.performance.has(operation)) {
      this.performance.set(operation, []);
    }
    this.performance.get(operation)!.push(duration);
  }
  
  getPopularDocuments(limit = 10): Array<{uuid: string, usage: number}> {
    return Array.from(this.usage.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([uuid, usage]) => ({uuid, usage}));
  }
  
  getAveragePerformance(): Record<string, number> {
    const result: Record<string, number> = {};
    
    for (const [operation, times] of this.performance.entries()) {
      result[operation] = times.reduce((a, b) => a + b, 0) / times.length;
    }
    
    return result;
  }
}
```

## 🛡️ Bezpieczeństwo i Najlepsze Praktyki

### Zasady Bezpieczeństwa
1. **Walidacja UUID**: Sprawdzanie formatu i uprawnień
2. **Sanityzacja treści**: Usuwanie potencjalnie niebezpiecznego kodu
3. **Limity rozmiaru**: Ograniczenia dla dokumentów
4. **Rate limiting**: Kontrola częstotliwości zapytań
5. **Audyt dostępu**: Logowanie użycia dokumentów

### Optymalizacja Wydajności
1. **Lazy loading**: Ładowanie dokumentów na żądanie
2. **Cachowanie**: Przechowywanie często używanych dokumentów
3. **Kompresja**: Zmniejszanie rozmiaru dużych plików
4. **Indeksowanie**: Szybkie wyszukiwanie po metadanych

## 🔄 Integracje

### Baza Danych
```typescript
// Integracja z PostgreSQL
const db = new Pool({ connectionString: process.env.DATABASE_URL });

class DatabaseContextService {
  async saveDocument(uuid: string, content: string, metadata: any) {
    await db.query(
      'INSERT INTO documents (uuid, content, metadata) VALUES ($1, $2, $3)',
      [uuid, content, JSON.stringify(metadata)]
    );
  }
  
  async loadDocument(uuid: string): Promise<DocumentInfo | null> {
    const result = await db.query(
      'SELECT * FROM documents WHERE uuid = $1',
      [uuid]
    );
    return result.rows[0] || null;
  }
}
```

### Cache Redis
```typescript
// Integracja z Redis
import Redis from 'ioredis';

class CacheContextService {
  private redis = new Redis(process.env.REDIS_URL);
  
  async cacheDocument(uuid: string, content: string, ttl = 3600) {
    await this.redis.setex(`doc:${uuid}`, ttl, content);
  }
  
  async getCachedDocument(uuid: string): Promise<string | null> {
    return await this.redis.get(`doc:${uuid}`);
  }
}
```

## 🤝 Współpraca i Rozwój

### Rozszerzanie Systemu
1. **Nowe formaty**: Dodawanie obsługi innych typów plików
2. **Procesory treści**: Własne algorytmy przetwarzania
3. **Adaptery**: Integracja z zewnętrznymi systemami
4. **Pluginy**: Modularna architektura rozszerzeń

### Przykład Pluginu
```typescript
interface ContextPlugin {
  name: string;
  version: string;
  process(content: string, metadata: DocumentMetadata): Promise<string>;
  supports(fileType: string): boolean;
}

class PDFPlugin implements ContextPlugin {
  name = 'pdf-processor';
  version = '1.0.0';
  
  supports(fileType: string): boolean {
    return fileType === '.pdf';
  }
  
  async process(content: string, metadata: DocumentMetadata): Promise<string> {
    // Przetwarzanie PDF z OCR, ekstraktowanie obrazów itp.
    return processedContent;
  }
}
```

## 📞 Wsparcie

### Rozwiązywanie Problemów
- **UUID nie zostaje zastąpiony**: Sprawdź format placeholdera `[[uuid]]`
- **Błędy ładowania**: Upewnij się, że ścieżki do plików są prawidłowe
- **Przekroczenie limitów**: Sprawdź rozmiar dokumentów i liczbę tokenów
- **Problemy wydajności**: Włącz cachowanie i optymalizuj rozmiar dokumentów

### Debugging
```typescript
// Włączenie trybu debug
process.env.CONTEXT_DEBUG = 'true';

// Szczegółowe logowanie
const debugLogger = {
  logPlaceholderReplacement: (uuid: string, found: boolean) => {
    console.log(`Placeholder ${uuid}: ${found ? 'FOUND' : 'NOT FOUND'}`);
  },
  
  logDocumentLoad: (path: string, size: number) => {
    console.log(`Loaded document: ${path} (${size} bytes)`);
  }
};
```

## 📄 Licencja

Ten projekt jest dostępny na warunkach licencji określonej w głównym repozytorium.

---

*Context System - Inteligentne zarządzanie długimi kontekstami w aplikacjach AI* 📚 