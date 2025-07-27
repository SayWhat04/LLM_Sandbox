# Loader - Kompleksowy System Przetwarzania Dokumentów i Mediów

## Opis

**Loader** to zaawansowany system do przetwarzania, analizy i indeksowania różnorodnych typów plików i treści. System oferuje kompleksowe rozwiązanie do ładowania dokumentów, mediów, stron internetowych i integracji z usługami chmurowymi, wykorzystując sztuczną inteligencję do analizy i wyszukiwania treści.

## 🚀 Główne Funkcjonalności

### 📁 Obsługiwane Formaty Plików

**Dokumenty:**
- PDF (z konwersją na obrazy dla lepszej analizy)
- Microsoft Word (.docx)
- Microsoft Excel (.xlsx)
- Markdown (.md)
- Pliki tekstowe (.txt)
- HTML (.html)
- CSV (.csv)
- JSON (.json)

**Media:**
- **Audio:** MP3, WAV, OGG (z transkrypcją, analizą głośności, detekcją ciszy)
- **Obrazy:** JPG, JPEG, PNG, GIF, BMP, WebP (z opisem AI)
- **Wideo:** MP4 (wyodrębnianie audio do transkrypcji)

**Źródła Internetowe:**
- Strony internetowe (scraping z Firecrawl)
- Google Drive (dokumenty, arkusze)
- Notion (integracja z bazą wiedzy)

### 🔍 Zaawansowane Wyszukiwanie

System oferuje **hybrydowe wyszukiwanie** łączące:
- **Wyszukiwanie pełnotekstowe** (SQLite FTS5)
- **Wyszukiwanie wektorowe** (Qdrant + OpenAI embeddings)
- **Wyszukiwanie zewnętrzne** (Algolia)

### 🤖 Integracja AI

- **OpenAI GPT-4/4o** do analizy treści
- **Whisper** do transkrypcji audio
- **DALL-E/Vision** do analizy obrazów
- **Embeddings** do wyszukiwania semantycznego

## 🛠️ Architektura Systemu

### Główne Komponenty

```
📦 Loader System
├── 🎯 FileService        # Główny orchestrator przetwarzania plików
├── 🎵 AudioService       # Zaawansowane przetwarzanie audio
├── 💾 DatabaseService    # Baza danych z full-text search
├── 📝 TextService        # Inteligentne dzielenie tekstu
├── 🔍 VectorService      # Wyszukiwanie wektorowe (Qdrant)
├── 🔎 SearchService      # Wyszukiwanie zewnętrzne (Algolia)
├── 🤖 OpenAIService      # Integracja z AI
├── 🌐 WebSearchService   # Scraping i wyszukiwanie web
└── ☁️  GoogleDriveService # Integracja z Google Drive
```

## 📋 Wymagania

### Zmienne Środowiskowe

```env
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Qdrant Vector Database
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_api_key

# Algolia Search
ALGOLIA_APPLICATION_ID=your_algolia_app_id
ALGOLIA_API_KEY=your_algolia_api_key

# Firecrawl (Web Scraping)
FIRECRAWL_API_KEY=your_firecrawl_api_key

# Google Drive Integration
GOOGLE_PROJECT_ID=your_google_project_id
GOOGLE_PRIVATE_KEY_ID=your_google_private_key_id
GOOGLE_PRIVATE_KEY=your_google_private_key
GOOGLE_CLIENT_EMAIL=your_google_client_email
GOOGLE_CLIENT_ID=your_google_client_id
```

### Zależności

```json
{
  "dependencies": {
    "openai": "^4.x.x",
    "@qdrant/js-client-rest": "^1.x.x",
    "@algolia/client-search": "^4.x.x",
    "@mendable/firecrawl-js": "^1.x.x",
    "googleapis": "^128.x.x",
    "drizzle-orm": "^0.29.x",
    "fluent-ffmpeg": "^2.x.x",
    "sharp": "^0.33.x",
    "pdf2pic": "^3.x.x",
    "file-type": "^19.x.x",
    "turndown": "^7.x.x",
    "@microsoft/tiktokenizer": "^1.x.x"
  }
}
```

## 🚦 Szybki Start

### Podstawowe Użycie

