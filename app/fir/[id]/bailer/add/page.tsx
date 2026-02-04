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
  ChevronLeft, Shield, Loader2, Save, User, 
  Phone, CreditCard, MapPin, Upload, FileText
} from "lucide-react"
import { toast } from "sonner"

export default function AddBailerPage() {
  const params = useParams()
  const router = useRouter()
  const firId = params.id as string

  const [firNumber, setFirNumber] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Dropdown data
  const [states, setStates] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])

  // Form data - All client required fields
  const [formData, setFormData] = useState({
    name: "",
    aadhaar: "",
    gender: "male",
    dob: "",
    age: "",
    pan: "",
    father_name: "",
    state_id: "",
    district_id: "",
    full_address: "",
    pin_code: "",
    mobile: "",
    email: "",
    brief: "",
    attachment_url: "",
    attachment_name: ""
  })

  useEffect(() => {
    checkAuth()
    loadInitialData()
  }, [firId])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  const loadInitialData = async () => {
    try {
      setLoading(true)

      // Load FIR details
      const { data: fir, error: firError } = await supabase
        .from("fir_records")
        .select("fir_number")
        .eq("id", firId)
        .single()

      if (firError || !fir) {
        toast.error("FIR not found")
        router.push('/fir/list')
        return
      }

      setFirNumber(fir.fir_number)

      // Load states and districts
      const [statesRes, districtsRes] = await Promise.all([
        supabase.from("states").select("*").order("name"),
        supabase.from("districts").select("*").order("name")
      ])

      setStates(statesRes.data || [])
      setDistricts(districtsRes.data || [])

    } catch (err) {
      console.error("Error loading data:", err)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-calculate age from DOB
      if (field === 'dob' && value) {
        const birthDate = new Date(value)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        
        updated.age = age.toString()
      }
      
      return updated
    })
  }

  // File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)

      const fileExt = file.name.split('.').pop()
      const fileName = `bailer_${firId}_${Date.now()}.${fileExt}`
      const filePath = `fir-attachments/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) {
        console.error("Upload error:", uploadError)
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      setFormData(prev => ({
        ...prev,
        attachment_url: publicUrl,
        attachment_name: file.name
      }))

      toast.success("File uploaded successfully!")
    } catch (err: any) {
      console.error("Upload error:", err)
      toast.error("Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (saving) return

    // Validation
    if (!formData.name.trim()) {
      toast.error("Name is required!")
      return
    }

    try {
      setSaving(true)

      console.log("💾 Adding bailer to FIR:", firId)

      // Get state and district names
      const selectedState = states.find(s => s.id === parseInt(formData.state_id))
      const selectedDistrict = districts.find(d => d.id === parseInt(formData.district_id))

      const insertData = {
        fir_id: parseInt(firId),
        name: formData.name.trim(),
        aadhaar: formData.aadhaar.trim() || null,
        gender: formData.gender,
        dob: formData.dob || null,
        age: formData.age ? parseInt(formData.age) : null,
        pan: formData.pan ? formData.pan.toUpperCase().trim() : null,
        father_name: formData.father_name.trim() || null,
        state_id: formData.state_id ? parseInt(formData.state_id) : null,
        state_name: selectedState?.name || selectedState?.state_name || null,
        district_id: formData.district_id ? parseInt(formData.district_id) : null,
        district_name: selectedDistrict?.name || selectedDistrict?.district_name || null,
        full_address: formData.full_address.trim() || null,
        pin_code: formData.pin_code.trim() || null,
        mobile: formData.mobile.trim() || null,
        email: formData.email.trim() || null,
        brief: formData.brief.trim() || null,
        attachment_url: formData.attachment_url || null,
        attachment_name: formData.attachment_name || null,
        created_at: new Date().toISOString()
      }

      console.log("📤 Insert data:", insertData)

      const { data, error: insertError } = await supabase
        .from("bailer_details")
        .insert(insertData)
        .select()

      if (insertError) {
        console.error("❌ Insert error:", insertError)
        toast.error("Failed to add bailer: " + insertError.message)
        return
      }

      console.log("✅ Bailer added:", data)
      toast.success("Bailer added successfully!")

      // Set refresh flag
      localStorage.setItem('fir_updated', JSON.stringify({
        firId: firId,
        timestamp: Date.now()
      }))

      // Redirect
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
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={goBack}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="p-2 bg-yellow-100 rounded-lg">
            <Shield className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Add Bailer</h1>
            <p className="text-muted-foreground text-sm">FIR: {firNumber}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Personal Information */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Name */}
                <div className="md:col-span-2">
                  <Label>Name <span className="text-red-500">*</span></Label>
                  <Input
                    className="mt-1"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    required
                  />
                </div>
                
                {/* Aadhaar */}
                <div>
                  <Label>Aadhaar No.</Label>
                  <div className="relative mt-1">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="12-digit Aadhaar"
                      value={formData.aadhaar}
                      onChange={(e) => handleChange("aadhaar", e.target.value)}
                      maxLength={12}
                    />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <Label>Gender</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    value={formData.gender}
                    onChange={(e) => handleChange("gender", e.target.value)}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* DOB / Age */}
                <div>
                  <Label>DOB / Age</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => handleChange("dob", e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Age"
                      value={formData.age}
                      onChange={(e) => handleChange("age", e.target.value)}
                      className="w-20"
                      min="18"
                      max="120"
                    />
                  </div>
                </div>

                {/* PAN */}
                <div>
                  <Label>PAN No.</Label>
                  <Input
                    className="mt-1 uppercase"
                    placeholder="PAN Number"
                    value={formData.pan}
                    onChange={(e) => handleChange("pan", e.target.value.toUpperCase())}
                    maxLength={10}
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>

                {/* Father's Name */}
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

          {/* Contact Information */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Mobile */}
                <div>
                  <Label>Mobile</Label>
                  <div className="relative mt-1">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="10-digit Mobile Number"
                      value={formData.mobile}
                      onChange={(e) => handleChange("mobile", e.target.value)}
                      maxLength={10}
                    />
                  </div>
                </div>
                
                {/* Email */}
                <div>
                  <Label>Email ID</Label>
                  <Input
                    type="email"
                    className="mt-1"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* State */}
                <div>
                  <Label>State</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    value={formData.state_id}
                    onChange={(e) => handleChange("state_id", e.target.value)}
                  >
                    <option value="">-- Select State --</option>
                    {states.map(state => (
                      <option key={state.id} value={state.id}>
                        {state.name || state.state_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div>
                  <Label>District</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    value={formData.district_id}
                    onChange={(e) => handleChange("district_id", e.target.value)}
                  >
                    <option value="">-- Select District --</option>
                    {districts.map(district => (
                      <option key={district.id} value={district.id}>
                        {district.name || district.district_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Full Address */}
                <div className="md:col-span-2">
                  <Label>Full Address</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Complete address including village, post office, police station..."
                    value={formData.full_address}
                    onChange={(e) => handleChange("full_address", e.target.value)}
                    rows={3}
                  />
                </div>

                {/* PIN Code */}
                <div>
                  <Label>PIN Code</Label>
                  <Input
                    className="mt-1"
                    placeholder="6-digit PIN Code"
                    value={formData.pin_code}
                    onChange={(e) => handleChange("pin_code", e.target.value)}
                    maxLength={6}
                  />
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Additional Information - Brief & Attachment */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                
                {/* Brief (Taxarea) */}
                <div>
                  <Label>Brief (Taxarea)</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Enter brief details about bail..."
                    value={formData.brief}
                    onChange={(e) => handleChange("brief", e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Attachment (FIR Copy) */}
                <div>
                  <Label>Attachment (FIR Copy)</Label>
                  <input
                    id="file-upload"
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={uploading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={uploading}
                    className="w-full justify-start mt-1 h-12"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {formData.attachment_name || "Click to upload file (PDF, JPG, PNG)"}
                      </>
                    )}
                  </Button>
                  {formData.attachment_url && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">{formData.attachment_name}</span>
                      <span className="text-xs text-green-600 ml-auto">✓ Uploaded</span>
                    </div>
                  )}
                </div>

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
                  Saving...
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