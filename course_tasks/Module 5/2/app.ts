import express from 'express';
import cors from 'cors';
import type { Request, Response } from 'express';
import { GPSTrackingService } from './GPSTrackingService';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

interface GPSQuestion {
  question: string;
}

interface GPSCoordinate {
  lat: number;
  lon: number;
}

interface GPSResult {
  [name: string]: GPSCoordinate;
}



class GPSAgentService {
  private gpsService: GPSTrackingService;
  private question: string = "";
  private result: GPSResult = {};
  private isProcessing: boolean = false;

  constructor() {
    this.gpsService = new GPSTrackingService();
    this.loadQuestion();
  }

  private loadQuestion(): void {
    try {
      const questionPath = path.join(__dirname, 'resources', 'gps_question.json');
      const questionData = fs.readFileSync(questionPath, 'utf-8');
      const questionObj: GPSQuestion = JSON.parse(questionData);
      this.question = questionObj.question;
      console.log("📖 Pytanie załadowane:", this.question);
    } catch (error) {
      console.error("❌ Błąd przy wczytywaniu pytania:", error);
      throw error;
    }
  }

  public async processGPSRequest(): Promise<GPSResult> {
    if (this.isProcessing) {
      throw new Error("Przetwarzanie już trwa");
    }

    this.isProcessing = true;
    console.log("🚀 Rozpoczynam przetwarzanie zapytania GPS");

    try {
      // Uruchom pobieranie współrzędnych GPS
      this.result = await this.gpsService.trackGPS(this.question);
      
      console.log("✅ Przetwarzanie zakończone");
      console.log("📍 Znalezione współrzędne GPS:", JSON.stringify(this.result, null, 2));
      
      return this.result;
    } catch (error) {
      console.error("💥 Błąd podczas przetwarzania:", error);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  public getLastResult(): GPSResult {
    return this.result;
  }

  public getQuestion(): string {
    return this.question;
  }

  public getProcessingStatus(): boolean {
    return this.isProcessing;
  }
}

// Express aplikacja
const app = express();
const port = 3000;
const gpsAgent = new GPSAgentService();

app.use(express.json());
app.use(cors());

// API Endpoints

// Rozpocznij pobieranie współrzędnych GPS
app.post('/api/gps/track', async (req: Request, res: Response) => {
  try {
    const result = await gpsAgent.processGPSRequest();
    res.json({
      success: true,
      data: result,
      message: 'Pobieranie współrzędnych GPS zakończone pomyślnie'
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Sprawdź status przetwarzania
app.get('/api/gps/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      isProcessing: gpsAgent.getProcessingStatus(),
      question: gpsAgent.getQuestion(),
      lastResult: gpsAgent.getLastResult()
    }
  });
});

// Pobierz pytanie
app.get('/api/gps/question', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      question: gpsAgent.getQuestion()
    }
  });
});

// Pobierz ostatni wynik
app.get('/api/gps/result', (req: Request, res: Response) => {
  const result = gpsAgent.getLastResult();
  
  if (Object.keys(result).length === 0) {
    return res.status(404).json({
      success: false,
      error: 'Brak wyników. Najpierw uruchom pobieranie współrzędnych GPS.'
    });
  }

  res.json({
    success: true,
    data: result
  });
});

// Endpoint diagnostyczny
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'GPS Agent API działa',
    timestamp: new Date().toISOString(),
    question: gpsAgent.getQuestion(),
    isProcessing: gpsAgent.getProcessingStatus()
  });
});

// Uruchom serwer
app.listen(port, () => {
  console.log(`🚀 GPS Tracking Agent API działa na porcie ${port}`);
  console.log(`📖 Dostępne endpointy:`);
  console.log(`   POST /api/gps/track - rozpocznij pobieranie współrzędnych GPS`);
  console.log(`   GET  /api/gps/status - sprawdź status przetwarzania`);
  console.log(`   GET  /api/gps/question - pobierz pytanie`);
  console.log(`   GET  /api/gps/result - pobierz ostatni wynik`);
  console.log(`   GET  /api/health - sprawdź czy API działa`);
  console.log(`\n❓ Pytanie: ${gpsAgent.getQuestion()}`);
}); 