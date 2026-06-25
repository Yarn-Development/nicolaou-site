#!/usr/bin/env tsx

/**
 * Purge Unverified Questions
 *
 * Deletes all questions where is_verified = false.
 * Run with --confirm to execute the deletion.
 * Run with --dry-run (default) to preview what would be deleted.
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function purgeUnverified() {
  const confirm = process.argv.includes('--confirm')

  // Count unverified
  const { count: unverifiedCount, error: countError } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', false)

  if (countError) {
    console.error('❌ Failed to count questions:', countError.message)
    process.exit(1)
  }

  // Count verified (so user knows what remains)
  const { count: verifiedCount } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', true)

  console.log('\n📊 Current database state:')
  console.log(`   Verified questions:   ${verifiedCount ?? 0}`)
  console.log(`   Unverified questions: ${unverifiedCount ?? 0}`)
  console.log(`   Total:                ${(verifiedCount ?? 0) + (unverifiedCount ?? 0)}`)

  if ((unverifiedCount ?? 0) === 0) {
    console.log('\n✅ No unverified questions to delete.')
    return
  }

  if (!confirm) {
    console.log(`\n⚠️  Would delete ${unverifiedCount} unverified questions.`)
    console.log('   Run with --confirm to execute the deletion.')
    console.log('   Example: npx tsx scripts/purge-unverified.ts --confirm\n')
    return
  }

  console.log(`\n🗑️  Deleting ${unverifiedCount} unverified questions...`)

  const { error: deleteError } = await supabase
    .from('questions')
    .delete()
    .eq('is_verified', false)

  if (deleteError) {
    console.error('❌ Deletion failed:', deleteError.message)
    process.exit(1)
  }

  console.log(`✅ Successfully deleted ${unverifiedCount} unverified questions.`)
  console.log(`   ${verifiedCount ?? 0} verified questions remain.\n`)
}

purgeUnverified().catch(console.error)
