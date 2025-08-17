import OpenAI from "openai";
import type { ChatCompletionMessageParam, ChatCompletion } from "openai/resources/chat/completions";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI();
  }

  async analyzeDroneMovement(instruction: string): Promise<{
    finalPosition: { row: number, col: number },
    description: string,
    reasoning: string
  }> {
    const mapDescription = `
MAPA DRONA - SIATKA 4x4:

PUNKT STARTOWY: Pozycja (1,1) - lewy górny róg

SZCZEGÓŁOWA MAPA:
RZĄD 1: [pin startowy] [łąka] [drzewo] [dom]
RZĄD 2: [łąka] [wiatrak] [łąka] [łąka]  
RZĄD 3: [łąka] [łąka] [skały] [drzewa]
RZĄD 4: [góry] [góry] [samochód] [jaskinia]

POZYCJE SZCZEGÓŁOWO:
- (1,1): Znacznik lokalizacji (pin) - PUNKT STARTOWY
- (1,2): Łąka/pole z trawą
- (1,3): Drzewo liściaste
- (1,4): Dom/budynek
- (2,1): Łąka z trawą
- (2,2): Wiatrak
- (2,3): Łąka/pole
- (2,4): Łąka/pole  
- (3,1): Łąka/pole
- (3,2): Łąka/pole
- (3,3): Skały/kamienie
- (3,4): Grupa drzew
- (4,1): Góry/wzgórza
- (4,2): Góry/wzgórza
- (4,3): Samochód
- (4,4): Jaskinia/grota

KIERUNKI:
- W prawo = zwiększ kolumnę (+1 col)
- W lewo = zmniejsz kolumnę (-1 col)  
- W dół = zwiększ rząd (+1 row)
- W górę = zmniejsz rząd (-1 row)

GRANICE: Pozycje od (1,1) do (4,4)
`;

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `Jesteś ekspertem w analizie instrukcji lotu drona na mapie 4x4.

${mapDescription}

ZADANIE:
1. Przeanalizuj instrukcję lotu drona
2. Dron ZAWSZE zaczyna w pozycji (1,1) - lewy górny róg
3. Oblicz końcową pozycję po wykonaniu wszystkich ruchów
4. Podaj opis tego co znajduje się na końcowej pozycji w maksymalnie DWÓCH słowach po polsku

ZASADY RUCHU:
- "w prawo" / "na prawo" = +1 kolumna
- "w lewo" / "na lewo" = -1 kolumna  
- "w dół" / "na dół" / "w dół" = +1 rząd
- "w górę" / "na górę" / "do góry" = -1 rząd
- "jedno pole" = ruch o 1 pozycję
- "dwa pola" = ruch o 2 pozycje
- itd.

ODPOWIEDŹ W FORMACIE JSON:
{
  "finalPosition": {"row": X, "col": Y},
  "description": "maksymalnie dwa słowa opisujące miejsce",
  "reasoning": "krok po kroku analiza ruchu"
}`
      },
      {
        role: "user",
        content: `Przeanalizuj tę instrukcję lotu drona: "${instruction}"`
      }
    ];

    const response = await this.openai.chat.completions.create({
      messages,
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content');
    }

    try {
      const result = JSON.parse(content);
      
      // Walidacja pozycji
      const row = result.finalPosition?.row;
      const col = result.finalPosition?.col;
      
      if (!row || !col || row < 1 || row > 4 || col < 1 || col > 4) {
        throw new Error(`Invalid position: (${row}, ${col})`);
      }

      return {
        finalPosition: { row, col },
        description: result.description || "nieznane",
        reasoning: result.reasoning || "brak analizy"
      };
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.error('Response content:', content);
      throw new Error('Failed to parse drone analysis response');
    }
  }

  // Pomocnicza metoda do mapowania pozycji na opis
  private getLocationDescription(row: number, col: number): string {
    const locationMap: { [key: string]: string } = {
      '1,1': 'pin startowy',
      '1,2': 'łąka',
      '1,3': 'drzewo',
      '1,4': 'dom',
      '2,1': 'łąka',
      '2,2': 'wiatrak',
      '2,3': 'łąka',
      '2,4': 'łąka',
      '3,1': 'łąka',
      '3,2': 'łąka',
      '3,3': 'skały',
      '3,4': 'drzewa',
      '4,1': 'góry',
      '4,2': 'góry',
      '4,3': 'samochód',
      '4,4': 'jaskinia'
    };

    return locationMap[`${row},${col}`] || 'nieznane';
  }

  // Metoda fallback na wypadek problemów z LLM
  async fallbackAnalysis(instruction: string): Promise<{
    finalPosition: { row: number, col: number },
    description: string,
    reasoning: string
  }> {
    // Prosta analiza tekstu bez LLM
    let row = 1; // start position
    let col = 1; // start position
    
    const text = instruction.toLowerCase();
    
    // Podstawowe wzorce ruchu
    const rightMatches = text.match(/(w prawo|na prawo|prawo)/g)?.length || 0;
    const leftMatches = text.match(/(w lewo|na lewo|lewo)/g)?.length || 0;
    const downMatches = text.match(/(w dół|na dół|dół|w dol|na dol)/g)?.length || 0;
    const upMatches = text.match(/(w górę|na górę|górę|do góry|w gore|na gore)/g)?.length || 0;
    
    col += rightMatches - leftMatches;
    row += downMatches - upMatches;
    
    // Ograniczenia mapy
    row = Math.max(1, Math.min(4, row));
    col = Math.max(1, Math.min(4, col));
    
    return {
      finalPosition: { row, col },
      description: this.getLocationDescription(row, col),
      reasoning: `Fallback analysis: prawo:${rightMatches}, lewo:${leftMatches}, dół:${downMatches}, góra:${upMatches}`
    };
  }
} 