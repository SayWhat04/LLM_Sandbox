# Barbara Photo Processing Service

Serwis do przetwarzania zdjęć Barbary - zadanie z Module 4/1 kursu AI Devs 3.

## Opis

Serwis automatycznie:

1. **Pobiera zdjęcia** - Wysyła zapytanie START do centrali i otrzymuje URLe do 4 zdjęć
2. **Analizuje jakość** - Używa GPT-4o-mini do oceny jakości każdego zdjęcia i identyfikacji Barbary
3. **Poprawia zdjęcia** - Automatycznie wysyła polecenia REPAIR/DARKEN/BRIGHTEN do centrali
4. **Iteruje proces** - Powtarza poprawki aż do uzyskania dobrej jakości (max 3 próby na zdjęcie)
5. **Generuje rysopis** - Tworzy szczegółowy opis Barbary na podstawie najlepszych zdjęć
6. **Wysyła wynik** - Przesyła rysopis do centrali jako finalną odpowiedź

## Użycie

### Uruchomienie serwera

```bash
# Uruchom serwer (domyślnie port 3000)
bun run task4_1

# Lub bezpośrednio
bun run "course_tasks/Module 4/1/app.ts"
```

### API Endpoints

- `GET /health` - Sprawdzenie statusu serwisu
- `GET /info` - Informacje o serwisie  
- `POST /process-photos` - Uruchomienie procesu przetwarzania

### Przetwarzanie zdjęć

```bash
# Uruchom przetwarzanie przez API
curl -X POST http://localhost:3000/process-photos

# Lub użyj narzędzia HTTP jak Postman/Insomnia
```

## Architektura

### OpenAIService.ts
- Komunikacja z OpenAI API
- Analiza pojedynczych i wielu zdjęć
- Generowanie rysopisu Barbary

### PhotoProcessingService.ts  
- Główna logika przetwarzania
- Komunikacja z centralą ag3nts.org
- Zarządzanie cyklem poprawek zdjęć
- Ekstraktowanie nazw plików z odpowiedzi

### app.ts
- Serwer Express
- REST API endpoints
- Obsługa błędów

## Optymalizacje

- **Tokens saving**: Używa wersji `-small` zdjęć do analizy (50% mniej tokenów)
- **Rate limiting**: Opóźnienia między requestami do API
- **Error handling**: Graceful degradation przy błędach analizy
- **Model selection**: GPT-4o-mini do analizy, GPT-4o do finalnego rysopisu

## Środowisko

Wymagane zmienne środowiskowe:
```
OPENAI_API_KEY=your_openai_api_key
```

## Monitoring

Serwis loguje szczegółowe informacje o:
- Postępie przetwarzania każdego zdjęcia
- Analizach jakości i akcjach
- Komunikacji z centralą
- Błędach i problemach

## Przykład działania

```
=== Starting photo processing ===
1. Getting initial photo information...
✓ Received 4 photo URLs
2. Processing photos...
   Processing photo 1/4: IMG_001.PNG
      Attempt 1/3 for IMG_001.PNG
      Analysis: poor - Action: REPAIR
      Sending command: REPAIR IMG_001.PNG
      Response: Zdjęcie zostało naprawione jako IMG_001_FXER.PNG
      New filename: IMG_001_FXER.PNG
      Attempt 2/3 for IMG_001_FXER.PNG
      Analysis: good - Action: none
      Final result: IMG_001_FXER.PNG - Quality: good, Barbara: true
...
3. Found 2 good quality photos of Barbara
4. Generating portrait description...
✓ Portrait description generated
5. Submitting final answer...
✓ Final answer submitted
=== Photo processing completed ===
``` 