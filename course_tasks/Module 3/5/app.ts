import express from 'express';
import cors from 'cors';
import { Neo4jService } from './Neo4jService';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Neo4j connection parameters
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

// Types for data structures
interface User {
  id: string;
  username: string;
  access_level: string;
  is_active: string;
  lastlog: string;
}

interface Connection {
  user1_id: string;
  user2_id: string;
}

interface DatabaseResponse<T> {
  reply: T[];
  error: string;
}

// POST endpoint to initialize data
app.post('/initialize-data', async (req, res) => {
  let neo4jService: Neo4jService | null = null;
  
  try {
    console.log('=== Starting data initialization ===');
    console.log(`Neo4j URI: ${NEO4J_URI}`);
    console.log(`Neo4j User: ${NEO4J_USER}`);
    
    // Initialize Neo4j service
    console.log('1. Initializing Neo4j service...');
    neo4jService = new Neo4jService(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD);
    console.log('✓ Neo4j service initialized');
    
    // Test Neo4j connection
    console.log('2. Testing Neo4j connection...');
    await neo4jService!.runQuery('RETURN 1 as test');
    console.log('✓ Neo4j connection successful');
    
    // Load data from JSON files
    const resourcesPath = path.join(__dirname, 'resources');
    console.log(`3. Loading data from: ${resourcesPath}`);
    
    console.log('3.1. Loading users data...');
    const usersData = await fs.readFile(path.join(resourcesPath, 'db_users.json'), 'utf-8');
    const users: DatabaseResponse<User> = JSON.parse(usersData);
    console.log(`✓ Loaded ${users.reply.length} users`);
    
    console.log('3.2. Loading connections data...');
    const connectionsData = await fs.readFile(path.join(resourcesPath, 'db_connections.json'), 'utf-8');
    const connections: DatabaseResponse<Connection> = JSON.parse(connectionsData);
    console.log(`✓ Loaded ${connections.reply.length} connections`);
    
    // Clear existing data
    console.log('4. Clearing existing data...');
    await neo4jService!.runQuery('MATCH (n) DETACH DELETE n');
    console.log('✓ Existing data cleared');
    
    // Create user nodes
    console.log('5. Creating user nodes...');
    const userNodes = [];
    
    for (let i = 0; i < users.reply.length; i++) {
      const user = users.reply[i];
      if (i % 10 === 0) {
        console.log(`   Processing user ${i + 1}/${users.reply.length}: ${user.username}`);
      }
      
      const nodeData = {
        userId: user.id,
        username: user.username,
        accessLevel: user.access_level,
        isActive: user.is_active === '1',
        lastlog: user.lastlog
      };
      
      const result = await neo4jService!.addNode('User', nodeData);
      userNodes.push({ originalId: user.id, neo4jId: result.id });
    }
    
    console.log(`✓ Created ${userNodes.length} user nodes`);
    
    // Create user ID mapping for relationships
    console.log('6. Creating user ID mapping...');
    const userIdMap = new Map<string, number>();
    userNodes.forEach(node => {
      userIdMap.set(node.originalId, node.neo4jId);
    });
    console.log(`✓ Created mapping for ${userIdMap.size} users`);
    
    // Create relationships between users
    console.log('7. Creating user connections...');
    let connectionsCreated = 0;
    let connectionsSkipped = 0;
    
    for (let i = 0; i < connections.reply.length; i++) {
      const connection = connections.reply[i];
      
      if (i % 20 === 0) {
        console.log(`   Processing connection ${i + 1}/${connections.reply.length}`);
      }
      
      const user1Neo4jId = userIdMap.get(connection.user1_id);
      const user2Neo4jId = userIdMap.get(connection.user2_id);
      
      if (user1Neo4jId && user2Neo4jId) {
        await neo4jService!.connectNodes(user1Neo4jId, user2Neo4jId, 'CONNECTED_TO');
        connectionsCreated++;
      } else {
        connectionsSkipped++;
        if (connectionsSkipped <= 5) { // Log only first 5 skipped connections
          console.warn(`   Skipping connection: user1_id=${connection.user1_id}, user2_id=${connection.user2_id} - user not found`);
        }
      }
    }
    
    console.log(`✓ Created ${connectionsCreated} connections (skipped ${connectionsSkipped})`);
    
    console.log('8. Finalizing...');
    console.log('=== Data initialization completed successfully ===');
    
    // Return success response
    res.json({
      success: true,
      message: 'Data initialization completed successfully',
      statistics: {
        usersCreated: userNodes.length,
        connectionsCreated: connectionsCreated,
        connectionsSkipped: connectionsSkipped
      }
    });
    
  } catch (error) {
    console.error('Error during data initialization:', error);
    
    res.status(500).json({
      success: false,
      message: 'Data initialization failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
  } finally {
    // Close Neo4j connection
    if (neo4jService) {
      await neo4jService.close();
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database status endpoint
app.get('/db-status', async (req, res) => {
  let neo4jService: Neo4jService | null = null;
  
  try {
    neo4jService = new Neo4jService(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD);
    
    // Count nodes and relationships
    const nodeCountResult = await neo4jService.runQuery('MATCH (n:User) RETURN count(n) as count');
    const relationshipCountResult = await neo4jService.runQuery('MATCH ()-[r:CONNECTED_TO]->() RETURN count(r) as count');
    
    const nodeCount = nodeCountResult.records[0].get('count').toNumber();
    const relationshipCount = relationshipCountResult.records[0].get('count').toNumber();
    
    res.json({
      status: 'connected',
      timestamp: new Date().toISOString(),
      data: {
        users: nodeCount,
        connections: relationshipCount
      }
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    if (neo4jService) {
      await neo4jService.close();
    }
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Database status: http://localhost:${PORT}/db-status`);
  console.log(`Initialize data: POST http://localhost:${PORT}/initialize-data`);
});

export default app;
