import { WebCrawlerService } from './WebCrawlerService.js';

interface Question {
  question: string;
  id: string;
}

interface QuestionsData {
  [key: string]: string;
}

interface AnswerData {
  [key: string]: string;
}

interface FinalResponse {
  task: string;
  apikey: string;
  answer: AnswerData;
}

class SoftoAgent {
  private webCrawler: WebCrawlerService;
  private readonly API_KEY = "97ad060a-008e-40cc-8012-f8cbaaa3968e";
  private readonly QUESTIONS_URL = `https://c3ntrala.ag3nts.org/data/${this.API_KEY}/softo.json`;
  private readonly REPORT_URL = "https://c3ntrala.ag3nts.org/report";

  constructor() {
    this.webCrawler = new WebCrawlerService();
  }

  async fetchQuestions(): Promise<Question[]> {
    console.log('📥 Fetching questions...');
    
    try {
      const response = await fetch(this.QUESTIONS_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: QuestionsData = await response.json();
      console.log('Questions received:', data);
      
      // Konwertujemy obiekt na tablicę pytań
      const questions: Question[] = Object.entries(data).map(([id, question]) => ({
        id,
        question
      }));
      
      return questions;
    } catch (error) {
      console.error('Error fetching questions:', error);
      throw error;
    }
  }

  async processAllQuestions(): Promise<AnswerData> {
    const questions = await this.fetchQuestions();
    const answers: AnswerData = {};
    
    console.log(`\n🎯 Processing ${questions.length} questions...`);
    
    for (const question of questions) {
      try {
        console.log(`\n${'='.repeat(60)}`);
        const answer = await this.webCrawler.searchForAnswer(question);
        answers[question.id] = answer;
        console.log(`✅ Question ${question.id} completed: ${answer}`);
      } catch (error) {
        console.error(`❌ Failed to answer question ${question.id}:`, error);
        // Możemy dodać fallback lub retry logic tutaj
        answers[question.id] = "Nie udało się znaleźć odpowiedzi";
      }
    }
    
    return answers;
  }

  async submitAnswers(answers: AnswerData): Promise<void> {
    const payload: FinalResponse = {
      task: "softo",
      apikey: this.API_KEY,
      answer: answers
    };
    
    console.log('\n📤 Submitting answers...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    try {
      const response = await fetch(this.REPORT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.text();
      console.log('✅ Response from server:', result);
      
    } catch (error) {
      console.error('❌ Error submitting answers:', error);
      throw error;
    }
  }

  async run(): Promise<void> {
    try {
      console.log('🚀 Starting Softo Agent...');
      
      const answers = await this.processAllQuestions();
      
      console.log('\n📋 Final answers:');
      Object.entries(answers).forEach(([id, answer]) => {
        console.log(`${id}: ${answer}`);
      });
      
      await this.submitAnswers(answers);
      
      console.log('\n🎉 Task completed successfully!');
      
    } catch (error) {
      console.error('💥 Fatal error:', error);
      process.exit(1);
    }
  }
}

// Uruchamiamy agenta
const agent = new SoftoAgent();
agent.run(); 