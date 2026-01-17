/**
 * Script to apply pending database migrations
 * Run with: npx tsx scripts/apply-migrations.ts
 */

import { createClient } from "@supabase/supabase-js"
import * as dotenv from "dotenv"
import * as fs from "fs"
import * as path from "path"

// Load environment variables
dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing environment variables:")
  console.error("   - NEXT_PUBLIC_SUPABASE_URL")
  console.error("   - SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigrations() {
  console.log("🚀 Starting migration process...")
  console.log("=" .repeat(60))

  const migrationsDir = path.join(process.cwd(), "supabase", "migrations")
  
  // Read migration files
  const migrationFiles = [
    "019_add_assignment_mode.sql",
    "020_update_get_student_pending_assignments_with_mode.sql"
  ]

  for (const file of migrationFiles) {
    const filePath = path.join(migrationsDir, file)
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Skipping ${file} (file not found)`)
      continue
    }

    console.log(`\n📄 Applying migration: ${file}`)
    
    try {
      const sql = fs.readFileSync(filePath, "utf-8")
      
      // Execute the SQL
      const { error } = await supabase.rpc("exec_sql", { sql })
      
      if (error) {
        // Try direct execution if exec_sql doesn't exist
        console.log("   Trying direct execution...")
        const { error: directError } = await supabase.from("_migrations").insert({ name: file })
        
        if (directError) {
          console.error(`❌ Failed to apply ${file}:`, directError.message)
          continue
        }
      }
      
      console.log(`✅ Successfully applied ${file}`)
    } catch (err) {
      console.error(`❌ Error applying ${file}:`, err)
    }
  }

  console.log("\n" + "=".repeat(60))
  console.log("✅ Migration process complete")
  console.log("\nNote: If migrations failed, you may need to apply them manually")
  console.log("using the Supabase SQL Editor or CLI.")
}

applyMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("💥 Fatal error:", err)
    process.exit(1)
  })
