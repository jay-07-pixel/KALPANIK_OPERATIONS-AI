/**
 * LLM PARSER (Groq API)
 * 
 * ONLY used for parsing unstructured WhatsApp text
 * 
 * Responsibilities:
 * - Parse WhatsApp message into structured data
 * - Extract: product, quantity, priority, deadline
 * 
 * NOT used for:
 * - Decision making
 * - Agent logic
 * - Conversational responses
 * 
 * Input:
 * - Raw WhatsApp text: "I need 15 boxes of Widget A by tomorrow"
 * 
 * Output:
 * - Structured data: {product: "Widget A", quantity: 15, deadline: "..."}
 */

class LLMParser {
  // TODO: Implement Groq API integration
  // TODO: Implement prompt engineering for parsing
  // TODO: Implement structured output validation
}

module.exports = LLMParser;
