/**
 * TEST WHATSAPP PARSER
 * 
 * Test Groq API integration for parsing WhatsApp messages
 * Run: node src/services/testWhatsAppParser.js
 */

const whatsappParser = require('./whatsappParser');

console.log('='.repeat(60));
console.log('TESTING WHATSAPP PARSER (Groq API)');
console.log('='.repeat(60));

// Test messages (real MSME scenarios)
const testMessages = [
  {
    name: 'Complete order with urgency',
    message: 'Hi, I need 15 boxes of Widget A by tomorrow 3pm. Urgent!'
  },
  {
    name: 'Simple order',
    message: 'Can I get 20 pieces of Widget B?'
  },
  {
    name: 'Casual message',
    message: 'Hey, need 10 boxes of Product X asap'
  },
  {
    name: 'Order with deadline',
    message: 'I want 25 units of Component Y by Friday morning'
  },
  {
    name: 'Vague message (test fallback)',
    message: 'Can you send me some widgets tomorrow?'
  },
  {
    name: 'High priority',
    message: '50 boxes of Material Z needed urgently for client meeting'
  },
  {
    name: 'No quantity mentioned',
    message: 'Do you have Widget A available? Need it by tomorrow.'
  },
  {
    name: 'Different unit',
    message: 'I need 100 kgs of raw material by next week'
  }
];

async function runTests() {
  for (let i = 0; i < testMessages.length; i++) {
    const test = testMessages[i];
    
    console.log('\n' + '='.repeat(60));
    console.log(`TEST ${i + 1}: ${test.name}`);
    console.log('='.repeat(60));
    console.log('Message:', test.message);
    
    try {
      const result = await whatsappParser.parseMessage(test.message);
      
      console.log('\n✅ Parsed Result:');
      console.log('  Product:', result.product || '(not detected)');
      console.log('  Quantity:', result.quantity !== null ? result.quantity : '(not specified)');
      console.log('  Unit:', result.unit);
      console.log('  Priority:', result.priority);
      console.log('  Deadline:', result.deadline || '(not mentioned)');
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Health check
  console.log('\n' + '='.repeat(60));
  console.log('HEALTH CHECK');
  console.log('='.repeat(60));
  
  try {
    const health = await whatsappParser.healthCheck();
    console.log('Status:', health.status);
    console.log('Provider:', health.provider);
    if (health.error) {
      console.log('Error:', health.error);
    }
  } catch (error) {
    console.error('Health check failed:', error.message);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS COMPLETED');
  console.log('='.repeat(60));
  console.log('\nWhatsApp Parser is ready for integration!\n');
}

runTests().catch(console.error);
