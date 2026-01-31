"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SimpleLoginPage() {
  const [email, setEmail] = useState("officer1@railpolice.in")
  const [password, setPassword] = useState("Officer@123")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string>("")
  const [step, setStep] = useState<string>("")

  const handleLogin = async () => {
    setLoading(true)
    setMessage("")
    setStep("")

    try {
      // Step 1: Check Supabase connection
      setStep("Step 1: Checking Supabase connection...")
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        setMessage("❌ ERROR: Supabase credentials not found in .env.local")
        setLoading(false)
        return
      }
      setMessage("✅ Supabase credentials found\n")

      // Step 2: Try to login
      setStep("Step 2: Attempting authentication...")
      setMessage(prev => prev + "🔐 Logging in...\n")
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (authError) {
        setMessage(prev => prev + `❌ Auth Error: ${authError.message}\n`)
        setMessage(prev => prev + `   Code: ${authError.status}\n\n`)
        setMessage(prev => prev + "💡 SOLUTION:\n")
        setMessage(prev => prev + "   1. Check if user exists in Supabase Auth\n")
        setMessage(prev => prev + "   2. Verify email and password are correct\n")
        setMessage(prev => prev + "   3. Go to Supabase Dashboard > Authentication > Users\n")
        setLoading(false)
        return
      }

      if (!authData.user) {
        setMessage(prev => prev + "❌ No user returned from authentication\n")
        setLoading(false)
        return
      }

      setMessage(prev => prev + `✅ Authentication successful!\n`)
      setMessage(prev => prev + `   User ID: ${authData.user.id}\n`)
      setMessage(prev => prev + `   Email: ${authData.user.email}\n\n`)

      // Step 3: Check users table
      setStep("Step 3: Checking users table...")
      setMessage(prev => prev + "🔍 Checking users table...\n")
      
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authData.user.id)
        .single()

      if (userError) {
        if (userError.code === 'PGRST116') {
          setMessage(prev => prev + "❌ User NOT found in users table!\n\n")
          setMessage(prev => prev + "💡 SOLUTION - Run this SQL in Supabase:\n\n")
          setMessage(prev => prev + "INSERT INTO users (auth_id, employee_id, email, mobile, full_name, designation, role, police_station_id, railway_district_id, is_first_login)\n")
          setMessage(prev => prev + "SELECT id, 'EMP001', 'officer1@railpolice.in', '9876543210', 'Officer Rajesh Kumar', 'SHO', 'station_officer', 1, 1, true\n")
          setMessage(prev => prev + `FROM auth.users WHERE id = '${authData.user.id}';\n\n`)
        } else {
          setMessage(prev => prev + `❌ Error: ${userError.message}\n`)
          setMessage(prev => prev + `   Code: ${userError.code}\n`)
        }
        setLoading(false)
        return
      }

      if (!userData) {
        setMessage(prev => prev + "❌ User data is null\n")
        setLoading(false)
        return
      }

      setMessage(prev => prev + `✅ User found in database!\n`)
      setMessage(prev => prev + `   Name: ${userData.full_name}\n`)
      setMessage(prev => prev + `   Role: ${userData.role}\n`)
      setMessage(prev => prev + `   Is Active: ${userData.is_active}\n`)
      setMessage(prev => prev + `   Police Station: ${userData.police_station_id}\n\n`)

      // Step 4: Validate user
      setStep("Step 4: Validating user permissions...")
      let hasErrors = false

      if (!userData.is_active) {
        setMessage(prev => prev + "❌ User is INACTIVE\n")
        setMessage(prev => prev + "💡 Fix: UPDATE users SET is_active = true WHERE email = 'officer1@railpolice.in';\n\n")
        hasErrors = true
      } else {
        setMessage(prev => prev + "✅ User is active\n")
      }

      if (!['station_officer', 'data_operator'].includes(userData.role)) {
        setMessage(prev => prev + `❌ Wrong role: ${userData.role}\n`)
        setMessage(prev => prev + "💡 Fix: UPDATE users SET role = 'station_officer' WHERE email = 'officer1@railpolice.in';\n\n")
        hasErrors = true
      } else {
        setMessage(prev => prev + "✅ Role is correct\n")
      }

      if (!userData.police_station_id) {
        setMessage(prev => prev + "⚠️ Police station ID is NULL\n")
        setMessage(prev => prev + "💡 Fix: UPDATE users SET police_station_id = 1, railway_district_id = 1 WHERE email = 'officer1@railpolice.in';\n\n")
        hasErrors = true
      } else {
        setMessage(prev => prev + "✅ Police station is set\n")
      }

      if (hasErrors) {
        setMessage(prev => prev + "\n❌ Please fix the errors above, then try again.\n")
        setLoading(false)
        return
      }

      // Step 5: Success - redirect
      setStep("Step 5: Redirecting to dashboard...")
      setMessage(prev => prev + "\n🎉 ALL CHECKS PASSED!\n")
      setMessage(prev => prev + "✅ Login successful!\n")
      setMessage(prev => prev + "🔄 Redirecting to dashboard...\n\n")

      // Wait a moment then redirect
      setTimeout(() => {
        const redirectPath = userData.is_first_login ? "/change-password" : "/dashboard"
        window.location.href = redirectPath
      }, 2000)

    } catch (error: any) {
      setMessage(prev => prev + `\n❌ UNEXPECTED ERROR:\n${error.message}\n`)
      setMessage(prev => prev + `\nStack:\n${error.stack}\n`)
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="page-container">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl">Simple Login Test</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              This page directly tests login without any form validation. It will show you exactly what's wrong.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="text-base"
              />
            </div>
            <Button 
              onClick={handleLogin} 
              disabled={loading} 
              className="w-full h-12 text-base font-semibold"
            >
              {loading ? "Testing Login..." : "Test Login Now"}
            </Button>

            {step && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">{step}</p>
              </div>
            )}

            {message && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border">
                <h3 className="font-semibold mb-2">Results:</h3>
                <pre className="text-sm whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                  {message}
                </pre>
              </div>
            )}

            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h3 className="font-semibold mb-2">Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Enter your email and password above</li>
                <li>Click "Test Login Now"</li>
                <li>Read the results - it will tell you exactly what's wrong</li>
                <li>If there are errors, copy the SQL fixes shown and run them in Supabase</li>
                <li>Try again after fixing</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


