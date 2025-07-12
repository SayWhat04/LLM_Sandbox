# Data Processing Service

Zaawansowany serwis do przetwarzania danych z pliku `data.json` zawierającego zadania arytmetyczne i testowe, z integracją OpenAI i automatycznym wysyłaniem wyników.

## Funkcjonalności

### 1. Przetwarzanie danych arytmetycznych
- Iteruje po tablicy `test-data` w pliku JSON
- Identyfikuje obiekty z zadaniami arytmetycznymi (tylko `question` i `answer`)
- Oblicza wynik wyrażenia arytmetycznego z pola `question` (zawsze dodawanie)
- Sprawdza poprawność wyniku w polu `answer`
- Tworzy poprawione kopie elementów (bez modyfikacji oryginalnego pliku)
- Dodaje wszystkie elementy arytmetyczne do tablicy `arithmetic`

### 2. Przetwarzanie elementów testowych z LLM
- Identyfikuje obiekty z dodatkowymi testami (zawierające pole `test`)
- Wysyła pytania z pola `test.q` do modelu OpenAI GPT-4
- Otrzymuje krótkie, konkretne odpowiedzi
- Zastępuje "???" w polu `test.a` odpowiedziami z LLM
- Zwraca kompletne obiekty z wypełnionymi odpowiedziami

### 3. Finalne przetwarzanie i wysyłanie
- Łączy tablice `arithmetic` i `forLLM` (z odpowiedziami LLM)
- Tworzy finalny obiekt zgodny ze specyfikacją API
- Wysyła dane na endpoint `https://c3ntrala.ag3nts.org/report`
- Zwraca odpowiedź z serwera

### 4. Statystyki i monitoring
- Wyświetla statystyki przed przetworzeniem
- Pokazuje postęp operacji (LLM, łączenie, wysyłanie)
- Loguje odpowiedzi z serwera API

## Struktura danych

### Element arytmetyczny
```json
{
    "question": "86 + 84",
    "answer": 170
}
```

### Element testowy
```json
{
    "question": "18 + 76",
    "answer": 94,
    "test": {
        "q": "name of the 2020 USA president",
        "a": "???"
    }
}
```

## Wymagania

### Zmienne środowiskowe
Utwórz plik `.env` z następującymi zmiennymi:
```env
OPENAI_API_KEY=twój_klucz_openai
```

### Zależności
```bash
# Instalacja axios (jeśli nie zainstalowany)
bun add axios
```

## Uruchomienie

```bash
# Uruchomienie serwera Express
bun task3

# Lub bezpośrednio
bun run course_tasks/3/app.ts
```

## API Endpoints

### GET `/api/status`
Zwraca status serwisu i statystyki danych
```json
{
  "status": "ready",
  "message": "Data processing service is running...",
  "statistics": {
    "totalItems": 100,
    "arithmeticItems": 95,
    "testItems": 5
  }
}
```

### POST `/api/run-processing`
Uruchamia pełne przetwarzanie z LLM i wysyłaniem na endpoint
```json
{
  "success": true,
  "message": "Data processing and submission completed successfully",
  "serverResponse": {...}
}
```

## Klasy i interfejsy

### DataProcessingService
- `processData()` - podstawowe przetwarzanie danych
- `processAndSubmit()` - pełne przetwarzanie z LLM i wysyłaniem
- `getStats()` - zwraca statystyki danych
- `loadData()` - wczytuje dane z pliku JSON
- `sendToEndpoint()` - wysyła dane na zewnętrzny endpoint

### OpenAIService
- `answerQuestions()` - wysyła pytania do GPT-4 i zwraca odpowiedzi

### Interfejsy
- `ArithmeticItem` - struktura dla elementów arytmetycznych
- `TestItem` - struktura dla elementów testowych
- `DataStructure` - struktura całego pliku JSON
- `FinalResponse` - struktura finalnego obiektu wysyłanego na API

## Przepływ działania

1. **Inicjalizacja** - wczytanie danych z `data.json`
2. **Przetwarzanie arytmetyczne** - sprawdzenie i poprawienie obliczeń
3. **Przetwarzanie LLM** - wysłanie pytań do OpenAI GPT-4
4. **Łączenie wyników** - połączenie tablic `arithmetic` i `forLLM`
5. **Tworzenie finalnego obiektu** - zgodnie ze specyfikacją API
6. **Wysyłanie** - POST request na `https://c3ntrala.ag3nts.org/report`

## Uwagi

- Serwis **NIE modyfikuje** oryginalnego pliku `data.json`
- Obsługuje tylko operacje dodawania w wyrażeniach arytmetycznych
- Automatycznie uruchamia się przy starcie serwera (po 2 sekundach)
- Wymaga klucza OpenAI API w zmiennych środowiskowych 