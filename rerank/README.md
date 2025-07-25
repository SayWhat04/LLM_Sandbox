# Rerank - Zaawansowany System Wyszukiwania z Przerankowaniem

## Opis

Moduł `rerank` implementuje zaawansowany system wyszukiwania, który łączy wektorowe wyszukiwanie semantyczne z inteligentnym przerankowaniem wyników przy użyciu modeli językowych. System wykorzystuje dwuetapowy proces:

1. **Wyszukiwanie wektorowe** - znajdowanie semantycznie podobnych dokumentów
2. **Przeranking AI** - inteligentne filtrowanie i ocena relevancji wyników

## Architektura

```
┌─────────────────┐    ┌─────────────────┐     ┌─────────────────┐
│   Query/Text    │───▶│  VectorService  │───▶│     Qdrant      │
└─────────────────┘    └─────────────────┘     └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐     ┌─────────────────┐
│ Reranked Results│◀───│   OpenAIService │◀───│  Search Results │
└─────────────────┘    └─────────────────┘     └─────────────────┘
```

## Komponenty

### 1. **app.ts** - Główna Aplikacja
Demonstracja pełnego workflow wyszukiwania z przerankowaniem:

**Funkcjonalności:**
- Inicjalizacja danych testowych (cytaty z książek biznesowych)
- Automatyczne określenie autora zapytania
- Filtrowanie wektorowe według autora
- Inteligentne przeranking wyników przez AI
- Prezentacja finalne wyników

**Przykład użycia:**
```bash
npm run dev:rerank
```

### 2. **OpenAIService.ts** - Serwis AI
Kompleksowy serwis do integracji z modelami AI:

**Obsługiwane operacje:**
- **Embeddingi OpenAI** - text-embedding-3-large
- **Embeddingi Jina** - jina-embeddings-v3 (1024 wymiary)
- **Chat Completions** - GPT-4o, o1-mini, o1-preview
- **Tokenizacja** - precyzyjne liczenie tokenów
- **Obrazy** - kalkulacja kosztów tokenów dla obrazów

**Kluczowe metody:**
```typescript
// Tworzenie embeddingów
await openai.createEmbedding(text)
await openai.createJinaEmbedding(text)

// Chat completion
await openai.completion({
  messages: [...],
  model: 'gpt-4o',
  jsonMode: true
})

// Liczenie tokenów
await openai.countTokens(messages, 'gpt-4o')
```

### 3. **VectorService.ts** - Baza Wektorowa
Zarządzanie bazą wektorową Qdrant:

**Funkcjonalności:**
- Automatyczne tworzenie kolekcji
- Dodawanie dokumentów z embeddingami
- Wyszukiwanie semantyczne z filtrami
- Eksport danych do JSON

**Konfiguracja:**
```typescript
// Wymagane zmienne środowiskowe
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key
```

**Przykład użycia:**
```typescript
const vectorService = new VectorService(openAIService);

// Dodanie dokumentów
await vectorService.addPoints('collection', [
  { text: 'dokument 1', metadata: { author: 'autor' } }
]);

// Wyszukiwanie z filtrem
const results = await vectorService.performSearch(
  'collection', 
  'zapytanie', 
  { 
    should: [{ key: "author", match: { value: "autor" } }] 
  },
  10
);
```

### 4. **TextService.ts** - Przetwarzanie Tekstu
Zaawansowany procesor tekstowy z tokenizacją:

**Możliwości:**
- **Chunking** - inteligentne dzielenie tekstu z limitem tokenów
- **Ekstrykcja** - automatyczne wyciąganie nagłówków, linków, obrazów
- **Tokenizacja** - precyzyjne liczenie tokenów dla różnych modeli
- **Formatowanie** - przygotowanie tekstu dla modeli AI

**Przykład użycia:**
```typescript
const textSplitter = new TextSplitter('gpt-4o');

// Podział na chunki
const chunks = await textSplitter.split(longText, 1000);

// Przetworzenie dokumentu
const doc = await textSplitter.document(text, 'gpt-4o', {
  author: 'autor',
  category: 'kategoria'
});
```

## Workflow Wyszukiwania

### Etap 1: Przygotowanie Danych
```typescript
// 1. Przetworzenie dokumentów
const docs = await Promise.all(data.map(async ({ author, text }) => {
  return await textSplitter.document(text, 'gpt-4o', { author });
}));

// 2. Inicjalizacja kolekcji z embeddingami
await vectorService.initializeCollectionWithData('collection', docs);
```

