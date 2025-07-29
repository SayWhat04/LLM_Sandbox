# Neo4j AI Knowledge Management System

Zaawansowany system zarządzania wiedzą oparty na grafowej bazie danych Neo4j z integracją AI do inteligentnego przechowywania, wyszukiwania i zarządzania zasobami.

## 📋 Opis projektu

System łączy w sobie potęgę grafowych baz danych Neo4j z możliwościami sztucznej inteligencji OpenAI, tworząc inteligentnego asystenta zdolnego do:

- **Semantycznego wyszukiwania** w bazie wiedzy przy użyciu embeddingów
- **Inteligentnego podejmowania decyzji** o potrzebie odczytu, zapisu lub bezpośredniej odpowiedzi
- **Kontekstowego zarządzania zasobami** różnych typów (artykuły, wideo, książki, aplikacje, itp.)
- **Relacyjnego wyszukiwania** opartego na połączeniach między dokumentami
- **Automatycznego przetwarzania** i kategoryzacji nowych zasobów

## 🏗️ Architektura systemu

### Komponenty główne:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  AssistantService│    │   Neo4jService  │    │  OpenAIService  │
│                 │    │                 │    │                 │
│ • Myślenie      │    │ • Wyszukiwanie  │    │ • Embeddingi    │
│ • Zapamiętywanie│◄──►│ • Relacje       │◄──►│ • Chat API      │
│ • Odpowiadanie  │    │ • Indeksy       │    │ • Przetwarzanie │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Przepływ danych:
```
Zapytanie użytkownika → Analiza intencji → Decyzja (READ/WRITE/ANSWER)
                                                ↓
                            READ: Wyszukiwanie semantyczne/relacyjne
                            WRITE: Przetwarzanie i zapis zasobu  
                            ANSWER: Bezpośrednia odpowiedź
                                                ↓
                                    Generowanie odpowiedzi z kontekstem
```

## 🚀 Kluczowe funkcjonalności

### 🧠 Inteligentne podejmowanie decyzji
System automatycznie analizuje każde zapytanie i decyduje o najlepszej strategii:
- **READ** - Wyszukiwanie w bazie wiedzy
- **WRITE** - Dodawanie nowego zasobu  
- **ANSWER** - Bezpośrednia odpowiedź bez dostępu do bazy

### 🔍 Zaawansowane wyszukiwanie

#### Wyszukiwanie specyficzne:
```typescript
const results = await neo4jService.performVectorSearch(
  "document_index", 
  "Neo4j tutorial", 
  5, 
  "node.type IN ['article', 'video']"
);
```

#### Wyszukiwanie relacyjne:
```typescript
const results = await neo4jService.relationshipVectorSearch(
  "document_index",
  "graph databases",
  5,
  "node.type IN ['application']",
  ["HAS_ARTICLE", "HAS_VIDEO"]
);
```

#### Wyszukiwanie facetowe:
```typescript
const results = await neo4jService.facetedSearch("video", 10);
```

### 📚 Typy dokumentów

System obsługuje 15 kategorii zasobów:

| Typ | Opis |
|-----|------|
| `application` | Narzędzia, usługi, aplikacje |
| `device` | Urządzenia, instrukcje obsługi |
| `book` | Książki, opinie, notatki |
| `course` | Kursy online, webinary, warsztaty |
| `movie` | Filmy, recenzje, opinie |
| `video` | Filmy YouTube, podcasty |
| `image` | Zdjęcia, galerie, obrazy |
| `blog` | Społeczności online, blogi |
| `music` | Muzyka, preferencje |
| `article` | Artykuły, newslettery |
| `channel` | Kanały YouTube |
| `document` | Dokumenty, pliki |
| `note` | Notatki osobiste, pomysły |

## 🛠️ Instalacja i konfiguracja

### Wymagania:
- Node.js (v18+)
- Neo4j Database (v5.0+)
- Klucz API OpenAI

### Zmienne środowiskowe:
```bash
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
OPENAI_API_KEY=your_openai_api_key
```

### Zależności:
```bash
npm install neo4j-driver openai uuid
npm install --save-dev @types/uuid
```

## 🎯 Użycie

### Uruchomienie systemu:
```bash
npx tsx app.ts
```

### Przykłady zapytań:

```typescript
// Wyszukiwanie wszystkich video
await chat("List me all the videos we have");

// Wyszukiwanie konkretnego artykułu  
await chat("Find me an article about Cypher query language");

// Złożone zapytanie z relacjami
await chat("Find me Neo4j service and then the videos about it");
```

## 🔧 API Reference

### Neo4jService

#### Podstawowe operacje:
- `addNode(label, properties)` - Dodaje węzeł z automatycznym embeddingiem
- `findNodeByProperty(label, property, value)` - Wyszukuje węzeł
- `connectNodes(fromId, toId, type, properties?)` - Tworzy relację

