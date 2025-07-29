# Neo4j 101 - Wprowadzenie do grafowych baz danych z wyszukiwaniem wektorowym

Projekt demonstracyjny pokazujący podstawowe operacje w Neo4j połączone z możliwościami wyszukiwania semantycznego przy użyciu embeddingów OpenAI.

## 📋 Opis projektu

Ten projekt to praktyczne wprowadzenie do pracy z grafową bazą danych Neo4j, obejmujące:

- **Tworzenie i zarządzanie węzłami** (aktorzy, filmy, reżyserzy)
- **Ustanawianie relacji** między węzłami (ACTED_IN, DIRECTED)
- **Wyszukiwanie wektorowe** z wykorzystaniem embeddingów OpenAI
- **Zaawansowane zapytania Cypher** do analizy danych grafowych
- **Integrację z AI** dla semantycznego wyszukiwania

## 🏗️ Architektura

### Komponenty projektu:

1. **Neo4jService.ts** - Główna usługa do operacji na bazie Neo4j
2. **OpenAIService.ts** - Integracja z OpenAI API (embeddingi, chat completions)
3. **app.ts** - Aplikacja demonstracyjna
4. **prompts.ts** - Systemowe prompty dla AI (szablon)

### Model danych:
```
(Actor)-[:ACTED_IN {character}]->(Movie)
(Director)-[:DIRECTED]->(Movie)
```

## 🚀 Funkcjonalności

### Operacje na węzłach:
- ✅ Tworzenie węzłów z automatycznym generowaniem embeddingów
- ✅ Odczytywanie węzłów po ID lub właściwościach
- ✅ Aktualizowanie właściwości węzłów
- ✅ Usuwanie węzłów z relacjami
- ✅ Operacje wsadowe

### Indeksy wektorowe:
- ✅ Tworzenie indeksów wektorowych
- ✅ Monitorowanie statusu indeksów
- ✅ Wyszukiwanie semantyczne z podobieństwem cosinusowym

### Relacje:
- ✅ Łączenie węzłów relacjami
- ✅ Zapytania o relacje węzła
- ✅ Analiza połączeń między węzłami

### Zapytania Cypher:
- ✅ Znajdowanie aktorów w konkretnych filmach
- ✅ Filmografia konkretnego aktora
- ✅ Reżyserzy współpracujący z aktorem
- ✅ Statystyki obsad filmów
- ✅ Analiza współpracy między aktorami

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

### Instalacja zależności:
```bash
npm install neo4j-driver openai uuid
npm install --save-dev @types/uuid
```

## 🎯 Uruchomienie

```bash
# Uruchomienie aplikacji demonstracyjnej
npm run dev
# lub
npx tsx app.ts
```

## 📊 Przykładowe dane

Aplikacja tworzy przykładową bazę danych zawierającą:

### Aktorzy:
- Keanu Reeves (ur. 1964)
- Carrie-Anne Moss (ur. 1967)
- Laurence Fishburne (ur. 1961)
- Hugo Weaving (ur. 1960)

### Filmy:
- The Matrix (1999)
- The Matrix Reloaded (2003)
- John Wick (2014)
- The Lord of the Rings: The Fellowship of the Ring (2001)

### Reżyserzy:
- The Wachowskis
- Chad Stahelski

## 🔍 Przykładowe zapytania

### 1. Aktorzy w filmie "The Matrix":
```cypher
MATCH (actor:Actor)-[role:ACTED_IN]->(movie:Movie)
WHERE movie.title = 'The Matrix'
RETURN actor.name, role.character
```

### 2. Filmografia Keanu Reevesa:
```cypher
MATCH (keanu:Actor {name: 'Keanu Reeves'})-[role:ACTED_IN]->(movie:Movie)
RETURN movie.title, role.character, movie.releaseYear
ORDER BY movie.releaseYear
```

### 3. Wyszukiwanie wektorowe:
```typescript
const results = await neo4jService.performVectorSearch('movie_index', 'Sauron', 1);
```

## 🧩 Kluczowe metody Neo4jService

### Zarządzanie węzłami:
- `addNode(label, properties)` - Dodaje węzeł z embeddingiem
- `findNodeByProperty(label, property, value)` - Znajduje węzeł
- `updateNode(nodeId, properties)` - Aktualizuje węzeł
- `deleteNode(nodeId)` - Usuwa węzeł

### Indeksy wektorowe:
- `createVectorIndex(name, label, property, dimensions)` - Tworzy indeks
- `performVectorSearch(indexName, query, limit)` - Wyszukuje podobne

### Relacje:
- `connectNodes(fromId, toId, type, properties)` - Łączy węzły
- `getNodeRelationships(nodeId, direction)` - Pobiera relacje

## 🎓 Zastosowania edukacyjne

Ten projekt idealnie nadaje się do nauki:

1. **Podstaw Neo4j** - tworzenie węzłów, relacji, zapytania Cypher
2. **Wyszukiwania wektorowego** - embeddingi, podobieństwo semantyczne
3. **Integracji AI z bazami danych** - łączenie LLM z grafowymi strukturami
4. **Wzorców projektowych** - serwisy, separacja odpowiedzialności
5. **TypeScript z bazami danych** - typy, async/await, error handling

## 🔧 Rozszerzenia

Projekt można rozbudować o:

- **Więcej węzłów** (gatunki, studia filmowe, nagrody)
- **Złożone relacje** (współpraca, wpływy, podobieństwa)
- **Interfejs webowy** dla eksploracji danych
- **Import danych** z zewnętrznych API (TMDb, IMDb)
- **Analitykę grafową** (centralność, społeczności)
- **Rekomendację** filmów na podstawie preferencji

## 📚 Dodatkowe zasoby

- [Neo4j Documentation](https://neo4j.com/docs/)
- [Cypher Query Language](https://neo4j.com/developer/cypher/)
- [Neo4j Vector Indexes](https://neo4j.com/docs/cypher-manual/current/indexes-for-vector-search/)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)

## 🤝 Współpraca

Projekt stworzony do celów edukacyjnych. Mile widziane są propozycje ulepszeń i rozszerzeń funkcjonalności. 