# Task 5 - Cenzurowanie danych osobowych

## Opis zadania

Aplikacja implementuje funkcjonalność automatycznego cenzurowania danych osobowych w tekście przy użyciu modelu LLM.

## Funkcjonalności

1. **Pobieranie danych** - wykonuje zapytanie HTTP GET do endpointa z tekstem do cenzurowania
2. **Cenzurowanie przez LLM** - wykorzystuje model GPT-4 do zamiany danych osobowych na słowo "CENZURA"
3. **Wysyłanie raportu** - opakowuje wynik w JSON i wysyła POST do API

## Dane poddawane cenzurze

- **Imię i nazwisko** (razem, np. "Jan Nowak" → "CENZURA")
- **Wiek** (np. "32" → "CENZURA")
- **Miasto** (np. "Wrocław" → "CENZURA")
- **Ulica i numer domu** (razem, np. "ul. Szeroka 18" → "ul. CENZURA")

## Struktura plików

- `app.ts` - główny serwer Express
- `CensureService.ts` - serwis do obsługi procesu cenzurowania
- `OpenAIService.ts` - serwis do komunikacji z OpenAI API

## Uruchomienie

```bash
# Z głównego katalogu projektu
npm run task5

# Lub bezpośrednio
bun run course_tasks/5/app.ts
```

## API Endpoints

- `GET /api/status` - sprawdzenie statusu serwisu
- `POST /api/run-censure` - manualne uruchomienie procesu cenzurowania

## Automatyczne uruchomienie

Aplikacja automatycznie wykonuje proces cenzurowania przy starcie serwera, a następnie pozostaje dostępna przez API.

## Wymagane zmienne środowiskowe

Aplikacja używa klucza OpenAI z zmiennej środowiskowej `OPENAI_API_KEY`. 