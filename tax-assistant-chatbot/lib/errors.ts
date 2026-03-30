/**
 * Custom error types and handlers for the tax assistant
 */

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class QueryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueryValidationError';
  }
}

export class AIGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIGenerationError';
  }
}

/**
 * Safe error message for user display
 */
export function getUserFriendlyMessage(error: Error): string {
  if (error.message.includes('ECONNREFUSED')) {
    return 'Database connection failed. Please check if MySQL is running.';
  }

  if (error.message.includes('GOOGLE_GENERATIVE_AI_API_KEY')) {
    return 'API key not configured. Please set your Google Generative AI API key.';
  }

  if (
    error.message.includes('SELECT') ||
    error.message.includes('column')
  ) {
    return 'There was an issue with your query. Please try rephrasing it.';
  }

  if (error.message.includes('drop') || error.message.includes('delete')) {
    return 'This operation is not allowed. Only SELECT queries are permitted.';
  }

  return error.message || 'An unexpected error occurred. Please try again.';
}

/**
 * Log errors safely without exposing sensitive information
 */
export function logError(context: string, error: Error): void {
  console.error(`[${context}] ${error.name}: ${error.message}`);
  // In production, you might send this to a monitoring service
}