```typescript
import { FileService } from './FileService';
import { OpenAIService } from './OpenAIService';

const fileService = new FileService();
const openaiService = new OpenAIService();

// Przetwarzanie różnych typów plików
async function processDocuments() {
  const results = await Promise.all([
    fileService.process('examples/document.pdf'),
    fileService.process('examples/audio.wav'),
    fileService.process('examples/image.png'),
    fileService.process('https://example.com/article'),
    fileService.process('examples/spreadsheet.xlsx')
  ]);

  // Analiza treści z AI
  for (const result of results) {
    const analysis = await openaiService.completion({
      messages: [
        {
          role: 'system',
          content: `Przeanalizuj następującą treść: ${result.docs[0].text}`
        },
        {
          role: 'user',
          content: 'Jakie są główne tematy w tym dokumencie?'
        }
      ],
      model: 'gpt-4o'
    });
    
    console.log('Analiza:', analysis.choices[0].message.content);
  }
}
```

### Zaawansowane Wyszukiwanie

```typescript
import { DatabaseService } from './DatabaseService';
import { VectorService } from './VectorService';
import { SearchService } from './SearchService';

// Inicjalizacja usług wyszukiwania
const searchService = new SearchService(algoliaAppId, algoliaApiKey);
const vectorService = new VectorService(openaiService);
const databaseService = new DatabaseService('database.db', searchService, vectorService);

// Hybrydowe wyszukiwanie
async function hybridSearch(query: string) {
  const [textResults, vectorResults, externalResults] = await Promise.all([
    databaseService.searchDocuments(query, { limit: 10 }),
    vectorService.performSearch('documents', query, {}, 10),
    searchService.searchSingleIndex('documents', query)
  ]);

  // Łączenie wyników z różnych źródeł
  return {
    textSearch: textResults,
    vectorSearch: vectorResults,
    externalSearch: externalResults
  };
}
```

## 📊 Szczegółowe Funkcjonalności

### 🎵 AudioService - Przetwarzanie Audio

```typescript
import { AudioService } from './AudioService';

const audioService = new AudioService();

// Analiza metadanych audio
const metadata = await audioService.getMetadata('audio.wav');
console.log({
  duration: metadata.duration,
  sampleRate: metadata.sampleRate,
  channels: metadata.channels,
  format: metadata.format
});

// Analiza głośności
const loudnessData = await audioService.analyzeLoudness('audio.wav');

// Detekcja ciszy
const silentParts = await audioService.detectSilence('audio.wav');

// Podział na fragmenty
const chunks = await audioService.splitIntoChunks('audio.wav', { maxDuration: 30 });
```

### 🖼️ Przetwarzanie Obrazów

```typescript
// Analiza obrazów z AI
const imageAnalysis = await openaiService.processImage('image.png');
console.log('Opis obrazu:', imageAnalysis.description);

// Przetwarzanie wielu obrazów
const imageResults = await openaiService.processImages([
  'image1.png',
  'image2.jpg',
  'image3.webp'
]);
```

### 📝 TextService - Inteligentne Dzielenie Tekstu

```typescript
import { TextService } from './TextService';

const textService = new TextService();

// Podział tekstu z zachowaniem kontekstu
const chunks = await textService.split(longText, 1000, {
  source: 'document.pdf',
  name: 'Ważny dokument'
});

console.log(`Podzielono na ${chunks.length} fragmentów`);
chunks.forEach((chunk, index) => {
  console.log(`Fragment ${index + 1}:`, {
    tokens: chunk.metadata.tokens,
    headers: chunk.metadata.headers,
    urls: chunk.metadata.urls
  });
});
```

### 🌐 WebSearchService - Scraping Stron

```typescript
import { WebSearchService } from './WebSearch';

const webService = new WebSearchService();

// Wyszukiwanie w określonych domenach
const searchResults = await webService.searchWeb([
  { q: 'sztuczna inteligencja', url: 'wikipedia.org' },
  { q: 'machine learning', url: 'arxiv.org' }
], 'conversation-uuid');

// Automatyczny wybór najlepszych zasobów
const selectedResources = await webService.selectResourcesToLoad(
  conversationMessages,
  searchResults,
  'conversation-uuid'
);
```

### ☁️ Integracja z Google Drive

