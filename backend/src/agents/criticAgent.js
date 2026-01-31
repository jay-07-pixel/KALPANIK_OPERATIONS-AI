/**
 * CRITIC AGENT
 * 
 * Responsibilities:
 * - Validate proposed plan before execution
 * - Check constraints:
 *   ✓ Inventory reserved
 *   ✓ Staff capacity available
 *   ✓ No conflicts detected
 *   ✓ Deadline feasible (if applicable)
 * 
 * Decision Logic:
 * - Deterministic validation rules
 * - Return: APPROVED | REJECTED (with reason)
 * - NO LLM usage
 * 
 * Input:
 * - Complete plan (order + tasks + assignments)
 * 
 * Output:
 * - Status: APPROVED | REJECTED
 * - Validation report
 */

class CriticAgent {
  // TODO: Implement constraint validation
  // TODO: Implement conflict detection
  // TODO: Implement deadline feasibility check
}

module.exports = CriticAgent;
