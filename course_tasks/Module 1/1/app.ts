import express from 'express';
import { TaskService } from './TaskService';

const app = express();
const port = 3000;

app.use(express.json());

const taskService = new TaskService();
const TARGET_URL = 'https://xyz.ag3nts.org/';

// Route to manually trigger the task
app.post('/api/run-task', async (req, res) => {
  try {
    const result = await taskService.processTask(TARGET_URL);
    res.json(result);
  } catch (error) {
    console.error('Error running task:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Route to get task status
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ready', 
    message: 'Task service is running. Use POST /api/run-task to execute the task.' 
  });
});

// Auto-run the task on startup
const runTaskOnStartup = async () => {
  console.log('\n🚀 Starting automatic task execution...');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  try {
    const result = await taskService.processTask(TARGET_URL);
    console.log('\n🎉 Startup task result:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error in startup task:', error);
  }
};

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/status - Check service status');
  console.log('  POST /api/run-task - Manually trigger task');
  
  // Auto-run the task after a short delay
  setTimeout(runTaskOnStartup, 2000);
});

// Export for direct execution
export { taskService, TARGET_URL };

// If running directly with node/ts-node
if (require.main === module) {
  console.log('Running task directly...');
  taskService.processTask(TARGET_URL)
    .then(result => {
      console.log('Direct execution result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Direct execution error:', error);
      process.exit(1);
    });
} 