# Hybrid Search System

## 🎯 Przegląd

System hybrydowego wyszukiwania łączący **wyszukiwanie semantyczne** (embedding vectors) z **wyszukiwaniem tradycyjnym** (full-text search), wykorzystując algorytm **Reciprocal Rank Fusion (RRF)** do dostarczania najlepszych wyników.

## 🏗️ Architektura

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SQLite DB     │◄──►│  Algolia Search │    │  Qdrant Vector  │
│   (Local Data)  │    │  (Text Search)  │    │  (Semantic)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  RRF Algorithm  │ 
                    │  (Rank Fusion)  │
                    └─────────────────┘
```

## 🚀 Funkcjonalności

### ✨ Główne Cechy
- **Hybrydowe wyszukiwanie** - Łączy semantic search (Qdrant) z full-text search (Algolia)
- **Automatyczna synchronizacja** - Dane są automatycznie synchronizowane między SQLite, Algolia i Qdrant
- **RRF (Reciprocal Rank Fusion)** - Inteligentne łączenie wyników z różnych źródeł
- **Zaawansowane przetwarzanie tekstu** - Smart chunking z token counting
- **Filtrowanie autorów** - AI-powered author detection i filtering
- **Multi-embedding support** - OpenAI + Jina embeddings

### 🔍 Typy Wyszukiwania

1. **Vector Search (Qdrant)**
   - Semantyczne wyszukiwanie za pomocą embeddingów
   - Najlepsze dla konceptualnych zapytań
   - Model: `text-embedding-3-large` (3072 wymiary)

2. **Full-text Search (Algolia)**
   - Tradycyjne wyszukiwanie tekstowe
   - Obsługa synonimów, filtrów, facetów
   - Typo tolerance i advanced syntax

3. **Hybrid Results (RRF)**
   - Łączy wyniki z obu metod
   - Rank Fusion: `1/rank`
   - Sortowanie według combined score

## 📁 Struktura Plików

```
hybrid/
├── app.ts                 # 🎯 Główna logika aplikacji
├── data.ts               # 📚 Przykładowe dane (książki)
├── points.json           # 🗃️ Vector data cache
├── AlgoliaService.ts     # 🔍 Full-text search service
├── VectorService.ts      # 🧠 Semantic search service  
├── DatabaseService.ts    # 💾 Local SQLite + sync
├── OpenAIService.ts      # 🤖 AI embeddings & completion
├── TextService.ts        # ✂️ Advanced text processing
└── README.md            # 📖 Ta dokumentacja
```

## ⚙️ Konfiguracja

### Wymagane Zmienne Środowiskowe

```bash
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Qdrant Vector Database  
QDRANT_URL=https://your-qdrant-cluster.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key

# Algolia Search
ALGOLIA_APP_ID=your_algolia_app_id  
ALGOLIA_API_KEY=your_algolia_admin_key

# Optional: Jina Embeddings
JINA_API_KEY=your_jina_api_key
```

### Instalacja Dependencies

```bash
npm install @qdrant/js-client-rest @algolia/client-search openai drizzle-orm bun:sqlite @microsoft/tiktokenizer uuid
```

## 🏃‍♂️ Uruchomienie

```bash
# Uruchom system hybrydowy
bun run hybrid/app.ts

# Lub z Node.js
node hybrid/app.ts
```

### Pierwszy Start
1. System automatycznie zainicjalizuje bazę danych SQLite
2. Załaduje przykładowe dane z `data.ts`  
3. Zsynchronizuje dane z Algolia i Qdrant
4. Wykona przykładowe zapytanie hybrydowe

## 🔧 API Reference

### DatabaseService

```typescript
// Dodawanie dokumentu (auto-sync do Algolia + Qdrant)
await dbService.insertDocument({
  uuid: "unique-id",
  name: "Document Title", 
  content: "Document content...",
  source: "source_name",
  conversation_uuid: "conv-id",
  type: "book",
  indexed: true
});

// Aktualizacja dokumentu
await dbService.updateDocument("uuid", {
  content: "Updated content..."
});

// Pobieranie wszystkich dokumentów
const documents = await dbService.getAllDocuments();
```

### AlgoliaService

```typescript
// Wyszukiwanie full-text
const results = await algoliaService.searchSingleIndex(
  "documents", 
  "search query",
  { 
    queryParameters: { 
      filters: "author:'Jim Collins'" 
    }
  }
);
```

### VectorService

```typescript
// Wyszukiwanie semantyczne
const results = await vectorService.performSearch(
  "documents",
  "conceptual search query", 
  { should: [{ key: "author", match: { value: "Simon Sinek" } }] },
  10
);
```

### OpenAIService

```typescript
// Generowanie embeddingów
const embedding = await openAIService.createEmbedding("text to embed");

// Chat completion
const response = await openAIService.completion({
  messages: [{ role: "user", content: "Hello!" }],
  model: "gpt-4o"
});
```

### TextService

```typescript
// Dzielenie tekstu na chunki z token counting
const textSplitter = new TextSplitter("gpt-4");
const chunks = await textSplitter.split(longText, 1000); // 1000 tokens per chunk