### Etap 2: Analiza Zapytania
```typescript
// Określenie autora/kategorii zapytania przez AI
const authorAnalysis = await openai.completion({
  messages: [
    { 
      role: 'system', 
      content: 'Określ autora na podstawie zapytania...' 
    },
    { role: 'user', content: query }
  ]
});
```

### Etap 3: Wyszukiwanie Wektorowe
```typescript
// Wyszukiwanie z filtrem
const searchResults = await vectorService.performSearch(
  'collection',
  query,
  authorFilter,
  15  // więcej wyników dla reranking
);
```

### Etap 4: Przeranking AI
```typescript
// Ocena relevancji każdego wyniku
const relevanceChecks = await Promise.all(
  searchResults.map(async (result) => {
    const relevanceCheck = await openai.completion({
      messages: [
        { 
          role: 'system', 
          content: 'Oceń relevancję (1/0)...' 
        },
        { 
          role: 'user', 
          content: `Query: ${query}\nText: ${result.payload?.text}` 
        }
      ]
    });
    
    return {
      ...result,
      isRelevant: relevanceCheck.choices[0].message.content === '1'
    };
  })
);

// Filtrowanie tylko relevantnych wyników
const finalResults = relevanceChecks.filter(r => r.isRelevant);
```

## Struktura Danych

### Dokument (IDoc)
```typescript
interface IDoc {
  text: string;
  metadata: {
    tokens: number;        // liczba tokenów
    headers: Headers;      // nagłówki (h1-h6)
    urls: string[];        // wyciągnięte linki
    images: string[];      // wyciągnięte obrazy
    author?: string;       // dodatkowe metadane
  };
}
```

### Punkt Wektorowy
```typescript
interface VectorPoint {
  id: string;              // UUID
  vector: number[];        // embedding (1024 dim dla Jina)
  payload: {
    text: string;          // oryginalny tekst
    tokens: number;        // liczba tokenów
    author?: string;       // autor
    // inne metadane...
  };
}
```

## Przykłady Zastosowań

### 1. Wyszukiwanie w Bazie Wiedzy
```typescript
const query = 'Jak budować efektywne zespoły?';

// System automatycznie:
// 1. Znajdzie semantycznie podobne dokumenty
// 2. Określi odpowiednich autorów/kategorie
// 3. Oceni relevancję każdego wyniku
// 4. Zwróci najlepsze dopasowania
```

### 2. Rekomendacje Treści
```typescript
const userQuery = 'leadership and team management';

// Wyniki zostaną przefiltrowane przez AI pod kątem:
// - Semantycznego podobieństwa
// - Kontekstowej relevancji
// - Jakości dopasowania do zapytania
```

### 3. Analiza Dokumentów
```typescript
// System może analizować długie dokumenty:
// 1. Dzielenie na chunki z zachowaniem kontekstu
// 2. Wektoryzacja każdego fragmentu
// 3. Inteligentne wyszukiwanie w fragmentach
```

## Konfiguracja

### Zmienne Środowiskowe
```bash
# OpenAI
OPENAI_API_KEY=your_openai_key

# Jina AI (opcjonalne - dla lepszych embeddingów)
JINA_API_KEY=your_jina_key

# Qdrant
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key
```

### Instalacja Zależności
```bash
npm install @qdrant/js-client-rest openai uuid @microsoft/tiktokenizer
npm install -D @types/uuid
```

## Metryki i Monitoring

System generuje szczegółowe logi procesów:
- Tokenizacja i chunking
- Embedding i wektoryzacja
- Wyniki wyszukiwania
- Oceny relevancji
- Końcowe wyniki

## Optymalizacja

### Wydajność
- **Przetwarzanie równoległe** - embeddingi i oceny relevancji
- **Caching** - embeddingi zapisywane do points.json
- **Chunking inteligentny** - podział z zachowaniem kontekstu

### Jakość Wyników
- **Dwuetapowe filtrowanie** - wektorowe + AI
- **Metadane kontekstowe** - autor, kategoria, nagłówki
- **Threshold relevancji** - tylko istotne wyniki

## Rozszerzenia

System można łatwo rozszerzyć o:
- Dodatkowe źródła embeddingów
- Różne strategie reranking
- Feedback loop dla uczenia
- A/B testing różnych metod
- Interfejs webowy

---

**Autor:** System AI Development  
**Wersja:** 1.0  
**Licencja:** MIT 