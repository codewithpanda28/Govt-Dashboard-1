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
  ChevronLeft, Save, Loader2, Gavel, Calendar, 
  Clock, User, Scale, FileText 
} from "lucide-react"
import { toast } from "sonner"

export default function AddHearingPage() {
  const params = useParams()
  const router = useRouter()
  const firId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [firNumber, setFirNumber] = useState("")

  // Form data - All hearing fields
  const [formData, setFormData] = useState({
    hearing_date: "",
    hearing_time: "",
    next_hearing_date: "",
    court_name: "",
    judge_name: "",
    hearing_type: "regular",
    hearing_status: "scheduled",
    order_passed: "",
    attended_by: "",
    prosecutor_name: "",
    defense_lawyer: "",
    remarks: ""
  })

  useEffect(() => {
    loadInitialData()
  }, [firId])

  const loadInitialData = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: fir, error: firError } = await supabase
        .from('fir_records')
        .select('fir_number, court_name')
        .eq('id', firId)
        .single()

      if (firError || !fir) {
        toast.error("FIR not found")
        router.push('/fir/list')
        return
      }

      setFirNumber(fir.fir_number)
      
      // Pre-fill court name from FIR if available
      if (fir.court_name) {
        setFormData(prev => ({ ...prev, court_name: fir.court_name }))
      }

    } catch (err: any) {
      console.error("Error:", err)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.hearing_date) {
      toast.error("Hearing date is required")
      return
    }

    try {
      setSaving(true)

      console.log("💾 Adding hearing to FIR:", firId)

      const hearingData = {
        fir_id: parseInt(firId),
        hearing_date: formData.hearing_date,
        hearing_time: formData.hearing_time || null,
        next_hearing_date: formData.next_hearing_date || null,
        court_name: formData.court_name.trim() || null,
        judge_name: formData.judge_name.trim() || null,
        hearing_type: formData.hearing_type,
        hearing_status: formData.hearing_status,
        order_passed: formData.order_passed.trim() || null,
        attended_by: formData.attended_by.trim() || null,
        prosecutor_name: formData.prosecutor_name.trim() || null,
        defense_lawyer: formData.defense_lawyer.trim() || null,
        remarks: formData.remarks.trim() || null,
        created_at: new Date().toISOString()
      }

      console.log("📤 Insert data:", hearingData)

      const { data, error } = await supabase
        .from('hearing_history')
        .insert(hearingData)
        .select()

      if (error) {
        console.error("❌ Insert error:", error)
        toast.error("Failed to add hearing: " + error.message)
        return
      }

      console.log("✅ Hearing added:", data)

      // Update next hearing in FIR if provided
      if (formData.next_hearing_date) {
        await supabase
          .from('fir_records')
          .update({ 
            next_hearing_date: formData.next_hearing_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', firId)
      }

      toast.success("Hearing added successfully!")
      
      localStorage.setItem('fir_updated', JSON.stringify({ 
        firId, 
        timestamp: Date.now() 
      }))

      setTimeout(() => {
        router.push(`/fir/${firId}`)
      }, 1000)

    } catch (err: any) {
      console.error("Error:", err)
      toast.error(err.message || "Failed to add hearing")
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
          <div className="p-2 bg-purple-100 rounded-lg">
            <Gavel className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Add Hearing</h1>
            <p className="text-muted-foreground text-sm">FIR: {firNumber}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Hearing Date & Time */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Hearing Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Hearing Date */}
                <div>
                  <Label>Hearing Date <span className="text-red-500">*</span></Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={formData.hearing_date}
                    onChange={(e) => handleChange("hearing_date", e.target.value)}
                    required
                  />
                </div>

                {/* Hearing Time */}
                <div>
                  <Label>Hearing Time</Label>
                  <div className="relative mt-1">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="time"
                      className="pl-9"
                      value={formData.hearing_time}
                      onChange={(e) => handleChange("hearing_time", e.target.value)}
                    />
                  </div>
                </div>

                {/* Hearing Type */}
                <div>
                  <Label>Hearing Type</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    value={formData.hearing_type}
                    onChange={(e) => handleChange("hearing_type", e.target.value)}
                  >
                    <option value="regular">Regular Hearing</option>
                    <option value="bail">Bail Hearing</option>
                    <option value="chargesheet">Charge Sheet</option>
                    <option value="evidence">Evidence</option>
                    <option value="argument">Argument</option>
                    <option value="judgment">Judgment</option>
                    <option value="remand">Remand</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Hearing Status */}
                <div>
                  <Label>Hearing Status</Label>
                  <select
                    className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
                    value={formData.hearing_status}
                    onChange={(e) => handleChange("hearing_status", e.target.value)}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="adjourned">Adjourned</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Next Hearing Date */}
                <div className="md:col-span-2">
                  <Label>Next Hearing Date</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    value={formData.next_hearing_date}
                    onChange={(e) => handleChange("next_hearing_date", e.target.value)}
                    min={formData.hearing_date}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will also update the FIR's next hearing date
                  </p>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Court Details */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5 text-primary" />
                Court Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Court Name */}
                <div>
                  <Label>Court Name</Label>
                  <Input
                    className="mt-1"
                    placeholder="e.g., Railway Court, Patna"
                    value={formData.court_name}
                    onChange={(e) => handleChange("court_name", e.target.value)}
                  />
                </div>

                {/* Judge Name */}
                <div>
                  <Label>Judge Name</Label>
                  <Input
                    className="mt-1"
                    placeholder="Presiding Judge Name"
                    value={formData.judge_name}
                    onChange={(e) => handleChange("judge_name", e.target.value)}
                  />
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Appearance Details */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Appearance Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Attended By */}
                <div>
                  <Label>Attended By (IO)</Label>
                  <Input
                    className="mt-1"
                    placeholder="Officer who attended"
                    value={formData.attended_by}
                    onChange={(e) => handleChange("attended_by", e.target.value)}
                  />
                </div>

                {/* Prosecutor */}
                <div>
                  <Label>Prosecutor Name</Label>
                  <Input
                    className="mt-1"
                    placeholder="Public Prosecutor"
                    value={formData.prosecutor_name}
                    onChange={(e) => handleChange("prosecutor_name", e.target.value)}
                  />
                </div>

                {/* Defense Lawyer */}
                <div>
                  <Label>Defense Lawyer</Label>
                  <Input
                    className="mt-1"
                    placeholder="Defense Advocate"
                    value={formData.defense_lawyer}
                    onChange={(e) => handleChange("defense_lawyer", e.target.value)}
                  />
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Order & Remarks */}
          <Card className="border-2">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Order & Remarks
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                
                {/* Order Passed */}
                <div>
                  <Label>Order Passed</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Enter the order passed by the court..."
                    value={formData.order_passed}
                    onChange={(e) => handleChange("order_passed", e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Remarks */}
                <div>
                  <Label>Remarks / Notes</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Enter any additional remarks or observations..."
                    value={formData.remarks}
                    onChange={(e) => handleChange("remarks", e.target.value)}
                    rows={3}
                  />
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
                  Add Hearing
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}