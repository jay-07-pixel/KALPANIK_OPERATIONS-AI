/**
 * WHATSAPP PARSER
 * 
 * Uses Groq API (LLM) ONLY for parsing unstructured WhatsApp text
 * 
 * Purpose:
 * - Extract structured data from free-text messages
 * - NO decision-making
 * - NO business logic
 * 
 * Input: "I need 15 boxes of Widget A by tomorrow. Urgent!"
 * Output: { product: "Widget A", quantity: 15, unit: "boxes", priority: "HIGH" }
 */

const axios = require('axios');

class WhatsAppParser {
  constructor() {
    this.groqApiKey = process.env.GROQ_API_KEY;
    this.groqApiUrl = 'https://api.groq.com/openai/v1/chat/completions';
    // Use current Groq production model (mixtral-8x7b-32768 was deprecated)
    this.model = process.env.GROQ_CHAT_MODEL || 'llama-3.1-8b-instant';
  }

  /**
   * Parse WhatsApp message into structured data
   * 
   * @param {string} message - Raw WhatsApp text
   * @returns {Promise<Object>} Parsed structured data
   */
  async parseMessage(message) {
    console.log('\n[WhatsAppParser] 🤖 Parsing message with Groq...');
    console.log('[WhatsAppParser] Message:', message);

    try {
      // Call Groq API
      const parsed = await this._callGroqAPI(message);
      
      // Validate parsed result
      const validated = this._validateAndClean(parsed);
      
      console.log('[WhatsAppParser] ✅ Parsed successfully');
      console.log('[WhatsAppParser] Result:', JSON.stringify(validated, null, 2));
      
      return validated;
      
    } catch (error) {
      console.error('[WhatsAppParser] ❌ Groq API failed:', error.message);
      if (error.response?.data?.error?.message) {
        console.error('[WhatsAppParser] Groq error:', error.response.data.error.message);
      }
      // Fallback: Try simple regex-based parsing
      console.log('[WhatsAppParser] 🔄 Attempting fallback parsing...');
      return this._fallbackParse(message);
    }
  }

