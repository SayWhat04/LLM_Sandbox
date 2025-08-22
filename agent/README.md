# Agent - Inteligentny Asystent AI z Wyszukiwaniem Internetowym

Zaawansowany system agenta AI, który może planować działania, wyszukiwać informacje w internecie i generować odpowiedzi na podstawie zebranych danych.

## 🚀 Funkcjonalności

### Główne możliwości
- **Planowanie działań**: Agent automatycznie planuje kolejne kroki na podstawie zapytania użytkownika
- **Wyszukiwanie internetowe**: Inteligentne wyszukiwanie z wykorzystaniem Firecrawl API
- **Przetwarzanie tekstu**: Zaawansowana tokenizacja i dzielenie dokumentów na chunki
- **Generowanie odpowiedzi**: Tworzenie precyzyjnych odpowiedzi na podstawie zebranych informacji
- **Obsługa metadanych**: Automatyczne generowanie i zarządzanie metadanymi dokumentów

### Architektura systemu
```
Agent
├── AgentService.ts      # Główna logika agenta
├── WebSearch.ts         # Usługa wyszukiwania internetowego
├── TextService.ts       # Przetwarzanie i tokenizacja tekstu
├── OpenAIService.ts     # Integracja z OpenAI API
├── app.ts              # Serwer Express i endpoint API
├── types/              # Definicje typów TypeScript
├── prompts/            # Szablony promptów AI
└── utils/              # Narzędzia pomocnicze
```

## 📋 Wymagania

- Node.js (wersja 18+)
- Klucz API OpenAI (`OPENAI_API_KEY`)
- Klucz API Firecrawl (`FIRECRAWL_API_KEY`)

## 🛠️ Instalacja i uruchomienie

1. **Instalacja zależności**:
```bash
npm install
```

2. **Konfiguracja zmiennych środowiskowych**:
```bash
export OPENAI_API_KEY="your-openai-api-key"
export FIRECRAWL_API_KEY="your-firecrawl-api-key"
```

3. **Uruchomienie serwera**:
```bash
npm run dev
```

Serwer będzie dostępny pod adresem `http://localhost:3000`

## 🔧 Użytkowanie

### API Endpoint

**POST** `/api/chat`

**Przykład żądania**:
```json
{
  "messages": [
    {
      "role": "user", 
      "content": "Znajdź najnowsze informacje o sztucznej inteligencji"
    }
  ],
  "conversation_uuid": "unique-conversation-id"
}
```

**Przykład odpowiedzi**:
```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "Znalazłem najnowsze informacje o AI:\n\n1. [OpenAI announces GPT-5](https://example.com/gpt5)\n2. [Google's new AI breakthrough](https://example.com/google-ai)\n\nKluczowe trendy:\n- Multimodalne modele AI\n- Zwiększona wydajność\n- Nowe zastosowania w medycynie"
      }
    }
  ]
}
```

## 🏗️ Architektura komponentów

### AgentService
Główny orkiestrator systemu, który:
- Planuje kolejne działania na podstawie kontekstu
- Koordynuje użycie narzędzi
- Generuje finalne odpowiedzi

**Kluczowe metody**:
- `plan()` - Określa następny krok
- `describe()` - Generuje parametry dla narzędzi
- `useTool()` - Wykonuje wybrane narzędzie
- `generateAnswer()` - Tworzy odpowiedź dla użytkownika

### WebSearchService
Zaawansowana usługa wyszukiwania internetowego:
- **Dozwolone domeny**: Predefiniowana lista zaufanych źródeł
- **Inteligentne zapytania**: Automatyczne generowanie zapytań wyszukiwania
- **Scraping treści**: Pobieranie pełnej treści stron
- **Selekcja zasobów**: Wybór najbardziej relevantnych źródeł

**Obsługiwane domeny**:
- Wikipedia, ArXiv, OpenAI, Reuters
- MIT Technology Review, TechCrunch
- Brain Overment, Tailwind CSS
- I wiele innych...

### TextService
Zaawansowane przetwarzanie tekstu:
- **Tokenizacja**: Wykorzystuje Microsoft Tiktokenizer
- **Chunking**: Inteligentne dzielenie długich tekstów
- **Metadane**: Ekstraktowanie nagłówków, linków i obrazów
- **Placeholders**: System zastępczy dla URL-i i obrazów

### OpenAIService
Wrapper dla OpenAI API z obsługą:
- Różnych modeli (GPT-4o, O1-mini, O1-preview)
- Trybu JSON
- Streamingu
- Konfigurowalnych limitów tokenów

