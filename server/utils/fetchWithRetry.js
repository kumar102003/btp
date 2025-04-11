
const fetchWithRetry = async (url, options, retries = 3, timeout = 50000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorResponse = await response.text();
      console.error('Error details:', errorResponse);
      throw new Error(`Failed with status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (retries > 0) {
      console.log('Retrying...', retries);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return fetchWithRetry(url, options, retries - 1, timeout);
    } else {
      console.error('Final error:', error);
      throw error;
    }
  }
};

module.exports = { fetchWithRetry };
