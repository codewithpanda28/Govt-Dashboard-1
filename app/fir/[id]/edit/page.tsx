"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft, Save, Loader2, FileText, Train,
  User, Scale, Briefcase, Users, Plus, Trash2, RefreshCw
} from "lucide-react"
import { toast } from "sonner"

interface Accused {
  id?: number
  name: string
  father_name: string
  age: string
  gender: string
  mobile: string
  aadhaar: string
  accused_type: string
  full_address: string
  isNew?: boolean
}

interface Bailer {
  id?: number
  name: string
  father_name: string
  mobile: string
  aadhaar: string
  full_address: string
  isNew?: boolean
}

export default function EditFIRPage() {
  const params = useParams()
  const router = useRouter()
  const firId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("case")

  // ✅ Form Data - Using EXACT column names from your database
  const [formData, setFormData] = useState({
    fir_number: "",
    accused_type: "unknown",
    case_status: "open",
    // Location (text fields)
    state: "",
    state_name: "",
    zone: "",
    zone_name: "",
    district: "",
    district_name: "",
    thana: "",
    thana_name: "",
    court_name: "",
    // Location IDs (bigint fields)
    state_id: "",
    zone_id: "",
    railway_district_id: "",
    thana_id: "",
    court_id: "",
    // Law sections
    law_sections_text: "",
    // Date/Time
    incident_date: "",
    incident_time: "",
    // Train (correct column names)
    train_number_manual: "",
    train_name_manual: "",
    station_code: "",
    station_name_manual: "",
    // Description
    brief_description: "",
    property_stolen: "",
    estimated_value: "",
    // IO (correct column names)
    io_name: "",
    io_belt_no: "",
    io_rank: "",
    io_mobile: "",
    // Lawyer (correct column names)
    lawyer_name: "",
    bar_council_no: "",
    lawyer_mobile: "",
    lawyer_email: ""
  })

  const [accusedList, setAccusedList] = useState<Accused[]>([])
  const [bailerList, setBailerList] = useState<Bailer[]>([])
  const [newAccusedCount, setNewAccusedCount] = useState(0)
  const [newBailerCount, setNewBailerCount] = useState(0)

  // ✅ Load FIR Data
  const loadFIRData = useCallback(async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch FIR
      const { data: fir, error: firError } = await supabase
        .from("fir_records")
        .select("*")
        .eq("id", firId)
        .single()

      if (firError || !fir) {
        toast.error("FIR not found")
        router.push('/fir/list')
        return
      }

      console.log("FIR loaded:", fir)

      // ✅ Set form data using exact column names
      setFormData({
        fir_number: fir.fir_number || "",
        accused_type: fir.accused_type || "unknown",
        case_status: fir.case_status || "open",
        // Location text
        state: fir.state || "",
        state_name: fir.state_name || "",
        zone: fir.zone || "",
        zone_name: fir.zone_name || "",
        district: fir.district || "",
        district_name: fir.district_name || "",
        thana: fir.thana || "",
        thana_name: fir.thana_name || "",
        court_name: fir.court_name || "",
        // Location IDs
        state_id: fir.state_id?.toString() || "",
        zone_id: fir.zone_id?.toString() || "",
        railway_district_id: fir.railway_district_id?.toString() || "",
        thana_id: fir.thana_id?.toString() || "",
        court_id: fir.court_id?.toString() || "",
        // Law sections
        law_sections_text: fir.law_sections_text || "",
        // Date/Time
        incident_date: fir.incident_date || "",
        incident_time: fir.incident_time || "",
        // Train
        train_number_manual: fir.train_number_manual || "",
        train_name_manual: fir.train_name_manual || "",
        station_code: fir.station_code || "",
        station_name_manual: fir.station_name_manual || "",
        // Description
        brief_description: fir.brief_description || "",
        property_stolen: fir.property_stolen || "",
        estimated_value: fir.estimated_value?.toString() || "",
        // IO
        io_name: fir.io_name || "",
        io_belt_no: fir.io_belt_no || "",
        io_rank: fir.io_rank || "",
        io_mobile: fir.io_mobile || "",
        // Lawyer
        lawyer_name: fir.lawyer_name || "",
        bar_council_no: fir.bar_council_no || "",
        lawyer_mobile: fir.lawyer_mobile || "",
        lawyer_email: fir.lawyer_email || ""
      })

      // Load Accused & Bailers
      await loadAccused()
      await loadBailers()

    } catch (err) {
      console.error("Error:", err)
      toast.error("Failed to load FIR")
    } finally {
      setLoading(false)
    }
  }, [firId, router])

  // Load Accused
  const loadAccused = async () => {
    const { data: accused, error } = await supabase
      .from("accused_details")
      .select("*")
      .eq("fir_id", firId)
      .order("id", { ascending: true })

    if (!error && accused) {
      setAccusedList(accused.map(a => ({
        id: a.id,
        name: a.name || "",
        father_name: a.father_name || "",
        age: a.age?.toString() || "",
        gender: a.gender || "male",
        mobile: a.mobile || "",
        aadhaar: a.aadhaar || "",
        accused_type: a.accused_type || "unknown",
        full_address: a.full_address || "",
        isNew: false
      })))
    }
  }

  // Load Bailers
  const loadBailers = async () => {
    const { data: bailers, error } = await supabase
      .from("bailer_details")
      .select("*")
      .eq("fir_id", firId)
      .order("id", { ascending: true })

    if (!error && bailers) {
      setBailerList(bailers.map(b => ({
        id: b.id,
        name: b.name || "",
        father_name: b.father_name || "",
        mobile: b.mobile || "",
        aadhaar: b.aadhaar || "",
        full_address: b.full_address || "",
        isNew: false
      })))
    }
  }

  useEffect(() => {
    loadFIRData()

    const checkUpdates = () => {
      const updateFlag = localStorage.getItem('fir_updated')
      if (updateFlag) {
        try {
          const parsed = JSON.parse(updateFlag)
          if (parsed.firId === firId) {
            loadBailers()
            loadAccused()
            localStorage.removeItem('fir_updated')
          }
        } catch (e) {
          localStorage.removeItem('fir_updated')
        }
      }
    }

    checkUpdates()
    window.addEventListener('focus', checkUpdates)
    return () => window.removeEventListener('focus', checkUpdates)
  }, [loadFIRData, firId])

  // Form handlers
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Add New Accused
  const addNewAccused = () => {
    setAccusedList(prev => [...prev, {
      name: "", father_name: "", age: "", gender: "male",
      mobile: "", aadhaar: "", accused_type: "unknown", full_address: "", isNew: true
    }])
    setNewAccusedCount(prev => prev + 1)
  }

  // Add New Bailer
  const addNewBailer = () => {
    setBailerList(prev => [...prev, {
      name: "", father_name: "", mobile: "", aadhaar: "", full_address: "", isNew: true
    }])
    setNewBailerCount(prev => prev + 1)
  }

  // Update Accused
  const updateAccused = (index: number, field: string, value: string) => {
    setAccusedList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Update Bailer
  const updateBailer = (index: number, field: string, value: string) => {
    setBailerList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  // Delete Accused
  const deleteAccused = async (index: number) => {
    const accused = accusedList[index]
    
    if (accused.id && !accused.isNew) {
      const { error } = await supabase
        .from("accused_details")
        .delete()
        .eq("id", accused.id)

      if (error) {
        toast.error("Failed to delete accused")
        return
      }
    }

    setAccusedList(prev => prev.filter((_, i) => i !== index))
    if (accused.isNew) setNewAccusedCount(prev => prev - 1)
    toast.success("Accused removed")
  }

  // Delete Bailer
  const deleteBailer = async (index: number) => {
    const bailer = bailerList[index]
    
    if (bailer.id && !bailer.isNew) {
      const { error } = await supabase
        .from("bailer_details")
        .delete()
        .eq("id", bailer.id)

      if (error) {
        toast.error("Failed to delete bailer")
        return
      }
    }

    setBailerList(prev => prev.filter((_, i) => i !== index))
    if (bailer.isNew) setNewBailerCount(prev => prev - 1)
    toast.success("Bailer removed")
  }

  // Refresh
  const handleRefresh = async () => {
    toast.info("Refreshing...")
    await loadAccused()
    await loadBailers()
    toast.success("Refreshed!")
  }

  // ✅ SAVE - Using EXACT column names
  const handleSave = async () => {
    try {
      setSaving(true)

      // ✅ Build update data with EXACT column names from your table
      const updateData: Record<string, any> = {
        accused_type: formData.accused_type,
        case_status: formData.case_status,
        updated_at: new Date().toISOString()
      }

      // Location text fields
      if (formData.state) updateData.state = formData.state
      if (formData.state_name) updateData.state_name = formData.state_name
      if (formData.zone) updateData.zone = formData.zone
      if (formData.zone_name) updateData.zone_name = formData.zone_name
      if (formData.district) updateData.district = formData.district
      if (formData.district_name) updateData.district_name = formData.district_name
      if (formData.thana) updateData.thana = formData.thana
      if (formData.thana_name) updateData.thana_name = formData.thana_name
      if (formData.court_name) updateData.court_name = formData.court_name

      // Location IDs (convert to number)
      if (formData.state_id) updateData.state_id = parseInt(formData.state_id)
      if (formData.zone_id) updateData.zone_id = parseInt(formData.zone_id)
      if (formData.railway_district_id) updateData.railway_district_id = parseInt(formData.railway_district_id)
      if (formData.thana_id) updateData.thana_id = parseInt(formData.thana_id)
      if (formData.court_id) updateData.court_id = parseInt(formData.court_id)

      // Law sections (correct column name)
      if (formData.law_sections_text) updateData.law_sections_text = formData.law_sections_text

      // Date/Time
      if (formData.incident_date) updateData.incident_date = formData.incident_date
      if (formData.incident_time) updateData.incident_time = formData.incident_time

      // Train (correct column names)
      if (formData.train_number_manual) updateData.train_number_manual = formData.train_number_manual
      if (formData.train_name_manual) updateData.train_name_manual = formData.train_name_manual
      if (formData.station_code) updateData.station_code = formData.station_code
      if (formData.station_name_manual) updateData.station_name_manual = formData.station_name_manual

      // Description
      if (formData.brief_description) updateData.brief_description = formData.brief_description
      if (formData.property_stolen) updateData.property_stolen = formData.property_stolen
      if (formData.estimated_value) updateData.estimated_value = parseFloat(formData.estimated_value)

      // IO (correct column names)
      if (formData.io_name) updateData.io_name = formData.io_name
      if (formData.io_belt_no) updateData.io_belt_no = formData.io_belt_no
      if (formData.io_rank) updateData.io_rank = formData.io_rank
      if (formData.io_mobile) updateData.io_mobile = formData.io_mobile

      // Lawyer (correct column names)
      if (formData.lawyer_name) updateData.lawyer_name = formData.lawyer_name
      if (formData.bar_council_no) updateData.bar_council_no = formData.bar_council_no
      if (formData.lawyer_mobile) updateData.lawyer_mobile = formData.lawyer_mobile
      if (formData.lawyer_email) updateData.lawyer_email = formData.lawyer_email

      console.log("Updating FIR with:", updateData)

      // Update FIR
      const { error: firError } = await supabase
        .from("fir_records")
        .update(updateData)
        .eq("id", firId)

      if (firError) {
        console.error("FIR update error:", firError)
        toast.error("Failed to update: " + firError.message)
        return
      }

      // Update/Insert Accused
      for (const accused of accusedList) {
        if (accused.isNew && accused.name.trim()) {
          await supabase.from("accused_details").insert({
            fir_id: parseInt(firId),
            name: accused.name,
            father_name: accused.father_name || null,
            age: accused.age ? parseInt(accused.age) : null,
            gender: accused.gender,
            mobile: accused.mobile || null,
            aadhaar: accused.aadhaar || null,
            accused_type: accused.accused_type,
            full_address: accused.full_address || null
          })
        } else if (accused.id) {
          await supabase.from("accused_details").update({
            name: accused.name,
            father_name: accused.father_name || null,
            age: accused.age ? parseInt(accused.age) : null,
            gender: accused.gender,
            mobile: accused.mobile || null,
            aadhaar: accused.aadhaar || null,
            accused_type: accused.accused_type,
            full_address: accused.full_address || null
          }).eq("id", accused.id)
        }
      }

      // Update/Insert Bailers
      for (const bailer of bailerList) {
        if (bailer.isNew && bailer.name.trim()) {
          await supabase.from("bailer_details").insert({
            fir_id: parseInt(firId),
            name: bailer.name,
            father_name: bailer.father_name || null,
            mobile: bailer.mobile || null,
            aadhaar: bailer.aadhaar || null,
            full_address: bailer.full_address || null
          })
        } else if (bailer.id) {
          await supabase.from("bailer_details").update({
            name: bailer.name,
            father_name: bailer.father_name || null,
            mobile: bailer.mobile || null,
            aadhaar: bailer.aadhaar || null,
            full_address: bailer.full_address || null
          }).eq("id", bailer.id)
        }
      }

      toast.success("FIR updated successfully!")
      
      localStorage.setItem('fir_updated', JSON.stringify({
        firId: firId,
        timestamp: Date.now()
      }))

      router.push(`/fir/${firId}`)

    } catch (err: any) {
      console.error("Save error:", err)
      toast.error(err.message || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const goBack = () => router.push(`/fir/${firId}`)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading FIR...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Edit FIR</h1>
              <p className="text-muted-foreground text-sm">{formData.fir_number}</p>
            </div>
          </div>
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b pb-2 overflow-x-auto">
          {[
            { id: "case", label: "Case Details", icon: FileText },
            { id: "accused", label: `Accused (${accusedList.length})`, icon: User },
            { id: "bailers", label: `Bailers (${bailerList.length})`, icon: Users },
            { id: "io", label: "IO & Lawyer", icon: Briefcase }
          ].map(tab => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Case Details Tab */}
        {activeTab === "case" && (
          <div className="space-y-6">
            <Card className="border-2">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-lg">Case Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>FIR Number</Label>
                    <Input value={formData.fir_number} disabled className="mt-1 bg-muted" />
                  </div>
                  <div>
                    <Label>Accused Type</Label>
                    <select
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                      value={formData.accused_type}
                      onChange={(e) => handleChange("accused_type", e.target.value)}
                    >
                      <option value="unknown">Unknown</option>
                      <option value="known">Known</option>
                    </select>
                  </div>
                  <div>
                    <Label>Case Status</Label>
                    <select
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                      value={formData.case_status}
                      onChange={(e) => handleChange("case_status", e.target.value)}
                    >
                      <option value="open">Open</option>
                      <option value="under_investigation">Under Investigation</option>
                      <option value="chargesheet">Chargesheet Filed</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      className="mt-1"
                      value={formData.state || formData.state_name}
                      onChange={(e) => {
                        handleChange("state", e.target.value)
                        handleChange("state_name", e.target.value)
                      }}
                    />
                  </div>
                  <div>
                    <Label>Zone</Label>
                    <Input
                      className="mt-1"
                      value={formData.zone || formData.zone_name}
                      onChange={(e) => {
                        handleChange("zone", e.target.value)
                        handleChange("zone_name", e.target.value)
                      }}
                    />
                  </div>
                  <div>
                    <Label>District</Label>
                    <Input
                      className="mt-1"
                      value={formData.district || formData.district_name}
                      onChange={(e) => {
                        handleChange("district", e.target.value)
                        handleChange("district_name", e.target.value)
                      }}
                    />
                  </div>
                  <div>
                    <Label>Thana</Label>
                    <Input
                      className="mt-1"
                      value={formData.thana || formData.thana_name}
                      onChange={(e) => {
                        handleChange("thana", e.target.value)
                        handleChange("thana_name", e.target.value)
                      }}
                    />
                  </div>
                  <div>
                    <Label>Court</Label>
                    <Input
                      className="mt-1"
                      value={formData.court_name}
                      onChange={(e) => handleChange("court_name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Law Sections</Label>
                    <Input
                      className="mt-1"
                      value={formData.law_sections_text}
                      onChange={(e) => handleChange("law_sections_text", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Incident Date</Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={formData.incident_date}
                      onChange={(e) => handleChange("incident_date", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Incident Time</Label>
                    <Input
                      type="time"
                      className="mt-1"
                      value={formData.incident_time}
                      onChange={(e) => handleChange("incident_time", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Train className="h-5 w-5" />
                  Train & Station
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Train Number</Label>
                    <Input
                      className="mt-1"
                      value={formData.train_number_manual}
                      onChange={(e) => handleChange("train_number_manual", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Train Name</Label>
                    <Input
                      className="mt-1"
                      value={formData.train_name_manual}
                      onChange={(e) => handleChange("train_name_manual", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Station Code</Label>
                    <Input
                      className="mt-1"
                      value={formData.station_code}
                      onChange={(e) => handleChange("station_code", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Station Name</Label>
                    <Input
                      className="mt-1"
                      value={formData.station_name_manual}
                      onChange={(e) => handleChange("station_name_manual", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-lg">Case Description</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div>
                  <Label>Brief Description</Label>
                  <Textarea
                    className="mt-1"
                    value={formData.brief_description}
                    onChange={(e) => handleChange("brief_description", e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Property Stolen</Label>
                    <Input
                      className="mt-1"
                      value={formData.property_stolen}
                      onChange={(e) => handleChange("property_stolen", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Estimated Value (₹)</Label>
                    <Input
                      type="number"
                      className="mt-1"
                      value={formData.estimated_value}
                      onChange={(e) => handleChange("estimated_value", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Accused Tab */}
        {activeTab === "accused" && (
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Accused ({accusedList.length})
                  {newAccusedCount > 0 && <Badge>{newAccusedCount} new</Badge>}
                </CardTitle>
                <Button size="sm" onClick={addNewAccused}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {accusedList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No accused added</p>
                  <Button size="sm" className="mt-4" onClick={addNewAccused}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Accused
                  </Button>
                </div>
              ) : (
                accusedList.map((accused, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between mb-3">
                      <span className="font-medium">
                        #{index + 1} {accused.isNew && <Badge>New</Badge>}
                      </span>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteAccused(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input placeholder="Name" value={accused.name} onChange={(e) => updateAccused(index, "name", e.target.value)} />
                      <Input placeholder="Father Name" value={accused.father_name} onChange={(e) => updateAccused(index, "father_name", e.target.value)} />
                      <div className="flex gap-2">
                        <Input placeholder="Age" className="w-20" value={accused.age} onChange={(e) => updateAccused(index, "age", e.target.value)} />
                        <select className="flex-1 border rounded px-2 bg-background" value={accused.gender} onChange={(e) => updateAccused(index, "gender", e.target.value)}>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <Input placeholder="Mobile" value={accused.mobile} onChange={(e) => updateAccused(index, "mobile", e.target.value)} />
                      <Input placeholder="Aadhaar" value={accused.aadhaar} onChange={(e) => updateAccused(index, "aadhaar", e.target.value)} />
                      <select className="border rounded px-3 py-2 bg-background" value={accused.accused_type} onChange={(e) => updateAccused(index, "accused_type", e.target.value)}>
                        <option value="unknown">Unknown</option>
                        <option value="known">Known</option>
                        <option value="arrested">Arrested</option>
                        <option value="absconding">Absconding</option>
                      </select>
                      <Input placeholder="Address" className="md:col-span-3" value={accused.full_address} onChange={(e) => updateAccused(index, "full_address", e.target.value)} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Bailers Tab */}
        {activeTab === "bailers" && (
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Bailers ({bailerList.length})
                  {newBailerCount > 0 && <Badge>{newBailerCount} new</Badge>}
                </CardTitle>
                <Button size="sm" onClick={addNewBailer}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {bailerList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No bailers added</p>
                  <Button size="sm" className="mt-4" onClick={addNewBailer}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bailer
                  </Button>
                </div>
              ) : (
                bailerList.map((bailer, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex justify-between mb-3">
                      <span className="font-medium">
                        #{index + 1} {bailer.isNew && <Badge>New</Badge>}
                      </span>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteBailer(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input placeholder="Name" value={bailer.name} onChange={(e) => updateBailer(index, "name", e.target.value)} />
                      <Input placeholder="Father Name" value={bailer.father_name} onChange={(e) => updateBailer(index, "father_name", e.target.value)} />
                      <Input placeholder="Mobile" value={bailer.mobile} onChange={(e) => updateBailer(index, "mobile", e.target.value)} />
                      <Input placeholder="Aadhaar" value={bailer.aadhaar} onChange={(e) => updateBailer(index, "aadhaar", e.target.value)} />
                      <Input placeholder="Address" className="md:col-span-2" value={bailer.full_address} onChange={(e) => updateBailer(index, "full_address", e.target.value)} />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* IO & Lawyer Tab */}
        {activeTab === "io" && (
          <div className="space-y-6">
            <Card className="border-2">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Investigating Officer
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>IO Name</Label>
                    <Input className="mt-1" value={formData.io_name} onChange={(e) => handleChange("io_name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Belt Number</Label>
                    <Input className="mt-1" value={formData.io_belt_no} onChange={(e) => handleChange("io_belt_no", e.target.value)} />
                  </div>
                  <div>
                    <Label>Rank</Label>
                    <select className="w-full mt-1 px-3 py-2 border rounded-lg bg-background" value={formData.io_rank} onChange={(e) => handleChange("io_rank", e.target.value)}>
                      <option value="">Select</option>
                      <option value="Constable">Constable</option>
                      <option value="Head Constable">Head Constable</option>
                      <option value="ASI">ASI</option>
                      <option value="SI">SI</option>
                      <option value="Inspector">Inspector</option>
                    </select>
                  </div>
                  <div>
                    <Label>Mobile</Label>
                    <Input className="mt-1" value={formData.io_mobile} onChange={(e) => handleChange("io_mobile", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Lawyer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Lawyer Name</Label>
                    <Input className="mt-1" value={formData.lawyer_name} onChange={(e) => handleChange("lawyer_name", e.target.value)} />
                  </div>
                  <div>
                    <Label>Bar Council No.</Label>
                    <Input className="mt-1" value={formData.bar_council_no} onChange={(e) => handleChange("bar_council_no", e.target.value)} />
                  </div>
                  <div>
                    <Label>Mobile</Label>
                    <Input className="mt-1" value={formData.lawyer_mobile} onChange={(e) => handleChange("lawyer_mobile", e.target.value)} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" className="mt-1" value={formData.lawyer_email} onChange={(e) => handleChange("lawyer_email", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t-2">
          <Button variant="outline" onClick={goBack} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
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
        </div>
      </div>
    </div>
  )
}