#### Wyszukiwanie wektorowe:
- `performVectorSearch(index, query, limit, filters?)` - Wyszukiwanie semantyczne
- `relationshipVectorSearch(index, query, limit, filters?, relations)` - Z relacjami
- `facetedSearch(type, limit, relationship?)` - Według typu

#### Zarządzanie indeksami:
- `createVectorIndex(name, label, property, dimensions)` - Tworzy indeks
- `waitForIndexToBeOnline(name, timeout?)` - Czeka na indeks

### AssistantService

- `think(query)` - Analizuje zapytanie i podejmuje decyzję
- `getRecallJson(query)` - Generuje zapytania wyszukiwania
- `describe(query)` - Przetwarza nowy zasób do zapisu
- `generateAnswer(query, context)` - Generuje odpowiedź z kontekstem

## 📊 Struktura danych

### Dokument:
```typescript
interface Document {
  uuid: string;
  name: string;
  description: string;
  content: string;
  url: string;
  images: string[];
  type: DocumentType;
  tags: string[];
  embedding: number[];
  createdAt: string;
  updatedAt: string;
}
```

### Zapytanie wyszukiwania:
```typescript
interface RecallJson {
  specific?: {
    q: string;
    types: DocumentType[];
  };
  relation?: {
    q: string; 
    types: DocumentType[];
    relatedTypes: DocumentType[];
  };
  general?: {
    type: DocumentType;
  };
}
```

## 🎓 Przykłady użycia

### 1. Dodawanie nowego zasobu:
```bash
User: "Remember this great Neo4j tutorial: https://example.com/neo4j-guide"
System: → WRITE → Przetwarza zasób → Zapisuje w bazie → Potwierdza
```

### 2. Wyszukiwanie informacji:
```bash
User: "What do we know about graph databases?"
System: → READ → Szuka podobnych dokumentów → Zwraca kontekst → Odpowiada
```

### 3. Bezpośrednia odpowiedź:
```bash
User: "What's the weather today?"
System: → ANSWER → Odpowiada bez dostępu do bazy
```

## 🔍 Zaawansowane funkcje

### Filtrowanie wyników:
```typescript
// Tylko artykuły i wideo
const filter = "node.type IN ['article', 'video']";

// Tylko dokumenty z konkretnym tagiem
const filter = "'graph' IN node.tags";
```

### Wyszukiwanie wielokierunkowe:
```typescript
const multiSearch = {
  specific: { q: "Neo4j database", types: ["application", "article"] },
  relation: { q: "tutorials", types: ["article"], relatedTypes: ["video"] },
  general: { type: "course" }
};
```

## 📈 Przykładowe dane inicjalne

System automatycznie tworzy przykładową bazę wiedzy zawierającą:

- **Neo4j Graph Database** (aplikacja)
- **Introduction to Neo4j** (artykuł)  
- **Neo4j vs Elasticsearch** (wideo)
- **Graph Databases in the Cloud** (artykuł)
- **Cypher Query Language Tutorial** (artykuł)
- **Neo4j APOC Library** (dokumentacja)

Z relacjami: `HAS_ARTICLE`, `HAS_VIDEO`, `HAS_TUTORIAL`, `HAS_DOCUMENTATION`

## 🚀 Rozszerzenia i rozwój

### Możliwe ulepszenia:
- **Interfejs webowy** dla graficznej eksploracji wiedzy
- **Import z zewnętrznych źródeł** (RSS, API, PDF)
- **Analiza nastrojów** dokumentów
- **Automatyczne tagowanie** przy użyciu AI
- **Personalizacja** na podstawie preferencji użytkownika
- **Współpraca zespołowa** i udostępnianie wiedzy
- **Metryki użycia** i analityka
- **Backup i synchronizacja** między instancjami

### Integracje:
- **Slack/Discord** boty
- **Browser extensions** do szybkiego dodawania
- **Mobile apps** dla dostępu mobilnego
- **API endpoints** dla zewnętrznych aplikacji

## 🔧 Konfiguracja zaawansowana

### Optymalizacja wyszukiwania:
```typescript
// Różne funkcje podobieństwa
await neo4jService.createVectorIndex(
  "document_index", 
  "Document", 
  "embedding", 
  3072, 
  "euclidean" // lub "cosine", "dot"
);
```

### Niestandardowe typy dokumentów:
```typescript
enum CustomDocumentType {
  Podcast = "podcast",
  Research = "research", 
  Template = "template"
}
```

## 📚 Zasoby dodatkowe

- [Neo4j Vector Search Documentation](https://neo4j.com/docs/cypher-manual/current/indexes-for-vector-search/)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Graph Database Modeling](https://neo4j.com/developer/data-modeling/)
- [Cypher Query Language](https://neo4j.com/developer/cypher/)

## 🤝 Wkład i rozwój

Projekt stanowi zaawansowany przykład integracji AI z grafowymi bazami danych. Idealne narzędzie do nauki i rozwoju systemów zarządzania wiedzą. 