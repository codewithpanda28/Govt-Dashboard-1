"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function DebugLoginPage() {
  const [email, setEmail] = useState("officer1@railpolice.in")
  const [results, setResults] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const runDiagnostics = async () => {
    setLoading(true)
    setResults([])
    const newResults: string[] = []

    try {
      newResults.push("🔍 Starting diagnostics...")
      newResults.push("")

      // Check 1: Environment variables
      newResults.push("1️⃣ Checking environment variables...")
      const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
      const hasKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      newResults.push(hasUrl ? "✅ NEXT_PUBLIC_SUPABASE_URL is set" : "❌ NEXT_PUBLIC_SUPABASE_URL is missing")
      newResults.push(hasKey ? "✅ NEXT_PUBLIC_SUPABASE_ANON_KEY is set" : "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is missing")
      newResults.push("")

      if (!hasUrl || !hasKey) {
        setResults(newResults)
        setLoading(false)
        return
      }

      // Check 2: Try to query users table
      newResults.push("2️⃣ Checking users table...")
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)

      if (usersError) {
        newResults.push(`❌ Error querying users: ${usersError.message}`)
        newResults.push(`   Code: ${usersError.code}`)
        newResults.push(`   Details: ${JSON.stringify(usersError)}`)
      } else {
        if (users && users.length > 0) {
          const user = users[0]
          newResults.push(`✅ User found in users table`)
          newResults.push(`   ID: ${user.id}`)
          newResults.push(`   Email: ${user.email}`)
          newResults.push(`   Auth ID: ${user.auth_id}`)
          newResults.push(`   Role: ${user.role}`)
          newResults.push(`   Is Active: ${user.is_active}`)
          newResults.push(`   Is First Login: ${user.is_first_login}`)
          newResults.push(`   Police Station ID: ${user.police_station_id}`)
          
          // Check if role is correct
          if (!['station_officer', 'data_operator'].includes(user.role)) {
            newResults.push(`❌ Role is wrong: ${user.role}`)
            newResults.push(`   Should be: station_officer or data_operator`)
          } else {
            newResults.push(`✅ Role is correct`)
          }
          
          if (!user.is_active) {
            newResults.push(`❌ User is INACTIVE`)
          } else {
            newResults.push(`✅ User is active`)
          }
        } else {
          newResults.push(`❌ User NOT found in users table`)
          newResults.push(`   Email searched: ${email}`)
        }
      }
      newResults.push("")

      // Check 3: Try to get current session
      newResults.push("3️⃣ Checking current session...")
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        newResults.push(`❌ Session error: ${sessionError.message}`)
      } else if (session) {
        newResults.push(`✅ Active session found`)
        newResults.push(`   User ID: ${session.user.id}`)
        newResults.push(`   Email: ${session.user.email}`)
        
        // Check if auth_id matches
        if (users && users.length > 0) {
          const user = users[0]
          if (user.auth_id === session.user.id) {
            newResults.push(`✅ auth_id matches session user ID`)
          } else {
            newResults.push(`❌ auth_id MISMATCH!`)
            newResults.push(`   Session user ID: ${session.user.id}`)
            newResults.push(`   User auth_id: ${user.auth_id}`)
          }
        }
      } else {
        newResults.push(`ℹ️ No active session (this is normal if not logged in)`)
      }
      newResults.push("")

      // Check 4: Test login
      newResults.push("4️⃣ Testing authentication...")
      newResults.push(`   Attempting to sign in with: ${email}`)
      newResults.push(`   (This will show if auth works, but won't actually log you in)`)
      
    } catch (error: any) {
      newResults.push(`❌ Unexpected error: ${error.message}`)
      newResults.push(`   Stack: ${error.stack}`)
    }

    setResults(newResults)
    setLoading(false)
  }

  return (
    <div className="page-wrapper">
      <div className="page-container">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Login Diagnostics</CardTitle>
            <CardDescription>
              This page helps diagnose login issues. Enter the email you're trying to login with.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email to check</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="officer1@railpolice.in"
              />
            </div>
            <Button onClick={runDiagnostics} disabled={loading}>
              {loading ? "Running diagnostics..." : "Run Diagnostics"}
            </Button>

            {results.length > 0 && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Results:</h3>
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {results.join("\n")}
                </pre>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold mb-2">Common Fixes:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>If user not found: Run the SQL from SETUP.md to link the user</li>
                <li>If auth_id mismatch: Update users table with correct auth_id</li>
                <li>If user inactive: Set is_active = true in users table</li>
                <li>If wrong role: Update role to 'station_officer' or 'data_operator'</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


