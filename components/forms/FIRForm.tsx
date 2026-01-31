"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface PersonDetail {
  id: string
  name: string
  aadhaar_no: string
  gender: string
  dob: string
  age: string
  pan_no: string
  father_name: string
  state: string
  district: string
  full_address: string
  pin_code: string
  mobile: string
  email: string
}

export function FIRForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)

  // Case Details
  const [accusedType, setAccusedType] = useState("")
  const [state, setState] = useState("")
  const [zone, setZone] = useState("")
  const [district, setDistrict] = useState("")
  const [thana, setThana] = useState("")
  const [court, setCourt] = useState("")
  const [section, setSection] = useState("")
  const [firNo, setFirNo] = useState("")
  const [firDate, setFirDate] = useState("")
  const [incidentTime, setIncidentTime] = useState("")
  const [trainNo, setTrainNo] = useState("")
  const [trainName, setTrainName] = useState("")
  const [stationCode, setStationCode] = useState("")
  const [stationName, setStationName] = useState("")
  const [brief, setBrief] = useState("")
  const [firCopyUrl, setFirCopyUrl] = useState("")

  // Accused & Bailer Lists
  const [accusedList, setAccusedList] = useState<PersonDetail[]>([createEmptyPerson()])
  const [bailerList, setBailerList] = useState<PersonDetail[]>([createEmptyPerson()])

  function createEmptyPerson(): PersonDetail {
    return {
      id: crypto.randomUUID(),
      name: "",
      aadhaar_no: "",
      gender: "",
      dob: "",
      age: "",
      pan_no: "",
      father_name: "",
      state: "",
      district: "",
      full_address: "",
      pin_code: "",
      mobile: "",
      email: "",
    }
  }

  // Accused Functions
  const addAccused = () => setAccusedList([...accusedList, createEmptyPerson()])
  const removeAccused = (id: string) => {
    if (accusedList.length > 1) {
      setAccusedList(accusedList.filter((p) => p.id !== id))
    }
  }
  const updateAccused = (id: string, field: keyof PersonDetail, value: string) => {
    setAccusedList(accusedList.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  // Bailer Functions
  const addBailer = () => setBailerList([...bailerList, createEmptyPerson()])
  const removeBailer = (id: string) => {
    if (bailerList.length > 1) {
      setBailerList(bailerList.filter((p) => p.id !== id))
    }
  }
  const updateBailer = (id: string, field: keyof PersonDetail, value: string) => {
    setBailerList(bailerList.map((p) => (p.id === id ? { ...p, [field]: value } : p)))
  }

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploadingFile(true)
      const fileExt = file.name.split(".").pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `fir-copies/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("documents").getPublicUrl(filePath)
      setFirCopyUrl(data.publicUrl)

      toast({
        title: "Success",
        description: "FIR copy uploaded successfully",
      })
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      })
    } finally {
      setUploadingFile(false)
    }
  }

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!firNo || !firDate || !section) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      const user = await getCurrentUser()

      if (!user?.police_station_id) {
        throw new Error("User not authenticated")
      }

      // Insert FIR
      const { data: firData, error: firError } = await supabase
        .from("fir_records")
        .insert({
          police_station_id: user.police_station_id,
          fir_number: firNo,
          incident_date: firDate,
          incident_time: incidentTime,
          accused_type: accusedType,
          state,
          zone,
          district,
          thana,
          court,
          section,
          train_no: trainNo,
          train_name: trainName,
          station_code: stationCode,
          station_name: stationName,
          brief_description: brief,
          fir_copy_url: firCopyUrl,
          case_status: "registered",
        })
        .select()
        .single()

      if (firError) throw firError

      // Insert Accused
      for (const accused of accusedList) {
        if (accused.name) {
          await supabase.from("accused_details").insert({
            fir_id: firData.id,
            ...accused,
            id: undefined,
          })
        }
      }

      // Insert Bailers
      for (const bailer of bailerList) {
        if (bailer.name) {
          await supabase.from("bailer_details").insert({
            fir_id: firData.id,
            ...bailer,
            id: undefined,
          })
        }
      }

      toast({
        title: "Success",
        description: "FIR created successfully",
      })

      router.push("/fir/list")
    } catch (error: any) {
      console.error("Submit error:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create FIR",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Case Details */}
      <Card>
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Accused Type <span className="text-red-500">*</span></Label>
            <Select value={accusedType} onValueChange={setAccusedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="group">Group</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>State <span className="text-red-500">*</span></Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="maharashtra">Maharashtra</SelectItem>
                <SelectItem value="delhi">Delhi</SelectItem>
                <SelectItem value="karnataka">Karnataka</SelectItem>
                <SelectItem value="uttar_pradesh">Uttar Pradesh</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Zone</Label>
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger>
                <SelectValue placeholder="Select zone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zone1">Zone 1</SelectItem>
                <SelectItem value="zone2">Zone 2</SelectItem>
                <SelectItem value="zone3">Zone 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>District <span className="text-red-500">*</span></Label>
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger>
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mumbai">Mumbai</SelectItem>
                <SelectItem value="pune">Pune</SelectItem>
                <SelectItem value="nagpur">Nagpur</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Thana <span className="text-red-500">*</span></Label>
            <Select value={thana} onValueChange={setThana}>
              <SelectTrigger>
                <SelectValue placeholder="Select thana" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thana1">Thana 1</SelectItem>
                <SelectItem value="thana2">Thana 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Court</Label>
            <Select value={court} onValueChange={setCourt}>
              <SelectTrigger>
                <SelectValue placeholder="Select court" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="district_court_1">District Court 1</SelectItem>
                <SelectItem value="district_court_2">District Court 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Section <span className="text-red-500">*</span></Label>
            <Input
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g., IPC 302, 307"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>FIR No. <span className="text-red-500">*</span></Label>
            <Input
              value={firNo}
              onChange={(e) => setFirNo(e.target.value)}
              placeholder="Enter FIR number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Date of FIR <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={firDate}
              onChange={(e) => setFirDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Timing of Incident</Label>
            <Input
              type="time"
              value={incidentTime}
              onChange={(e) => setIncidentTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Train No.</Label>
            <Input
              value={trainNo}
              onChange={(e) => setTrainNo(e.target.value)}
              placeholder="Enter train number"
            />
          </div>

          <div className="space-y-2">
            <Label>Train Name</Label>
            <Input
              value={trainName}
              onChange={(e) => setTrainName(e.target.value)}
              placeholder="Enter train name"
            />
          </div>

          <div className="space-y-2">
            <Label>Station Code</Label>
            <Input
              value={stationCode}
              onChange={(e) => setStationCode(e.target.value)}
              placeholder="Enter station code"
            />
          </div>

          <div className="space-y-2">
            <Label>Station Name</Label>
            <Input
              value={stationName}
              onChange={(e) => setStationName(e.target.value)}
              placeholder="Enter station name"
            />
          </div>
        </CardContent>
      </Card>

      {/* Accused Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Accused Details</CardTitle>
          <Button type="button" onClick={addAccused} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Accused
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {accusedList.map((accused, index) => (
            <PersonDetailsForm
              key={accused.id}
              person={accused}
              index={index}
              label="Accused"
              onUpdate={(field, value) => updateAccused(accused.id, field, value)}
              onRemove={() => removeAccused(accused.id)}
              canRemove={accusedList.length > 1}
            />
          ))}
        </CardContent>
      </Card>

      {/* Bailer Details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bailer Details</CardTitle>
          <Button type="button" onClick={addBailer} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Bailer
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {bailerList.map((bailer, index) => (
            <PersonDetailsForm
              key={bailer.id}
              person={bailer}
              index={index}
              label="Bailer"
              onUpdate={(field, value) => updateBailer(bailer.id, field, value)}
              onRemove={() => removeBailer(bailer.id)}
              canRemove={bailerList.length > 1}
            />
          ))}
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Brief Description</Label>
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder="Enter brief description"
              rows={6}
            />
          </div>

          <div className="space-y-2">
            <Label>Attachment (FIR Copy)</Label>
            <Input
              type="file"
              onChange={handleFileUpload}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              disabled={uploadingFile}
            />
            {uploadingFile && <p className="text-sm text-muted-foreground">Uploading...</p>}
            {firCopyUrl && <p className="text-sm text-green-600">✓ File uploaded</p>}
          </div>
        </CardContent>
      </Card>

      {/* Buttons */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit FIR"
          )}
        </Button>
      </div>
    </form>
  )
}

// Person Details Subcomponent
interface PersonDetailsFormProps {
  person: PersonDetail
  index: number
  label: string
  onUpdate: (field: keyof PersonDetail, value: string) => void
  onRemove: () => void
  canRemove: boolean
}

function PersonDetailsForm({
  person,
  index,
  label,
  onUpdate,
  onRemove,
  canRemove,
}: PersonDetailsFormProps) {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">
          {label} #{index + 1}
        </h4>
        {canRemove && (
          <Button type="button" onClick={onRemove} variant="destructive" size="sm">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input
            value={person.name}
            onChange={(e) => onUpdate("name", e.target.value)}
            placeholder="Enter name"
          />
        </div>

        <div className="space-y-2">
          <Label>Aadhaar No.</Label>
          <Input
            value={person.aadhaar_no}
            onChange={(e) => onUpdate("aadhaar_no", e.target.value)}
            placeholder="12-digit Aadhaar"
            maxLength={12}
          />
        </div>

        <div className="space-y-2">
          <Label>Gender</Label>
          <Select value={person.gender} onValueChange={(v) => onUpdate("gender", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Input
            type="date"
            value={person.dob}
            onChange={(e) => onUpdate("dob", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Age</Label>
          <Input
            type="number"
            value={person.age}
            onChange={(e) => onUpdate("age", e.target.value)}
            placeholder="Age"
          />
        </div>

        <div className="space-y-2">
          <Label>PAN No.</Label>
          <Input
            value={person.pan_no}
            onChange={(e) => onUpdate("pan_no", e.target.value)}
            placeholder="10-digit PAN"
            maxLength={10}
          />
        </div>

        <div className="space-y-2">
          <Label>Father's Name</Label>
          <Input
            value={person.father_name}
            onChange={(e) => onUpdate("father_name", e.target.value)}
            placeholder="Father's name"
          />
        </div>

        <div className="space-y-2">
          <Label>State</Label>
          <Select value={person.state} onValueChange={(v) => onUpdate("state", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="maharashtra">Maharashtra</SelectItem>
              <SelectItem value="delhi">Delhi</SelectItem>
              <SelectItem value="karnataka">Karnataka</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>District</Label>
          <Input
            value={person.district}
            onChange={(e) => onUpdate("district", e.target.value)}
            placeholder="District"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Full Address</Label>
          <Input
            value={person.full_address}
            onChange={(e) => onUpdate("full_address", e.target.value)}
            placeholder="Full address"
          />
        </div>

        <div className="space-y-2">
          <Label>PIN Code</Label>
          <Input
            value={person.pin_code}
            onChange={(e) => onUpdate("pin_code", e.target.value)}
            placeholder="6-digit PIN"
            maxLength={6}
          />
        </div>

        <div className="space-y-2">
          <Label>Mobile</Label>
          <Input
            value={person.mobile}
            onChange={(e) => onUpdate("mobile", e.target.value)}
            placeholder="10-digit mobile"
            maxLength={10}
          />
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={person.email}
            onChange={(e) => onUpdate("email", e.target.value)}
            placeholder="Email address"
          />
        </div>
      </div>
    </div>
  )
}