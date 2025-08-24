# AI Assistant - Intelligent Task-Oriented Conversational Agent

## Opis

Zaawansowany asystent AI zbudowany w TypeScript, który wykorzystuje wieloetapowy proces myślenia i planowania do wykonywania zadań w oparciu o rozmowę z użytkownikiem. System implementuje architekturę ReAct (Reasoning + Acting) z wbudowaną pamięcią, narzędziami i świadomością kontekstu środowiskowego.

## Architektura

### Główne komponenty

- **OpenAIService** - Serwis do komunikacji z API OpenAI
- **State Management** - Zarządzanie stanem konwersacji, zadań i pamięci
- **Multi-Phase Processing** - Wieloetapowy proces przetwarzania zapytań
- **Tool Integration** - Integracja z zewnętrznymi narzędziami

### Fazy przetwarzania

1. **Thinking Phase** (Faza myślenia)
   - Analiza środowiska
   - Refleksja osobowości
   - Przeszukiwanie pamięci
   - Analiza dostępnych narzędzi

2. **Planning Phase** (Faza planowania)
   - Tworzenie i aktualizacja zadań
   - Planowanie akcji
   - Ustalanie sekwencji wykonania

3. **Action Phase** (Faza działania)
   - Wykonywanie zaplanowanych akcji
   - Wykorzystanie narzędzi
   - Generowanie odpowiedzi

## Funkcjonalności

### 🧠 Inteligentne myślenie
- Analiza kontekstu środowiskowego (lokalizacja, pogoda, czas)
- Uwzględnianie osobowości AI w odpowiedziach
- Wykorzystanie pamięci długoterminowej
- Świadome wybieranie odpowiednich narzędzi

### 🎯 Zarządzanie zadaniami
- Automatyczne tworzenie zadań na podstawie rozmowy
- Śledzenie statusu zadań (pending, completed, failed)
- Sekwencyjne wykonywanie akcji
- Persystencja stanu między interakcjami

### 🛠️ Zintegrowane narzędzia
- **Spotify** - Odtwarzanie muzyki
- **Google** - Wyszukiwanie w internecie
- **Linear** - Zarządzanie zadaniami projektowymi
- **Calendar** - Sprawdzanie kalendarza
- **Memory** - Przeszukiwanie pamięci
- **Final Answer** - Generowanie finalnych odpowiedzi

### 💾 System pamięci
Kategoryzowana pamięć długoterminowa:
- **Profiles** - Profile osób, preferencje, szczegóły
- **Resources** - Materiały edukacyjne, artykuły, referencje
- **Tasks** - Zadania użytkownika
- **Events** - Wydarzenia, spotkania, ważne daty

## Struktura plików

```
assistant/
├── app.ts              # Główna logika aplikacji
├── OpenAIService.ts    # Serwis OpenAI
├── types.ts           # Definicje typów TypeScript
├── prompts/
│   ├── think/         # Prompty dla fazy myślenia
│   │   ├── environment.ts
│   │   ├── personality.ts
│   │   ├── memory.ts
│   │   ├── tools.ts
│   │   ├── task.ts
│   │   ├── action.ts
│   │   ├── use.ts
│   │   └── answer.ts
│   └── conversation/
│       └── compress.ts
└── README.md          # Ten plik
```

## Konfiguracja

### Wymagania
- Node.js
- TypeScript
- Klucz API OpenAI
- Bun (opcjonalnie)

### Zmienne środowiskowe
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### Instalacja
```bash
# Zainstaluj zależności
npm install

# Lub z Bun
bun install
```

## Użycie

### Podstawowe uruchomienie
```typescript
import { executeLoop } from './app';

// Uruchom asystenta z wiadomością użytkownika
const userMessage = "Play my favorite music";
await executeLoop(state, userMessage);
```

