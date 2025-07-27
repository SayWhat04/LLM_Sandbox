import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import { OpenAIService } from './OpenAIService';
import 'dotenv/config';

interface SearchStatus {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  progress: {
    currentIteration: number;
    peopleChecked: number;
    placesChecked: number;
    barbaraLocationsFound: number;
  };
  results: {
    barbaraLocations: string[];
    foundConnections: Array<{person: string, places: string[]}>;
    foundPlaceConnections: Array<{place: string, people: string[]}>;
    initialPlaces: string[];
    finalAnswer: string | null;
    submitted: boolean;
    submissionResult: any;
  };
  logs: string[];
  error: string | null;
}

class BarbaraTrackerService {
  private openaiService: OpenAIService;
  private readonly API_KEY = "97ad060a-008e-40cc-8012-f8cbaaa3968e";
  private readonly BASE_URL = "https://c3ntrala.ag3nts.org";
  
  // Bieżący stan wyszukiwania
  private currentSearch: SearchStatus | null = null;
  
  // Śledzenie sprawdzonych elementów
  private checkedPeople = new Set<string>();
  private checkedPlaces = new Set<string>();
  
  // Kolejki do sprawdzenia
  private peopleQueue = new Set<string>();
  private placesQueue = new Set<string>();
  
  // Znalezione powiązania
  private foundConnections: Array<{person: string, places: string[]}> = [];
  private foundPlaceConnections: Array<{place: string, people: string[]}> = [];
  
  // Miejsca gdzie widziano Barbarę
  private barbaraLocations = new Set<string>();

  constructor() {
    this.openaiService = new OpenAIService();
  }

  private log(message: string): void {
    console.log(message);
    if (this.currentSearch) {
      this.currentSearch.logs.push(`${new Date().toISOString()}: ${message}`);
    }
  }

