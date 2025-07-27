import 'dotenv/config';
import express from 'express';
import { DatabaseService } from './DatabaseService';

const app = express();
const port = 3000;

app.use(express.json());

const databaseService = new DatabaseService();

// Route to start the database analysis process
app.post('/api/analyze-database', async (req, res) => {
  try {
    console.log('🚀 Starting database analysis process...');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    // Find datacenter IDs with inactive managers
    const dcIds = await databaseService.findInactiveManagerDatacenters();
    
    console.log('\n🎯 Analysis Results:');
    console.log(`Found ${dcIds.length} datacenter(s) with inactive managers: ${dcIds.join(', ')}`);
    
    // Submit the answer to the API
    console.log('\n📤 Submitting answer...');
    const submissionResult = await databaseService.submitAnswer(dcIds);
    
    console.log('✅ Database analysis completed successfully!');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    res.json({
      success: true,
      datacenterIds: dcIds,
      submissionResult: submissionResult,
      totalFound: dcIds.length
    });
  } catch (error) {
    console.error('❌ Error in database analysis:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route to manually discover database structure
app.get('/api/discover-tables', async (req, res) => {
  try {
    console.log('🔍 Discovering database structure...');
    
    const tables = await databaseService.discoverTables();
    
    res.json({
      success: true,
      tables: tables
    });
  } catch (error) {
    console.error('❌ Error discovering tables:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route to get schema for a specific table
app.get('/api/table-schema/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    console.log(`🔍 Getting schema for table: ${tableName}`);
    
    const schema = await databaseService.getTableSchema(tableName);
    
    res.json({
      success: true,
      schema: schema
    });
  } catch (error) {
    console.error(`❌ Error getting schema for table ${req.params.tableName}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Route to check service status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ready',
    message: 'Database analysis service is running.',
    endpoints: {
      'POST /api/analyze-database': 'Start the complete database analysis process',
      'GET /api/discover-tables': 'Discover all tables in the database',
      'GET /api/table-schema/:tableName': 'Get schema for a specific table'
    }
  });
});

// Auto-run database analysis on startup
const runAnalysisOnStartup = async () => {
  console.log('\n🗄️ Starting automatic database analysis...');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  
  try {
    // Start the complete analysis process
    const dcIds = await databaseService.findInactiveManagerDatacenters();
    
    console.log('\n🎉 Database analysis completed on startup:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`📊 Found ${dcIds.length} datacenter(s) with inactive managers: ${dcIds.join(', ')}`);
    
    // Submit the answer
    console.log('\n📤 Submitting answer to API...');
    const submissionResult = await databaseService.submitAnswer(dcIds);
    
    console.log('\n✅ Complete process finished successfully:');
    console.log(`   Datacenter IDs found: [${dcIds.join(', ')}]`);
    console.log(`   Submission status: ${submissionResult.message || 'Success'}`);
    
  } catch (error) {
    console.error('❌ Error in startup database analysis:', error);
  }
};

// Start the server
app.listen(port, () => {
  console.log(`🚀 Database Analysis Server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/status - Check service status');
  console.log('  GET  /api/discover-tables - Discover database tables');
  console.log('  GET  /api/table-schema/:tableName - Get table schema');
  console.log('  POST /api/analyze-database - Run complete database analysis');
  
  // Auto-run database analysis after a short delay
  setTimeout(runAnalysisOnStartup, 3000);
});

// Export for direct execution
export { databaseService };

// If running directly with node/ts-node/bun
if (require.main === module) {
  console.log('Running database analysis directly...');
  runAnalysisOnStartup()
    .then(() => {
      console.log('✅ Direct execution completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Direct execution error:', error);
      process.exit(1);
    });
} 