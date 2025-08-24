import { OpenAIService } from './OpenAIService';

interface GPSCoordinate {
  lat: number;
  lon: number;
}

interface GPSResult {
  [name: string]: GPSCoordinate;
}

export class GPSTrackingService {
  private openaiService: OpenAIService;
  private readonly API_KEY = "97ad060a-008e-40cc-8012-f8cbaaa3968e";
  private readonly BASE_URL = "https://c3ntrala.ag3nts.org";

  constructor() {
    this.openaiService = new OpenAIService();
  }

  private log(message: string): void {
    console.log(`[GPS] ${message}`);
  }

  private async callPlacesAPI(location: string): Promise<any> {
    this.log(`🔍 Sprawdzam lokalizację: ${location}`);
    
    try {
      const response = await fetch(`${this.BASE_URL}/places`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apikey: this.API_KEY,
          query: location
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.log(`📋 Wynik dla ${location}: ${JSON.stringify(data)}`);
      return data;
    } catch (error) {
      this.log(`❌ Błąd przy sprawdzaniu ${location}: ${error}`);
      throw error;
    }
  }

  private async callDatabaseAPI(query: string): Promise<any> {
    this.log(`🗄️ Wykonuję zapytanie SQL: ${query}`);
    
    try {
      const response = await fetch(`${this.BASE_URL}/apidb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task: "database",
          apikey: this.API_KEY,
          query: query
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.log(`📊 Wynik zapytania: ${JSON.stringify(data)}`);
      return data;
    } catch (error) {
      this.log(`❌ Błąd przy wykonywaniu zapytania: ${error}`);
      throw error;
    }
  }

  private async callGPSAPI(userID: string): Promise<GPSCoordinate | null> {
    this.log(`📍 Pobieranie współrzędnych GPS dla ID: ${userID}`);
    
    try {
      const response = await fetch(`${this.BASE_URL}/gps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userID: userID
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      this.log(`📍 Współrzędne dla ID ${userID}: ${JSON.stringify(data)}`);
      
      // API GPS zwraca dane w formacie: {"code":0,"message":{"lat":X,"lon":Y}}
      if (data.code === 0 && data.message && data.message.lat !== undefined && data.message.lon !== undefined) {
        return {
          lat: data.message.lat,
          lon: data.message.lon
        };
      }
      
      this.log(`⚠️ Niepoprawny format odpowiedzi GPS dla ID ${userID}`);
      this.log(`   • code: ${data.code}`);
      this.log(`   • message: ${JSON.stringify(data.message)}`);
      return null;
    } catch (error) {
      this.log(`❌ Błąd przy pobieraniu współrzędnych dla ID ${userID}: ${error}`);
      return null;
    }
  }



  private async getPeopleInLocation(location: string): Promise<string[]> {
    this.log(`👥 Pobieranie osób w lokalizacji: ${location}`);
    
    try {
      // Używaj TYLKO places API do pobierania listy osób
      const placesResult = await this.callPlacesAPI(location);
      
      // API places zwraca dane w polu "message", nie "reply"
      if (placesResult.code === 0 && placesResult.message) {
        this.log(`📋 Otrzymano message: "${placesResult.message}"`);
        
        // Parsuj string z imionami oddzielonymi spacjami
        const people = placesResult.message.trim().split(/\s+/);
        
        // Filtruj Barbarę i puste wartości
        const filteredPeople = people.filter((person: string) => 
          person && 
          person.trim() !== '' && 
          !person.toLowerCase().includes('barbara')
        );
        
        this.log(`✅ Znaleziono ${filteredPeople.length} osób: ${filteredPeople.join(', ')}`);
        return filteredPeople;
      }

      this.log(`⚠️ Places API nie zwróciło poprawnych danych`);
      this.log(`   • code: ${placesResult.code}`);
      this.log(`   • message: ${placesResult.message}`);
      return [];
    } catch (error) {
      this.log(`❌ Błąd przy pobieraniu osób: ${error}`);
      return [];
    }
  }

  private async getPersonId(personName: string): Promise<string | null> {
    this.log(`🆔 Pobieranie ID dla: ${personName}`);
    
    try {
      // Użyj konkretnego zapytania SQL
      const query = `SELECT * FROM users WHERE username='${personName}'`;
      const result = await this.callDatabaseAPI(query);
      
      // API database zwraca dane w polu "reply", nie "message"
      if (result.error === "OK" && result.reply && Array.isArray(result.reply) && result.reply.length > 0) {
        const userData = result.reply[0]; // Pierwszy (i prawdopodobnie jedyny) rekord
        const userId = userData.id; // Wyciągnij tylko ID
        this.log(`✅ ID dla ${personName}: ${userId}`);
        return userId;
      }
      
      this.log(`❌ Nie znaleziono danych dla ${personName}`);
      this.log(`   • error: ${result.error}`);
      this.log(`   • reply: ${JSON.stringify(result.reply)}`);
      return null;
    } catch (error) {
      this.log(`❌ Błąd przy pobieraniu ID dla ${personName}: ${error}`);
      return null;
    }
  }

  private async getPersonIDs(people: string[]): Promise<{[name: string]: string}> {
    this.log(`🆔 Pobieranie ID dla ${people.length} osób`);
    
    const result: {[name: string]: string} = {};

    for (const person of people) {
      if (person.toLowerCase().includes('barbara')) {
        this.log(`⚠️ Pomijam ${person} (zawiera 'barbara')`);
        continue;
      }

      this.log(`🔍 Szukam ID dla: ${person}`);
      
      // Pobierz ID osoby z bazy danych
      const personId = await this.getPersonId(person);
      
      if (personId) {
        result[person] = personId;
        this.log(`✅ Znaleziono ID dla ${person}: ${personId}`);
      } else {
        this.log(`❌ Brak ID dla ${person}`);
      }
    }

    return result;
  }



  public async trackGPS(question: string): Promise<GPSResult> {
    try {
      this.log("🚀 Rozpoczynam pobieranie współrzędnych GPS");
      this.log(`❓ Pytanie: ${question}`);

      // 1. Analizuj pytanie
      const analysis = await this.openaiService.analyzeQuestion(question);
      this.log(`🧠 Analiza: ${JSON.stringify(analysis)}`);

      // 2. Pobierz listę osób w lokalizacji
      const people = await this.getPeopleInLocation(analysis.location);
      this.log(`👥 Znaleziono ${people.length} osób w ${analysis.location}: ${people.join(', ')}`);

      if (people.length === 0) {
        this.log("⚠️ Nie znaleziono osób w podanej lokalizacji");
        return {};
      }

      // 3. Pobierz ID osób z bazy danych (już filtruje Barbarę)
      const personIDs = await this.getPersonIDs(people);
      this.log(`🆔 Pobrano ${Object.keys(personIDs).length} ID osób`);

      // 4. Pobierz współrzędne GPS dla każdego ID
      const result: GPSResult = {};
      
      for (const [name, id] of Object.entries(personIDs)) {
        this.log(`📍 Pobieranie GPS dla ${name} (ID: ${id})`);
        
        const coordinates = await this.callGPSAPI(id);
        if (coordinates) {
          result[name] = coordinates;
          this.log(`✅ GPS dla ${name}: ${coordinates.lat}, ${coordinates.lon}`);
        } else {
          this.log(`❌ Brak współrzędnych GPS dla ${name}`);
        }
        
        // Krótkie opóźnienie między requestami
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      this.log(`✅ Końcowy wynik: ${Object.keys(result).length} lokalizacji GPS`);
      return result;

    } catch (error) {
      this.log(`💥 Błąd w pobieraniu współrzędnych GPS: ${error}`);
      throw error;
    }
  }
} 