  private updateProgress(): void {
    if (this.currentSearch) {
      this.currentSearch.progress = {
        currentIteration: this.currentSearch.progress.currentIteration,
        peopleChecked: this.checkedPeople.size,
        placesChecked: this.checkedPlaces.size,
        barbaraLocationsFound: this.barbaraLocations.size
      };
      
      this.currentSearch.results = {
        barbaraLocations: Array.from(this.barbaraLocations),
        foundConnections: [...this.foundConnections],
        foundPlaceConnections: [...this.foundPlaceConnections],
        initialPlaces: this.currentSearch.results.initialPlaces,
        finalAnswer: this.currentSearch.results.finalAnswer,
        submitted: this.currentSearch.results.submitted,
        submissionResult: this.currentSearch.results.submissionResult
      };
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchFromAPI(endpoint: string, query: string): Promise<any> {
    this.log(`🔍 Sprawdzam: ${endpoint} -> ${query}`);
    
    try {
      const response = await fetch(`${this.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: this.API_KEY,
          query: query
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.log(`📋 Wynik dla ${query}: ${JSON.stringify(data)}`);
      
      // Sprawdź czy w odpowiedzi jest flaga
      if (data.message && typeof data.message === 'string' && data.message.includes('FLG:')) {
        this.log(`🚩 ZNALEZIONO FLAGĘ: ${data.message}`);
      }
      
      return data;
    } catch (error) {
      this.log(`❌ Błąd przy sprawdzaniu ${query}: ${error}`);
      throw error;
    }
  }

  private async loadBarbaraNotes(): Promise<string> {
    this.log("📖 Pobieram notatkę o Barbarze...");
    
    try {
      const response = await fetch(`${this.BASE_URL}/dane/barbara.txt`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      this.log("✅ Notatka pobrana");
      this.log(`📝 Treść notatki: ${text}`);
      return text;
    } catch (error) {
      this.log(`❌ Błąd przy pobieraniu notatki: ${error}`);
      throw error;
    }
  }

  private normalizeCity(city: string): string {
    // Pomiń dane objęte restrykcją
    if (!city || city.trim() === '' || city === '[**RESTRICTED DATA**]') {
      return '';
    }

    const result = city
      .toUpperCase()
      .trim()
      .replace(/Ą/g, 'A')
      .replace(/Ć/g, 'C')
      .replace(/Ę/g, 'E')
      .replace(/Ł/g, 'L')
      .replace(/Ń/g, 'N')
      .replace(/Ó/g, 'O')
      .replace(/Ś/g, 'S')
      .replace(/Ź/g, 'Z')
      .replace(/Ż/g, 'Z');

    return result.trim() || city.toUpperCase().trim();
  }

  private normalizeName(name: string): string {
    // Pomiń dane objęte restrykcją
    if (!name || name.trim() === '' || name === '[**RESTRICTED DATA**]') {
      return '';
    }

    // Konwersja na mianownik i usunięcie polskich znaków
    const nominativeMap: Record<string, string> = {
      'ALEKSANDRA': 'ALEKSANDER',
      'ALEKSANDROWI': 'ALEKSANDER',
      'ALEKSANDREM': 'ALEKSANDER',
      'ALEKSANDRĄ': 'ALEKSANDER',
      'ALEKSANDRZE': 'ALEKSANDER',
      'RAFAŁA': 'RAFAL',
      'RAFAŁOWI': 'RAFAL',
      'RAFAŁEM': 'RAFAL',
      'GRZEŚKOWI': 'GRZESIEK',
      'GRZEŚKIEM': 'GRZESIEK',
      'GRZEŚKA': 'GRZESIEK',
      'BARTKA': 'BARTEK',
      'BARTKIEM': 'BARTEK',
      'BARTKOWI': 'BARTEK',
      'BARBARZE': 'BARBARA',
      'BARBARĄ': 'BARBARA',
      'BARBARĘ': 'BARBARA',
      'BARBARY': 'BARBARA',
      'ANIELA': 'ANIEL',
      'ANIELE': 'ANIEL',
      'ANIELĄ': 'ANIEL'
    };

    let normalized = name.toUpperCase().trim();
    
    // Usuń polskie znaki
    normalized = normalized
      .replace(/Ą/g, 'A')
      .replace(/Ć/g, 'C')
      .replace(/Ę/g, 'E')
      .replace(/Ł/g, 'L')
      .replace(/Ń/g, 'N')
      .replace(/Ó/g, 'O')
      .replace(/Ś/g, 'S')
      .replace(/Ź/g, 'Z')
      .replace(/Ż/g, 'Z');

    // Sprawdź mapowanie na mianownik
    const result = nominativeMap[normalized] || normalized;
    
    // Dodatkowe sprawdzenie na wypadek pustego wyniku
    return result.trim() || name.toUpperCase().trim();
  }

  private async checkPerson(name: string): Promise<string[]> {
    if (this.checkedPeople.has(name)) {
      this.log(`⏭️ ${name}: już sprawdzana, pomijam`);
      return [];
    }

    this.checkedPeople.add(name);
    
    try {
      const result = await this.fetchFromAPI('/people', name);
      
      this.log(`🔍 DEBUG ${name}: Pełna odpowiedź API: ${JSON.stringify(result, null, 2)}`);
      
      // Sprawdź czy API zwróciło dane w message (format: "MIASTO1 MIASTO2 MIASTO3")
      if (result.message && typeof result.message === 'string') {
        this.log(`📋 ${name}: Otrzymano message: "${result.message}"`);
        
        // Podziel string po spacjach na osobne elementy
        const rawPlaces = result.message.trim().split(/\s+/).filter((place: string) => place.length > 0);
        this.log(`📋 ${name}: Po podzieleniu na elementy: [${rawPlaces.join(', ')}]`);
        
        // Filtruj dane objęte restrykcją
        const validPlaces = rawPlaces.filter((place: string) => 
          place && place.trim() !== '' && place !== '[**RESTRICTED DATA**]'
        );
        
        this.log(`✅ ${name}: Po filtrowaniu restricted data zostało ${validPlaces.length} miejsc: [${validPlaces.join(', ')}]`);
        
        if (validPlaces.length > 0) {
          const beforeNormalization = [...validPlaces];
          const places = validPlaces
            .map((place: string) => this.normalizeCity(place))
            .filter((place: string) => place && place.trim() !== ''); // Filtruj puste po normalizacji
          
          this.log(`🔄 ${name}: Przed normalizacją: [${beforeNormalization.join(', ')}]`);
          this.log(`🔄 ${name}: Po normalizacji: [${places.join(', ')}]`);
          
          if (places.length > 0) {
            this.foundConnections.push({ person: name, places });
            
            this.log(`👤 ${name}: znaleziono ${places.length} miejsc(a): ${places.join(', ')}`);
            
            // Dodaj nowe miejsca do kolejki
            let addedCount = 0;
            places.forEach((place: string) => {
              if (!this.checkedPlaces.has(place)) {
                this.placesQueue.add(place);
                this.log(`➕ Dodano miejsce do kolejki: ${place}`);
                addedCount++;
              } else {
                this.log(`⏭️ Miejsce ${place} już sprawdzone, pomijam`);
              }
            });
            
            this.log(`📊 ${name}: Dodano ${addedCount} nowych miast do kolejki`);
            this.updateProgress();
            return places;
          } else {
            this.log(`⚠️ ${name}: wszystkie miejsca stały się puste po normalizacji`);
          }
        } else {
          this.log(`⚠️ ${name}: wszystkie dane objęte restrykcją lub puste`);
        }
      } else if (result.message === '[**RESTRICTED DATA**]') {
        this.log(`🔒 ${name}: dane objęte restrykcją (message)`);
      } else {
        this.log(`❓ ${name}: nieoczekiwany format odpowiedzi`);
        this.log(`   • Typ result.message: ${typeof result.message}`);
        this.log(`   • Wartość result.message: ${result.message}`);
        this.log(`   • result.code: ${result.code}`);
      }
      
      return [];
    } catch (error) {
      this.log(`❌ Błąd przy sprawdzaniu osoby ${name}: ${error}`);
      return [];
    }
  }

  private async checkPlace(place: string): Promise<string[]> {
    if (this.checkedPlaces.has(place)) {
      this.log(`⏭️ ${place}: już sprawdzane, pomijam`);
      return [];
    }

    this.checkedPlaces.add(place);
    
    try {
      const result = await this.fetchFromAPI('/places', place);
      
      this.log(`🔍 DEBUG ${place}: Pełna odpowiedź API: ${JSON.stringify(result, null, 2)}`);
      
      // Sprawdź czy API zwróciło dane w message (format: "OSOBA1 OSOBA2 OSOBA3")
      if (result.message && typeof result.message === 'string') {
        this.log(`📋 ${place}: Otrzymano message: "${result.message}"`);
        
        // Podziel string po spacjach na osobne elementy
        const rawPeople = result.message.trim().split(/\s+/).filter((person: string) => person.length > 0);
        this.log(`📋 ${place}: Po podzieleniu na elementy: [${rawPeople.join(', ')}]`);
        
        // Filtruj dane objęte restrykcją
        const validPeople = rawPeople.filter((person: string) => 
          person && person.trim() !== '' && person !== '[**RESTRICTED DATA**]'
        );
        
        this.log(`✅ ${place}: Po filtrowaniu restricted data zostało ${validPeople.length} osób: [${validPeople.join(', ')}]`);
        
        if (validPeople.length > 0) {
          const beforeNormalization = [...validPeople];
          const people = validPeople
            .map((person: string) => this.normalizeName(person))
            .filter((person: string) => person && person.trim() !== ''); // Filtruj puste po normalizacji
          
          this.log(`🔄 ${place}: Przed normalizacją: [${beforeNormalization.join(', ')}]`);
          this.log(`🔄 ${place}: Po normalizacji: [${people.join(', ')}]`);
          
          if (people.length > 0) {
            this.foundPlaceConnections.push({ place, people });
            
            this.log(`🏙️ ${place}: znaleziono ${people.length} osób: ${people.join(', ')}`);
            
            // Sprawdź czy Barbara jest w tym miejscu
            if (people.includes('BARBARA')) {
              this.log(`🎯 ZNALEZIONO BARBARĘ W: ${place}`);
              this.barbaraLocations.add(place);
            }
            
            // Dodaj nowe osoby do kolejki  
            let addedCount = 0;
            people.forEach((person: string) => {
              if (!this.checkedPeople.has(person)) {
                this.peopleQueue.add(person);
                this.log(`➕ Dodano osobę do kolejki: ${person}`);
                addedCount++;
              } else {
                this.log(`⏭️ Osoba ${person} już sprawdzona, pomijam`);
              }
            });
            
            this.log(`📊 ${place}: Dodano ${addedCount} nowych osób do kolejki`);
            this.updateProgress();
            return people;
          } else {
            this.log(`⚠️ ${place}: wszystkie osoby stały się puste po normalizacji`);
          }
        } else {
          this.log(`⚠️ ${place}: wszystkie dane objęte restrykcją lub puste`);
        }
      } else if (result.message === '[**RESTRICTED DATA**]') {
        this.log(`🔒 ${place}: dane objęte restrykcją (message)`);
      } else {
        this.log(`❓ ${place}: nieoczekiwany format odpowiedzi`);
        this.log(`   • Typ result.message: ${typeof result.message}`);
        this.log(`   • Wartość result.message: ${result.message}`);
        this.log(`   • result.code: ${result.code}`);
      }
      
      return [];
    } catch (error) {
      this.log(`❌ Błąd przy sprawdzaniu miejsca ${place}: ${error}`);
      return [];
    }
  }

  public async startSearch(): Promise<string> {
    if (this.currentSearch && this.currentSearch.status === 'running') {
      throw new Error('Wyszukiwanie już trwa');
    }

    const searchId = `search_${Date.now()}`;
    this.currentSearch = {
      id: searchId,
      status: 'running',
      progress: {
        currentIteration: 0,
        peopleChecked: 0,
        placesChecked: 0,
        barbaraLocationsFound: 0
      },
      results: {
        barbaraLocations: [],
        foundConnections: [],
        foundPlaceConnections: [],
        initialPlaces: [],
        finalAnswer: null,
        submitted: false,
        submissionResult: null
      },
      logs: [],
      error: null
    };

    // Reset stanu
    this.checkedPeople.clear();
    this.checkedPlaces.clear();
    this.peopleQueue.clear();
    this.placesQueue.clear();
    this.foundConnections = [];
    this.foundPlaceConnections = [];
    this.barbaraLocations.clear();

    // Uruchom wyszukiwanie w tle
    this.findBarbara().catch((error) => {
      if (this.currentSearch) {
        this.currentSearch.status = 'error';
        this.currentSearch.error = error.message;
        this.log(`💥 Błąd w wyszukiwaniu: ${error.message}`);
      }
    });

    return searchId;
  }

  public getSearchStatus(searchId: string): SearchStatus | null {
    if (!this.currentSearch || this.currentSearch.id !== searchId) {
      return null;
    }
    return { ...this.currentSearch };
  }

  public async submitAnswer(city: string): Promise<boolean> {
    if (!this.currentSearch) {
      throw new Error('Brak aktywnego wyszukiwania');
    }

    this.log(`📤 Wysyłam odpowiedź: ${city}`);
    
    try {
      const response = await fetch(`${this.BASE_URL}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: "loop",
          apikey: this.API_KEY,
          answer: city
        })
      });

      const result = await response.json();
      this.log(`📬 Odpowiedź centrali: ${JSON.stringify(result)}`);
      
      this.currentSearch.results.submitted = true;
      this.currentSearch.results.submissionResult = result;
      
      if (result.code === 0) {
        this.log("✅ Odpowiedź zaakceptowana!");
        this.currentSearch.results.finalAnswer = city;
        return true;
      } else {
        this.log(`❌ Odpowiedź odrzucona: ${result.message}`);
        return false;
      }
    } catch (error) {
      this.log(`❌ Błąd przy wysyłaniu odpowiedzi: ${error}`);
      return false;
    }
  }

  private async findBarbara(): Promise<void> {
    try {
      this.log("🔍 Rozpoczynam poszukiwania Barbary Zawadzkiej...");
      
      // 1. Pobierz notatkę o Barbarze
      const barbaraNotes = await this.loadBarbaraNotes();
      
      // 2. Wyodrębnij imiona i miasta z notatki
      this.log("🧠 Analizuję notatkę...");
      const extracted = await this.openaiService.extractNamesAndCities(barbaraNotes);
      
      if ('error' in extracted) {
        throw new Error(`Błąd analizy notatki: ${extracted.error}`);
      }
      
      this.log(`👥 Znalezione imiona: ${extracted.names.join(', ')}`);
      this.log(`🏙️ Znalezione miasta: ${extracted.cities.join(', ')}`);
      
      // 3. Dodaj do kolejek
      this.log(`\n📋 Dodaję do kolejek początkowe elementy:`);
      extracted.names.forEach(name => {
        this.peopleQueue.add(name);
        this.log(`➕ Osoba: ${name}`);
      });
      extracted.cities.forEach(city => {
        this.placesQueue.add(city);
        this.log(`➕ Miasto: ${city}`);
      });
      
      // Zapisz znane miejsca Barbary z notatki
      const initialBarbaraPlaces = new Set(extracted.cities);
      if (this.currentSearch) {
        this.currentSearch.results.initialPlaces = extracted.cities;
      }
      
      this.log(`\n🎯 Szukam Barbary w nowych miejscach (nie z notatki początkowej)`);
      this.log(`📍 Znane miejsca z notatki: ${Array.from(initialBarbaraPlaces).join(', ')}`);
      
      // 4. Główna pętla wyszukiwania
      let iterations = 0;
      const maxIterations = 50; // Zabezpieczenie przed nieskończoną pętlą
      
      while ((this.peopleQueue.size > 0 || this.placesQueue.size > 0) && iterations < maxIterations) {
        iterations++;
        if (this.currentSearch) {
          this.currentSearch.progress.currentIteration = iterations;
        }
        
        this.log(`\n🔄 === ITERACJA ${iterations} ===`);
        this.log(`📊 Stan kolejek - Osoby: ${this.peopleQueue.size}, Miasta: ${this.placesQueue.size}`);
        this.log(`📈 Progress - Sprawdzono osób: ${this.checkedPeople.size}, Sprawdzono miast: ${this.checkedPlaces.size}`);
        this.log(`🎯 Znalezione lokacje Barbary: ${this.barbaraLocations.size}`);
        
        // Sprawdź osoby
        const peopleToCheck = Array.from(this.peopleQueue);
        this.peopleQueue.clear();
        
        this.log(`\n📋 Stan kolejek PRZED sprawdzaniem osób:`);
        this.log(`   • Osób do sprawdzenia: ${peopleToCheck.length} [${peopleToCheck.join(', ')}]`);
        this.log(`   • Miast w kolejce: ${this.placesQueue.size} [${Array.from(this.placesQueue).join(', ')}]`);
        
        if (peopleToCheck.length > 0) {
          this.log(`\n👥 Sprawdzam ${peopleToCheck.length} osób: ${peopleToCheck.join(', ')}`);
          for (const person of peopleToCheck) {
            this.log(`\n🔍 === Sprawdzam osobę: ${person} ===`);
            await this.checkPerson(person);
            this.log(`📊 Po sprawdzeniu ${person}: kolejka miast ma teraz ${this.placesQueue.size} elementów`);
            await this.sleep(300); // Opóźnienie między requestami
          }
        } else {
          this.log(`⚠️ Brak osób do sprawdzenia w tej iteracji`);
        }
        
        // Sprawdź miejsca
        const placesToCheck = Array.from(this.placesQueue);
        this.placesQueue.clear();
        
        this.log(`\n📋 Stan kolejek PRZED sprawdzaniem miast:`);
        this.log(`   • Miast do sprawdzenia: ${placesToCheck.length} [${placesToCheck.join(', ')}]`);
        this.log(`   • Osób w kolejce: ${this.peopleQueue.size} [${Array.from(this.peopleQueue).join(', ')}]`);
        
        if (placesToCheck.length > 0) {
          this.log(`\n🏙️ Sprawdzam ${placesToCheck.length} miast: ${placesToCheck.join(', ')}`);
          for (const place of placesToCheck) {
            this.log(`\n🔍 === Sprawdzam miejsce: ${place} ===`);
            await this.checkPlace(place);
            this.log(`📊 Po sprawdzeniu ${place}: kolejka osób ma teraz ${this.peopleQueue.size} elementów`);
            await this.sleep(300); // Opóźnienie między requestami
          }
        } else {
          this.log(`⚠️ Brak miast do sprawdzenia w tej iteracji`);
        }
        
        // Podsumowanie iteracji
        this.log(`\n📝 Koniec iteracji ${iterations}:`);
        this.log(`   • Nowe osoby w kolejce: ${this.peopleQueue.size}`);
        this.log(`   • Nowe miasta w kolejce: ${this.placesQueue.size}`);
        this.log(`   • Razem sprawdzono osób: ${this.checkedPeople.size}`);
        this.log(`   • Razem sprawdzono miast: ${this.checkedPlaces.size}`);
        this.log(`   • Lokacje z Barbarą: ${Array.from(this.barbaraLocations).join(', ') || 'brak'}`);
        
        // Sprawdź czy znaleziono już nowe miejsce Barbary
        const currentNewLocation = Array.from(this.barbaraLocations)
          .find(location => !initialBarbaraPlaces.has(location));
        if (currentNewLocation) {
          this.log(`🎉 ZNALEZIONO NOWE MIEJSCE BARBARY: ${currentNewLocation}`);
        }
        
        // Sprawdź warunki kontynuacji pętli
        const shouldContinue = (this.peopleQueue.size > 0 || this.placesQueue.size > 0) && iterations < maxIterations;
        this.log(`\n🔄 Warunki kontynuacji pętli:`);
        this.log(`   • Osoby w kolejce: ${this.peopleQueue.size > 0 ? '✅' : '❌'} (${this.peopleQueue.size})`);
        this.log(`   • Miasta w kolejce: ${this.placesQueue.size > 0 ? '✅' : '❌'} (${this.placesQueue.size})`);
        this.log(`   • Limit iteracji: ${iterations < maxIterations ? '✅' : '❌'} (${iterations}/${maxIterations})`);
        this.log(`   • Kontynuować pętlę: ${shouldContinue ? '✅ TAK' : '❌ NIE'}`);
      }
      
      if (iterations >= maxIterations) {
        this.log(`⚠️ Osiągnięto maksymalną liczbę iteracji (${maxIterations})`);
      }
      
      // 5. Analizuj wyniki
      this.log("\n📊 PODSUMOWANIE WYSZUKIWAŃ:");
      this.log(`👥 Sprawdzone osoby: ${Array.from(this.checkedPeople).join(', ')}`);
      this.log(`🏙️ Sprawdzone miejsca: ${Array.from(this.checkedPlaces).join(', ')}`);
      this.log(`🎯 Miejsca gdzie widziano Barbarę: ${Array.from(this.barbaraLocations).join(', ')}`);
      
      // 6. Znajdź nowe miejsce Barbary (nie z notatki)
      const newBarbaraLocation = Array.from(this.barbaraLocations)
        .find(location => !initialBarbaraPlaces.has(location));
      
      if (newBarbaraLocation) {
        this.log(`\n🎉 ZNALEZIONO NOWE MIEJSCE BARBARY: ${newBarbaraLocation}`);
        
        // Automatyczne wysłanie odpowiedzi można włączyć przez API endpoint
        if (this.currentSearch) {
          this.currentSearch.results.finalAnswer = newBarbaraLocation;
        }
      } else {
        this.log("❌ Nie znaleziono nowego miejsca Barbary");
        this.log(`📋 Wszystkie znalezione lokacje to: ${Array.from(this.barbaraLocations).join(', ')}`);
      }
      
      // Wyświetl szczegółowe powiązania
      this.log("\n🔗 SZCZEGÓŁOWE POWIĄZANIA:");
      this.foundConnections.forEach(conn => {
        this.log(`👤 ${conn.person}: ${conn.places.join(', ')}`);
      });
      
      this.foundPlaceConnections.forEach(conn => {
        this.log(`🏙️ ${conn.place}: ${conn.people.join(', ')}`);
      });
      
      if (this.currentSearch) {
        this.currentSearch.status = 'completed';
      }
      
    } catch (error) {
      this.log(`💥 Błąd w głównej funkcji: ${error}`);
      throw error;
    }
  }
}

