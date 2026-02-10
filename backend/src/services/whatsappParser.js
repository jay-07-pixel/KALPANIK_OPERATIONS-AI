/**
 * WHATSAPP PARSER
 * 
 * Uses Groq API (LLM) ONLY for parsing unstructured WhatsApp text
 * Same 10 clothing products as website (see productCatalog.js)
 * 
 * Input: "I need 2 Cotton Crew T-Shirt by tomorrow. Urgent!"
 * Output: { product: "Cotton Crew T-Shirt", quantity: 2, unit: "pieces", priority: "URGENT" }
 */

const axios = require('axios');
const { getProductNames } = require('../data/productCatalog');

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
   * @param {{ log?: (text: string, type?: string) => void }} opts - Optional logger (for run log so web matches terminal)
   * @returns {Promise<Object>} Parsed structured data
   */
  async parseMessage(message, opts = {}) {
    const log = opts.log ? (text, type) => opts.log(text, type) : (text, type) => (type === 'error' ? console.error(text) : console.log(text));
    log('\n[WhatsAppParser] 🤖 Parsing message with Groq...');
    log('[WhatsAppParser] Message: ' + (message || ''));

    try {
      // Call Groq API
      const parsed = await this._callGroqAPI(message);

      // Validate parsed result
      const validated = this._validateAndClean(parsed);

      log('[WhatsAppParser] ✅ Parsed successfully');
      log('[WhatsAppParser] Result: ' + JSON.stringify(validated, null, 2));

      return validated;
    } catch (error) {
      log('[WhatsAppParser] ❌ Groq API failed: ' + error.message, 'error');
      if (error.response?.data?.error?.message) {
        log('[WhatsAppParser] Groq error: ' + error.response.data.error.message, 'error');
      }
      // Fallback: Try simple regex-based parsing
      log('[WhatsAppParser] 🔄 Attempting fallback parsing...');
      return this._fallbackParse(message, { log });
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
   * Injects current product catalog so LLM returns exact product names (same as website)
   */
  _buildPrompt(message) {
    const productNames = getProductNames();
    const productList = productNames.join(', ');
    return `Extract order information from this WhatsApp message and return as JSON.

Message: "${message}"

AVAILABLE PRODUCTS (you MUST use one of these EXACT names for "product", or null if no product mentioned):
${productList}

Examples of mapping: "t-shirt" or "cotton t-shirt" → "Cotton Crew T-Shirt"; "jacket" or "denim" → "Denim Jacket"; "dress" or "floral dress" → "Summer Floral Dress"; "chinos" → "Slim Fit Chinos"; "sweater" → "Wool Blend Sweater"; "sneakers" or "shoes" → "Running Sneakers"; "blazer" → "Casual Blazer"; "polo" → "Striped Polo Shirt"; "trousers" → "High-Waist Trousers"; "hoodie" → "Zip-Up Hoodie".

Extract the following fields:
- product: MUST be exactly one of the available product names above, or null
- quantity: The number of items requested (number)
- unit: "pieces" for clothes, "pairs" for footwear (Running Sneakers). Default "pieces"
- priority: "LOW", "MEDIUM", "HIGH", or "URGENT"
- deadline: Any mentioned deadline as short string: "tomorrow", "tomorrow 3pm", "by tomorrow", etc. Use null only if no deadline mentioned.

Rules:
1. product MUST be one of: ${productList} (exact spelling)
2. If quantity not mentioned, use null
3. Priority: "urgent"/"asap" → "URGENT"; "priority"/"soon" → "HIGH"; else "MEDIUM"
4. Default unit "pieces"; use "pairs" only for sneakers/shoes
5. Return ONLY valid JSON, no explanations

Required JSON format:
{
  "product": "exact name from list or null",
  "quantity": number or null,
  "unit": "pieces or pairs",
  "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
  "deadline": "string or null"
}`;
  }

  /**
   * Validate and clean Groq response
   * Maps product to exact catalog name (same 10 products as website)
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

    const catalogNames = getProductNames();
    let product = (parsed.product && String(parsed.product).trim()) || null;
    if (product) {
      const exact = catalogNames.find(n => n.toLowerCase() === product.toLowerCase());
      if (exact) product = exact;
      else {
        const partial = catalogNames.find(n => n.toLowerCase().includes(product.toLowerCase()) || product.toLowerCase().includes(n.toLowerCase()));
        if (partial) product = partial;
      }
    }

    const result = {
      product,
      quantity: parsed.quantity ? parseInt(parsed.quantity) : null,
      unit: parsed.unit || 'pieces',
      priority: this._normalizePriority(parsed.priority),
      deadline: deadline || null
    };

    result.unit = (result.unit && result.unit.toLowerCase() === 'pairs') ? 'pairs' : 'pieces';

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
   * @param {{ log?: (text: string, type?: string) => void }} opts
   */
  _fallbackParse(message, opts = {}) {
    const log = opts.log ? (text, type) => opts.log(text, type) : (text, type) => (type === 'error' ? console.error(text) : console.log(text));
    log('[WhatsAppParser] 🔧 Using fallback regex parsing...');
    
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

    const catalogNames = getProductNames();
    for (const pattern of productPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        let product = match[1].trim().replace(/\s+(by|urgent|asap|needed|for)$/i, '');
        if (product.length > 2) {
          const exact = catalogNames.find(n => n.toLowerCase() === product.toLowerCase());
          const partial = catalogNames.find(n => n.toLowerCase().includes(product.toLowerCase()) || product.toLowerCase().includes(n.toLowerCase()));
          result.product = exact || partial || product;
          break;
        }
      }
    }
    // Fallback: map keywords to catalog product names (same 10 as website)
    if (!result.product) {
      const lower = message.toLowerCase();
      const keywordToProduct = [
        [['t-shirt', 'shirt', 'tee', 'cotton crew'], 'Cotton Crew T-Shirt'],
        [['denim jacket', 'denim', 'jacket'], 'Denim Jacket'],
        [['dress', 'floral dress', 'summer dress'], 'Summer Floral Dress'],
        [['chinos', 'chino', 'slim fit'], 'Slim Fit Chinos'],
        [['sweater', 'wool blend'], 'Wool Blend Sweater'],
        [['sneakers', 'running shoes', 'shoes', 'trainers'], 'Running Sneakers'],
        [['blazer', 'casual blazer'], 'Casual Blazer'],
        [['polo', 'striped polo'], 'Striped Polo Shirt'],
        [['trousers', 'high waist', 'high-waist'], 'High-Waist Trousers'],
        [['hoodie', 'hoody', 'zip-up'], 'Zip-Up Hoodie']
      ];
      for (const [keywords, name] of keywordToProduct) {
        if (keywords.some(kw => lower.includes(kw))) {
          result.product = name;
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

    log('[WhatsAppParser] ⚠️  Fallback result: ' + JSON.stringify(result, null, 2));

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
