"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  ChevronLeft, UserPlus, Loader2, Save, User, 
  Phone, CreditCard, MapPin, Users
} from "lucide-react"
import { toast } from "sonner"

export default function AddBailerPage() {
  const params = useParams()
  const router = useRouter()
  const firId = params.id as string

  const [firNumber, setFirNumber] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    father_name: "",
    mobile: "",
    aadhaar: "",
    full_address: ""
  })

  useEffect(() => {
    checkAuth()
    loadFIRDetails()
  }, [firId])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  const loadFIRDetails = async () => {
    try {
      setLoading(true)

      const { data: fir, error } = await supabase
        .from("fir_records")
        .select("fir_number")
        .eq("id", firId)
        .single()

      if (error || !fir) {
        toast.error("FIR not found")
        router.push('/fir/list')
        return
      }

      setFirNumber(fir.fir_number)
    } catch (err) {
      console.error("Error loading data:", err)
      toast.error("Failed to load FIR details")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (saving) return

    // Validation
    if (!formData.name.trim()) {
      toast.error("Bailer name is required!")
      return
    }

    try {
      setSaving(true)

      console.log("💾 Adding bailer to FIR:", firId)

      const insertData = {
        fir_id: parseInt(firId),
        name: formData.name.trim(),
        father_name: formData.father_name.trim() || null,
        mobile: formData.mobile.trim() || null,
        aadhaar: formData.aadhaar.trim() || null,
        full_address: formData.full_address.trim() || null
      }

      console.log("📤 Insert data:", insertData)

      const { data, error: insertError } = await supabase
        .from("bailer_details")
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        console.error("❌ Insert error:", insertError)
        toast.error("Failed to add bailer: " + insertError.message)
        return
      }

      console.log("✅ Bailer added:", data)
      toast.success("Bailer added successfully!")

      // Set refresh flag for detail page
      localStorage.setItem('fir_updated', JSON.stringify({
        firId: firId,
        timestamp: Date.now(),
        bailers_updated: true
      }))

      // Redirect after delay
      setTimeout(() => {
        router.push(`/fir/${firId}`)
      }, 1000)

    } catch (err: any) {
      console.error("Error:", err)
      toast.error(err.message || "Failed to add bailer")
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => router.push(`/fir/${firId}`)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={goBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Users className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Add Bailer</h1>
            <p className="text-muted-foreground text-sm">
              FIR: {firNumber}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Details */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Name <span className="text-red-500">*</span></Label>
                  <Input
                    className="mt-1"
                    placeholder="Full Name of Bailer"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label>Father's Name</Label>
                  <Input
                    className="mt-1"
                    placeholder="Father's Name"
                    value={formData.father_name}
                    onChange={(e) => handleChange("father_name", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Details */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Contact Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Mobile Number</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="10-digit Mobile Number"
                      value={formData.mobile}
                      onChange={(e) => handleChange("mobile", e.target.value)}
                    />
                  </div>
                </div>
                
                <div>
                  <Label>Aadhaar Number</Label>
                  <div className="relative mt-1">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="12-digit Aadhaar Number"
                      value={formData.aadhaar}
                      onChange={(e) => handleChange("aadhaar", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Address
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div>
                <Label>Full Address</Label>
                <Textarea
                  className="mt-1"
                  placeholder="Complete address including village, district, state..."
                  value={formData.full_address}
                  onChange={(e) => handleChange("full_address", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t-2">
            <Button type="button" variant="outline" onClick={goBack} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="min-w-[140px]">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Add Bailer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}