// Express aplikacja
const app = express();
const port = 3000;
const barbaraService = new BarbaraTrackerService();

app.use(express.json());
app.use(cors());

// API Endpoints

// Rozpocznij wyszukiwanie
app.post('/api/search/start', async (req: Request, res: Response) => {
  try {
    const searchId = await barbaraService.startSearch();
    res.json({
      success: true,
      searchId,
      message: 'Wyszukiwanie rozpoczęte'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Sprawdź status wyszukiwania
app.get('/api/search/:searchId/status', (req: Request, res: Response) => {
  const { searchId } = req.params;
  const status = barbaraService.getSearchStatus(searchId);
  
  if (!status) {
    return res.status(404).json({
      success: false,
      error: 'Nie znaleziono wyszukiwania o podanym ID'
    });
  }
  
  res.json({
    success: true,
    data: status
  });
});

// Wyślij odpowiedź do centrali
app.post('/api/search/submit', async (req: Request, res: Response) => {
  try {
    const { city } = req.body;
    
    if (!city) {
      return res.status(400).json({
        success: false,
        error: 'Pole city jest wymagane'
      });
    }
    
    const success = await barbaraService.submitAnswer(city);
    res.json({
      success,
      message: success ? 'Odpowiedź zaakceptowana' : 'Odpowiedź odrzucona'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint diagnostyczny
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Barbara Tracker API działa',
    timestamp: new Date().toISOString()
  });
});

// Uruchom serwer
app.listen(port, () => {
  console.log(`🚀 Barbara Tracker API działa na porcie ${port}`);
  console.log(`📖 Dostępne endpointy:`);
  console.log(`   POST /api/search/start - rozpocznij wyszukiwanie`);
  console.log(`   GET  /api/search/:id/status - sprawdź status`);
  console.log(`   POST /api/search/submit - wyślij odpowiedź`);
  console.log(`   GET  /api/health - sprawdź czy API działa`);
}); 