// Pojedynczy dokument z metadanymi
const doc = await textSplitter.document(text, "gpt-4o", { customField: "value" });
```

## 🧪 Przykłady Użycia

### Podstawowe Wyszukiwanie Hybrydowe

```typescript
// 1. Określ autorów na podstawie zapytania
const authors = await determineAuthors("leadership principles");

// 2. Zbuduj filtry
const vectorFilter = buildFilter(authors);
const algoliaFilter = buildAlgoliaFilter(authors);

// 3. Wykonaj oba wyszukiwania równolegle
const [vectorResults, algoliaResults] = await Promise.all([
  performVectorSearch("leadership principles", vectorFilter),
  performAlgoliaSearch("leadership principles", { filters: algoliaFilter })
]);

// 4. Połącz wyniki za pomocą RRF
const hybridResults = calculateRRF(vectorResults, algoliaResults);

console.table(hybridResults);
```

### Zaawansowana Konfiguracja Wyszukiwania

```typescript
// Semantic search z custom filtering
const semanticResults = await vectorService.performSearch(
  "documents",
  "innovation and growth strategies",
  {
    should: [
      { key: "type", match: { value: "book" } },
      { key: "author", match: { value: "Jim Collins" } }
    ]
  },
  15
);

// Full-text search z zaawansowanymi parametrami
const textResults = await algoliaService.searchSingleIndex(
  "documents",
  "innovation growth",
  {
    queryParameters: {
      typoTolerance: true,
      ignorePlurals: true,
      filters: "type:'book' AND (author:'Jim Collins' OR author:'Simon Sinek')",
      hitsPerPage: 20,
      attributesToHighlight: ['name', 'content']
    }
  }
);
```

## 🔄 RRF Algorithm

Reciprocal Rank Fusion łączy wyniki z różnych źródeł:

```typescript
function calculateRRF(vectorResults: any[], algoliaResults: any[]) {
  return combinedResults.map(result => ({
    ...result,
    score: (1 / vectorRank) + (1 / algoliaRank)
  })).sort((a, b) => b.score - a.score);
}
```

**Zalety RRF:**
- Brak potrzeby tuningu wag
- Automatyczna normalizacja wyników
- Robustość na różne typy zapytań
- Dobra performance dla hybrid search

## 🎨 Kustomizacja

### Dodawanie Nowych Źródeł Danych

```typescript
// Dodaj nowy typ dokumentu
const document = {
  uuid: uuidv4(),
  name: "Research Paper",
  content: "Paper content...",
  source: "academic",
  type: "research",
  author: "Researcher Name",
  conversation_uuid: uuidv4(),
  indexed: true
};

await dbService.insertDocument(document);
```

### Custom Embeddings

```typescript
// Użyj Jina embeddings zamiast OpenAI
const jinaEmbedding = await openAIService.createJinaEmbedding(
  "text for embedding"
);
```

### Extended Text Processing

```typescript
// Custom metadata w text splitting
const doc = await textSplitter.document(text, "gpt-4o", {
  source: "custom_source",
  category: "research",
  tags: ["AI", "Machine Learning"]
});
```

## 📊 Monitoring & Debugowanie

System loguje kluczowe operacje:

```typescript
// Debugging vector search
console.log("Vector results:");
vectorResults.forEach(result => {
  console.log(`${result.author}: ${result.content.slice(0, 75)} (${(result.score*100).toFixed(2)}%)`);
});

// Debugging Algolia search  
console.log("Algolia results:");
algoliaResults.forEach(hit => {
  console.log(`${hit.author}: ${hit.content.slice(0, 50)}`);
});

// Final hybrid results
console.table(hybridResults.map(result => ({
  Author: result.author,
  Text: result.content.slice(0, 75) + "...", 
  "RRF Score": result.score.toFixed(4)
})));
```

## 🚧 Rozszerzenia

### Planowane Funkcjonalności
- [ ] Multi-language support
- [ ] Advanced filtering UI
- [ ] Real-time sync webhooks
- [ ] Performance analytics dashboard  
- [ ] A/B testing framework dla ranking algorithms
- [ ] GraphQL API layer
- [ ] Elasticsearch integration option

### Optymalizacje
- [ ] Caching layer dla frequent queries
- [ ] Batch processing dla large datasets
- [ ] Async background syncing
- [ ] Query performance metrics

## 🤝 Contributing

1. Fork repository
2. Stwórz feature branch
3. Zaimplementuj zmiany z testami
4. Submit pull request

## 📄 License

MIT License - szczegóły w pliku LICENSE

---

**💡 Pro Tip:** Hybrid search działa najlepiej gdy łączysz:
- **Semantic search** dla conceptual queries ("leadership styles")  
- **Full-text search** dla specific terms ("ISBN: 978-0-06-293660-4")
- **RRF** dla balanced, high-quality results 