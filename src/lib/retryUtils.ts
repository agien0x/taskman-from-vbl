/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param retries Number of retry attempts (default: 3)
 * @param delayMs Initial delay in milliseconds (default: 1000)
 * @returns Promise with the result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (i === retries - 1) {
        break;
      }
      
      // Calculate exponential backoff delay: 1s, 2s, 4s
      const currentDelay = delayMs * Math.pow(2, i);
      console.log(`Retry attempt ${i + 1}/${retries} after ${currentDelay}ms`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  
  throw lastError!;
}