```typescript
// Przetwarzanie plików z Google Drive
const driveResults = await fileService.processGoogleDriveFile('drive-file-id');

// Upload pliku na Drive
const fileId = await fileService.uploadToGoogleDrive('local-file.pdf');
```

## 🔧 Konfiguracja i Dostosowanie

### Ustawienia FileService

```typescript
const fileService = new FileService({
  tempDir: './storage/temp',
  maxFileSize: 100 * 1024 * 1024, // 100MB
  supportedMimeTypes: {
    text: ['.txt', '.md', '.json'],
    audio: ['.mp3', '.wav'],
    image: ['.png', '.jpg'],
    document: ['.pdf', '.docx']
  }
});
```

### Konfiguracja Wyszukiwania

```typescript
const searchConfig = {
  database: {
    path: './database.db',
    ftsEnabled: true
  },
  vector: {
    collection: 'documents',
    embeddingModel: 'text-embedding-3-large'
  },
  algolia: {
    indexName: 'documents',
    typoTolerance: true,
    hitsPerPage: 20
  }
};
```

## 📈 Monitorowanie i Logowanie

System oferuje szczegółowe logowanie dla wszystkich operacji:

```typescript
// Włączenie szczegółowych logów
process.env.DEBUG_LOADER = 'true';

// Dostęp do metryk przetwarzania
const metrics = await fileService.getProcessingMetrics();
console.log({
  processedFiles: metrics.totalFiles,
  processingTime: metrics.averageTime,
  errorRate: metrics.errorRate
});
```

## 🧪 Przykłady Użycia

### Przetwarzanie Biblioteki Dokumentów

```typescript
async function processDocumentLibrary(directory: string) {
  const files = await fs.readdir(directory);
  const results = [];

  for (const file of files) {
    try {
      const filePath = path.join(directory, file);
      const result = await fileService.process(filePath);
      
      // Indeksowanie w bazach danych
      await databaseService.indexDocument(result);
      await vectorService.addPoints('library', [{
        text: result.docs[0].text,
        metadata: result.docs[0].metadata
      }]);
      
      results.push(result);
    } catch (error) {
      console.error(`Błąd przetwarzania ${file}:`, error);
    }
  }

  return results;
}
```

### Inteligentny Asystent Dokumentów

```typescript
async function createDocumentAssistant(query: string) {
  // Hybrydowe wyszukiwanie
  const searchResults = await hybridSearch(query);
  
  // Przygotowanie kontekstu
  const context = searchResults.vectorSearch
    .slice(0, 5)
    .map(doc => doc.content)
    .join('\n\n');

  // Generowanie odpowiedzi
  const response = await openaiService.completion({
    messages: [
      {
        role: 'system',
        content: `Jesteś asystentem, który odpowiada na pytania na podstawie dostarczonych dokumentów. Kontekst: ${context}`
      },
      {
        role: 'user',
        content: query
      }
    ],
    model: 'gpt-4o'
  });

  return response.choices[0].message.content;
}
```

## 🛡️ Bezpieczeństwo i Najlepsze Praktyki

1. **Walidacja plików**: Wszystkie pliki przechodzą weryfikację typu i rozmiaru
2. **Sandboxing**: Przetwarzanie w izolowanym środowisku
3. **Rate limiting**: Ograniczenia dla API zewnętrznych
4. **Szyfrowanie**: Wrażliwe dane są szyfrowane
5. **Audyt**: Pełne logowanie wszystkich operacji

## 🤝 Współpraca i Rozwój

System jest modularny i łatwo rozszerzalny. Aby dodać obsługę nowego formatu:

1. Rozszerz `FileService.mimeTypes`
2. Dodaj metodę procesowania w odpowiednim serwisie
3. Zaktualizuj testy i dokumentację

## 📞 Wsparcie

W przypadku problemów sprawdź:
- Konfigurację zmiennych środowiskowych
- Logi w konsoli
- Dostępność usług zewnętrznych (OpenAI, Qdrant, Algolia)

## 📄 Licencja

Ten projekt jest dostępny na warunkach licencji określonej w głównym repozytorium.

---

*Loader System - Twoja brama do inteligentnego przetwarzania dokumentów i mediów* 🚀 