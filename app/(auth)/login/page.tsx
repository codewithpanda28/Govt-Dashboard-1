"use client"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const supabase = createClientComponentClient()
  const [email, setEmail] = useState("officer1@railpolice.in")
  const [password, setPassword] = useState("Officer@123")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setLoading(true)

    try {
      // Step 1: Login with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (authError) {
        setError(`Authentication failed: ${authError.message}`)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError("Login failed: No user data returned")
        setLoading(false)
        return
      }

      // Step 2: Check if user exists in users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authData.user.id)
        .single()

      if (userError || !userData) {
        setError(
          "User not found in database. Please run this SQL in Supabase:\n\n" +
          "INSERT INTO users (auth_id, employee_id, email, mobile, full_name, designation, role, police_station_id, railway_district_id, is_first_login)\n" +
          "SELECT id, 'EMP001', 'officer1@railpolice.in', '9876543210', 'Officer Name', 'SHO', 'station_officer', 1, 1, true\n" +
          `FROM auth.users WHERE id = '${authData.user.id}';`
        )
        setLoading(false)
        return
      }

      // Step 3: Check user is active and has correct role
      if (!userData.is_active) {
        setError("Your account is inactive. Please contact administrator.")
        setLoading(false)
        return
      }

      if (!['station_officer', 'data_operator'].includes(userData.role)) {
        setError(`You don't have permission. Your role is: ${userData.role}. Required: station_officer or data_operator`)
        setLoading(false)
        return
      }

      // Step 4: Success - redirect
      setMessage("Login successful! Redirecting...")
      const redirectPath = userData.is_first_login ? "/change-password" : "/dashboard"
      
      setTimeout(() => {
        window.location.href = redirectPath
      }, 1000)

    } catch (err: any) {
      setError(`Error: ${err.message || "Something went wrong"}`)
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper">
      <div className="page-container">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Railway Police Portal</CardTitle>
            <CardDescription>Enter your credentials to login</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800 whitespace-pre-wrap">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                {message}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="mt-1"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
            <div className="mt-4 text-center text-xs text-gray-500">
              <p>Test: officer1@railpolice.in / Officer@123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
