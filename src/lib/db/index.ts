import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Check for database URL
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create postgres connection
// Optimized for serverless/edge environments (Vercel, Netlify, etc.)
const connectionString = process.env.DATABASE_URL;

const client = postgres(connectionString, {
  max: 1, // Single connection for serverless
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Timeout connection attempts after 10 seconds
  prepare: false, // Disable prepared statements (better for serverless)
});

// Create drizzle instance
export const db = drizzle(client, { schema });

// Export for convenience
export { schema };
