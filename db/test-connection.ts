import './load-env';
import { db } from './index';
import { sql } from 'drizzle-orm';

async function testConnection() {
    try {
        const result = await db.execute(sql`SELECT version()`);
        console.log('✅ Connected to PostgreSQL successfully!');
        console.log('Version:', result[0]);
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error);
        process.exit(1);
    }
}

testConnection();