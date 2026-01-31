"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/auth"
import { Header } from "@/components/layout/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft,
  Save,
  Loader2,
  FileText,
  Calendar,
  Train,
  MapPin,
  Scale,
  User,
  Phone,
  Building
} from "lucide-react"

// States Data for Dropdown
const STATES_DATA: Record<string, { zones: string[]; districts: Record<string, string[]> }> = {
  "Uttar Pradesh": {
    zones: ["Eastern", "Western", "Central"],
    districts: {
      "Eastern": ["Lucknow", "Kanpur", "Varanasi", "Allahabad", "Gorakhpur"],
      "Western": ["Agra", "Meerut", "Ghaziabad", "Bareilly", "Moradabad"],
      "Central": ["Kanpur Nagar", "Unnao", "Sitapur", "Hardoi"]
    }
  },
  "Bihar": {
    zones: ["North Bihar", "South Bihar"],
    districts: {
      "North Bihar": ["Patna", "Muzaffarpur", "Darbhanga", "Samastipur"],
      "South Bihar": ["Gaya", "Bhagalpur", "Nalanda"]
    }
  },
  "Maharashtra": {
    zones: ["Mumbai", "Pune", "Nagpur"],
    districts: {
      "Mumbai": ["Mumbai City", "Mumbai Suburban", "Thane"],
      "Pune": ["Pune", "Solapur", "Satara"],
      "Nagpur": ["Nagpur", "Wardha", "Chandrapur"]
    }
  },
  "Delhi": {
    zones: ["North", "South", "East", "West", "Central"],
    districts: {
      "North": ["North Delhi", "North West Delhi"],
      "South": ["South Delhi", "South West Delhi"],
      "East": ["East Delhi", "Shahdara"],
      "West": ["West Delhi"],
      "Central": ["Central Delhi", "New Delhi"]
    }
  }
}

// Railway Police Stations
const RAILWAY_POLICE_STATIONS: Record<string, string[]> = {
  "Lucknow": ["GRP Lucknow Junction", "GRP Charbagh", "GRP Alambagh"],
  "Kanpur": ["GRP Kanpur Central", "GRP Kanpur Anwarganj"],
  "Patna": ["GRP Patna Junction", "GRP Danapur"],
  "Mumbai City": ["GRP CST Mumbai", "GRP Mumbai Central", "GRP Bandra"],
  "New Delhi": ["GRP New Delhi", "GRP Old Delhi", "GRP Hazrat Nizamuddin"]
}

// Railway Courts
const RAILWAY_COURTS = [
  "Railway Court, New Delhi",
  "Railway Court, Mumbai CST",
  "Railway Court, Lucknow Junction",
  "Railway Court, Patna Junction",
  "Railway Court, Chennai Central"
]

