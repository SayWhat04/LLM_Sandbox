# Module 5 - Task 3: Agent Challenge API

## Opis zadania

Implementacja wieloetapowego procesu komunikacji z zewnętrznym API, który wykonuje następujące kroki:

1. **Uwierzytelnienie** - wysłanie hasła i otrzymanie hash-a
2. **Pobranie źródeł** - wysłanie hash-a i otrzymanie URL-i do dwóch źródeł danych
3. **Pobieranie danych** - współbieżne pobranie danych z obu źródeł
4. **Przetwarzanie LLM** - współbieżne wykonanie zadań z pomocą modelu językowego
5. **Wysłanie odpowiedzi** - scalenie wyników i wysłanie finalnej odpowiedzi

## Wymagania

- Cały proces musi zakończyć się w maksymalnie 6 sekund
- Zadania z kroków 3 i 4 są wykonywane współbieżnie dla optymalizacji czasu
- Używa modelu OpenAI GPT-4o do przetwarzania zadań

## Struktura plików

```
course_tasks/Module 5/3/
├── app.ts              # Główna aplikacja Express
├── OpenAIService.ts    # Serwis do komunikacji z OpenAI
└── README.md          # Dokumentacja
```

## Instalacja i uruchomienie

1. Upewnij się, że masz skonfigurowane zmienne środowiskowe:
   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   ```

2. Uruchom serwer:
   ```bash
   cd course_tasks/Module\ 5/3
   bun run app.ts
   # lub
   npm run dev
   # lub
   node app.ts
   ```

3. Serwer uruchomi się na porcie 3000 (lub PORT z zmiennych środowiskowych)

## Endpoints

### POST `/api/process`
Wykonuje cały wieloetapowy proces challenge.

**Odpowiedź:**
```json
{
  "success": true,
  "elapsedTimeMs": 4523,
  "elapsedTimeSeconds": 4.523,
  "steps": {
    "step1": { "message": "hash_value" },
    "step2": { 
      "timestamp": "...",
      "signature": "...",
      "source0": "url1",
      "source1": "url2"
    },
    "step3": {
      "source0Data": { "task": "...", "data": "..." },
      "source1Data": { "task": "...", "data": "..." }
    },
    "step4": {
      "source0Result": "wynik_zadania_1",
      "source1Result": "wynik_zadania_2"
    },
    "step5": {
      "mergedAnswer": { "source0": "...", "source1": "..." },
      "finalResponse": { "flag": "...", "message": "..." }
    }
  }
}
```

### GET `/api/status`
Sprawdza status serwisu i pokazuje konfigurację.

### GET `/api/test`
Endpoint testowy do sprawdzenia czy serwis działa.

### GET `/health`
Health check endpoint.

## Przykład użycia

```bash
# Uruchomienie procesu
curl -X POST http://localhost:3000/api/process

# Sprawdzenie statusu
curl http://localhost:3000/api/status
```

## Optymalizacje czasowe

1. **Współbieżność** - kroki 3 i 4 wykonywane równolegle
2. **Timeout handling** - automatyczne obsługiwanie błędów czasowych
3. **Efficient prompting** - optymalne prompty dla szybkiej odpowiedzi LLM
4. **Connection reuse** - wykorzystanie keep-alive dla połączeń HTTP

## Logowanie

Aplikacja loguje szczegółowe informacje o każdym kroku procesu:
- ⏱️ Czasy wykonania
- 📤 Wysyłane dane
- 📥 Otrzymane odpowiedzi
- ✅ Pomyślne zakończenie kroków
- ❌ Błędy i problemy

## Obsługa błędów

- Automatyczne retry dla błędów sieciowych
- Graceful handling błędów OpenAI
- Szczegółowe logowanie błędów
- Zwracanie informacji o czasie wykonania nawet w przypadku błędu 