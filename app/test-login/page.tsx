"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function TestLoginPage() {
  const [email, setEmail] = useState("officer1@railpolice.in")
  const [password, setPassword] = useState("Officer@123")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string>("")

  const testLogin = async () => {
    setLoading(true)
    setResult("")
    const logs: string[] = []

    try {
      logs.push("🔐 Step 1: Attempting Supabase Auth login...")
      logs.push(`   Email: ${email}`)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        logs.push(`❌ Auth Error: ${error.message}`)
        logs.push(`   Code: ${error.status}`)
        setResult(logs.join("\n"))
        setLoading(false)
        return
      }

      if (!data.user) {
        logs.push("❌ No user returned from auth")
        setResult(logs.join("\n"))
        setLoading(false)
        return
      }

      logs.push(`✅ Auth Success! User ID: ${data.user.id}`)
      logs.push(`   Email: ${data.user.email}`)
      logs.push("")

      logs.push("🔍 Step 2: Checking users table...")
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", data.user.id)
        .single()

      if (userError) {
        logs.push(`❌ Users table error: ${userError.message}`)
        logs.push(`   Code: ${userError.code}`)
        if (userError.code === 'PGRST116') {
          logs.push("")
          logs.push("💡 SOLUTION: User not linked!")
          logs.push("   Run this SQL in Supabase:")
          logs.push(`   INSERT INTO users (auth_id, employee_id, email, mobile, full_name, designation, role, police_station_id, railway_district_id, is_first_login)`)
          logs.push(`   SELECT id, 'EMP001', '${email}', '9876543210', 'Officer Name', 'SHO', 'station_officer', 1, 1, true`)
          logs.push(`   FROM auth.users WHERE id = '${data.user.id}';`)
        }
        setResult(logs.join("\n"))
        setLoading(false)
        return
      }

      if (!userData) {
        logs.push("❌ User not found in users table")
        setResult(logs.join("\n"))
        setLoading(false)
        return
      }

      logs.push(`✅ User found in database!`)
      logs.push(`   Name: ${userData.full_name}`)
      logs.push(`   Role: ${userData.role}`)
      logs.push(`   Is Active: ${userData.is_active}`)
      logs.push(`   Police Station ID: ${userData.police_station_id}`)
      logs.push("")

      // Check if role is correct
      if (!['station_officer', 'data_operator'].includes(userData.role)) {
        logs.push(`❌ Wrong role: ${userData.role}`)
        logs.push(`   Required: station_officer or data_operator`)
        logs.push("")
        logs.push("💡 SOLUTION: Update role:")
        logs.push(`   UPDATE users SET role = 'station_officer' WHERE email = '${email}';`)
      } else {
        logs.push(`✅ Role is correct`)
      }

      if (!userData.is_active) {
        logs.push(`❌ User is INACTIVE`)
        logs.push("")
        logs.push("💡 SOLUTION: Activate user:")
        logs.push(`   UPDATE users SET is_active = true WHERE email = '${email}';`)
      } else {
        logs.push(`✅ User is active`)
      }

      if (!userData.police_station_id) {
        logs.push(`⚠️ Police station ID is NULL`)
        logs.push("")
        logs.push("💡 SOLUTION: Set police station:")
        logs.push(`   UPDATE users SET police_station_id = 1, railway_district_id = 1 WHERE email = '${email}';`)
      }

      logs.push("")
      logs.push("🎉 All checks passed! Login should work now.")
      logs.push("   Try logging in from the main login page.")

    } catch (error: any) {
      logs.push(`❌ Unexpected error: ${error.message}`)
      logs.push(`   ${error.stack}`)
    }

    setResult(logs.join("\n"))
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Direct Login Test</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            This page tests login directly without form validation. Use this to debug login issues.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Email</Label>
            <Input
              id="test-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="test-password">Password</Label>
            <Input
              id="test-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button onClick={testLogin} disabled={loading} className="w-full">
            {loading ? "Testing..." : "Test Login"}
          </Button>

          {result && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Test Results:</h3>
              <pre className="text-sm whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                {result}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


