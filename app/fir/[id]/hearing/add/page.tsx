"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/auth"
import { Header } from "@/components/layout/Header"
import { Button } from "@/components/ui/button"
import { Gavel, ArrowLeft, Send, Loader2, Calendar, Clock, User } from "lucide-react"

const COURTS = [
  "Railway Court, New Delhi",
  "Railway Court, Mumbai CST",
  "Railway Court, Lucknow Junction",
  "Railway Court, Patna Junction",
  "Railway Court, Varanasi Junction",
  "Railway Court, Kolkata",
  "Railway Court, Chennai"
]

const HEARING_PURPOSE = [
  "first_hearing",
  "bail_hearing",
  "evidence",
  "witness",
  "arguments",
  "judgment",
  "other"
]

const HEARING_STATUS = [
  "scheduled",
  "completed", 
  "adjourned",
  "cancelled"
]

export default function AddHearingPage() {
  const router = useRouter()
  const params = useParams()
  const firId = params.id as string
  
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [firNumber, setFirNumber] = useState("")

  const [formData, setFormData] = useState({
    hearing_date: new Date().toISOString().split('T')[0],
    hearing_time: "",
    court_name: "",
    purpose: "first_hearing",
    status: "scheduled",
    remarks: ""
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push("/login")
      return
    }
    setUser(currentUser)

    const { data } = await supabase
      .from("fir_records")
      .select("fir_number, court_name")
      .eq("id", firId)
      .single()
    
    if (data) {
      setFirNumber(data.fir_number)
      // Pre-fill court name from FIR
      if (data.court_name) {
        setFormData(prev => ({ ...prev, court_name: data.court_name }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.hearing_date) {
      alert("Hearing Date is required!")
      return
    }

    setLoading(true)

    try {
      const insertData = {
        fir_id: parseInt(firId),
        hearing_date: formData.hearing_date,
        hearing_time: formData.hearing_time || null,
        court_name: formData.court_name || null,
        purpose: formData.purpose || null,
        status: formData.status || "scheduled",
        remarks: formData.remarks || null
      }

      console.log("Inserting hearing:", insertData)

      // ✅ FIXED: Use correct table name
      const { error } = await supabase
        .from("hearing_history")  // <- Changed from hearing_details to hearing_history
        .insert([insertData])

      if (error) {
        console.error("Error:", error)
        throw error
      }

      // Set refresh flag for FIR detail page
      localStorage.setItem('fir_updated', JSON.stringify({
        firId: firId,
        timestamp: Date.now(),
        hearings_updated: true
      }))

      alert("Hearing added successfully!")
      router.push(`/fir/${firId}`)
    } catch (error: any) {
      console.error("Error:", error)
      alert(`Error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getPurposeLabel = (value: string) => {
    const labels: Record<string, string> = {
      first_hearing: "First Hearing",
      bail_hearing: "Bail Hearing",
      evidence: "Evidence",
      witness: "Witness Examination",
      arguments: "Arguments",
      judgment: "Judgment",
      other: "Other"
    }
    return labels[value] || value
  }

  const getStatusLabel = (value: string) => {
    const labels: Record<string, string> = {
      scheduled: "Scheduled",
      completed: "Completed",
      adjourned: "Adjourned",
      cancelled: "Cancelled"
    }
    return labels[value] || value
  }

  return (
    <div className="page-wrapper">
      <Header user={user} title="Add Hearing" />

      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-b-2 gov-shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-white/20 rounded-xl flex items-center justify-center border-2 border-white/40">
                <Gavel className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">ADD HEARING</h1>
                <p className="text-purple-100">FIR: {firNumber}</p>
              </div>
            </div>
            <Button 
              onClick={() => router.push(`/fir/${firId}`)} 
              variant="outline" 
              className="bg-white/20 border-2 border-white/30 text-white hover:bg-white/30"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          </div>
        </div>
      </div>

      <div className="page-container page-section">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="bg-white border-2 border-purple-100 rounded-xl overflow-hidden gov-shadow-lg">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4">
              <h2 className="text-lg font-bold">HEARING DETAILS</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-600" />
                    Hearing Date <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.hearing_date}
                    onChange={(e) => setFormData({...formData, hearing_date: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    Hearing Time
                  </label>
                  <input
                    type="time"
                    value={formData.hearing_time}
                    onChange={(e) => setFormData({...formData, hearing_time: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-2">Court Name</label>
                  <select
                    value={formData.court_name}
                    onChange={(e) => setFormData({...formData, court_name: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  >
                    <option value="">-- Select Court --</option>
                    {COURTS.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Purpose</label>
                  <select
                    value={formData.purpose}
                    onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  >
                    {HEARING_PURPOSE.map(p => (
                      <option key={p} value={p}>{getPurposeLabel(p)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  >
                    {HEARING_STATUS.map(s => (
                      <option key={s} value={s}>{getStatusLabel(s)}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-2">Remarks</label>
                  <textarea
                    rows={4}
                    value={formData.remarks}
                    onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                    placeholder="Enter any remarks..."
                    className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t-2 border-gray-200">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="px-8 py-3 bg-purple-600 text-white font-bold hover:bg-purple-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
                      ADDING...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" /> 
                      ADD HEARING
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}