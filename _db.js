import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
export const q = (text, params = []) => sql.query(text, params);