### Konfiguracja asystenta
```typescript
const state: State = {
  config: {
    max_steps: 10,
    ai_name: "Alice",
    username: "Adam",
    environment: "Krakow, Poland. Sunny. 20°C. At home.",
    personality: "Curious and happy AI assistant...",
    // ... inne ustawienia
  },
  // ... pozostałe właściwości stanu
};
```

## Przykłady użycia

### 1. Odtwarzanie muzyki
```
Użytkownik: "Play my favorite music"

Proces:
1. Analiza środowiska i osobowości
2. Przeszukanie pamięci (ulubione utwory)
3. Wybór narzędzia Spotify
4. Wykonanie akcji odtwarzania
5. Potwierdzenie dla użytkownika
```

### 2. Zarządzanie zadaniami
```
Użytkownik: "I need to finish the AI_devs lesson"

Proces:
1. Utworzenie zadania w systemie
2. Analiza dostępnych narzędzi (Linear)
3. Dodanie zadania do Linear
4. Aktualizacja pamięci
```

### 3. Wyszukiwanie informacji
```
Użytkownik: "Find information about machine learning"

Proces:
1. Identyfikacja potrzeby wyszukiwania
2. Użycie narzędzia Google
3. Przeszukanie pamięci o podobnych zasobach
4. Przedstawienie wyników
```

## Typy danych

### State
Główny stan aplikacji zawierający:
- `config` - Konfiguracja asystenta
- `thoughts` - Wyniki faz myślenia
- `tasks` - Lista zadań
- `documents` - Dokumenty
- `memories` - Pamięć długoterminowa
- `tools` - Dostępne narzędzia
- `messages` - Historia konwersacji

### Task
```typescript
type Task = {
    uuid: string;
    conversation_uuid: string;
    status: 'pending' | 'completed' | 'failed';
    name: string;
    actions: Action[];
    description: string;
    created_at: string;
    updated_at: string;
}
```

### Action
```typescript
type Action = {
    uuid: string;
    task_uuid: string;
    name: string;
    tool_name: string;
    payload: Record<string, any>;
    result: ActionResult | null;
    status: 'pending' | 'completed' | 'failed';
    sequence: number;
    description: string;
}
```

## Rozszerzanie funkcjonalności

### Dodawanie nowych narzędzi

1. Dodaj definicję narzędzia do tablicy `tools`:
```typescript
{
  name: "weather",
  description: "Get weather information",
  instruction: 'To get weather write { "location": "<city>" }'
}
```

2. Dodaj handler narzędzia do `mockToolHandlers`:
```typescript
weather: (payload: { location: string }) => {
  // Implementacja logiki narzędzia
  return { status: "success", data: weatherData };
}
```

### Dodawanie nowych kategorii pamięci
```typescript
memory_categories.push({
  name: "preferences",
  description: "User preferences and settings"
});
```

## Monitorowanie i debugging

System zawiera rozbudowane logowanie:
- Wyniki każdej fazy przetwarzania
- Stan zadań i akcji
- Wyniki narzędzi
- Finalny stan systemu

```typescript
console.log("=== Thinking Phase Results ===");
console.log("=== Planning Phase Results ===");
console.log("=== Action Phase Results ===");
console.log("=== Final State ===");
```

## Ograniczenia

- Maksymalna liczba kroków: 10 (konfigurowalne)
- Mocki narzędzi (wymagają implementacji rzeczywistych integracji)
- Brak persystencji stanu między sesjami
- Ograniczona obsługa błędów

## Rozwój

### Planowane ulepszenia
- [ ] Rzeczywiste integracje z zewnętrznymi API
- [ ] Persystencja stanu w bazie danych
- [ ] Ulepszona obsługa błędów
- [ ] Interface użytkownika
- [ ] Wsparcie dla wielu użytkowników
- [ ] Rozszerzona pamięć wektorowa

### Wkład w rozwój
1. Fork repozytorium
2. Utwórz branch feature
3. Dodaj testy
4. Złóż pull request

## Licencja

[Określ licencję projektu]

## Kontakt

[Informacje kontaktowe] 