## 📊 Stan agenta

Agent utrzymuje stan zawierający:

```typescript
interface State {
  messages: ChatCompletionMessageParam[];  // Historia konwersacji
  tools: Tool[];                          // Dostępne narzędzia
  documents: IDoc[];                      // Zebrane dokumenty
  actions: Action[];                      // Wykonane działania
  config: {
    max_steps: number;                    // Maksymalna liczba kroków
    current_step: number;                 // Aktualny krok
    active_step?: Step | null;            // Aktywne zadanie
  };
}
```

## 🎯 Dostępne narzędzia

### 1. Web Search (`web_search`)
- **Opis**: Wyszukiwanie informacji w internecie
- **Parametry**: `query` - zapytanie wyszukiwania
- **Funkcjonalność**: 
  - Generuje inteligentne zapytania
  - Przeszukuje dozwolone domeny
  - Pobiera i przetwarza treść stron

### 2. Final Answer (`final_answer`)
- **Opis**: Generowanie odpowiedzi dla użytkownika
- **Użycie**: Gdy agent ma wystarczające informacje lub potrzebuje interakcji z użytkownikiem

## 🔍 Proces działania

1. **Otrzymanie zapytania** - User wysyła wiadomość
2. **Planowanie** - Agent analizuje kontekst i planuje działania
3. **Wykonanie narzędzi** - Wyszukiwanie informacji, przetwarzanie danych
4. **Agregacja wyników** - Zbieranie i organizacja znalezionych informacji
5. **Generowanie odpowiedzi** - Tworzenie precyzyjnej odpowiedzi na podstawie danych

## 📝 Przykłady użycia

### Wyszukiwanie informacji
```javascript
// Zapytanie o najnowsze trendy AI
{
  "messages": [{"role": "user", "content": "Co nowego w dziedzinie AI?"}],
  "conversation_uuid": "conv-123"
}
```

### Wyszukiwanie w konkretnej domenie
```javascript
// Wyszukiwanie na konkretnej stronie
{
  "messages": [{"role": "user", "content": "Znajdź informacje o GPT-4 na openai.com"}],
  "conversation_uuid": "conv-124"
}
```

### Złożone zapytania analityczne
```javascript
// Analiza porównawcza
{
  "messages": [{"role": "user", "content": "Porównaj najnowsze modele AI od OpenAI i Anthropic"}],
  "conversation_uuid": "conv-125"
}
```

## 🛡️ Bezpieczeństwo

- **Dozwolone domeny**: Agent wyszukuje tylko w predefiniowanych, zaufanych domenach
- **Walidacja URL**: Wszystkie URL są walidowane przed scrapingiem
- **Limity tokenów**: Kontrola wykorzystania API poprzez limity tokenów
- **Error handling**: Obsługa błędów i graceful degradation

## ⚙️ Konfiguracja

### Dodawanie nowych domen
W `WebSearchService.ts` można rozszerzyć listę `allowedDomains`:

```typescript
this.allowedDomains = [
  { name: 'Nowa domena', url: 'example.com', scrappable: true },
  // ... inne domeny
];
```

### Modyfikacja limitów
W `AgentService.ts` można zmienić maksymalną liczbę kroków:

```typescript
const state: State = {
  config: { max_steps: 10, current_step: 0, active_step: null },
  // ... reszta konfiguracji
};
```

## 📈 Monitoring i debugging

Agent loguje informacje o:
- Planowanych działaniach
- Wygenerowanych zapytaniach wyszukiwania
- Wynikach wyszukiwania
- Wybranych zasobach do scrappingu
- Błędach i ostrzeżeniach

Przykład logów:
```
Thinking... Użytkownik pyta o najnowsze trendy AI, potrzebuję wyszukać aktualne informacje
┌─────────┬──────────────────────────────────────────┐
│ (index) │                  Value                   │
├─────────┼──────────────────────────────────────────┤
│  Tool   │              'web_search'                │
│  Query  │ 'Znajdź najnowsze trendy sztucznej       │
│         │  inteligencji 2024'                      │
└─────────┴──────────────────────────────────────────┘
```

## 🚀 Rozszerzenia

System można łatwo rozszerzyć o:
- Nowe narzędzia (bazy danych, API zewnętrzne)
- Dodatkowe formaty dokumentów
- Integracje z innymi usługami AI
- Zaawansowane przetwarzanie obrazów
- Obsługę plików audio/wideo

## 📄 Licencja

Ten projekt jest częścią kursu 3rd-devs i służy celom edukacyjnym. 