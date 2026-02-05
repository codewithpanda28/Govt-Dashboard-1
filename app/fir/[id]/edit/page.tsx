"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft, Save, Loader2, FileText, User, Users, 
  Briefcase, Plus, Trash2, Upload, Gavel
} from "lucide-react"
import { toast } from "sonner"

interface Accused {
  id?: number
  name: string
  aadhaar: string
  gender: string
  dob: string
  age: string
  pan: string
  father_name: string
  state_id: string
  district_id: string
  full_address: string
  pin_code: string
  mobile: string
  email: string
  isNew?: boolean
}

interface Bailer {
  id?: number
  name: string
  aadhaar: string
  gender: string
  dob: string
  age: string
  pan: string
  father_name: string
  state_id: string
  district_id: string
  full_address: string
  pin_code: string
  mobile: string
  email: string
  brief: string
  attachment_url: string
  attachment_name: string
  isNew?: boolean
}

interface Hearing {
  id?: number
  hearing_date: string
  hearing_time: string
  hearing_type: string
  hearing_status: string
  next_hearing_date: string
  court_name: string
  judge_name: string
  attended_by: string
  prosecutor_name: string
  defense_lawyer: string
  order_passed: string
  remarks: string
  isNew?: boolean
}

export default function EditFIRPage() {
  const params = useParams()
  const router = useRouter()
  const firId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState("case")

  // Dropdowns
  const [states, setStates] = useState<any[]>([])
  const [zones, setZones] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [thanas, setThanas] = useState<any[]>([])
  const [courts, setCourts] = useState<any[]>([])

  // Form Data
  const [formData, setFormData] = useState({
    fir_number: "",
    case_status: "open",
    state_id: "",
    zone_id: "",
    district_id: "",
    thana_id: "",
    court_id: "",
    law_sections_text: "",
    incident_date: "",
    incident_time: "",
    train_number_manual: "",
    train_name_manual: "",
    station_code: "",
    station_name_manual: "",
    brief_description: "",
    io_name: "",
    io_belt_no: "",
    io_rank: "",
    io_mobile: "",
    lawyer_name: "",
    bar_council_no: "",
    lawyer_mobile: "",
    lawyer_email: ""
  })

  const [accusedList, setAccusedList] = useState<Accused[]>([])
  const [bailerList, setBailerList] = useState<Bailer[]>([])
  const [hearingList, setHearingList] = useState<Hearing[]>([])

  // Get name helper
  const getName = (item: any): string => {
    if (!item) return ""
    return item.name || item.state_name || item.zone_name || item.district_name || 
           item.thana_name || item.court_name || ""
  }

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)

        if (!firId) {
          toast.error("Invalid FIR ID")
          router.push('/fir/list')
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Load dropdowns
        const [statesRes, zonesRes, districtsRes, thanasRes, courtsRes] = await Promise.all([
          supabase.from("states").select("*").order("id"),
          supabase.from("zones").select("*").order("id"),
          supabase.from("districts").select("*").order("id"),
          supabase.from("thanas").select("*").order("id"),
          supabase.from("courts").select("*").order("id")
        ])

        setStates(statesRes.data || [])
        setZones(zonesRes.data || [])
        setDistricts(districtsRes.data || [])
        setThanas(thanasRes.data || [])
        setCourts(courtsRes.data || [])

        // Load FIR
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

        setFormData({
          fir_number: fir.fir_number || "",
          case_status: fir.case_status || "open",
          state_id: fir.state_id?.toString() || "",
          zone_id: fir.zone_id?.toString() || "",
          district_id: fir.district_id?.toString() || fir.railway_district_id?.toString() || "",
          thana_id: fir.thana_id?.toString() || "",
          court_id: fir.court_id?.toString() || "",
          law_sections_text: fir.law_sections_text || "",
          incident_date: fir.incident_date || "",
          incident_time: fir.incident_time || "",
          train_number_manual: fir.train_number_manual || "",
          train_name_manual: fir.train_name_manual || "",
          station_code: fir.station_code || "",
          station_name_manual: fir.station_name_manual || "",
          brief_description: fir.brief_description || "",
          io_name: fir.io_name || "",
          io_belt_no: fir.io_belt_no || "",
          io_rank: fir.io_rank || "",
          io_mobile: fir.io_mobile || "",
          lawyer_name: fir.lawyer_name || "",
          bar_council_no: fir.bar_council_no || "",
          lawyer_mobile: fir.lawyer_mobile || "",
          lawyer_email: fir.lawyer_email || ""
        })

        // Load Accused
        const { data: accusedData } = await supabase
          .from("accused_details")
          .select("*")
          .eq("fir_id", firId)
          .order("id")

        if (accusedData) {
          setAccusedList(accusedData.map(a => ({
            id: a.id,
            name: a.name || "",
            aadhaar: a.aadhaar || "",
            gender: a.gender || "male",
            dob: a.dob || "",
            age: a.age?.toString() || "",
            pan: a.pan || "",
            father_name: a.father_name || "",
            state_id: a.state_id?.toString() || "",
            district_id: a.district_id?.toString() || "",
            full_address: a.full_address || "",
            pin_code: a.pin_code || "",
            mobile: a.mobile || "",
            email: a.email || "",
            isNew: false
          })))
        }

        // Load Bailers
        const { data: bailerData } = await supabase
          .from("bailer_details")
          .select("*")
          .eq("fir_id", firId)
          .order("id")

        if (bailerData) {
          setBailerList(bailerData.map(b => ({
            id: b.id,
            name: b.name || "",
            aadhaar: b.aadhaar || "",
            gender: b.gender || "male",
            dob: b.dob || "",
            age: b.age?.toString() || "",
            pan: b.pan || "",
            father_name: b.father_name || "",
            state_id: b.state_id?.toString() || "",
            district_id: b.district_id?.toString() || "",
            full_address: b.full_address || "",
            pin_code: b.pin_code || "",
            mobile: b.mobile || "",
            email: b.email || "",
            brief: b.brief || "",
            attachment_url: b.attachment_url || "",
            attachment_name: b.attachment_name || "",
            isNew: false
          })))
        }

        // Load Hearings
        const { data: hearingData } = await supabase
          .from("hearing_history")
          .select("*")
          .eq("fir_id", firId)
          .order("hearing_date", { ascending: false })

        if (hearingData) {
          setHearingList(hearingData.map(h => ({
            id: h.id,
            hearing_date: h.hearing_date || "",
            hearing_time: h.hearing_time || "",
            hearing_type: h.hearing_type || "regular",
            hearing_status: h.hearing_status || "scheduled",
            next_hearing_date: h.next_hearing_date || "",
            court_name: h.court_name || "",
            judge_name: h.judge_name || "",
            attended_by: h.attended_by || "",
            prosecutor_name: h.prosecutor_name || "",
            defense_lawyer: h.defense_lawyer || "",
            order_passed: h.order_passed || "",
            remarks: h.remarks || "",
            isNew: false
          })))
        }

      } catch (err: any) {
        console.error("Error:", err)
        toast.error("Failed to load FIR data")
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [firId, router])

  // Form handlers
  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Accused handlers
  const addNewAccused = () => {
    setAccusedList(prev => [...prev, {
      name: "", aadhaar: "", gender: "male", dob: "", age: "",
      pan: "", father_name: "", state_id: "", district_id: "",
      full_address: "", pin_code: "", mobile: "", email: "", isNew: true
    }])
  }

  const updateAccused = (index: number, field: string, value: string) => {
    setAccusedList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      
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

  const deleteAccused = async (index: number) => {
    const accused = accusedList[index]
    
    if (accused.id && !accused.isNew) {
      const { error } = await supabase.from("accused_details").delete().eq("id", accused.id)
      if (error) {
        toast.error("Failed to delete accused")
        return
      }
    }

    setAccusedList(prev => prev.filter((_, i) => i !== index))
    toast.success("Accused removed")
  }

  // Bailer handlers
  const addNewBailer = () => {
    setBailerList(prev => [...prev, {
      name: "", aadhaar: "", gender: "male", dob: "", age: "",
      pan: "", father_name: "", state_id: "", district_id: "",
      full_address: "", pin_code: "", mobile: "", email: "",
      brief: "", attachment_url: "", attachment_name: "", isNew: true
    }])
  }

  const updateBailer = (index: number, field: string, value: string) => {
    setBailerList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      
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

  const handleBailerFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(index)

      const fileExt = file.name.split('.').pop()
      const fileName = `bailer_${firId}_${index}_${Date.now()}.${fileExt}`
      const filePath = `fir-attachments/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      setBailerList(prev => {
        const updated = [...prev]
        updated[index].attachment_url = publicUrl
        updated[index].attachment_name = file.name
        return updated
      })

      toast.success("File uploaded!")
    } catch (err: any) {
      toast.error("Upload failed")
    } finally {
      setUploading(null)
    }
  }

  const deleteBailer = async (index: number) => {
    const bailer = bailerList[index]
    
    if (bailer.id && !bailer.isNew) {
      const { error } = await supabase.from("bailer_details").delete().eq("id", bailer.id)
      if (error) {
        toast.error("Failed to delete bailer")
        return
      }
    }

    setBailerList(prev => prev.filter((_, i) => i !== index))
    toast.success("Bailer removed")
  }

  // Hearing handlers
  const addNewHearing = () => {
    setHearingList(prev => [...prev, {
      hearing_date: "",
      hearing_time: "",
      hearing_type: "regular",
      hearing_status: "scheduled",
      next_hearing_date: "",
      court_name: "",
      judge_name: "",
      attended_by: "",
      prosecutor_name: "",
      defense_lawyer: "",
      order_passed: "",
      remarks: "",
      isNew: true
    }])
  }

  const updateHearing = (index: number, field: string, value: string) => {
    setHearingList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const deleteHearing = async (index: number) => {
    const hearing = hearingList[index]
    
    if (hearing.id && !hearing.isNew) {
      const { error } = await supabase.from("hearing_history").delete().eq("id", hearing.id)
      if (error) {
        toast.error("Failed to delete hearing")
        return
      }
    }

    setHearingList(prev => prev.filter((_, i) => i !== index))
    toast.success("Hearing removed")
  }

  // Save - FIXED LOGIC
  const handleSave = async () => {
    try {
      setSaving(true)
      
      console.log("🔄 Starting save process...")

      const selectedState = states.find(s => s.id === parseInt(formData.state_id))
      const selectedZone = zones.find(z => z.id === parseInt(formData.zone_id))
      const selectedDistrict = districts.find(d => d.id === parseInt(formData.district_id))
      const selectedThana = thanas.find(t => t.id === parseInt(formData.thana_id))
      const selectedCourt = courts.find(c => c.id === parseInt(formData.court_id))

      // Build update data - FIXED
      const updateData: Record<string, any> = {
        case_status: formData.case_status,
        law_sections_text: formData.law_sections_text || null,
        incident_date: formData.incident_date || null,
        incident_time: formData.incident_time || null,
        train_number_manual: formData.train_number_manual || null,
        train_name_manual: formData.train_name_manual || null,
        station_code: formData.station_code || null,
        station_name_manual: formData.station_name_manual || null,
        brief_description: formData.brief_description || null,
        io_name: formData.io_name || null,
        io_belt_no: formData.io_belt_no || null,
        io_rank: formData.io_rank || null,
        io_mobile: formData.io_mobile || null,
        lawyer_name: formData.lawyer_name || null,
        bar_council_no: formData.bar_council_no || null,
        lawyer_mobile: formData.lawyer_mobile || null,
        lawyer_email: formData.lawyer_email || null,
        updated_at: new Date().toISOString()
      }

      // IDs and Names
      if (formData.state_id) {
        updateData.state_id = parseInt(formData.state_id)
        updateData.state = getName(selectedState)
        updateData.state_name = getName(selectedState)
      }
      if (formData.zone_id) {
        updateData.zone_id = parseInt(formData.zone_id)
        updateData.zone = getName(selectedZone)
        updateData.zone_name = getName(selectedZone)
      }
      if (formData.district_id) {
        updateData.railway_district_id = parseInt(formData.district_id) // FIXED: Use railway_district_id
        updateData.district = getName(selectedDistrict)
        updateData.district_name = getName(selectedDistrict)
      }
      if (formData.thana_id) {
        updateData.thana_id = parseInt(formData.thana_id)
        updateData.thana = getName(selectedThana)
        updateData.thana_name = getName(selectedThana)
      }
      if (formData.court_id) {
        updateData.court_id = parseInt(formData.court_id)
        updateData.court_name = getName(selectedCourt)
      }

      console.log("📝 Update data:", updateData)

      // Update FIR
      const { error: firError } = await supabase
        .from("fir_records")
        .update(updateData)
        .eq("id", firId)

      if (firError) {
        console.error("❌ FIR update error:", firError)
        throw firError
      }

      console.log("✅ FIR updated successfully")

      // Update Accused
      for (const accused of accusedList) {
        if (!accused.name.trim()) continue

        const selectedAccusedState = states.find(s => s.id === parseInt(accused.state_id))
        const selectedAccusedDistrict = districts.find(d => d.id === parseInt(accused.district_id))

        const accusedData = {
          fir_id: parseInt(firId),
          name: accused.name,
          aadhaar: accused.aadhaar || null,
          gender: accused.gender,
          dob: accused.dob || null,
          age: accused.age ? parseInt(accused.age) : null,
          pan: accused.pan || null,
          father_name: accused.father_name || null,
          state_id: accused.state_id ? parseInt(accused.state_id) : null,
          state_name: selectedAccusedState ? getName(selectedAccusedState) : null,
          district_id: accused.district_id ? parseInt(accused.district_id) : null,
          district_name: selectedAccusedDistrict ? getName(selectedAccusedDistrict) : null,
          full_address: accused.full_address || null,
          pin_code: accused.pin_code || null,
          mobile: accused.mobile || null,
          email: accused.email || null
        }

        if (accused.isNew) {
          const { error } = await supabase.from("accused_details").insert(accusedData)
          if (error) console.error("Accused insert error:", error)
        } else if (accused.id) {
          const { error } = await supabase.from("accused_details").update(accusedData).eq("id", accused.id)
          if (error) console.error("Accused update error:", error)
        }
      }

      // Update Bailers
      for (const bailer of bailerList) {
        if (!bailer.name.trim()) continue

        const selectedBailerState = states.find(s => s.id === parseInt(bailer.state_id))
        const selectedBailerDistrict = districts.find(d => d.id === parseInt(bailer.district_id))

        const bailerData = {
          fir_id: parseInt(firId),
          name: bailer.name,
          aadhaar: bailer.aadhaar || null,
          gender: bailer.gender,
          dob: bailer.dob || null,
          age: bailer.age ? parseInt(bailer.age) : null,
          pan: bailer.pan || null,
          father_name: bailer.father_name || null,
          state_id: bailer.state_id ? parseInt(bailer.state_id) : null,
          state_name: selectedBailerState ? getName(selectedBailerState) : null,
          district_id: bailer.district_id ? parseInt(bailer.district_id) : null,
          district_name: selectedBailerDistrict ? getName(selectedBailerDistrict) : null,
          full_address: bailer.full_address || null,
          pin_code: bailer.pin_code || null,
          mobile: bailer.mobile || null,
          email: bailer.email || null,
          brief: bailer.brief || null,
          attachment_url: bailer.attachment_url || null,
          attachment_name: bailer.attachment_name || null
        }

        if (bailer.isNew) {
          const { error } = await supabase.from("bailer_details").insert(bailerData)
          if (error) console.error("Bailer insert error:", error)
        } else if (bailer.id) {
          const { error } = await supabase.from("bailer_details").update(bailerData).eq("id", bailer.id)
          if (error) console.error("Bailer update error:", error)
        }
      }

      // Update Hearings
      for (const hearing of hearingList) {
        if (!hearing.hearing_date) continue

        const hearingData = {
          fir_id: parseInt(firId),
          hearing_date: hearing.hearing_date,
          hearing_time: hearing.hearing_time || null,
          hearing_type: hearing.hearing_type,
          hearing_status: hearing.hearing_status,
          next_hearing_date: hearing.next_hearing_date || null,
          court_name: hearing.court_name || null,
          judge_name: hearing.judge_name || null,
          attended_by: hearing.attended_by || null,
          prosecutor_name: hearing.prosecutor_name || null,
          defense_lawyer: hearing.defense_lawyer || null,
          order_passed: hearing.order_passed || null,
          remarks: hearing.remarks || null
        }

        if (hearing.isNew) {
          const { error } = await supabase.from("hearing_history").insert(hearingData)
          if (error) console.error("Hearing insert error:", error)
        } else if (hearing.id) {
          const { error } = await supabase.from("hearing_history").update(hearingData).eq("id", hearing.id)
          if (error) console.error("Hearing update error:", error)
        }
      }

      toast.success("FIR updated successfully!")
      localStorage.setItem('fir_updated', JSON.stringify({ firId, timestamp: Date.now() }))
      router.push(`/fir/${firId}`)

    } catch (err: any) {
      console.error("Save error:", err)
      toast.error("Failed to save: " + (err.message || "Unknown error"))
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => router.push(`/fir/${firId}`)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-gray-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* Header */}
        <div className="bg-white border border-gray-300 rounded p-4">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={handleBack} disabled={saving}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Edit FIR</h1>
              <p className="text-sm text-gray-600">{formData.fir_number}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-gray-300 rounded">
          <div className="flex border-b border-gray-300 bg-gray-50 overflow-x-auto">
            {[
              { id: "case", label: "Case Details", icon: FileText },
              { id: "accused", label: `Accused (${accusedList.length})`, icon: User },
              { id: "bailers", label: `Bailers (${bailerList.length})`, icon: Users },
              { id: "hearings", label: `Hearings (${hearingList.length})`, icon: Gavel },
              { id: "io", label: "IO & Lawyer", icon: Briefcase }
            ].map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-gray-800 text-gray-800 bg-white'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            
            {/* CASE TAB */}
            {activeTab === "case" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">Case Information</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>FIR Number</Label>
                      <Input value={formData.fir_number} disabled className="mt-1 bg-gray-100" />
                    </div>
                    <div>
                      <Label>Case Status</Label>
                      <select className="w-full mt-1 px-3 py-2 border rounded bg-white" value={formData.case_status} onChange={(e) => handleChange("case_status", e.target.value)}>
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
                      <Label>Date of FIR</Label>
                      <Input type="date" className="mt-1 bg-white" value={formData.incident_date} onChange={(e) => handleChange("incident_date", e.target.value)} />
                    </div>
                    <div>
                      <Label>State</Label>
                      <select className="w-full mt-1 px-3 py-2 border rounded bg-white" value={formData.state_id} onChange={(e) => handleChange("state_id", e.target.value)}>
                        <option value="">-- Select --</option>
                        {states.map(s => <option key={s.id} value={s.id}>{getName(s)}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Zone</Label>
                      <select className="w-full mt-1 px-3 py-2 border rounded bg-white" value={formData.zone_id} onChange={(e) => handleChange("zone_id", e.target.value)}>
                        <option value="">-- Select --</option>
                        {zones.map(z => <option key={z.id} value={z.id}>{getName(z)}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>District</Label>
                      <select className="w-full mt-1 px-3 py-2 border rounded bg-white" value={formData.district_id} onChange={(e) => handleChange("district_id", e.target.value)}>
                        <option value="">-- Select --</option>
                        {districts.map(d => <option key={d.id} value={d.id}>{getName(d)}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Thana</Label>
                      <select className="w-full mt-1 px-3 py-2 border rounded bg-white" value={formData.thana_id} onChange={(e) => handleChange("thana_id", e.target.value)}>
                        <option value="">-- Select --</option>
                        {thanas.map(t => <option key={t.id} value={t.id}>{getName(t)}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Court</Label>
                      <select className="w-full mt-1 px-3 py-2 border rounded bg-white" value={formData.court_id} onChange={(e) => handleChange("court_id", e.target.value)}>
                        <option value="">-- Select --</option>
                        {courts.map(c => <option key={c.id} value={c.id}>{getName(c)}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Section</Label>
                      <Input className="mt-1 bg-white" value={formData.law_sections_text} onChange={(e) => handleChange("law_sections_text", e.target.value)} />
                    </div>
                    <div>
                      <Label>Incident Time</Label>
                      <Input type="time" className="mt-1 bg-white" value={formData.incident_time} onChange={(e) => handleChange("incident_time", e.target.value)} />
                    </div>
                    <div>
                      <Label>Train Number</Label>
                      <Input className="mt-1 bg-white" value={formData.train_number_manual} onChange={(e) => handleChange("train_number_manual", e.target.value)} />
                    </div>
                    <div>
                      <Label>Train Name</Label>
                      <Input className="mt-1 bg-white" value={formData.train_name_manual} onChange={(e) => handleChange("train_name_manual", e.target.value)} />
                    </div>
                    <div>
                      <Label>Station Code</Label>
                      <Input className="mt-1 bg-white" value={formData.station_code} onChange={(e) => handleChange("station_code", e.target.value)} />
                    </div>
                    <div className="col-span-2">
                      <Label>Station Name</Label>
                      <Input className="mt-1 bg-white" value={formData.station_name_manual} onChange={(e) => handleChange("station_name_manual", e.target.value)} />
                    </div>
                    <div className="col-span-3">
                      <Label>Brief Description</Label>
                      <Textarea className="mt-1 bg-white" value={formData.brief_description} onChange={(e) => handleChange("brief_description", e.target.value)} rows={3} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ACCUSED TAB */}
            {activeTab === "accused" && (
              <div>
                <div className="flex justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Accused ({accusedList.length})</h2>
                  <Button type="button" size="sm" onClick={addNewAccused}>
                    <Plus className="h-4 w-4 mr-1" /> Add Accused
                  </Button>
                </div>
                
                {accusedList.length === 0 ? (
                  <div className="text-center py-12 border border-dashed rounded">
                    <p className="text-gray-500 mb-4">No accused added</p>
                    <Button type="button" size="sm" onClick={addNewAccused}>
                      <Plus className="h-4 w-4 mr-1" /> Add First Accused
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {accusedList.map((accused, idx) => (
                      <div key={idx} className="border rounded p-4 bg-gray-50">
                        <div className="flex justify-between mb-3">
                          <span className="font-semibold text-gray-800">
                            Accused #{idx + 1} {accused.isNew && <Badge className="ml-2">New</Badge>}
                          </span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => deleteAccused(idx)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Name *</Label>
                            <Input className="bg-white" value={accused.name} onChange={(e) => updateAccused(idx, "name", e.target.value)} placeholder="Full Name" />
                          </div>
                          <div>
                            <Label>Aadhaar No.</Label>
                            <Input className="bg-white" value={accused.aadhaar} onChange={(e) => updateAccused(idx, "aadhaar", e.target.value)} placeholder="12-digit" maxLength={12} />
                          </div>
                          <div>
                            <Label>Gender</Label>
                            <select className="w-full px-3 py-2 border rounded bg-white" value={accused.gender} onChange={(e) => updateAccused(idx, "gender", e.target.value)}>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <Label>DOB</Label>
                            <Input className="bg-white" type="date" value={accused.dob} onChange={(e) => updateAccused(idx, "dob", e.target.value)} max={new Date().toISOString().split('T')[0]} />
                          </div>
                          <div>
                            <Label>Age</Label>
                            <Input className="bg-white" value={accused.age} readOnly placeholder="Auto" />
                          </div>
                          <div>
                            <Label>PAN No.</Label>
                            <Input className="bg-white" value={accused.pan} onChange={(e) => updateAccused(idx, "pan", e.target.value.toUpperCase())} placeholder="PAN" maxLength={10} style={{textTransform:'uppercase'}} />
                          </div>
                          <div>
                            <Label>Father's Name</Label>
                            <Input className="bg-white" value={accused.father_name} onChange={(e) => updateAccused(idx, "father_name", e.target.value)} placeholder="Father's Name" />
                          </div>
                          <div>
                            <Label>State</Label>
                            <select className="w-full px-3 py-2 border rounded bg-white" value={accused.state_id} onChange={(e) => updateAccused(idx, "state_id", e.target.value)}>
                              <option value="">Select</option>
                              {states.map(s => <option key={s.id} value={s.id}>{getName(s)}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label>District</Label>
                            <select className="w-full px-3 py-2 border rounded bg-white" value={accused.district_id} onChange={(e) => updateAccused(idx, "district_id", e.target.value)}>
                              <option value="">Select</option>
                              {districts.map(d => <option key={d.id} value={d.id}>{getName(d)}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <Label>Full Address</Label>
                            <Input className="bg-white" value={accused.full_address} onChange={(e) => updateAccused(idx, "full_address", e.target.value)} placeholder="Complete Address" />
                          </div>
                          <div>
                            <Label>PIN Code</Label>
                            <Input className="bg-white" value={accused.pin_code} onChange={(e) => updateAccused(idx, "pin_code", e.target.value)} placeholder="6-digit" maxLength={6} />
                          </div>
                          <div>
                            <Label>Mobile</Label>
                            <Input className="bg-white" value={accused.mobile} onChange={(e) => updateAccused(idx, "mobile", e.target.value)} placeholder="10-digit" maxLength={10} />
                          </div>
                          <div className="col-span-2">
                            <Label>Email ID</Label>
                            <Input className="bg-white" type="email" value={accused.email} onChange={(e) => updateAccused(idx, "email", e.target.value)} placeholder="email@example.com" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* BAILERS TAB */}
            {activeTab === "bailers" && (
              <div>
                <div className="flex justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Bailers ({bailerList.length})</h2>
                  <Button type="button" size="sm" onClick={addNewBailer}>
                    <Plus className="h-4 w-4 mr-1" /> Add Bailer
                  </Button>
                </div>
                
                {bailerList.length === 0 ? (
                  <div className="text-center py-12 border border-dashed rounded">
                    <p className="text-gray-500 mb-4">No bailers added</p>
                    <Button type="button" size="sm" onClick={addNewBailer}>
                      <Plus className="h-4 w-4 mr-1" /> Add First Bailer
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bailerList.map((bailer, idx) => (
                      <div key={idx} className="border rounded p-4 bg-gray-50">
                        <div className="flex justify-between mb-3">
                          <span className="font-semibold text-gray-800">
                            Bailer #{idx + 1} {bailer.isNew && <Badge className="ml-2">New</Badge>}
                          </span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => deleteBailer(idx)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Name *</Label>
                            <Input className="bg-white" value={bailer.name} onChange={(e) => updateBailer(idx, "name", e.target.value)} placeholder="Full Name" />
                          </div>
                          <div>
                            <Label>Aadhaar No.</Label>
                            <Input className="bg-white" value={bailer.aadhaar} onChange={(e) => updateBailer(idx, "aadhaar", e.target.value)} placeholder="12-digit" maxLength={12} />
                          </div>
                          <div>
                            <Label>Gender</Label>
                            <select className="w-full px-3 py-2 border rounded bg-white" value={bailer.gender} onChange={(e) => updateBailer(idx, "gender", e.target.value)}>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <Label>DOB</Label>
                            <Input className="bg-white" type="date" value={bailer.dob} onChange={(e) => updateBailer(idx, "dob", e.target.value)} max={new Date().toISOString().split('T')[0]} />
                          </div>
                          <div>
                            <Label>Age</Label>
                            <Input className="bg-white" value={bailer.age} readOnly placeholder="Auto" />
                          </div>
                          <div>
                            <Label>PAN No.</Label>
                            <Input className="bg-white" value={bailer.pan} onChange={(e) => updateBailer(idx, "pan", e.target.value.toUpperCase())} placeholder="PAN" maxLength={10} style={{textTransform:'uppercase'}} />
                          </div>
                          <div>
                            <Label>Father's Name</Label>
                            <Input className="bg-white" value={bailer.father_name} onChange={(e) => updateBailer(idx, "father_name", e.target.value)} placeholder="Father's Name" />
                          </div>
                          <div>
                            <Label>State</Label>
                            <select className="w-full px-3 py-2 border rounded bg-white" value={bailer.state_id} onChange={(e) => updateBailer(idx, "state_id", e.target.value)}>
                              <option value="">Select</option>
                              {states.map(s => <option key={s.id} value={s.id}>{getName(s)}</option>)}
                            </select>
                          </div>
                          <div>
                            <Label>District</Label>
                            <select className="w-full px-3 py-2 border rounded bg-white" value={bailer.district_id} onChange={(e) => updateBailer(idx, "district_id", e.target.value)}>
                              <option value="">Select</option>
                              {districts.map(d => <option key={d.id} value={d.id}>{getName(d)}</option>)}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <Label>Full Address</Label>
                            <Input className="bg-white" value={bailer.full_address} onChange={(e) => updateBailer(idx, "full_address", e.target.value)} placeholder="Complete Address" />
                          </div>
                          <div>
                            <Label>PIN Code</Label>
                            <Input className="bg-white" value={bailer.pin_code} onChange={(e) => updateBailer(idx, "pin_code", e.target.value)} placeholder="6-digit" maxLength={6} />
                          </div>
                          <div>
                            <Label>Mobile</Label>
                            <Input className="bg-white" value={bailer.mobile} onChange={(e) => updateBailer(idx, "mobile", e.target.value)} placeholder="10-digit" maxLength={10} />
                          </div>
                          <div className="col-span-2">
                            <Label>Email ID</Label>
                            <Input className="bg-white" type="email" value={bailer.email} onChange={(e) => updateBailer(idx, "email", e.target.value)} placeholder="email@example.com" />
                          </div>
                          <div className="col-span-3">
                            <Label>Brief (Textarea)</Label>
                            <Textarea className="bg-white" value={bailer.brief} onChange={(e) => updateBailer(idx, "brief", e.target.value)} placeholder="Enter brief details..." rows={3} />
                          </div>
                          <div className="col-span-3">
                            <Label>Attachment (FIR Copy)</Label>
                            <input
                              id={`bailer-file-${idx}`}
                              type="file"
                              onChange={(e) => handleBailerFileUpload(idx, e)}
                              accept=".pdf,.jpg,.jpeg,.png"
                              disabled={uploading === idx}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById(`bailer-file-${idx}`)?.click()}
                              disabled={uploading === idx}
                              className="w-full justify-start"
                            >
                              {uploading === idx ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                              ) : (
                                <><Upload className="mr-2 h-4 w-4" />{bailer.attachment_name || "Choose File"}</>
                              )}
                            </Button>
                            {bailer.attachment_url && <p className="text-sm text-green-600 mt-1">✓ File uploaded</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* HEARINGS TAB */}
            {activeTab === "hearings" && (
              <div>
                <div className="flex justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Hearings ({hearingList.length})</h2>
                  <Button type="button" size="sm" onClick={addNewHearing}>
                    <Plus className="h-4 w-4 mr-1" /> Add Hearing
                  </Button>
                </div>
                
                {hearingList.length === 0 ? (
                  <div className="text-center py-12 border border-dashed rounded">
                    <p className="text-gray-500 mb-4">No hearings added</p>
                    <Button type="button" size="sm" onClick={addNewHearing}>
                      <Plus className="h-4 w-4 mr-1" /> Add First Hearing
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {hearingList.map((hearing, idx) => (
                      <div key={idx} className="border rounded p-4 bg-gray-50">
                        <div className="flex justify-between mb-3">
                          <span className="font-semibold text-gray-800">
                            Hearing #{idx + 1} {hearing.isNew && <Badge className="ml-2">New</Badge>}
                          </span>
                          <Button type="button" variant="ghost" size="sm" onClick={() => deleteHearing(idx)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label>Hearing Date *</Label>
                            <Input className="bg-white" type="date" value={hearing.hearing_date} onChange={(e) => updateHearing(idx, "hearing_date", e.target.value)} />
                          </div>
                          <div>
                            <Label>Hearing Time</Label>
                            <Input className="bg-white" type="time" value={hearing.hearing_time} onChange={(e) => updateHearing(idx, "hearing_time", e.target.value)} />
                          </div>
                          <div>
                            <Label>Hearing Type</Label>
                            <select className="w-full px-3 py-2 border rounded bg-white" value={hearing.hearing_type} onChange={(e) => updateHearing(idx, "hearing_type", e.target.value)}>
                              <option value="regular">Regular Hearing</option>
                              <option value="bail">Bail Hearing</option>
                              <option value="chargesheet">Charge Sheet</option>
                              <option value="evidence">Evidence</option>
                              <option value="argument">Argument</option>
                              <option value="judgment">Judgment</option>
                            </select>
                          </div>
                          <div>
                            <Label>Hearing Status</Label>
                            <select className="w-full px-3 py-2 border rounded bg-white" value={hearing.hearing_status} onChange={(e) => updateHearing(idx, "hearing_status", e.target.value)}>
                              <option value="scheduled">Scheduled</option>
                              <option value="completed">Completed</option>
                              <option value="adjourned">Adjourned</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <Label>Next Hearing Date</Label>
                            <Input className="bg-white" type="date" value={hearing.next_hearing_date} onChange={(e) => updateHearing(idx, "next_hearing_date", e.target.value)} min={hearing.hearing_date} />
                          </div>
                          <div>
                            <Label>Court Name</Label>
                            <Input className="bg-white" value={hearing.court_name} onChange={(e) => updateHearing(idx, "court_name", e.target.value)} placeholder="Court Name" />
                          </div>
                          <div className="col-span-2">
                            <Label>Judge Name</Label>
                            <Input className="bg-white" value={hearing.judge_name} onChange={(e) => updateHearing(idx, "judge_name", e.target.value)} placeholder="Presiding Judge" />
                          </div>
                          <div>
                            <Label>Attended By (IO)</Label>
                            <Input className="bg-white" value={hearing.attended_by} onChange={(e) => updateHearing(idx, "attended_by", e.target.value)} placeholder="Officer" />
                          </div>
                          <div>
                            <Label>Prosecutor Name</Label>
                            <Input className="bg-white" value={hearing.prosecutor_name} onChange={(e) => updateHearing(idx, "prosecutor_name", e.target.value)} placeholder="Public Prosecutor" />
                          </div>
                          <div>
                            <Label>Defense Lawyer</Label>
                            <Input className="bg-white" value={hearing.defense_lawyer} onChange={(e) => updateHearing(idx, "defense_lawyer", e.target.value)} placeholder="Defense Advocate" />
                          </div>
                          <div className="col-span-3">
                            <Label>Order Passed</Label>
                            <Textarea className="bg-white" value={hearing.order_passed} onChange={(e) => updateHearing(idx, "order_passed", e.target.value)} placeholder="Court orders..." rows={2} />
                          </div>
                          <div className="col-span-3">
                            <Label>Remarks / Notes</Label>
                            <Textarea className="bg-white" value={hearing.remarks} onChange={(e) => updateHearing(idx, "remarks", e.target.value)} placeholder="Additional remarks..." rows={2} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* IO & LAWYER TAB */}
            {activeTab === "io" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">Investigating Officer</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>IO Name</Label>
                      <Input className="bg-white" value={formData.io_name} onChange={(e) => handleChange("io_name", e.target.value)} placeholder="Officer Name" />
                    </div>
                    <div>
                      <Label>Belt No.</Label>
                      <Input className="bg-white" value={formData.io_belt_no} onChange={(e) => handleChange("io_belt_no", e.target.value)} placeholder="Belt Number" />
                    </div>
                    <div>
                      <Label>Rank</Label>
                      <select className="w-full px-3 py-2 border rounded bg-white" value={formData.io_rank} onChange={(e) => handleChange("io_rank", e.target.value)}>
                        <option value="">Select Rank</option>
                        <option value="Constable">Constable</option>
                        <option value="HC">Head Constable</option>
                        <option value="ASI">ASI</option>
                        <option value="SI">Sub Inspector</option>
                        <option value="Inspector">Inspector</option>
                      </select>
                    </div>
                    <div>
                      <Label>Mobile</Label>
                      <Input className="bg-white" value={formData.io_mobile} onChange={(e) => handleChange("io_mobile", e.target.value)} placeholder="10-digit mobile" maxLength={10} />
                    </div>
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 mb-4 pb-2 border-b">Lawyer Details</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Lawyer Name</Label>
                      <Input className="bg-white" value={formData.lawyer_name} onChange={(e) => handleChange("lawyer_name", e.target.value)} placeholder="Advocate Name" />
                    </div>
                    <div>
                      <Label>Bar Council No.</Label>
                      <Input className="bg-white" value={formData.bar_council_no} onChange={(e) => handleChange("bar_council_no", e.target.value)} placeholder="Bar Council Number" />
                    </div>
                    <div>
                      <Label>Mobile</Label>
                      <Input className="bg-white" value={formData.lawyer_mobile} onChange={(e) => handleChange("lawyer_mobile", e.target.value)} placeholder="10-digit mobile" maxLength={10} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input className="bg-white" type="email" value={formData.lawyer_email} onChange={(e) => handleChange("lawyer_email", e.target.value)} placeholder="email@example.com" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white border border-gray-300 rounded p-4">
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleBack} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving} className="bg-gray-800 hover:bg-gray-900">
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
    </div>
  )
}