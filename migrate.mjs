import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
const sql = neon(process.env.DATABASE_URL);
const files = ['db/001_init.sql', ...(process.argv.includes('--seed') ? ['db/seed.sql'] : [])];
for (const f of files) {
  const stmts = readFileSync(f, 'utf8').replace(/^\s*--.*$/gm, '').split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
  for (const s of stmts) await sql.query(s);
  console.log('OK', f);
}
