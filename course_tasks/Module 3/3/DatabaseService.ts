import { CENTRAL_API_KEY } from "../../0-util/apiKey";
import { OpenAIService } from "./OpenAIService";

interface DatabaseAPIRequest {
  task: string;
  apikey: string;
  query: string;
}

interface DatabaseAPIResponse {
  message: string;
  error?: string;
  reply?: any[];
}

interface TableSchema {
  tableName: string;
  createStatement: string;
}

export class DatabaseService {
  private openaiService: OpenAIService;
  private readonly CENTRAL_API_URL = 'https://c3ntrala.ag3nts.org/apidb';
  private readonly CENTRAL_API_KEY = CENTRAL_API_KEY;

  constructor() {
    this.openaiService = new OpenAIService();
  }

  private async executeQuery(query: string): Promise<DatabaseAPIResponse> {
    console.log('\n' + '='.repeat(80));
    console.log(`📤 EXECUTING SQL QUERY:`);
    console.log(`🔍 Query: ${query}`);
    console.log(`🌐 URL: ${this.CENTRAL_API_URL}`);
    console.log('='.repeat(80));
    
    const request: DatabaseAPIRequest = {
      task: "database",
      apikey: this.CENTRAL_API_KEY,
      query: query
    };

    console.log(`📋 Request payload:`, {
      task: request.task,
      apikey: `${request.apikey.substring(0, 8)}...`,
      query: request.query
    });

    try {
      const response = await fetch(this.CENTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      console.log(`📡 HTTP Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DatabaseAPIResponse = await response.json();
      console.log(`📥 Database Response:`);
      console.log(`   Message: ${data.message}`);
      console.log(`   Error field: ${data.error || 'none'}`);
      console.log(`   Reply rows: ${data.reply ? data.reply.length : 0}`);
      if (data.reply && data.reply.length > 0) {
        console.log(`   First row sample:`, data.reply[0]);
        if (data.reply.length > 1) {
          console.log(`   ... and ${data.reply.length - 1} more rows`);
        }
      }
      console.log('='.repeat(80) + '\n');
      
      // Check for actual errors - "OK" is not an error
      if (data.error && data.error !== "OK" && data.error.toLowerCase() !== "ok") {
        throw new Error(`Database API error: ${data.error}`);
      }

      return data;
    } catch (error) {
      console.error('❌ ERROR executing database query:', error);
      console.log('='.repeat(80) + '\n');
      throw error;
    }
  }

  async discoverTables(): Promise<string[]> {
    console.log('🔍 Discovering database tables...');
    
    try {
      const response = await this.executeQuery('SHOW TABLES');
      
      if (!response.reply || !Array.isArray(response.reply)) {
        throw new Error('Invalid response format for SHOW TABLES');
      }

      // Extract table names from the response
      const tables = response.reply.map(row => {
        // Response format might be [{"Tables_in_database": "table_name"}] or similar
        const firstValue = Object.values(row)[0] as string;
        return firstValue;
      });

      console.log(`📋 Found tables: ${tables.join(', ')}`);
      return tables;
    } catch (error) {
      console.error('❌ Error discovering tables:', error);
      throw error;
    }
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    console.log(`🔍 Getting schema for table: ${tableName}`);
    
    try {
      const response = await this.executeQuery(`SHOW CREATE TABLE ${tableName}`);
      
      if (!response.reply || !Array.isArray(response.reply) || response.reply.length === 0) {
        throw new Error(`Invalid response format for SHOW CREATE TABLE ${tableName}`);
      }

      // The response usually contains the CREATE TABLE statement
      const createTableRow = response.reply[0];
      const createStatement = createTableRow[`Create Table`] || createTableRow[`CREATE TABLE`] || Object.values(createTableRow)[1] as string;

      if (!createStatement) {
        throw new Error(`Could not extract CREATE TABLE statement for ${tableName}`);
      }

      console.log(`📋 Schema for ${tableName}:`, createStatement.substring(0, 200) + '...');
      
      return {
        tableName,
        createStatement
      };
    } catch (error) {
      console.error(`❌ Error getting schema for table ${tableName}:`, error);
      throw error;
    }
  }

  async generateSQLQuery(schemas: TableSchema[]): Promise<string> {
    console.log('\n' + '🤖'.repeat(40));
    console.log('🤖 GENERATING SQL QUERY USING LLM...');
    console.log('🤖'.repeat(40));
    
    console.log(`📊 Schemas to analyze (${schemas.length} tables):`);
    schemas.forEach((schema, index) => {
      console.log(`   ${index + 1}. ${schema.tableName}`);
    });
    
    const schemasText = schemas.map(schema => 
      `TABLE: ${schema.tableName}\n${schema.createStatement}\n`
    ).join('\n---\n');

    console.log(`\n📝 Full schemas text (${schemasText.length} characters):`);
    console.log(schemasText.substring(0, 500) + '...\n');

    const prompt = `Przeanalizuj poniższe schematy tabel i napisz zapytanie SQL, które zwróci DC_ID aktywnych datacenter, których menadżerowie (z tabeli users) są nieaktywni.

SCHEMATY TABEL:
${schemasText}

ZADANIE:
- Znajdź aktywne datacenters (is_active = 1 lub podobne pole)
- Sprawdź czy ich menadżerowie z tabeli users są nieaktywni (is_active = 0 lub podobne pole)
- Zwróć tylko DC_ID tych datacenter

WAŻNE INSTRUKCJE:
1. Zwróć TYLKO surowe zapytanie SQL, bez żadnych dodatkowych opisów, komentarzy czy formatowania Markdown
2. Nie dodawaj wyjaśnień ani komentarzy
3. Zapytanie musi być gotowe do wykonania
4. Zwróć tylko i wyłącznie tekst zapytania SQL

SQL:`;

    console.log(`🧠 Sending prompt to GPT-4o (${prompt.length} characters)...`);

    try {
      const response = await this.openaiService.completion({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "gpt-4o",
        temperature: 0
      });

      if (this.openaiService.isStreamResponse(response)) {
        throw new Error('Streaming response not supported for SQL generation');
      }

      const sqlQuery = response.choices[0]?.message?.content?.trim();
      
      if (!sqlQuery) {
        throw new Error('Empty SQL query generated');
      }

      console.log(`✅ Raw LLM response (${sqlQuery.length} characters):`);
      console.log(`"${sqlQuery}"\n`);

      // Clean up the response - remove markdown formatting if present
      let cleanQuery = sqlQuery;
      if (cleanQuery.includes('```')) {
        const match = cleanQuery.match(/```(?:sql)?\s*([\s\S]*?)\s*```/i);
        if (match) {
          cleanQuery = match[1].trim();
          console.log(`🧹 Removed markdown formatting from query`);
        }
      }

      console.log(`🎯 FINAL CLEANED SQL QUERY:`);
      console.log(`${cleanQuery}`);
      console.log('🤖'.repeat(40) + '\n');
      return cleanQuery;
    } catch (error) {
      console.error('❌ Error generating SQL query:', error);
      throw error;
    }
  }

  async findInactiveManagerDatacenters(): Promise<number[]> {
    console.log('🚀 Starting database analysis process...');
    
    try {
      // Step 1: Discover tables
      const tables = await this.discoverTables();
      
      // Step 2: Get schemas for relevant tables (users, datacenters, datacenter, etc.)
      const relevantTables = tables.filter(table => 
        table.toLowerCase().includes('user') || 
        table.toLowerCase().includes('datacenter') ||
        table.toLowerCase().includes('manager')
      );

      if (relevantTables.length === 0) {
        // Fallback - get all tables if we can't identify relevant ones
        console.log('⚠️ No obviously relevant tables found, getting all table schemas...');
        const schemas = await Promise.all(
          tables.slice(0, 5).map(table => this.getTableSchema(table)) // Limit to first 5 tables
        );
        
        const sqlQuery = await this.generateSQLQuery(schemas);
        const result = await this.executeQuery(sqlQuery);
        
        return this.extractDCIds(result);
      }

      console.log(`📋 Getting schemas for relevant tables: ${relevantTables.join(', ')}`);
      
      // Step 3: Get schemas for relevant tables
      const schemas = await Promise.all(
        relevantTables.map(table => this.getTableSchema(table))
      );

      // Step 4: Generate SQL query using LLM
      const sqlQuery = await this.generateSQLQuery(schemas);

      // Step 5: Execute the generated query
      const result = await this.executeQuery(sqlQuery);

      // Step 6: Extract DC_IDs from the result
      const dcIds = this.extractDCIds(result);
      
      console.log(`✅ Found ${dcIds.length} datacenter IDs: ${dcIds.join(', ')}`);
      return dcIds;

    } catch (error) {
      console.error('❌ Error in database analysis process:', error);
      throw error;
    }
  }

  private extractDCIds(result: DatabaseAPIResponse): number[] {
    if (!result.reply || !Array.isArray(result.reply)) {
      throw new Error('Invalid database response format');
    }

    const dcIds: number[] = [];
    
    result.reply.forEach(row => {
      // Try to find DC_ID in different possible column names
      const dcId = row.DC_ID || row.dc_id || row.id || row.ID || 
                   row.datacenter_id || row.DATACENTER_ID ||
                   Object.values(row)[0]; // Fallback to first value

      if (dcId !== null && dcId !== undefined) {
        const numericId = typeof dcId === 'string' ? parseInt(dcId, 10) : dcId;
        if (!isNaN(numericId)) {
          dcIds.push(numericId);
        }
      }
    });

    return dcIds;
  }

  async submitAnswer(dcIds: number[]): Promise<any> {
    console.log('\n' + '📤'.repeat(40));
    console.log(`📤 SUBMITTING FINAL ANSWER TO CENTRALA`);
    console.log('📤'.repeat(40));
    console.log(`🎯 Datacenter IDs to submit: [${dcIds.join(', ')}]`);
    console.log(`📊 Total IDs count: ${dcIds.length}`);
    
    const answerRequest = {
      task: "database",
      apikey: this.CENTRAL_API_KEY,
      answer: dcIds
    };

    console.log(`📋 Submission payload:`, {
      task: answerRequest.task,
      apikey: `${answerRequest.apikey.substring(0, 8)}...`,
      answer: answerRequest.answer
    });
    console.log(`🌐 Submission URL: https://c3ntrala.ag3nts.org/report`);

    try {
      const response = await fetch('https://c3ntrala.ag3nts.org/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(answerRequest)
      });

      console.log(`📡 HTTP Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📥 CENTRALA RESPONSE:');
      console.log(JSON.stringify(result, null, 2));
      console.log('📤'.repeat(40) + '\n');
      
      return result;
    } catch (error) {
      console.error('❌ ERROR submitting answer to centrala:', error);
      console.log('📤'.repeat(40) + '\n');
      throw error;
    }
  }
} 