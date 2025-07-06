#!/usr/bin/env ts-node

import { TaskService } from './TaskService';

const TARGET_URL = 'https://xyz.ag3nts.org/';

async function testTask() {
  console.log('\n🚀 Testing Course Task 1');
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  
  const taskService = new TaskService();
  
  try {
    const result = await taskService.processTask(TARGET_URL);
    
    console.log('\n🎯 TEST RESULTS:');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    
    if (result.success) {
      console.log('✅ Task completed successfully!');
      console.log('\n📝 Question:', result.question);
      console.log('\n💬 Answer:', result.answer);
      console.log('\n🌐 Server Response (formatted above)');
      console.log('\n📊 Complete Result Object:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Task failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('🏁 Test execution completed');
}

// Run the test
testTask(); 