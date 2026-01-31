"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, Loader2, User, Phone, CreditCard, MapPin, FileText, AlertCircle, CheckCircle } from "lucide-react"

export default function EditAccusedPage() {
  const params = useParams()
  const router = useRouter()
  const accusedId = params.id as string

  const [accused, setAccused] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{type: "success" | "error", text: string} | null>(null)

  useEffect(() => {
    if (accusedId) {
      loadAccused()
    }
  }, [accusedId])

  const loadAccused = async () => {
    try {
      setLoading(true)
      
      console.log("📋 Loading accused for edit:", accusedId)

      const { data, error } = await supabase
        .from("accused_details")
        .select("*")
        .eq("id", accusedId)
        .single()

      if (error) {
        console.error("❌ Load error:", error)
        throw error
      }

      console.log("✅ Accused loaded for edit:", data)
      setAccused(data)

    } catch (error: any) {
      console.error("❌ Error:", error)
      setMessage({ type: "error", text: "Failed to load accused" })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    
    const updateData = {
      name: formData.get("name") as string,
      father_name: formData.get("father_name") as string || null,
      mother_name: formData.get("mother_name") as string || null,
      age: parseInt(formData.get("age") as string) || null,
      gender: formData.get("gender") as string,
      date_of_birth: formData.get("date_of_birth") as string || null,
      mobile: formData.get("mobile") as string || null,
      email: formData.get("email") as string || null,
      aadhaar: formData.get("aadhaar") as string || null,
      pan_no: formData.get("pan_no") as string || null,
      full_address: formData.get("full_address") as string || null,
      state: formData.get("state") as string || null,
      district: formData.get("district") as string || null,
      pin_code: formData.get("pin_code") as string || null,
      identification_marks: formData.get("identification_marks") as string || null,
      accused_type: formData.get("accused_type") as string || null,
      updated_at: new Date().toISOString(),
    }

    try {
      console.log("💾 Updating accused:", accusedId)
      console.log("📝 Update data:", updateData)

      const { error } = await supabase
        .from("accused_details")
        .update(updateData)
        .eq("id", accusedId)

      if (error) {
        console.error("❌ Update error:", error)
        throw error
      }

      console.log("✅ Accused updated successfully")

      setMessage({ type: "success", text: "Accused updated successfully!" })

      // ✅ KEY FIX: Set localStorage flag
      localStorage.setItem("accused_updated", JSON.stringify({
        accusedId: accusedId,
        timestamp: Date.now()
      }))

      // ✅ Navigate with full reload
      setTimeout(() => {
        window.location.href = `/accused/${accusedId}`
      }, 1000)
      
    } catch (error: any) {
      console.error("❌ Error:", error)
      setMessage({ type: "error", text: error.message || "Failed to update accused" })
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!accused) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-xl text-gray-900 mb-2">Accused not found</p>
            <Button onClick={() => window.location.href = "/accused/list"}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 lg:px-6 py-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.location.href = `/accused/${accusedId}`}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Edit Accused</h1>
            <p className="text-sm text-gray-500">{accused.name}</p>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            message.type === "success" 
              ? "bg-green-50 text-green-700 border border-green-200" 
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {message.type === "success" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
          
          {/* Personal Information */}
          <Card>
            <CardHeader className="bg-green-50 border-b py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-green-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={accused.name || ""}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="father_name">Father's Name</Label>
                  <Input
                    id="father_name"
                    name="father_name"
                    defaultValue={accused.father_name || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="mother_name">Mother's Name</Label>
                  <Input
                    id="mother_name"
                    name="mother_name"
                    defaultValue={accused.mother_name || ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    min="1"
                    max="120"
                    defaultValue={accused.age || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    name="gender"
                    defaultValue={accused.gender || "Male"}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    name="date_of_birth"
                    type="date"
                    defaultValue={accused.date_of_birth || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="accused_type">Status</Label>
                  <select
                    id="accused_type"
                    name="accused_type"
                    defaultValue={accused.accused_type || "Unknown"}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="Unknown">Unknown</option>
                    <option value="Known">Known</option>
                    <option value="Arrested">Arrested</option>
                    <option value="Absconding">Absconding</option>
                    <option value="Bailed">Bailed</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader className="bg-blue-50 border-b py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-blue-600" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    name="mobile"
                    defaultValue={accused.mobile || ""}
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={accused.email || ""}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ID Documents */}
          <Card>
            <CardHeader className="bg-purple-50 border-b py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-purple-600" />
                ID Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="aadhaar">Aadhaar Number</Label>
                  <Input
                    id="aadhaar"
                    name="aadhaar"
                    defaultValue={accused.aadhaar || ""}
                    maxLength={12}
                  />
                </div>
                <div>
                  <Label htmlFor="pan_no">PAN Number</Label>
                  <Input
                    id="pan_no"
                    name="pan_no"
                    defaultValue={accused.pan_no || ""}
                    maxLength={10}
                    className="uppercase"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader className="bg-amber-50 border-b py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-amber-600" />
                Address Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <Label htmlFor="full_address">Full Address</Label>
                <Textarea
                  id="full_address"
                  name="full_address"
                  defaultValue={accused.full_address || ""}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    name="state"
                    defaultValue={accused.state || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    name="district"
                    defaultValue={accused.district || ""}
                  />
                </div>
                <div>
                  <Label htmlFor="pin_code">PIN Code</Label>
                  <Input
                    id="pin_code"
                    name="pin_code"
                    defaultValue={accused.pin_code || ""}
                    maxLength={6}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Other Details */}
          <Card>
            <CardHeader className="bg-red-50 border-b py-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-red-600" />
                Other Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div>
                <Label htmlFor="identification_marks">Identification Marks</Label>
                <Textarea
                  id="identification_marks"
                  name="identification_marks"
                  defaultValue={accused.identification_marks || ""}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-4 sticky bottom-4 bg-white p-4 rounded-lg shadow-lg border">
            <Button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => window.location.href = `/accused/${accusedId}`}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}