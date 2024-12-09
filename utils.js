const https = require("https");

// Create an HTTPS agent with relaxed security
function createHttpsAgent() {
  return new https.Agent({ rejectUnauthorized: false });
}

// Log and rethrow errors for better debugging
function handleError(operation, error) {
  console.error(`Error during ${operation}:`, error.message);
  throw error;
}

module.exports = { createHttpsAgent, handleError };