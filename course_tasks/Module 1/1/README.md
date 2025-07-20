# Task 1 - Web Scraping and LLM Integration

Ten serwis implementuje automatyczne rozwiązanie dla zadania, które:

1. **Odwiedza stronę** `https://xyz.ag3nts.org/`
2. **Pobiera pytanie** z tagu `<p id="human-question"></p>`
3. **Wysyła pytanie** do modelu językowego GPT-4
4. **Formatuje odpowiedź** w JSON z wymaganymi danymi
5. **Wysyła odpowiedź** z powrotem na stronę

## Struktura plików

- `app.ts` - Główna aplikacja Express
- `TaskService.ts` - Orkiestracja całego procesu
- `WebScrapingService.ts` - Pobieranie i wysyłanie danych
- `OpenAIService.ts` - Komunikacja z OpenAI API

## Uruchomienie

### Opcja 1: Używając npm script (zalecane)
```bash
# Z głównego katalogu projektu
npm run task1
```

### Opcja 2: Serwer Express
```bash
# Przejdź do katalogu
cd course_tasks/1

# Uruchom serwer
bun run app.ts
# lub
ts-node app.ts
```

Serwer będzie dostępny na `http://localhost:3000` i automatycznie wykona zadanie po uruchomieniu.

### Opcja 3: Test bezpośredni
```bash
# Przejdź do katalogu
cd course_tasks/1

# Uruchom test
bun run test.ts
# lub
ts-node test.ts
```

## Endpointy API

- `GET /api/status` - Sprawdź status serwisu
- `POST /api/run-task` - Ręczne uruchomienie zadania

## Wymagane zmienne środowiskowe

Upewnij się, że masz ustawioną zmienną `OPENAI_API_KEY` w swoim środowisku:

```bash
export OPENAI_API_KEY="twój-klucz-api"
```

## Proces działania

1. **Pobieranie pytania**: Serwis pobiera stronę i wyciąga pytanie z odpowiedniego tagu HTML
2. **Wysyłanie do LLM**: Pytanie jest wysyłane do GPT-4 z podstawowym kontekstem
3. **Formatowanie odpowiedzi**: Odpowiedź jest pakowana w JSON z wymaganymi danymi:
   ```json
   {
     "username": "tester",
     "password": "574e112a", 
     "answer": "odpowiedź z LLM"
   }
   ```
4. **Wysyłanie odpowiedzi**: Dane są wysyłane jako POST z headerami `application/x-www-form-urlencoded`

## Logowanie

Serwis loguje każdy krok procesu dla łatwego debugowania i monitorowania z ulepszonymi funkcjami:

### Funkcje formatowania:
- **🎯 Sformatowane logi HTML** - Automatyczne formatowanie odpowiedzi HTML dla lepszej czytelności
- **📊 JSON pretty-print** - Czytelne formatowanie obiektów JSON
- **🎨 Emoji i kolory** - Wizualne rozróżnienie różnych typów wiadomości
- **═══ Separatory** - Wyraźne oddzielenie sekcji logów

### Przykładowe formatowanie:
```
🔄 STARTING TASK PROCESS
═══════════════════════════════════════════════════════════════════════════════
1. 🌐 Fetching question from: https://xyz.ag3nts.org/
📝 Question found: Rok wybuchu drugiej wojny światowej?
2. 🤖 Sending question to LLM...
💬 LLM Answer: 1939
3. 📦 Formatted response:
{
  "username": "tester",
  "password": "574e112a",
  "answer": "1939"
}
4. 🌐 Posting answer back to website...
✅ Task completed successfully!
🎯 Response from server:
═══════════════════════════════════════════════════════════════════════════════
🎯 HTML RESPONSE FROM SERVER:
═══════════════════════════════════════════════════════════════════════════════
```

### Obsługa odpowiedzi HTML:
- Automatyczne konwersje tagów HTML na emoji i formatowanie
- Wyświetlanie zarówno sformatowanej wersji jak i surowego HTML
- Obsługa najczęstszych tagów HTML (h1, h2, h3, p, div, span, strong, em, a, br) 