  /**
   * Call Groq API with structured prompt
   */
  async _callGroqAPI(message) {
    if (!this.groqApiKey || this.groqApiKey === 'your_groq_api_key' || this.groqApiKey.trim() === '') {
      throw new Error('GROQ_API_KEY not set or invalid (use fallback or set in .env)');
    }
    const prompt = this._buildPrompt(message);
    
    const response = await axios.post(
      this.groqApiUrl,
      {
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction assistant. Extract order information from customer messages and return ONLY valid JSON. Do not add explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for deterministic output
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    // Extract JSON from response
    const content = response.data.choices[0].message.content.trim();
    
    // Extract JSON from markdown code blocks if present
    let jsonText = content;
    if (content.includes('```')) {
      const match = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (match) {
        jsonText = match[1];
      }
    }
    
    const parsed = JSON.parse(jsonText);
    
    return parsed;
  }

  /**
   * Build deterministic prompt for Groq
   */
  _buildPrompt(message) {
    return `Extract order information from this WhatsApp message and return as JSON.

Message: "${message}"

Extract the following fields:
- product: The product name (string)
- quantity: The number of items requested (number)
- unit: Unit of measurement like "boxes", "pieces", "kg" (string)
- priority: Order urgency - "LOW", "MEDIUM", "HIGH", or "URGENT" (string)
- deadline: CRITICAL - Any mentioned deadline/date. Extract as a short string: "tomorrow", "tomorrow 3pm", "by tomorrow", "today", "3pm", "Friday", etc. Use null ONLY if absolutely no deadline mentioned.

Rules:
1. If product name is unclear, use best guess
2. If quantity is not mentioned, use null
3. Priority based on keywords:
   - "urgent", "asap", "immediately" → "URGENT"
   - "priority", "important", "soon" → "HIGH"
   - "normal", "regular" → "MEDIUM"
   - Default → "MEDIUM"
4. If unit is not mentioned, use "pieces"
5. For deadline: Extract EXACTLY what the user said - "tomorrow", "by tomorrow", "tomorrow 3pm", "by 5pm", "Friday" - never null if user mentioned a time/date
6. Return ONLY valid JSON, no explanations

Required JSON format:
{
  "product": "string or null",
  "quantity": number or null,
  "unit": "string",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "deadline": "string or null"
}`;
  }

  /**
   * Validate and clean Groq response
   * Handles LLM returning deadline in various formats: string, object, dueDate, etc.
   */
  _validateAndClean(parsed) {
    // Extract deadline from various LLM output formats
    let deadline = parsed.deadline ?? parsed.dueDate ?? parsed.deliveryDate ?? parsed.date ?? null;
    if (deadline && typeof deadline === 'object') {
      deadline = deadline.date ?? deadline.value ?? deadline.text ?? JSON.stringify(deadline);
    }
    if (deadline && typeof deadline !== 'string') {
      deadline = String(deadline).trim() || null;
    }
    if (deadline && deadline.trim() === '') deadline = null;

    const result = {
      product: parsed.product || null,
      quantity: parsed.quantity ? parseInt(parsed.quantity) : null,
      unit: parsed.unit || 'pieces',
      priority: this._normalizePriority(parsed.priority),
      deadline: deadline || null
    };

    // Validate quantity
    if (result.quantity !== null && (isNaN(result.quantity) || result.quantity <= 0)) {
      result.quantity = null;
    }

    return result;
  }

  /**
   * Normalize priority to valid values
   */
  _normalizePriority(priority) {
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    const normalized = (priority || '').toUpperCase();
    
    return validPriorities.includes(normalized) ? normalized : 'MEDIUM';
  }

  /**
   * Fallback parser using simple regex
   * Used when Groq API fails
   */
  _fallbackParse(message) {
    console.log('[WhatsAppParser] 🔧 Using fallback regex parsing...');
    
    const result = {
      product: null,
      quantity: null,
      unit: 'pieces',
      priority: 'MEDIUM',
      deadline: null
    };

    // Extract quantity and unit (number + unit)
    const quantityMatch = message.match(/(\d+)\s*(boxes?|pieces?|units?|kgs?|pcs?)?/i);
    if (quantityMatch) {
      result.quantity = parseInt(quantityMatch[1]);
      if (quantityMatch[2]) {
        let unit = quantityMatch[2].toLowerCase();
        // Normalize units
        if (unit.endsWith('s')) unit = unit.slice(0, -1); // Remove plural 's'
        if (unit === 'pc') unit = 'piece';
        if (unit === 'box') unit = 'boxe';
        if (unit === 'kg') unit = 'kg';
        result.unit = unit + 's'; // Add back 's' for consistency
      }
    }

    // Extract product name (improved patterns)
    const productPatterns = [
      /of\s+([A-Za-z0-9\s]+?)(?:\s+by|\s+urgent|\s+asap|\.|\!|$)/i,
      /need(?:ed)?\s+(?:\d+\s+(?:boxes?|pieces?|units?|kgs?)\s+of\s+)?([A-Za-z0-9\s]+?)(?:\s+by|\s+urgent|\s+asap|\.|\!|$)/i,
      /get\s+(?:\d+\s+(?:boxes?|pieces?|units?|kgs?)\s+of\s+)?([A-Za-z0-9\s]+?)(?:\?|\.|\!|$)/i,
      /"([^"]+)"/,
      /([A-Z][a-z]+(?:\s+[A-Z0-9][a-z0-9]*)?)/  // Capitalized words
    ];

    for (const pattern of productPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        let product = match[1].trim();
        // Clean up common noise words
        product = product.replace(/\s+(by|urgent|asap|needed|for)$/i, '');
        if (product.length > 2) {
          result.product = product;
          break;
        }
      }
    }

    // Extract priority (keyword-based)
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('urgent') || lowerMessage.includes('asap') || lowerMessage.includes('immediately')) {
      result.priority = 'URGENT';
    } else if (lowerMessage.includes('priority') || lowerMessage.includes('important') || lowerMessage.includes('soon')) {
      result.priority = 'HIGH';
    }

    // Extract deadline (fallback when LLM fails)
    const deadlinePatterns = [
      /(?:by|before|until|due|need\s+by|delivery\s+by)\s+(tomorrow(?:\s+\d{1,2}\s*(?:am|pm)?)?)/i,
      /(?:by|before|until)\s+(\d{1,2}\s*(?:am|pm)?)/i,
      /(?:by|before|until)\s+([\w\s]+?)(?:\.|!|$)/i,
      /(tomorrow(?:\s+\d{1,2}\s*(?:am|pm)?)?)/i,
      /(today|tonight)/i,
      /(\d{1,2}\s*(?:am|pm))/i,
      /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/,
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
      /(next\s+week|this\s+week)/i
    ];

    for (const pattern of deadlinePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        if (extracted.length >= 2) {
          result.deadline = extracted;
          break;
        }
      }
    }

    console.log('[WhatsAppParser] ⚠️  Fallback result:', JSON.stringify(result, null, 2));
    
    return result;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      // Test with simple message
      await this._callGroqAPI('Test message');
      return { status: 'operational', provider: 'Groq API' };
    } catch (error) {
      return { status: 'degraded', provider: 'Groq API', error: error.message };
    }
  }
}

// Singleton instance
const whatsappParser = new WhatsAppParser();

module.exports = whatsappParser;