export default function EditFIRPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [fir, setFir] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    fir_number: "",
    case_status: "registered",
    accused_type: "Unknown",
    incident_date: "",
    incident_time: "",
    state_name: "",
    zone_name: "",
    district_name: "",
    thana_name: "",
    court_name: "",
    train_number_manual: "",
    train_name_manual: "",
    station_code: "",
    station_name_manual: "",
    law_sections_text: "",
    brief_description: "",
    detailed_description: "",
    property_stolen: "",
    estimated_value: 0,
    io_name: "",
    io_belt_no: "",
    io_rank: "",
    io_mobile: "",
    lawyer_name: "",
    bar_council_no: "",
    lawyer_mobile: "",
    lawyer_email: ""
  })

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (params.id) {
      loadFIR()
    }
  }, [params.id])

  const loadUser = async () => {
    const currentUser = await getCurrentUser()
    setUser(currentUser)
  }

  const loadFIR = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("fir_records")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error) {
        console.error("Error loading FIR:", error)
        throw error
      }

      if (!data) {
        setMessage({ type: "error", text: "FIR not found" })
        return
      }

      setFir(data)
      setFormData({
        fir_number: data.fir_number || "",
        case_status: data.case_status || "registered",
        accused_type: data.accused_type || "Unknown",
        incident_date: data.incident_date || "",
        incident_time: data.incident_time || "",
        state_name: data.state_name || "",
        zone_name: data.zone_name || "",
        district_name: data.district_name || "",
        thana_name: data.thana_name || "",
        court_name: data.court_name || "",
        train_number_manual: data.train_number_manual || "",
        train_name_manual: data.train_name_manual || "",
        station_code: data.station_code || "",
        station_name_manual: data.station_name_manual || "",
        law_sections_text: data.law_sections_text || "",
        brief_description: data.brief_description || "",
        detailed_description: data.detailed_description || "",
        property_stolen: data.property_stolen || "",
        estimated_value: data.estimated_value || 0,
        io_name: data.io_name || "",
        io_belt_no: data.io_belt_no || "",
        io_rank: data.io_rank || "",
        io_mobile: data.io_mobile || "",
        lawyer_name: data.lawyer_name || "",
        bar_council_no: data.bar_council_no || "",
        lawyer_mobile: data.lawyer_mobile || "",
        lawyer_email: data.lawyer_email || ""
      })
    } catch (error: any) {
      console.error("Error:", error)
      setMessage({ type: "error", text: "Failed to load FIR" })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Reset dependent fields
    if (name === "state_name") {
      setFormData(prev => ({ ...prev, zone_name: "", district_name: "", thana_name: "" }))
    }
    if (name === "zone_name") {
      setFormData(prev => ({ ...prev, district_name: "", thana_name: "" }))
    }
    if (name === "district_name") {
      setFormData(prev => ({ ...prev, thana_name: "" }))
    }
  }

  const getZones = () => {
    return STATES_DATA[formData.state_name]?.zones || []
  }

  const getDistricts = () => {
    return STATES_DATA[formData.state_name]?.districts[formData.zone_name] || []
  }

  const getPoliceStations = () => {
    return RAILWAY_POLICE_STATIONS[formData.district_name] || []
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const updateData = {
      ...formData,
      estimated_value: parseFloat(String(formData.estimated_value)) || 0,
      updated_at: new Date().toISOString()
    }

    try {
      const { error } = await supabase
        .from("fir_records")
        .update(updateData)
        .eq("id", params.id)

      if (error) {
        console.error("Update error:", error)
        throw error
      }

      setMessage({ type: "success", text: "FIR updated successfully!" })

      setTimeout(() => {
        router.push(`/fir/${params.id}`)
      }, 1500)
    } catch (error: any) {
      console.error("Error:", error)
      setMessage({ type: "error", text: error.message || "Failed to update FIR" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-wrapper flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-3 text-gray-500">Loading FIR...</p>
        </div>
      </div>
    )
  }

  if (!fir) {
    return (
      <div className="page-wrapper flex flex-col items-center justify-center">
        <FileText className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-xl text-gray-500 mb-2">FIR not found</p>
        {message && <p className="text-red-500 mb-4">{message.text}</p>}
        <Button onClick={() => router.push("/fir/list")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <Header user={user} title={`Edit FIR: ${fir.fir_number}`} />

      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/fir/${params.id}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">Edit FIR</h1>
            <p className="text-sm text-gray-500">{fir.fir_number}</p>
          </div>
        </div>
      </div>

      <div className="page-container">
        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
          {/* FIR Basic Information */}
          <Card>
            <CardHeader className="bg-blue-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg text-blue-800">
                <FileText className="h-5 w-5" />
                FIR Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fir_number">FIR Number *</Label>
                  <Input
                    id="fir_number"
                    name="fir_number"
                    value={formData.fir_number}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="case_status">Case Status *</Label>
                  <select
                    id="case_status"
                    name="case_status"
                    value={formData.case_status}
                    onChange={handleChange}
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  <Label htmlFor="accused_type">Accused Type *</Label>
                  <select
                    id="accused_type"
                    name="accused_type"
                    value={formData.accused_type}
                    onChange={handleChange}
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

          {/* Incident Details */}
          <Card>
            <CardHeader className="bg-green-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg text-green-800">
                <Calendar className="h-5 w-5" />
                Incident Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="incident_date">Incident Date *</Label>
                  <Input
                    id="incident_date"
                    name="incident_date"
                    type="date"
                    value={formData.incident_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="incident_time">Incident Time</Label>
                  <Input
                    id="incident_time"
                    name="incident_time"
                    type="time"
                    value={formData.incident_time}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location Details */}
          <Card>
            <CardHeader className="bg-orange-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg text-orange-800">
                <MapPin className="h-5 w-5" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="state_name">State *</Label>
                  <select
                    id="state_name"
                    name="state_name"
                    value={formData.state_name}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">-- Select State --</option>
                    {Object.keys(STATES_DATA).map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="zone_name">Zone *</Label>
                  <select
                    id="zone_name"
                    name="zone_name"
                    value={formData.zone_name}
                    onChange={handleChange}
                    disabled={!formData.state_name}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <option value="">-- Select Zone --</option>
                    {getZones().map(zone => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="district_name">District *</Label>
                  <select
                    id="district_name"
                    name="district_name"
                    value={formData.district_name}
                    onChange={handleChange}
                    disabled={!formData.zone_name}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <option value="">-- Select District --</option>
                    {getDistricts().map(district => (
                      <option key={district} value={district}>{district}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="thana_name">Police Station (Thana) *</Label>
                  <select
                    id="thana_name"
                    name="thana_name"
                    value={formData.thana_name}
                    onChange={handleChange}
                    disabled={!formData.district_name}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
                  >
                    <option value="">-- Select Thana --</option>
                    {getPoliceStations().map(ps => (
                      <option key={ps} value={ps}>{ps}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label htmlFor="court_name">Court *</Label>
                <select
                  id="court_name"
                  name="court_name"
                  value={formData.court_name}
                  onChange={handleChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Select Court --</option>
                  {RAILWAY_COURTS.map(court => (
                    <option key={court} value={court}>{court}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Train & Station Details */}
          <Card>
            <CardHeader className="bg-purple-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg text-purple-800">
                <Train className="h-5 w-5" />
                Train & Station Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="train_number_manual">Train Number</Label>
                  <Input
                    id="train_number_manual"
                    name="train_number_manual"
                    value={formData.train_number_manual}
                    onChange={handleChange}
                    placeholder="e.g., 12301"
                  />
                </div>
                <div>
                  <Label htmlFor="train_name_manual">Train Name</Label>
                  <Input
                    id="train_name_manual"
                    name="train_name_manual"
                    value={formData.train_name_manual}
                    onChange={handleChange}
                    placeholder="e.g., Rajdhani Express"
                  />
                </div>
                <div>
                  <Label htmlFor="station_code">Station Code</Label>
                  <Input
                    id="station_code"
                    name="station_code"
                    value={formData.station_code}
                    onChange={handleChange}
                    placeholder="e.g., NDLS"
                  />
                </div>
                <div>
                  <Label htmlFor="station_name_manual">Station Name</Label>
                  <Input
                    id="station_name_manual"
                    name="station_name_manual"
                    value={formData.station_name_manual}
                    onChange={handleChange}
                    placeholder="e.g., New Delhi"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Crime & Legal Details */}
          <Card>
            <CardHeader className="bg-red-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg text-red-800">
                <Scale className="h-5 w-5" />
                Crime & Legal Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label htmlFor="law_sections_text">Law Sections Applied *</Label>
                <Input
                  id="law_sections_text"
                  name="law_sections_text"
                  value={formData.law_sections_text}
                  onChange={handleChange}
                  placeholder="e.g., 379, 411 IPC"
                />
              </div>
              <div>
                <Label htmlFor="brief_description">Brief Description *</Label>
                <Textarea
                  id="brief_description"
                  name="brief_description"
                  value={formData.brief_description}
                  onChange={handleChange}
                  rows={3}
                  required
                  placeholder="Enter brief description of the incident"
                />
              </div>
              <div>
                <Label htmlFor="detailed_description">Detailed Description</Label>
                <Textarea
                  id="detailed_description"
                  name="detailed_description"
                  value={formData.detailed_description}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Enter detailed description (optional)"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="property_stolen">Property Stolen</Label>
                  <Textarea
                    id="property_stolen"
                    name="property_stolen"
                    value={formData.property_stolen}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Describe stolen property"
                  />
                </div>
                <div>
                  <Label htmlFor="estimated_value">Estimated Value (₹)</Label>
                  <Input
                    id="estimated_value"
                    name="estimated_value"
                    type="number"
                    step="0.01"
                    value={formData.estimated_value}
                    onChange={handleChange}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* IO Details */}
          <Card>
            <CardHeader className="bg-teal-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg text-teal-800">
                <User className="h-5 w-5" />
                Investigating Officer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="io_name">IO Name</Label>
                  <Input
                    id="io_name"
                    name="io_name"
                    value={formData.io_name}
                    onChange={handleChange}
                    placeholder="Officer Name"
                  />
                </div>
                <div>
                  <Label htmlFor="io_belt_no">Belt Number</Label>
                  <Input
                    id="io_belt_no"
                    name="io_belt_no"
                    value={formData.io_belt_no}
                    onChange={handleChange}
                    placeholder="Belt No."
                  />
                </div>
                <div>
                  <Label htmlFor="io_rank">Rank</Label>
                  <select
                    id="io_rank"
                    name="io_rank"
                    value={formData.io_rank}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">-- Select Rank --</option>
                    <option value="Constable">Constable</option>
                    <option value="Head Constable">Head Constable</option>
                    <option value="ASI">ASI</option>
                    <option value="SI">SI</option>
                    <option value="Inspector">Inspector</option>
                    <option value="DSP">DSP</option>
                    <option value="SP">SP</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="io_mobile">Mobile</Label>
                  <Input
                    id="io_mobile"
                    name="io_mobile"
                    value={formData.io_mobile}
                    onChange={handleChange}
                    placeholder="10 digit mobile"
                    maxLength={10}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lawyer Details */}
          <Card>
            <CardHeader className="bg-pink-50 border-b">
              <CardTitle className="flex items-center gap-2 text-lg text-pink-800">
                <Building className="h-5 w-5" />
                Lawyer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="lawyer_name">Lawyer Name</Label>
                  <Input
                    id="lawyer_name"
                    name="lawyer_name"
                    value={formData.lawyer_name}
                    onChange={handleChange}
                    placeholder="Lawyer Name"
                  />
                </div>
                <div>
                  <Label htmlFor="bar_council_no">Bar Council No.</Label>
                  <Input
                    id="bar_council_no"
                    name="bar_council_no"
                    value={formData.bar_council_no}
                    onChange={handleChange}
                    placeholder="Bar Council Number"
                  />
                </div>
                <div>
                  <Label htmlFor="lawyer_mobile">Mobile</Label>
                  <Input
                    id="lawyer_mobile"
                    name="lawyer_mobile"
                    value={formData.lawyer_mobile}
                    onChange={handleChange}
                    placeholder="10 digit mobile"
                    maxLength={10}
                  />
                </div>
                <div>
                  <Label htmlFor="lawyer_email">Email</Label>
                  <Input
                    id="lawyer_email"
                    name="lawyer_email"
                    type="email"
                    value={formData.lawyer_email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                  />
                </div>
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
              onClick={() => router.push(`/fir/${params.id}`)}
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
