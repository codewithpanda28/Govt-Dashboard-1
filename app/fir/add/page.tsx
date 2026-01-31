"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ChevronLeft, FileText, Train, User, Users, Scale,
  Briefcase, Plus, Trash2, Loader2, Save, AlertCircle, RefreshCw
} from "lucide-react"
import { toast } from "sonner"

export default function AddFIRPage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Data from database
  const [states, setStates] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [thanas, setThanas] = useState<any[]>([])
  const [courts, setCourts] = useState<any[]>([])
  const [ios, setIOs] = useState<any[]>([])

  // Filtered data
  const [filteredZones, setFilteredZones] = useState<any[]>([])
  const [filteredDistricts, setFilteredDistricts] = useState<any[]>([])
  const [filteredThanas, setFilteredThanas] = useState<any[]>([])

  // Form data
  const [formData, setFormData] = useState({
    fir_number: "",
    accused_type: "unknown",
    case_status: "open",
    state_id: "",
    zone_id: "",
    district_id: "",
    thana_id: "",
    court_id: "",
    law_sections: "",
    incident_date: "",
    incident_time: "",
    train_number: "",
    train_name: "",
    station_code: "",
    station_name: "",
    brief_description: "",
    property_stolen: "",
    estimated_value: "",
    io_name: "",
    io_belt_no: "",
    io_rank: "",
    io_mobile: "",
    lawyer_name: "",
    bar_council_no: "",
    lawyer_mobile: "",
    lawyer_email: ""
  })

  const [accusedList, setAccusedList] = useState([{
    name: "", father_name: "", age: "", gender: "male",
    mobile: "", aadhaar: "", full_address: ""
  }])

  const [bailerList, setBailerList] = useState([{
    name: "", father_name: "", mobile: "", aadhaar: "", full_address: ""
  }])

  useEffect(() => {
    initPage()
  }, [])

  const initPage = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      await loadAllData()

    } catch (err: any) {
      console.error("Init error:", err)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const loadAllData = async () => {
    console.log("========== LOADING DATA ==========")

    // States
    const { data: statesData } = await supabase.from("states").select("*").order("id")
    setStates(statesData || [])
    console.log("States:", statesData?.length)

    // Zones
    const { data: zonesData } = await supabase.from("zones").select("*").order("id")
    setZones(zonesData || [])
    console.log("Zones:", zonesData?.length)

    // Districts
    const { data: districtsData } = await supabase.from("districts").select("*").order("id")
    setDistricts(districtsData || [])
    console.log("Districts:", districtsData?.length)

    // Thanas
    const { data: thanasData } = await supabase.from("thanas").select("*").order("id")
    setThanas(thanasData || [])
    console.log("Thanas:", thanasData?.length)

    // Courts
    const { data: courtsData } = await supabase.from("courts").select("*").order("id")
    setCourts(courtsData || [])
    console.log("Courts:", courtsData?.length)

    // IOs
    const { data: iosData } = await supabase.from("investigating_officers").select("*").order("id")
    setIOs(iosData || [])
    console.log("IOs:", iosData?.length)

    console.log("========== LOADING COMPLETE ==========")
  }

  // Get display name
  const getName = (item: any): string => {
    if (!item) return ""
    return item.name || item.state_name || item.zone_name || item.district_name || 
           item.thana_name || item.court_name || ""
  }

  // State change
  const handleStateChange = (stateId: string) => {
    setFormData(prev => ({
      ...prev,
      state_id: stateId,
      zone_id: "",
      district_id: "",
      thana_id: ""
    }))

    if (stateId) {
      const id = parseInt(stateId)
      setFilteredZones(zones.filter(z => z.state_id === id))
      setFilteredDistricts(districts.filter(d => d.state_id === id))
    } else {
      setFilteredZones([])
      setFilteredDistricts([])
    }
    setFilteredThanas([])
  }

  // Zone change
  const handleZoneChange = (zoneId: string) => {
    setFormData(prev => ({ ...prev, zone_id: zoneId }))
  }

  // District change
  const handleDistrictChange = (districtId: string) => {
    setFormData(prev => ({
      ...prev,
      district_id: districtId,
      thana_id: ""
    }))

    if (districtId) {
      const id = parseInt(districtId)
      const filtered = thanas.filter(t => 
        t.district_id === id || t.railway_district_id === id
      )
      setFilteredThanas(filtered.length > 0 ? filtered : thanas)
    } else {
      setFilteredThanas([])
    }
  }

  // Thana change
  const handleThanaChange = (thanaId: string) => {
    setFormData(prev => ({ ...prev, thana_id: thanaId }))
  }

  // Generic change
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // IO change - auto-fill
  const handleIOChange = (ioId: string) => {
    if (ioId) {
      const io = ios.find(i => i.id === parseInt(ioId))
      if (io) {
        setFormData(prev => ({
          ...prev,
          io_name: io.name || "",
          io_belt_no: io.belt_number || io.belt_no || "",
          io_rank: io.rank || "",
          io_mobile: io.mobile || io.phone || ""
        }))
      }
    } else {
      setFormData(prev => ({
        ...prev,
        io_name: "",
        io_belt_no: "",
        io_rank: "",
        io_mobile: ""
      }))
    }
  }

  // Accused handlers
  const addAccused = () => {
    setAccusedList(prev => [...prev, {
      name: "", father_name: "", age: "", gender: "male",
      mobile: "", aadhaar: "", full_address: ""
    }])
  }

  const updateAccused = (index: number, field: string, value: string) => {
    setAccusedList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removeAccused = (index: number) => {
    if (accusedList.length > 1) {
      setAccusedList(prev => prev.filter((_, i) => i !== index))
    }
  }

  // Bailer handlers
  const addBailer = () => {
    setBailerList(prev => [...prev, {
      name: "", father_name: "", mobile: "", aadhaar: "", full_address: ""
    }])
  }

  const updateBailer = (index: number, field: string, value: string) => {
    setBailerList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const removeBailer = (index: number) => {
    if (bailerList.length > 1) {
      setBailerList(prev => prev.filter((_, i) => i !== index))
    }
  }

  // ✅ SUBMIT - Using EXACT column names from your database
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log("========== SUBMIT STARTED ==========")
    setSubmitError(null)

    if (saving) return

    if (!formData.fir_number.trim()) {
      toast.error("FIR Number is required!")
      return
    }

    try {
      setSaving(true)

      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get selected items
      const selectedState = states.find(s => s.id === parseInt(formData.state_id))
      const selectedZone = zones.find(z => z.id === parseInt(formData.zone_id))
      const selectedDistrict = districts.find(d => d.id === parseInt(formData.district_id))
      const selectedThana = thanas.find(t => t.id === parseInt(formData.thana_id))
      const selectedCourt = courts.find(c => c.id === parseInt(formData.court_id))

      // ✅ Build FIR data with EXACT column names from your table
      const firData: Record<string, any> = {
        fir_number: formData.fir_number.trim(),
        user_id: user.id
      }

      // Basic fields
      if (formData.accused_type) firData.accused_type = formData.accused_type
      if (formData.case_status) firData.case_status = formData.case_status

      // ✅ IDs (bigint columns)
      if (formData.state_id) firData.state_id = parseInt(formData.state_id)
      if (formData.zone_id) firData.zone_id = parseInt(formData.zone_id)
      if (formData.district_id) firData.railway_district_id = parseInt(formData.district_id)
      if (formData.thana_id) firData.thana_id = parseInt(formData.thana_id)
      if (formData.court_id) firData.court_id = parseInt(formData.court_id)

      // ✅ Names (text columns)
      if (selectedState) {
        firData.state = getName(selectedState)
        firData.state_name = getName(selectedState)
      }
      if (selectedZone) {
        firData.zone = getName(selectedZone)
        firData.zone_name = getName(selectedZone)
      }
      if (selectedDistrict) {
        firData.district = getName(selectedDistrict)
        firData.district_name = getName(selectedDistrict)
      }
      if (selectedThana) {
        firData.thana = getName(selectedThana)
        firData.thana_name = getName(selectedThana)
      }
      if (selectedCourt) {
        firData.court_name = getName(selectedCourt)
      }

      // ✅ Law sections (correct column name: law_sections_text)
      if (formData.law_sections) firData.law_sections_text = formData.law_sections

      // ✅ Date/Time
      if (formData.incident_date) firData.incident_date = formData.incident_date
      if (formData.incident_time) firData.incident_time = formData.incident_time

      // ✅ Train details (correct column names: train_number_manual, train_name_manual, station_name_manual)
      if (formData.train_number) firData.train_number_manual = formData.train_number
      if (formData.train_name) firData.train_name_manual = formData.train_name
      if (formData.station_code) firData.station_code = formData.station_code
      if (formData.station_name) firData.station_name_manual = formData.station_name

      // ✅ Description
      if (formData.brief_description) firData.brief_description = formData.brief_description
      if (formData.property_stolen) firData.property_stolen = formData.property_stolen
      
      // ✅ Value (correct column name: estimated_value)
      if (formData.estimated_value) firData.estimated_value = parseFloat(formData.estimated_value)

      // ✅ IO details (correct column name: io_belt_no)
      if (formData.io_name) firData.io_name = formData.io_name
      if (formData.io_belt_no) firData.io_belt_no = formData.io_belt_no
      if (formData.io_rank) firData.io_rank = formData.io_rank
      if (formData.io_mobile) firData.io_mobile = formData.io_mobile

      // ✅ Lawyer details (correct column name: bar_council_no)
      if (formData.lawyer_name) firData.lawyer_name = formData.lawyer_name
      if (formData.bar_council_no) firData.bar_council_no = formData.bar_council_no
      if (formData.lawyer_mobile) firData.lawyer_mobile = formData.lawyer_mobile
      if (formData.lawyer_email) firData.lawyer_email = formData.lawyer_email

      console.log("FIR Data to insert:", firData)

      // Insert FIR
      const { data: fir, error: firError } = await supabase
        .from("fir_records")
        .insert(firData)
        .select()
        .single()

      if (firError) {
        console.error("FIR Error:", firError)
        setSubmitError(firError.message)
        toast.error("Error: " + firError.message)
        return
      }

      console.log("✅ FIR created:", fir.id)

      // Insert Accused
      const validAccused = accusedList.filter(a => a.name.trim())
      if (validAccused.length > 0) {
        const { error } = await supabase.from("accused_details").insert(
          validAccused.map(a => ({
            fir_id: fir.id,
            name: a.name.trim(),
            father_name: a.father_name || null,
            age: a.age ? parseInt(a.age) : null,
            gender: a.gender || "male",
            mobile: a.mobile || null,
            aadhaar: a.aadhaar || null,
            full_address: a.full_address || null
          }))
        )
        if (error) console.error("Accused error:", error)
        else console.log("✅ Accused inserted")
      }

      // Insert Bailers
      const validBailers = bailerList.filter(b => b.name.trim())
      if (validBailers.length > 0) {
        const { error } = await supabase.from("bailer_details").insert(
          validBailers.map(b => ({
            fir_id: fir.id,
            name: b.name.trim(),
            father_name: b.father_name || null,
            mobile: b.mobile || null,
            aadhaar: b.aadhaar || null,
            full_address: b.full_address || null
          }))
        )
        if (error) console.error("Bailers error:", error)
        else console.log("✅ Bailers inserted")
      }

      console.log("========== SUCCESS ==========")
      toast.success("FIR registered successfully!")
      router.push(`/fir/${fir.id}`)

    } catch (err: any) {
      console.error("Submit error:", err)
      setSubmitError(err.message)
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => router.push('/fir/list')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Register New FIR</h1>
              <p className="text-muted-foreground text-sm">Fill in the details</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap gap-1 text-xs">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">States: {states.length}</span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded">Districts: {districts.length}</span>
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">Thanas: {thanas.length}</span>
              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">IOs: {ios.length}</span>
            </div>
            <Button variant="outline" size="sm" onClick={loadAllData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">Failed to save FIR</p>
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Case Details */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Case Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                <div>
                  <Label>FIR Number <span className="text-red-500">*</span></Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g., 001/2024/RPF"
                    value={formData.fir_number}
                    onChange={(e) => handleChange("fir_number", e.target.value)}
                  />
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

                {/* STATE */}
                <div>
                  <Label>State</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    value={formData.state_id}
                    onChange={(e) => handleStateChange(e.target.value)}
                  >
                    <option value="">-- Select State --</option>
                    {states.map(state => (
                      <option key={state.id} value={state.id}>{getName(state)}</option>
                    ))}
                  </select>
                </div>

                {/* ZONE */}
                <div>
                  <Label>Zone</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    value={formData.zone_id}
                    onChange={(e) => handleZoneChange(e.target.value)}
                  >
                    <option value="">-- Select Zone --</option>
                    {(filteredZones.length > 0 ? filteredZones : zones).map(zone => (
                      <option key={zone.id} value={zone.id}>{getName(zone)}</option>
                    ))}
                  </select>
                </div>

                {/* DISTRICT */}
                <div>
                  <Label>District</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    value={formData.district_id}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                  >
                    <option value="">-- Select District --</option>
                    {(filteredDistricts.length > 0 ? filteredDistricts : districts).map(d => (
                      <option key={d.id} value={d.id}>{getName(d)}</option>
                    ))}
                  </select>
                </div>

                {/* THANA */}
                <div>
                  <Label>Thana</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    value={formData.thana_id}
                    onChange={(e) => handleThanaChange(e.target.value)}
                  >
                    <option value="">-- Select Thana --</option>
                    {(filteredThanas.length > 0 ? filteredThanas : thanas).map(t => (
                      <option key={t.id} value={t.id}>{getName(t)}</option>
                    ))}
                  </select>
                </div>

                {/* COURT */}
                <div>
                  <Label>Court</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    value={formData.court_id}
                    onChange={(e) => handleChange("court_id", e.target.value)}
                  >
                    <option value="">-- Select Court --</option>
                    {courts.map(c => (
                      <option key={c.id} value={c.id}>{getName(c)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Law Sections</Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g., IPC 379, 411"
                    value={formData.law_sections}
                    onChange={(e) => handleChange("law_sections", e.target.value)}
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

          {/* Train & Station */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Train className="h-5 w-5 text-primary" />
                Train & Station Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Train Number</Label>
                  <Input 
                    className="mt-1" 
                    placeholder="e.g., 12345" 
                    value={formData.train_number} 
                    onChange={(e) => handleChange("train_number", e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Train Name</Label>
                  <Input 
                    className="mt-1" 
                    placeholder="e.g., Rajdhani Express" 
                    value={formData.train_name} 
                    onChange={(e) => handleChange("train_name", e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Station Code</Label>
                  <Input 
                    className="mt-1" 
                    placeholder="e.g., PNBE" 
                    value={formData.station_code} 
                    onChange={(e) => handleChange("station_code", e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Station Name</Label>
                  <Input 
                    className="mt-1" 
                    placeholder="e.g., Patna Junction" 
                    value={formData.station_name} 
                    onChange={(e) => handleChange("station_name", e.target.value)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accused */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Accused Details
                </CardTitle>
                <Button type="button" size="sm" variant="outline" onClick={addAccused}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {accusedList.map((accused, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium">Accused #{idx + 1}</span>
                    {accusedList.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeAccused(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input placeholder="Name" value={accused.name} onChange={(e) => updateAccused(idx, "name", e.target.value)} />
                    <Input placeholder="Father's Name" value={accused.father_name} onChange={(e) => updateAccused(idx, "father_name", e.target.value)} />
                    <div className="flex gap-2">
                      <Input placeholder="Age" className="w-20" value={accused.age} onChange={(e) => updateAccused(idx, "age", e.target.value)} />
                      <select className="flex-1 px-2 border rounded bg-background" value={accused.gender} onChange={(e) => updateAccused(idx, "gender", e.target.value)}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <Input placeholder="Mobile" value={accused.mobile} onChange={(e) => updateAccused(idx, "mobile", e.target.value)} />
                    <Input placeholder="Aadhaar" value={accused.aadhaar} onChange={(e) => updateAccused(idx, "aadhaar", e.target.value)} />
                    <Input placeholder="Address" value={accused.full_address} onChange={(e) => updateAccused(idx, "full_address", e.target.value)} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Bailer */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Bailer Details
                </CardTitle>
                <Button type="button" size="sm" variant="outline" onClick={addBailer}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {bailerList.map((bailer, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium">Bailer #{idx + 1}</span>
                    {bailerList.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => removeBailer(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input placeholder="Name" value={bailer.name} onChange={(e) => updateBailer(idx, "name", e.target.value)} />
                    <Input placeholder="Father's Name" value={bailer.father_name} onChange={(e) => updateBailer(idx, "father_name", e.target.value)} />
                    <Input placeholder="Mobile" value={bailer.mobile} onChange={(e) => updateBailer(idx, "mobile", e.target.value)} />
                    <Input placeholder="Aadhaar" value={bailer.aadhaar} onChange={(e) => updateBailer(idx, "aadhaar", e.target.value)} />
                    <Input placeholder="Address" className="md:col-span-2" value={bailer.full_address} onChange={(e) => updateBailer(idx, "full_address", e.target.value)} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg">Case Description</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <Textarea 
                placeholder="Enter case description..." 
                value={formData.brief_description} 
                onChange={(e) => handleChange("brief_description", e.target.value)} 
                rows={3} 
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Property Stolen</Label>
                  <Input 
                    className="mt-1" 
                    placeholder="Description" 
                    value={formData.property_stolen} 
                    onChange={(e) => handleChange("property_stolen", e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Estimated Value (₹)</Label>
                  <Input 
                    type="number" 
                    className="mt-1" 
                    placeholder="Amount" 
                    value={formData.estimated_value} 
                    onChange={(e) => handleChange("estimated_value", e.target.value)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IO */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Investigating Officer
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Select IO (auto-fill)</Label>
                  <select 
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    onChange={(e) => handleIOChange(e.target.value)}
                  >
                    <option value="">-- Select IO --</option>
                    {ios.map(io => (
                      <option key={io.id} value={io.id}>
                        {io.name} {io.rank ? `- ${io.rank}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>IO Name</Label>
                  <Input 
                    className="mt-1" 
                    placeholder="Officer Name" 
                    value={formData.io_name} 
                    onChange={(e) => handleChange("io_name", e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Belt Number</Label>
                  <Input 
                    className="mt-1" 
                    placeholder="Belt No." 
                    value={formData.io_belt_no} 
                    onChange={(e) => handleChange("io_belt_no", e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Rank</Label>
                  <select 
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background" 
                    value={formData.io_rank} 
                    onChange={(e) => handleChange("io_rank", e.target.value)}
                  >
                    <option value="">Select Rank</option>
                    <option value="Constable">Constable</option>
                    <option value="Head Constable">Head Constable</option>
                    <option value="ASI">ASI</option>
                    <option value="SI">SI</option>
                    <option value="Inspector">Inspector</option>
                  </select>
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input 
                    className="mt-1" 
                    placeholder="Mobile" 
                    value={formData.io_mobile} 
                    onChange={(e) => handleChange("io_mobile", e.target.value)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lawyer */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Lawyer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Lawyer Name</Label>
                  <Input 
                    className="mt-1" 
                    placeholder="Advocate Name" 
                    value={formData.lawyer_name} 
                    onChange={(e) => handleChange("lawyer_name", e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Bar Council No.</Label>
                  <Input 
                    className="mt-1" 
                    placeholder="Bar Council Number" 
                    value={formData.bar_council_no} 
                    onChange={(e) => handleChange("bar_council_no", e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Mobile</Label>
                  <Input 
                    className="mt-1" 
                    placeholder="Mobile" 
                    value={formData.lawyer_mobile} 
                    onChange={(e) => handleChange("lawyer_mobile", e.target.value)} 
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email" 
                    className="mt-1" 
                    placeholder="Email" 
                    value={formData.lawyer_email} 
                    onChange={(e) => handleChange("lawyer_email", e.target.value)} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-6 border-t-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push('/fir/list')} 
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="min-w-[160px]">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Submit FIR
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}