import * as fs from 'fs';
import * as path from 'path';

interface FineTuningMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface FineTuningEntry {
  messages: FineTuningMessage[];
}

async function generateFineTuningData(): Promise<void> {
  try {
    const resourcesPath = path.join(__dirname, 'resources');
    const correctFilePath = path.join(resourcesPath, 'correct.txt');
    const incorrectFilePath = path.join(resourcesPath, 'incorect.txt');
    const outputFilePath = path.join(__dirname, 'finetune_data.jsonl');

    // Read both files
    const correctData = fs.readFileSync(correctFilePath, 'utf-8');
    const incorrectData = fs.readFileSync(incorrectFilePath, 'utf-8');

    // Split into lines and filter out empty lines
    const correctLines = correctData.split('\n').filter(line => line.trim() !== '');
    const incorrectLines = incorrectData.split('\n').filter(line => line.trim() !== '');

    console.log(`Found ${correctLines.length} correct examples`);
    console.log(`Found ${incorrectLines.length} incorrect examples`);

    const jsonlEntries: string[] = [];

    // Process correct data (label: "1")
    for (const line of correctLines) {
      const entry: FineTuningEntry = {
        messages: [
          {
            role: 'system',
            content: 'validate data'
          },
          {
            role: 'user',
            content: line.trim()
          },
          {
            role: 'assistant',
            content: '1'
          }
        ]
      };
      jsonlEntries.push(JSON.stringify(entry));
    }

    // Process incorrect data (label: "0")
    for (const line of incorrectLines) {
      const entry: FineTuningEntry = {
        messages: [
          {
            role: 'system',
            content: 'validate data'
          },
          {
            role: 'user',
            content: line.trim()
          },
          {
            role: 'assistant',
            content: '0'
          }
        ]
      };
      jsonlEntries.push(JSON.stringify(entry));
    }

    // Shuffle the entries to mix correct and incorrect examples
    for (let i = jsonlEntries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [jsonlEntries[i], jsonlEntries[j]] = [jsonlEntries[j], jsonlEntries[i]];
    }

    // Write JSONL file
    fs.writeFileSync(outputFilePath, jsonlEntries.join('\n'), 'utf-8');

    console.log(`✅ Fine-tuning data generated successfully!`);
    console.log(`📁 Output file: ${outputFilePath}`);
    console.log(`📊 Total entries: ${jsonlEntries.length}`);
    console.log(`   - Correct examples: ${correctLines.length}`);
    console.log(`   - Incorrect examples: ${incorrectLines.length}`);

    // Display first few examples
    console.log('\n🔍 First 3 examples:');
    for (let i = 0; i < Math.min(3, jsonlEntries.length); i++) {
      const entry = JSON.parse(jsonlEntries[i]);
      console.log(`${i + 1}. Input: "${entry.messages[1].content}" → Output: "${entry.messages[2].content}"`);
    }

  } catch (error) {
    console.error('❌ Error generating fine-tuning data:', error);
    process.exit(1);
  }
}

// Run the script
generateFineTuningData(); 