// Utility to verify user setup in Supabase
import { supabase } from '@/lib/supabase/client'

export async function verifyUserSetup(email: string) {
  const results: string[] = []
  let allGood = true

  try {
    // Check 1: User exists in auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      results.push(`❌ Cannot access auth.users (need admin): ${authError.message}`)
    } else {
      const authUser = authUsers?.users?.find(u => u.email === email)
      if (authUser) {
        results.push(`✅ User exists in auth.users (ID: ${authUser.id})`)
        
        // Check 2: User exists in users table
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single()

        if (dbError) {
          if (dbError.code === 'PGRST116') {
            results.push(`❌ User NOT found in users table`)
            results.push(`   Fix: Run SQL to link user`)
            allGood = false
          } else {
            results.push(`❌ Error querying users table: ${dbError.message}`)
            allGood = false
          }
        } else if (dbUser) {
          results.push(`✅ User exists in users table`)
          
          // Check 3: auth_id matches
          if (dbUser.auth_id === authUser.id) {
            results.push(`✅ auth_id matches`)
          } else {
            results.push(`❌ auth_id MISMATCH!`)
            results.push(`   Auth ID: ${authUser.id}`)
            results.push(`   DB auth_id: ${dbUser.auth_id}`)
            allGood = false
          }
          
          // Check 4: User is active
          if (dbUser.is_active) {
            results.push(`✅ User is active`)
          } else {
            results.push(`❌ User is INACTIVE`)
            allGood = false
          }
          
          // Check 5: Role is correct
          if (['station_officer', 'data_operator'].includes(dbUser.role)) {
            results.push(`✅ Role is correct: ${dbUser.role}`)
          } else {
            results.push(`❌ Role is wrong: ${dbUser.role}`)
            results.push(`   Required: station_officer or data_operator`)
            allGood = false
          }
          
          // Check 6: Police station is set
          if (dbUser.police_station_id) {
            results.push(`✅ Police station ID: ${dbUser.police_station_id}`)
          } else {
            results.push(`⚠️ Police station ID is NULL`)
          }
        }
      } else {
        results.push(`❌ User NOT found in auth.users`)
        allGood = false
      }
    }
  } catch (error: any) {
    results.push(`❌ Error: ${error.message}`)
    allGood = false
  }

  return { results, allGood }
}


