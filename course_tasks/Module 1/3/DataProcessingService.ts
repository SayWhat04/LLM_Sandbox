import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { OpenAIService } from './OpenAIService';
import axios from 'axios';

interface ArithmeticItem {
    question: string;
    answer: number;
}

interface TestItem {
    question: string;
    answer: number;
    test: {
        q: string;
        a: string;
    };
}

interface DataStructure {
    apikey: string;
    description: string;
    copyright: string;
    'test-data': (ArithmeticItem | TestItem)[];
}

interface FinalResponse {
    task: string;
    apikey: string;
    answer: {
        apikey: string;
        description: string;
        copyright: string;
        'test-data': (ArithmeticItem | TestItem)[];
    };
}

export class DataProcessingService {
    private filePath: string;
    private data!: DataStructure;
    private openAIService: OpenAIService;

    constructor(filePath: string = 'data.json') {
        this.filePath = join(__dirname, filePath);
        this.openAIService = new OpenAIService();
        this.loadData();
    }

    private loadData(): void {
        try {
            const fileContent = readFileSync(this.filePath, 'utf-8');
            this.data = JSON.parse(fileContent);
        } catch (error) {
            throw new Error(`Nie udało się wczytać pliku ${this.filePath}: ${error}`);
        }
    }

    private saveData(): void {
        try {
            writeFileSync(this.filePath, JSON.stringify(this.data, null, 4));
        } catch (error) {
            throw new Error(`Nie udało się zapisać pliku ${this.filePath}: ${error}`);
        }
    }

    private evaluateArithmetic(expression: string): number {
        // Wyciągamy liczby z wyrażenia dodawania
        const match = expression.match(/(\d+)\s*\+\s*(\d+)/);
        if (!match) {
            throw new Error(`Nieprawidłowe wyrażenie arytmetyczne: ${expression}`);
        }
        
        const num1 = parseInt(match[1]);
        const num2 = parseInt(match[2]);
        return num1 + num2;
    }

    private isArithmeticItem(item: any): item is ArithmeticItem {
        return item.question && 
               typeof item.answer === 'number' && 
               !item.test;
    }

    private isTestItem(item: any): item is TestItem {
        return item.question && 
               typeof item.answer === 'number' && 
               item.test && 
               item.test.q && 
               item.test.a;
    }

    public processData(): { arithmetic: ArithmeticItem[], forLLM: TestItem[] } {
        const arithmetic: ArithmeticItem[] = [];
        const forLLM: TestItem[] = [];

        for (const item of this.data['test-data']) {
            if (this.isArithmeticItem(item)) {
                // Obliczamy wynik arytmetyczny
                const calculatedResult = this.evaluateArithmetic(item.question);
                
                // Sprawdzamy czy wynik jest poprawny i tworzymy kopię z poprawką
                const processedItem: ArithmeticItem = {
                    question: (item as ArithmeticItem).question,
                    answer: (item as ArithmeticItem).answer
                };
                if (calculatedResult !== (item as ArithmeticItem).answer) {
                    console.log(`Wykryto niepoprawną odpowiedź dla "${(item as ArithmeticItem).question}": ${(item as ArithmeticItem).answer} -> ${calculatedResult}`);
                    processedItem.answer = calculatedResult;
                }
                
                arithmetic.push(processedItem);
            } else if (this.isTestItem(item)) {
                const testItem: TestItem = {
                    question: (item as TestItem).question,
                    answer: (item as TestItem).answer,
                    test: {
                        q: (item as TestItem).test.q,
                        a: (item as TestItem).test.a
                    }
                };
                forLLM.push(testItem);
            }
        }

        // NIE zapisujemy danych - tylko przetwarzamy i zwracamy wyniki
        console.log(`📊 Przetworzono ${arithmetic.length} elementów arytmetycznych i ${forLLM.length} elementów testowych`);

        return { arithmetic, forLLM };
    }

    public getStats(): { totalItems: number, arithmeticItems: number, testItems: number } {
        const arithmetic: ArithmeticItem[] = [];
        const forLLM: TestItem[] = [];

        for (const item of this.data['test-data']) {
            if (this.isArithmeticItem(item)) {
                arithmetic.push(item);
            } else if (this.isTestItem(item)) {
                forLLM.push(item);
            }
        }

        return {
            totalItems: this.data['test-data'].length,
            arithmeticItems: arithmetic.length,
            testItems: forLLM.length
        };
    }

    public async processAndSubmit(): Promise<any> {
        console.log('🔄 Rozpoczynam pełne przetwarzanie danych...');
        
        // 1. Przetwarzamy dane (arytmetyczne + testowe)
        const { arithmetic, forLLM } = this.processData();
        console.log(`📊 Przetworzono: ${arithmetic.length} arytmetycznych, ${forLLM.length} testowych`);
        
        // 2. Wysyłamy pytania testowe do LLM
        console.log('🤖 Wysyłam pytania do modelu LLM...');
        const answeredQuestions = await this.openAIService.answerQuestions(forLLM);
        console.log(`✅ Otrzymano odpowiedzi z LLM:`, answeredQuestions);
        
        // 3. Łączymy wyniki - sprawdzamy czy answeredQuestions jest tablicą
        if (!Array.isArray(answeredQuestions)) {
            throw new Error(`answeredQuestions is not an array: ${typeof answeredQuestions}`);
        }
        const combinedData = [...arithmetic, ...answeredQuestions];
        console.log(`🔗 Połączono dane: ${combinedData.length} elementów`);
        
        // 4. Tworzymy finalny obiekt
        const finalResponse: FinalResponse = {
            task: "JSON",
            apikey: this.data.apikey,
            answer: {
                apikey: this.data.apikey,
                description: this.data.description,
                copyright: this.data.copyright,
                'test-data': combinedData
            }
        };
        
        // 5. Wysyłamy na endpoint
        console.log('📡 Wysyłam dane na endpoint...');
        const response = await this.sendToEndpoint(finalResponse);
        
        return response;
    }

    private async sendToEndpoint(data: FinalResponse): Promise<any> {
        try {
            const response = await axios.post('https://c3ntrala.ag3nts.org/report', data, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            console.log('✅ Dane zostały pomyślnie wysłane!');
            console.log('📋 Odpowiedź z serwera:', response.data);
            
            return response.data;
        } catch (error) {
            console.error('❌ Błąd podczas wysyłania danych:', error);
            if (axios.isAxiosError(error)) {
                console.error('📋 Szczegóły błędu:', error.response?.data);
            }
            throw error;
        }
    }
} 