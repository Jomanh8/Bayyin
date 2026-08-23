import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly resolve server/.env absolute path
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log(`[Env Load] GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? "FOUND" : "MISSING"}`);
