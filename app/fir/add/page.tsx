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
  ChevronLeft, FileText, Train, User, Users,
  Plus, Trash2, Loader2, Save, AlertCircle, RefreshCw, Upload, MapPin
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
  const [crimes, setCrimes] = useState<any[]>([])

  // Filtered data
  const [filteredZones, setFilteredZones] = useState<any[]>([])
  const [filteredDistricts, setFilteredDistricts] = useState<any[]>([])
  const [filteredThanas, setFilteredThanas] = useState<any[]>([])

  // Form data - 🆕 Added case_status field
  const [formData, setFormData] = useState({
    accused_type: "",
    case_status: "open", // 🆕 Default status
    state_id: "",
    zone_id: "",
    district_id: "",
    thana_id: "",
    court_id: "",
    law_sections: "",
    fir_number: "",
    fir_date: "",
    incident_time: "",
    train_number: "",
    train_name: "",
    station_code: "",
    station_name: "",
    brief_description: "",
    fir_copy_url: ""
  })

  const [accusedList, setAccusedList] = useState([{
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
    email: ""
  }])

  const [bailerList, setBailerList] = useState([{
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
    email: ""
  }])

  const [uploadingFile, setUploadingFile] = useState(false)

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
    // States
    const { data: statesData } = await supabase.from("states").select("*").order("id")
    setStates(statesData || [])

    // Zones
    const { data: zonesData } = await supabase.from("zones").select("*").order("id")
    setZones(zonesData || [])

    // Districts
    const { data: districtsData } = await supabase.from("districts").select("*").order("id")
    setDistricts(districtsData || [])

    // Thanas
    const { data: thanasData } = await supabase.from("thanas").select("*").order("id")
    setThanas(thanasData || [])

    // Courts
    const { data: courtsData } = await supabase.from("courts").select("*").order("id")
    setCourts(courtsData || [])

    // Crimes
    const { data: crimesData, error: crimesError } = await supabase
      .from("crimes")
      .select("*")
      .order("crime_name")
    
    if (crimesError) {
      console.error("Crimes fetch error:", crimesError)
      toast.error("Failed to load crimes")
    } else {
      console.log("✅ Crimes loaded:", crimesData)
      setCrimes(crimesData || [])
    }
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

  // Accused handlers
  const addAccused = () => {
    setAccusedList(prev => [...prev, {
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
      email: ""
    }])
  }

  const updateAccused = (index: number, field: string, value: string) => {
    setAccusedList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      
      // Auto-calculate age from DOB
      if (field === 'dob' && value) {
        const birthDate = new Date(value)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        updated[index].age = age.toString()
      }
      
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
      email: ""
    }])
  }

  const updateBailer = (index: number, field: string, value: string) => {
    setBailerList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      
      // Auto-calculate age from DOB
      if (field === 'dob' && value) {
        const birthDate = new Date(value)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        updated[index].age = age.toString()
      }
      
      return updated
    })
  }

  const removeBailer = (index: number) => {
    if (bailerList.length > 1) {
      setBailerList(prev => prev.filter((_, i) => i !== index))
    }
  }

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingFile(true)

      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `fir-copies/${fileName}`

      const { error: uploadError, data } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) {
        toast.error('Failed to upload file: ' + uploadError.message)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, fir_copy_url: publicUrl }))
      toast.success('File uploaded successfully!')

    } catch (err: any) {
      console.error('Upload error:', err)
      toast.error('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }

  // Submit handler - 🆕 Updated to include case_status
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setSubmitError(null)

    if (saving) return

    if (!formData.fir_number.trim()) {
      toast.error("FIR Number is required!")
      return
    }

    if (!formData.accused_type) {
      toast.error("Please select Crime Type!")
      return
    }

    try {
      setSaving(true)

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

      // Build FIR data
      const firData: Record<string, any> = {
        fir_number: formData.fir_number.trim(),
        user_id: user.id,
        accused_type: formData.accused_type,
        case_status: formData.case_status // 🆕 Include status
      }

      // IDs
      if (formData.state_id) firData.state_id = parseInt(formData.state_id)
      if (formData.zone_id) firData.zone_id = parseInt(formData.zone_id)
      if (formData.district_id) firData.railway_district_id = parseInt(formData.district_id)
      if (formData.thana_id) firData.thana_id = parseInt(formData.thana_id)
      if (formData.court_id) firData.court_id = parseInt(formData.court_id)

      // Names
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

      // Other fields
      if (formData.law_sections) firData.law_sections_text = formData.law_sections
      if (formData.fir_date) firData.incident_date = formData.fir_date
      if (formData.incident_time) firData.incident_time = formData.incident_time
      if (formData.train_number) firData.train_number_manual = formData.train_number
      if (formData.train_name) firData.train_name_manual = formData.train_name
      if (formData.station_code) firData.station_code = formData.station_code
      if (formData.station_name) firData.station_name_manual = formData.station_name
      if (formData.brief_description) firData.brief_description = formData.brief_description
      if (formData.fir_copy_url) firData.fir_copy_url = formData.fir_copy_url

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

      // Insert Accused
      const validAccused = accusedList.filter(a => a.name.trim())
      if (validAccused.length > 0) {
        const accusedData = validAccused.map(a => {
          const selectedAccusedState = states.find(s => s.id === parseInt(a.state_id))
          const selectedAccusedDistrict = districts.find(d => d.id === parseInt(a.district_id))
          
          return {
            fir_id: fir.id,
            name: a.name.trim(),
            father_name: a.father_name || null,
            age: a.age ? parseInt(a.age) : null,
            dob: a.dob || null,
            gender: a.gender || "male",
            aadhaar: a.aadhaar || null,
            pan: a.pan || null,
            mobile: a.mobile || null,
            email: a.email || null,
            state_id: a.state_id ? parseInt(a.state_id) : null,
            state_name: selectedAccusedState ? getName(selectedAccusedState) : null,
            district_id: a.district_id ? parseInt(a.district_id) : null,
            district_name: selectedAccusedDistrict ? getName(selectedAccusedDistrict) : null,
            full_address: a.full_address || null,
            pin_code: a.pin_code || null
          }
        })

        await supabase.from("accused_details").insert(accusedData)
      }

      // Insert Bailers
      const validBailers = bailerList.filter(b => b.name.trim())
      if (validBailers.length > 0) {
        const bailerData = validBailers.map(b => {
          const selectedBailerState = states.find(s => s.id === parseInt(b.state_id))
          const selectedBailerDistrict = districts.find(d => d.id === parseInt(b.district_id))
          
          return {
            fir_id: fir.id,
            name: b.name.trim(),
            father_name: b.father_name || null,
            age: b.age ? parseInt(b.age) : null,
            dob: b.dob || null,
            gender: b.gender || "male",
            aadhaar: b.aadhaar || null,
            pan: b.pan || null,
            mobile: b.mobile || null,
            email: b.email || null,
            state_id: b.state_id ? parseInt(b.state_id) : null,
            state_name: selectedBailerState ? getName(selectedBailerState) : null,
            district_id: b.district_id ? parseInt(b.district_id) : null,
            district_name: selectedBailerDistrict ? getName(selectedBailerDistrict) : null,
            full_address: b.full_address || null,
            pin_code: b.pin_code || null
          }
        })

        await supabase.from("bailer_details").insert(bailerData)
      }

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-gray-600" />
          <p className="mt-3 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="bg-white border border-gray-300 rounded p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => router.push('/fir/list')}
                className="border-gray-300"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-gray-800">FIR Entry Form</h1>
                <p className="text-sm text-gray-600">Register New Case</p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadAllData}
              className="border-gray-300"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Error */}
        {submitError && (
          <div className="bg-red-50 border border-red-300 rounded p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-semibold text-red-800">Failed to save FIR</p>
                <p className="text-sm text-red-700">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Case Details */}
          <div className="bg-white border border-gray-300 rounded">
            <div className="border-b border-gray-300 bg-gray-100 px-4 py-3">
              <h2 className="font-bold text-gray-800">CASE DETAILS</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Crime Type */}
                <div>
                  <Label className="text-gray-700 font-semibold">Crime Type <span className="text-red-600">*</span></Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                    value={formData.accused_type}
                    onChange={(e) => handleChange("accused_type", e.target.value)}
                  >
                    <option value="">-- Select Crime Type --</option>
                    {crimes.map(crime => (
                      <option key={crime.id} value={crime.crime_name}>
                        {crime.crime_name} ({crime.crime_code})
                      </option>
                    ))}
                  </select>
                  {crimes.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-1">
                      ⚠️ No crimes found. Add from Admin → Manage Crime
                    </p>
                  )}
                </div>

                {/* 🆕 Status Field Added */}
                <div>
                  <Label className="text-gray-700 font-semibold">Status</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                    value={formData.case_status}
                    onChange={(e) => handleChange("case_status", e.target.value)}
                  >
                    <option value="open">Open</option>
                    <option value="registered">Registered</option>
                    <option value="under_investigation">Under Investigation</option>
                    <option value="chargesheet_filed">Chargesheet Filed</option>
                    <option value="in_court">In Court</option>
                    <option value="closed">Closed</option>
                    <option value="disposed">Disposed</option>
                  </select>
                </div>

                <div>
                  <Label className="text-gray-700 font-semibold">State</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                    value={formData.state_id}
                    onChange={(e) => handleStateChange(e.target.value)}
                  >
                    <option value="">-- Select State --</option>
                    {states.map(state => (
                      <option key={state.id} value={state.id}>{getName(state)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-gray-700 font-semibold">Zone</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                    value={formData.zone_id}
                    onChange={(e) => handleZoneChange(e.target.value)}
                  >
                    <option value="">-- Select Zone --</option>
                    {(filteredZones.length > 0 ? filteredZones : zones).map(zone => (
                      <option key={zone.id} value={zone.id}>{getName(zone)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-gray-700 font-semibold">District</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                    value={formData.district_id}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                  >
                    <option value="">-- Select District --</option>
                    {(filteredDistricts.length > 0 ? filteredDistricts : districts).map(d => (
                      <option key={d.id} value={d.id}>{getName(d)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-gray-700 font-semibold">Thana</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500"
                    value={formData.thana_id}
                    onChange={(e) => handleThanaChange(e.target.value)}
                  >
                    <option value="">-- Select Thana --</option>
                    {(filteredThanas.length > 0 ? filteredThanas : thanas).map(t => (
                      <option key={t.id} value={t.id}>{getName(t)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-gray-700 font-semibold">Court</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-gray-500"
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
                  <Label className="text-gray-700 font-semibold">Section</Label>
                  <Input
                    className="mt-1 border-gray-300 focus:border-gray-500"
                    placeholder="e.g., IPC 379, 411"
                    value={formData.law_sections}
                    onChange={(e) => handleChange("law_sections", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-gray-700 font-semibold">FIR No. <span className="text-red-600">*</span></Label>
                  <Input
                    className="mt-1 border-gray-300 focus:border-gray-500"
                    placeholder="e.g., 001/2024/RPF"
                    value={formData.fir_number}
                    onChange={(e) => handleChange("fir_number", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-gray-700 font-semibold">Date of FIR</Label>
                  <Input
                    type="date"
                    className="mt-1 border-gray-300 focus:border-gray-500"
                    value={formData.fir_date}
                    onChange={(e) => handleChange("fir_date", e.target.value)}
                  />
                </div>

                <div>
                  <Label className="text-gray-700 font-semibold">Timing of Incident</Label>
                  <Input
                    type="time"
                    className="mt-1 border-gray-300 focus:border-gray-500"
                    value={formData.incident_time}
                    onChange={(e) => handleChange("incident_time", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Train Details */}
          <div className="bg-white border border-gray-300 rounded">
            <div className="border-b border-gray-300 bg-gray-100 px-4 py-3">
              <h2 className="font-bold text-gray-800">WHICH TRAIN INCIDENT HAPPENED</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 font-semibold">Train No.</Label>
                  <Input 
                    className="mt-1 border-gray-300 focus:border-gray-500" 
                    placeholder="e.g., 12345" 
                    value={formData.train_number} 
                    onChange={(e) => handleChange("train_number", e.target.value)} 
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-semibold">Train Name</Label>
                  <Input 
                    className="mt-1 border-gray-300 focus:border-gray-500" 
                    placeholder="e.g., Rajdhani Express" 
                    value={formData.train_name} 
                    onChange={(e) => handleChange("train_name", e.target.value)} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Station Details */}
          <div className="bg-white border border-gray-300 rounded">
            <div className="border-b border-gray-300 bg-gray-100 px-4 py-3">
              <h2 className="font-bold text-gray-800">WHICH STATION INCIDENT HAPPENED</h2>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700 font-semibold">Station Code</Label>
                  <Input 
                    className="mt-1 border-gray-300 focus:border-gray-500" 
                    placeholder="e.g., PNBE" 
                    value={formData.station_code} 
                    onChange={(e) => handleChange("station_code", e.target.value)} 
                  />
                </div>
                <div>
                  <Label className="text-gray-700 font-semibold">Station Name</Label>
                  <Input 
                    className="mt-1 border-gray-300 focus:border-gray-500" 
                    placeholder="e.g., Patna Junction" 
                    value={formData.station_name} 
                    onChange={(e) => handleChange("station_name", e.target.value)} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Accused Details */}
          <div className="bg-white border border-gray-300 rounded">
            <div className="border-b border-gray-300 bg-gray-100 px-4 py-3 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">ACCUSED DETAIL</h2>
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                onClick={addAccused}
                className="border-gray-400"
              >
                <Plus className="h-4 w-4 mr-1" /> Add More
              </Button>
            </div>
            <div className="p-4 space-y-4">
              {accusedList.map((accused, idx) => (
                <div key={idx} className="border border-gray-300 rounded p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-gray-700">Accused #{idx + 1}</span>
                    {accusedList.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeAccused(idx)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-gray-700">Name</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="Full Name" 
                        value={accused.name} 
                        onChange={(e) => updateAccused(idx, "name", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">Aadhaar No.</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="XXXX-XXXX-XXXX" 
                        maxLength={12}
                        value={accused.aadhaar} 
                        onChange={(e) => updateAccused(idx, "aadhaar", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">Gender</Label>
                      <select 
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded" 
                        value={accused.gender} 
                        onChange={(e) => updateAccused(idx, "gender", e.target.value)}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">DOB / Age</Label>
                      <Input 
                        type="date"
                        className="mt-1 border-gray-300"
                        value={accused.dob} 
                        onChange={(e) => updateAccused(idx, "dob", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">Age (Auto)</Label>
                      <Input 
                        type="number"
                        className="mt-1 border-gray-300 bg-gray-50"
                        placeholder="Age" 
                        value={accused.age} 
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">PAN No.</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="XXXXX0000X" 
                        maxLength={10}
                        value={accused.pan} 
                        onChange={(e) => updateAccused(idx, "pan", e.target.value.toUpperCase())} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">Father's Name</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="Father's Name" 
                        value={accused.father_name} 
                        onChange={(e) => updateAccused(idx, "father_name", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">State</Label>
                      <select 
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded" 
                        value={accused.state_id} 
                        onChange={(e) => updateAccused(idx, "state_id", e.target.value)}
                      >
                        <option value="">-- Select State --</option>
                        {states.map(state => (
                          <option key={state.id} value={state.id}>{getName(state)}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">District</Label>
                      <select 
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded" 
                        value={accused.district_id} 
                        onChange={(e) => updateAccused(idx, "district_id", e.target.value)}
                      >
                        <option value="">-- Select District --</option>
                        {districts.map(d => (
                          <option key={d.id} value={d.id}>{getName(d)}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label className="text-gray-700">Full Address</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="Complete Address" 
                        value={accused.full_address} 
                        onChange={(e) => updateAccused(idx, "full_address", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">PIN Code</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="6 digit PIN" 
                        maxLength={6}
                        value={accused.pin_code} 
                        onChange={(e) => updateAccused(idx, "pin_code", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">Mobile</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="10 digit mobile" 
                        maxLength={10}
                        value={accused.mobile} 
                        onChange={(e) => updateAccused(idx, "mobile", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">Email ID</Label>
                      <Input 
                        type="email"
                        className="mt-1 border-gray-300"
                        placeholder="email@example.com" 
                        value={accused.email} 
                        onChange={(e) => updateAccused(idx, "email", e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bailer Details */}
          <div className="bg-white border border-gray-300 rounded">
            <div className="border-b border-gray-300 bg-gray-100 px-4 py-3 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">BAILER DETAIL</h2>
              <Button 
                type="button" 
                size="sm" 
                variant="outline" 
                onClick={addBailer}
                className="border-gray-400"
              >
                <Plus className="h-4 w-4 mr-1" /> Add More
              </Button>
            </div>
            <div className="p-4 space-y-4">
              {bailerList.map((bailer, idx) => (
                <div key={idx} className="border border-gray-300 rounded p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-gray-700">Bailer #{idx + 1}</span>
                    {bailerList.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeBailer(idx)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-gray-700">Name</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="Full Name" 
                        value={bailer.name} 
                        onChange={(e) => updateBailer(idx, "name", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">Aadhaar No.</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="XXXX-XXXX-XXXX" 
                        maxLength={12}
                        value={bailer.aadhaar} 
                        onChange={(e) => updateBailer(idx, "aadhaar", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">Gender</Label>
                      <select 
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded" 
                        value={bailer.gender} 
                        onChange={(e) => updateBailer(idx, "gender", e.target.value)}
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">DOB / Age</Label>
                      <Input 
                        type="date"
                        className="mt-1 border-gray-300"
                        value={bailer.dob} 
                        onChange={(e) => updateBailer(idx, "dob", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">Age (Auto)</Label>
                      <Input 
                        type="number"
                        className="mt-1 border-gray-300 bg-gray-50"
                        placeholder="Age" 
                        value={bailer.age} 
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">PAN No.</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="XXXXX0000X" 
                        maxLength={10}
                        value={bailer.pan} 
                        onChange={(e) => updateBailer(idx, "pan", e.target.value.toUpperCase())} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">Father's Name</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="Father's Name" 
                        value={bailer.father_name} 
                        onChange={(e) => updateBailer(idx, "father_name", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">State</Label>
                      <select 
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded" 
                        value={bailer.state_id} 
                        onChange={(e) => updateBailer(idx, "state_id", e.target.value)}
                      >
                        <option value="">-- Select State --</option>
                        {states.map(state => (
                          <option key={state.id} value={state.id}>{getName(state)}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">District</Label>
                      <select 
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded" 
                        value={bailer.district_id} 
                        onChange={(e) => updateBailer(idx, "district_id", e.target.value)}
                      >
                        <option value="">-- Select District --</option>
                        {districts.map(d => (
                          <option key={d.id} value={d.id}>{getName(d)}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label className="text-gray-700">Full Address</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="Complete Address" 
                        value={bailer.full_address} 
                        onChange={(e) => updateBailer(idx, "full_address", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">PIN Code</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="6 digit PIN" 
                        maxLength={6}
                        value={bailer.pin_code} 
                        onChange={(e) => updateBailer(idx, "pin_code", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">Mobile</Label>
                      <Input 
                        className="mt-1 border-gray-300"
                        placeholder="10 digit mobile" 
                        maxLength={10}
                        value={bailer.mobile} 
                        onChange={(e) => updateBailer(idx, "mobile", e.target.value)} 
                      />
                    </div>
                    
                    <div>
                      <Label className="text-gray-700">Email ID</Label>
                      <Input 
                        type="email"
                        className="mt-1 border-gray-300"
                        placeholder="email@example.com" 
                        value={bailer.email} 
                        onChange={(e) => updateBailer(idx, "email", e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Brief & Attachment */}
          <div className="bg-white border border-gray-300 rounded">
            <div className="border-b border-gray-300 bg-gray-100 px-4 py-3">
              <h2 className="font-bold text-gray-800">BRIEF & ATTACHMENT</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-gray-700 font-semibold">Brief (Description)</Label>
                <Textarea 
                  className="mt-1 border-gray-300"
                  placeholder="Enter detailed description of the incident..." 
                  value={formData.brief_description} 
                  onChange={(e) => handleChange("brief_description", e.target.value)} 
                  rows={4} 
                />
              </div>
              
              <div>
                <Label className="text-gray-700 font-semibold">Attachment (FIR Copy)</Label>
                <div className="mt-1 flex items-center gap-3">
                  <Input 
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="flex-1 border-gray-300"
                  />
                  {uploadingFile && <Loader2 className="h-5 w-5 animate-spin text-gray-600" />}
                </div>
                {formData.fir_copy_url && (
                  <p className="text-sm text-green-700 mt-2">✓ File uploaded successfully</p>
                )}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="bg-white border border-gray-300 rounded p-4">
            <div className="flex justify-end gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push('/fir/list')} 
                disabled={saving}
                className="border-gray-400"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saving} 
                className="min-w-[160px] bg-gray-800 hover:bg-gray-900 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Submit FIR
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}