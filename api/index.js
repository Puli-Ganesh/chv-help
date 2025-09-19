import app from "../app.js";

// Express apps are (req, res) handlers.
// Export a function for clarity.
export default function handler(req, res) {
  return app(req, res);
}
