"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { profileSchema, changePasswordSchema, type ProfileInput, type ChangePasswordInput } from "@/lib/validations/schemas"
import { supabase } from "@/lib/supabase/client"
import { Header } from "@/components/layout/Header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Lock, User, Mail, Phone, Shield, Building, Hash, Loader2 } from "lucide-react"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  })

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      // Get current auth user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        console.error("No authenticated user found")
        window.location.href = '/login'
        return
      }

      // Get user profile from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .single()

      if (userError) {
        // Try with email if auth_id not found (for legacy users)
        const { data: userByEmail, error: emailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single()

        if (emailError || !userByEmail) {
          console.error("User profile not found")
          toast({
            title: "Error",
            description: "Failed to load user profile",
            variant: "destructive"
          })
          return
        }
        
        setUser(userByEmail)
        setValue("full_name", userByEmail.full_name || "")
        setValue("mobile", userByEmail.mobile || "")
      } else {
        setUser(userData)
        setValue("full_name", userData.full_name || "")
        setValue("mobile", userData.mobile || "")
      }
    } catch (error) {
      console.error("Error loading user:", error)
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ProfileInput) => {
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: data.full_name,
          mobile: data.mobile || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id)

      if (error) throw error

      // Create audit log
      await supabase
        .from("audit_logs")
        .insert({
          user_id: user.id,
          action: "UPDATE",
          table_name: "users",
          record_id: user.id.toString(),
          summary: "Profile updated",
          created_at: new Date().toISOString()
        })

      toast({
        title: "Success",
        description: "Profile updated successfully",
      })

      // Reload user data
      await loadUser()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const onPasswordSubmit = async (data: ChangePasswordInput) => {
    setChangingPassword(true)
    try {
      // First verify current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: data.currentPassword
      })

      if (signInError) {
        throw new Error("Current password is incorrect")
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      })

      if (updateError) throw updateError

      // Update password_hash in users table if needed
      await supabase
        .from("users")
        .update({
          password_hash: data.newPassword,
          updated_at: new Date().toISOString()
        })
        .eq("id", user.id)

      // Create audit log
      await supabase
        .from("audit_logs")
        .insert({
          user_id: user.id,
          action: "UPDATE",
          table_name: "users",
          record_id: user.id.toString(),
          summary: "Password changed",
          created_at: new Date().toISOString()
        })

      toast({
        title: "Success",
        description: "Password changed successfully",
      })
      
      setShowPasswordDialog(false)
      resetPassword()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      })
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">User not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <Header user={user} title="Profile" />
      <div className="page-container space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your profile details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Employee ID */}
                <div className="space-y-2">
                  <Label htmlFor="employee_id">Employee ID</Label>
                  <Input
                    id="employee_id"
                    value={user?.employee_id || user?.belt_number || "N/A"}
                    disabled
                    className="bg-muted"
                  />
                </div>
                
                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    value={user?.email || ""} 
                    disabled 
                    className="bg-muted"
                  />
                </div>
                
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="full_name">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input id="full_name" {...register("full_name")} />
                  {errors.full_name && (
                    <p className="text-sm text-red-500">
                      {errors.full_name.message}
                    </p>
                  )}
                </div>
                
                {/* Mobile */}
                <div className="space-y-2">
                  <Label htmlFor="mobile">
                    Mobile <span className="text-red-500">*</span>
                  </Label>
                  <Input 
                    id="mobile" 
                    {...register("mobile")}
                    maxLength={10}
                  />
                  {errors.mobile && (
                    <p className="text-sm text-red-500">
                      {errors.mobile.message}
                    </p>
                  )}
                </div>
                
                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    value={user?.role?.replace(/_/g, " ").toUpperCase() || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
                
                {/* Designation */}
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input
                    id="designation"
                    value={user?.designation || "N/A"}
                    disabled
                    className="bg-muted"
                  />
                </div>

                {/* Rank */}
                {user?.rank && (
                  <div className="space-y-2">
                    <Label htmlFor="rank">Rank</Label>
                    <Input
                      id="rank"
                      value={user.rank}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                )}

                {/* Belt Number */}
                {user?.belt_number && (
                  <div className="space-y-2">
                    <Label htmlFor="belt_number">Belt Number</Label>
                    <Input
                      id="belt_number"
                      value={user.belt_number}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                
                <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline">
                      <Lock className="mr-2 h-4 w-4" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one
                      </DialogDescription>
                    </DialogHeader>
                    <form
                      onSubmit={handleSubmitPassword(onPasswordSubmit)}
                      className="space-y-4"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          {...registerPassword("currentPassword")}
                        />
                        {passwordErrors.currentPassword && (
                          <p className="text-sm text-red-500">
                            {passwordErrors.currentPassword.message}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          {...registerPassword("newPassword")}
                        />
                        {passwordErrors.newPassword && (
                          <p className="text-sm text-red-500">
                            {passwordErrors.newPassword.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Must be at least 8 characters with uppercase, number, and
                          special character
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          {...registerPassword("confirmPassword")}
                        />
                        {passwordErrors.confirmPassword && (
                          <p className="text-sm text-red-500">
                            {passwordErrors.confirmPassword.message}
                          </p>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setShowPasswordDialog(false)
                            resetPassword()
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={changingPassword}>
                          {changingPassword ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Changing...
                            </>
                          ) : (
                            "Change Password"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Info Card */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Account Status</p>
                <p className="font-medium">
                  {user.is_active ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">Inactive</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Member Since</p>
                <p className="font-medium">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              {user.thana_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Police Station</p>
                  <p className="font-medium">Thana ID: {user.thana_id}</p>
                </div>
              )}
              {user.district_id && (
                <div>
                  <p className="text-sm text-muted-foreground">District</p>
                  <p className="font-medium">District ID: {user.district_id}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card> */}
      </div>
    </div>
  )
}