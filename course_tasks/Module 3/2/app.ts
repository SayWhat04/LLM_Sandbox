import { OpenAIService } from './OpenAIService';
import { VectorService } from './VectorService';
import fs from 'fs/promises';
import path from 'path';

const QUERY = 'W raporcie, z którego dnia znajduje się wzmianka o kradzieży prototypu broni?';
const COLLECTION_NAME = 'reports';

interface Report {
    text: string;
    metaData: Record<string, any>;
}


const openAIService = new OpenAIService();
const vectorService = new VectorService(openAIService);

async function main() {
    // 1. Import reports
    const reports = await initializeData();
    await vectorService.initializeCollectionWithData(COLLECTION_NAME, reports);
    const searchResults = await vectorService.performSearch(COLLECTION_NAME, QUERY);
    const reportDate = searchResults[0].payload?.createdDate || 'Nie znaleziono daty';
    console.log(`Data raportu: ${reportDate}`);

    const answer = {
        reportDate: reportDate
    }
    console.log(answer);

    // TODO: Pozostałe kroki po skonfigurowaniu API key
    // 2. Index reports
    // 2.1. Get report date from file name
    // 2.2. Get report content
    // 2.3. Create vector (embedding) for report
    // 2.4. Add vector to collection
    // 3. Generate vector (embedding) for query
    // 4. Search for query
    // 5. Return report date
}

async function initializeData(): Promise<Report[]> {
    const resourcesPath = path.join(__dirname, 'resources');
    
    try {
        // Odczytaj wszystkie pliki z folderu resources
        const files = await fs.readdir(resourcesPath);
        const txtFiles = files.filter(file => file.endsWith('.txt'));
        
        const reports: Report[] = [];
        
        for (const file of txtFiles) {
            // Wyodrębnij datę z nazwy pliku (2024_01_08.txt -> 2024-01-08)
            const dateMatch = file.match(/(\d{4})_(\d{2})_(\d{2})\.txt/);
            if (dateMatch) {
                const [, year, month, day] = dateMatch;
                const createdDate = `${year}-${month}-${day}`;
                
                // Przeczytaj zawartość pliku
                const filePath = path.join(resourcesPath, file);
                const text = await fs.readFile(filePath, 'utf-8');
                
                reports.push({
                    text: text.trim(),
                    metaData: {
                        createdDate
                    }
                });
            }
        }
        
        // Sortuj raporty według daty
        reports.sort((a, b) => a.metaData.createdDate.localeCompare(b.metaData.createdDate));
        
        // Zapisz do pliku answer.json
        const result = { reports };
        await fs.writeFile(
            path.join(__dirname, 'answer.json'), 
            JSON.stringify(result, null, 2), 
            'utf-8'
        );
        
        console.log(`Załadowano ${reports.length} raportów do answer.json`);
        
        return reports;
        
    } catch (error) {
        console.error('Błąd podczas ładowania danych:', error);
        return [];
    }
}


main().catch(console.error);
