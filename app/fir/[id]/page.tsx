"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ChevronLeft, Edit, Printer, UserPlus, FileText, Train, Scale,
  User, Phone, CreditCard, Gavel, Users, Plus, Eye, MapPin, 
  RefreshCw, AlertCircle, Download, Calendar, Clock, CheckCircle,
  XCircle, Search, HelpCircle, Shield, UserCheck, UserX
} from "lucide-react"
import { toast } from "sonner"

interface FIRDetails {
  id: number
  fir_number: string
  case_status: string
  accused_type: string
  state_name: string
  zone_name: string
  district_name: string
  thana_name: string
  court_name: string
  incident_date: string
  incident_time: string
  created_at: string
  updated_at: string
  brief_description: string
  law_sections_text: string
  train_number_manual: string
  train_name_manual: string
  station_code: string
  station_name_manual: string
  property_stolen: string
  estimated_value: number
  io_name: string
  io_belt_no: string
  io_rank: string
  io_mobile: string
  lawyer_name: string
  bar_council_no: string
  lawyer_mobile: string
  lawyer_email: string
}

interface BailerDetails {
  id: number
  fir_id: number
  name: string
  father_name?: string
  age?: number | string
  gender?: string
  mobile?: string
  aadhaar?: string
  full_address?: string
  created_at?: string
}

interface AccusedDetails {
  id: number
  fir_id: number
  name: string
  father_name?: string
  age?: number | string
  gender?: string
  mobile?: string
  aadhaar?: string
  full_address?: string
  accused_type?: string
}

interface HearingDetails {
  id: number
  fir_id: number
  hearing_date: string
  hearing_time?: string
  court_name?: string
  purpose?: string
  status?: string
  remarks?: string
}

export default function FIRDetailPage() {
  const params = useParams()
  const router = useRouter()
  const firId = params.id as string

  const [fir, setFir] = useState<FIRDetails | null>(null)
  const [accusedList, setAccusedList] = useState<AccusedDetails[]>([])
  const [bailerList, setBailerList] = useState<BailerDetails[]>([])
  const [hearingList, setHearingList] = useState<HearingDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("details")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (firId) {
      loadFIRDetails()
    }
  }, [firId])

  // Auto-refresh on visibility/focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && firId) {
        checkForUpdates()
      }
    }

    const handleFocus = () => {
      if (firId) {
        checkForUpdates()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", handleFocus)
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", handleFocus)
    }
  }, [firId, lastUpdated])

  // Enhanced localStorage check for updates from Edit page
  useEffect(() => {
    const checkLocalStorage = () => {
      const updateFlag = localStorage.getItem('fir_updated')
      if (updateFlag) {
        try {
          const data = JSON.parse(updateFlag)
          console.log("🔄 Update flag detected:", data)
          if (data.firId === firId || data.firId === parseInt(firId)) {
            console.log("🔄 Refreshing FIR data...")
            localStorage.removeItem('fir_updated')
            loadFIRDetails(true)
          }
        } catch (e) {
          console.error("Parse error:", e)
        }
      }
    }

    // Check on mount
    checkLocalStorage()

    // Check every 2 seconds
    const interval = setInterval(checkLocalStorage, 2000)

    return () => clearInterval(interval)
  }, [firId])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  const checkForUpdates = async () => {
    if (!firId || !lastUpdated) {
      loadFIRDetails(true)
      return
    }

    try {
      const { data, error } = await supabase
        .from("fir_records")
        .select("updated_at")
        .eq("id", firId)
        .single()

      if (!error && data) {
        const dbUpdatedTime = new Date(data.updated_at)
        if (dbUpdatedTime > lastUpdated) {
          loadFIRDetails(true)
        }
      }
    } catch (err) {
      console.error("Error checking updates:", err)
    }
  }

  const loadFIRDetails = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      console.log("📋 ========== LOADING FIR DETAILS ==========")
      console.log("📋 FIR ID:", firId)

      // Load FIR record
      const { data: firData, error: firError } = await supabase
        .from("fir_records")
        .select("*")
        .eq("id", firId)
        .single()

      if (firError) {
        console.error("❌ FIR load error:", firError)
        setError(firError.message)
        setFir(null)
        toast.error("Failed to load FIR")
        return
      }

      if (!firData) {
        console.error("❌ FIR not found")
        setError("FIR not found")
        setFir(null)
        return
      }

      console.log("✅ FIR loaded:", firData.fir_number)
      setFir(firData)
      setLastUpdated(new Date(firData.updated_at))

      // Load accused persons
      console.log("👥 Loading accused...")
      const { data: accusedData, error: accusedError } = await supabase
        .from("accused_details")
        .select("*")
        .eq("fir_id", firId)
        .order("created_at", { ascending: false })

      if (accusedError) {
        console.error("❌ Accused load error:", accusedError)
        setAccusedList([])
      } else {
        console.log("✅ Accused loaded:", accusedData?.length || 0)
        setAccusedList(accusedData || [])
      }

      // Load bailer details - WITH DEBUGGING
      console.log("👤 ========== LOADING BAILERS ==========")
      const { data: bailerData, error: bailerError } = await supabase
        .from("bailer_details")
        .select("*")
        .eq("fir_id", firId)
        .order("created_at", { ascending: false })

      if (bailerError) {
        console.error("❌ Bailer load error:", bailerError)
        console.error("❌ Error details:", bailerError.message)
        setBailerList([])
      } else {
        console.log("✅ Bailers loaded from DB:", bailerData?.length || 0)
        console.log("📊 Bailer data:", bailerData)
        setBailerList(bailerData || [])
      }

      // Load hearing history
      console.log("⚖️ Loading hearings...")
      const { data: hearingData, error: hearingError } = await supabase
        .from("hearing_history")
        .select("*")
        .eq("fir_id", firId)
        .order("hearing_date", { ascending: false })

      if (hearingError) {
        console.error("❌ Hearing load error:", hearingError)
        setHearingList([])
      } else {
        console.log("✅ Hearings loaded:", hearingData?.length || 0)
        setHearingList(hearingData || [])
      }

      if (isRefresh) {
        toast.success("Data refreshed!")
      }

      console.log("📋 ========== LOAD COMPLETE ==========")
      console.log("📊 Summary - Accused:", accusedData?.length, "Bailers:", bailerData?.length, "Hearings:", hearingData?.length)

    } catch (error: any) {
      console.error("❌ Load error:", error)
      setError(error.message || "Failed to load FIR details")
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [firId])

  const handleRefresh = () => {
    loadFIRDetails(true)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      })
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase().replace(/ /g, "_") || "open"
    const config: Record<string, { bg: string, icon: any, label: string }> = {
      open: { bg: "bg-orange-100 text-orange-700 border-orange-200", icon: Clock, label: "OPEN" },
      registered: { bg: "bg-blue-100 text-blue-700 border-blue-200", icon: FileText, label: "REGISTERED" },
      under_investigation: { bg: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Search, label: "UNDER INVESTIGATION" },
      chargesheet_filed: { bg: "bg-purple-100 text-purple-700 border-purple-200", icon: Scale, label: "CHARGESHEET FILED" },
      in_court: { bg: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Gavel, label: "IN COURT" },
      closed: { bg: "bg-gray-100 text-gray-700 border-gray-200", icon: XCircle, label: "CLOSED" },
      disposed: { bg: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle, label: "DISPOSED" }
    }
    const { bg, icon: Icon, label } = config[statusLower] || config.open
    return (
      <Badge className={`${bg} font-semibold border`}>
        <Icon className="h-3 w-3 mr-1" />
        {label}
      </Badge>
    )
  }

  const getAccusedStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || "unknown"
    const config: Record<string, { bg: string, icon: any }> = {
      unknown: { bg: "bg-gray-100 text-gray-700 border-gray-200", icon: HelpCircle },
      known: { bg: "bg-blue-100 text-blue-700 border-blue-200", icon: User },
      arrested: { bg: "bg-green-100 text-green-700 border-green-200", icon: Shield },
      absconding: { bg: "bg-red-100 text-red-700 border-red-200", icon: UserX },
      bailed: { bg: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: UserCheck }
    }
    const { bg, icon: Icon } = config[statusLower] || config.unknown
    return (
      <Badge className={`${bg} font-medium text-xs border`}>
        <Icon className="h-3 w-3 mr-1" />
        {status?.toUpperCase() || "UNKNOWN"}
      </Badge>
    )
  }

  const handlePrint = () => window.print()

  const exportToCSV = () => {
    const data = {
      "FIR Number": fir?.fir_number,
      "Status": fir?.case_status,
      "Incident Date": formatDate(fir?.incident_date || ""),
      "District": fir?.district_name,
      "Thana": fir?.thana_name,
      "Accused Count": accusedList.length,
      "Bailer Count": bailerList.length
    }
    const csvContent = Object.entries(data)
      .map(([key, value]) => `"${key}","${value || 'N/A'}"`)
      .join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `FIR_${fir?.fir_number}.csv`
    link.click()
    toast.success("CSV exported!")
  }

  // Navigation
  const goToEditFIR = () => router.push(`/fir/${firId}/edit`)
  const goToAddAccused = () => router.push(`/fir/${firId}/accused/add`)
  const goToAddBailer = () => router.push(`/fir/${firId}/bailer/add`)
  const goToAddHearing = () => router.push(`/fir/${firId}/hearing/add`)
  const goToAccusedDetail = (id: number) => router.push(`/accused/${id}`)
  const goBack = () => router.push("/fir/list")

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading FIR Details...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !fir) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <p className="font-semibold text-lg mb-2">
              {error ? "Error Loading FIR" : "FIR Not Found"}
            </p>
            <p className="text-muted-foreground mb-6">{error || "FIR not found"}</p>
            <Button variant="outline" onClick={goBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const tabs = [
    { id: "details", label: "Case Details", icon: FileText },
    { id: "accused", label: `Accused (${accusedList.length})`, icon: Users },
    { id: "bailer", label: `Bailer (${bailerList.length})`, icon: User },
    { id: "hearings", label: `Hearings (${hearingList.length})`, icon: Gavel },
    { id: "io", label: "IO & Lawyer", icon: Scale }
  ]

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold">FIR: {fir.fir_number}</h1>
                {getStatusBadge(fir.case_status)}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Incident: {formatDate(fir.incident_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated: {formatDateTime(fir.updated_at)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button size="sm" onClick={goToEditFIR}>
              <Edit className="h-4 w-4 mr-2" />
              Edit FIR
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Card className="border-2">
          <CardContent className="p-0">
            <div className="flex overflow-x-auto border-b">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        <div className="space-y-6">
          
          {/* ========== DETAILS TAB ========== */}
          {activeTab === "details" && (
            <div className="space-y-6">
              {/* Basic Details */}
              <Card className="border-2">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Basic Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: "FIR Number", value: fir.fir_number },
                      { label: "Status", value: getStatusBadge(fir.case_status), isComponent: true },
                      { label: "Incident Date", value: formatDate(fir.incident_date) },
                      { label: "Incident Time", value: fir.incident_time },
                      { label: "State", value: fir.state_name },
                      { label: "Zone", value: fir.zone_name },
                      { label: "District", value: fir.district_name },
                      { label: "Thana", value: fir.thana_name }
                    ].map((item, i) => (
                      <div key={i}>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        {item.isComponent ? (
                          <div className="mt-1">{item.value}</div>
                        ) : (
                          <p className="font-semibold mt-1">{item.value || "N/A"}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Train Details */}
              <Card className="border-2">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Train className="h-5 w-5 text-primary" />
                    Train & Station Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: "Train Number", value: fir.train_number_manual },
                      { label: "Train Name", value: fir.train_name_manual },
                      { label: "Station Code", value: fir.station_code },
                      { label: "Station Name", value: fir.station_name_manual }
                    ].map((item, i) => (
                      <div key={i}>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="font-semibold mt-1">{item.value || "N/A"}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Crime Details */}
              <Card className="border-2">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    Crime Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Law Sections Applied</p>
                    <p className="font-semibold mt-1">{fir.law_sections_text || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Brief Description</p>
                    <p className="mt-1 whitespace-pre-wrap">{fir.brief_description || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ========== ACCUSED TAB - TABLE FORMAT ========== */}
          {activeTab === "accused" && (
            <Card className="border-2">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Accused Persons ({accusedList.length})
                  </CardTitle>
                  <Button size="sm" onClick={goToAddAccused}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Accused
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {accusedList.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="font-semibold">No accused persons added</p>
                    <p className="text-muted-foreground text-sm mb-4">Add accused details for this FIR</p>
                    <Button variant="outline" onClick={goToAddAccused}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add First Accused
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold">#</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">FATHER'S NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">AGE/GENDER</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">STATUS</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">MOBILE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">AADHAAR</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">ADDRESS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {accusedList.map((accused, index) => (
                          <tr key={accused.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3">{index + 1}</td>
                            <td className="px-4 py-3 font-medium">{accused.name || "Unknown"}</td>
                            <td className="px-4 py-3">{accused.father_name || "-"}</td>
                            <td className="px-4 py-3">
                              {accused.age || "-"} / {accused.gender || "-"}
                            </td>
                            <td className="px-4 py-3">
                              {getAccusedStatusBadge(accused.accused_type || "")}
                            </td>
                            <td className="px-4 py-3">{accused.mobile || "-"}</td>
                            <td className="px-4 py-3">{accused.aadhaar || "-"}</td>
                            <td className="px-4 py-3 max-w-xs">
                              <p className="truncate">{accused.full_address || "-"}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ========== BAILER TAB - TABLE FORMAT ========== */}
          {activeTab === "bailer" && (
            <Card className="border-2">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-5 w-5 text-yellow-600" />
                    Bailer Details ({bailerList.length})
                  </CardTitle>
                  <Button size="sm" onClick={goToAddBailer}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Bailer
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {bailerList.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Shield className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="font-semibold">No bailer details added</p>
                    <p className="text-muted-foreground text-sm mb-4">Add bailer information for this FIR</p>
                    <Button variant="outline" onClick={goToAddBailer}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Bailer
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold">#</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">FATHER'S NAME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">AGE/GENDER</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">MOBILE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">AADHAAR</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">ADDRESS</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">ADDED ON</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {bailerList.map((bailer, index) => (
                          <tr key={bailer.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3">{index + 1}</td>
                            <td className="px-4 py-3 font-medium">{bailer.name || "N/A"}</td>
                            <td className="px-4 py-3">{bailer.father_name || "-"}</td>
                            <td className="px-4 py-3">
                              {bailer.age || "-"} / {bailer.gender || "-"}
                            </td>
                            <td className="px-4 py-3">{bailer.mobile || "-"}</td>
                            <td className="px-4 py-3">{bailer.aadhaar || "-"}</td>
                            <td className="px-4 py-3 max-w-xs">
                              <p className="truncate">{bailer.full_address || "-"}</p>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {formatDate(bailer.created_at || "")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ========== HEARINGS TAB - TABLE FORMAT (Already exists) ========== */}
          {activeTab === "hearings" && (
            <Card className="border-2">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Gavel className="h-5 w-5 text-primary" />
                    Hearing History ({hearingList.length})
                  </CardTitle>
                  <Button size="sm" onClick={goToAddHearing}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Hearing
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {hearingList.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Gavel className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="font-semibold">No hearing records added</p>
                    <p className="text-muted-foreground text-sm mb-4">Add hearing details for this FIR</p>
                    <Button variant="outline" onClick={goToAddHearing}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Hearing
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-bold">S.No.</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">DATE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">TIME</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">COURT</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">PURPOSE</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">STATUS</th>
                          <th className="px-4 py-3 text-left text-xs font-bold">REMARKS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {hearingList.map((hearing, index) => (
                          <tr key={hearing.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3">{index + 1}</td>
                            <td className="px-4 py-3 font-medium">{formatDate(hearing.hearing_date)}</td>
                            <td className="px-4 py-3">{hearing.hearing_time || "-"}</td>
                            <td className="px-4 py-3">{hearing.court_name || "-"}</td>
                            <td className="px-4 py-3">{hearing.purpose || "-"}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">{hearing.status || "Scheduled"}</Badge>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{hearing.remarks || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ========== IO & LAWYER TAB ========== */}
          {activeTab === "io" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* IO Details */}
              <Card className="border-2">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Investigating Officer
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {[
                    { label: "IO Name", value: fir.io_name || "Not Assigned" },
                    { label: "Belt Number", value: fir.io_belt_no },
                    { label: "Rank", value: fir.io_rank },
                    { label: "Mobile", value: fir.io_mobile, isPhone: true }
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      {item.isPhone && item.value ? (
                        <p className="font-semibold mt-1 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {item.value}
                        </p>
                      ) : (
                        <p className="font-semibold mt-1">{item.value || "N/A"}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Lawyer Details */}
              <Card className="border-2">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    Lawyer Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {[
                    { label: "Lawyer Name", value: fir.lawyer_name || "Not Assigned" },
                    { label: "Bar Council Number", value: fir.bar_council_no },
                    { label: "Mobile", value: fir.lawyer_mobile, isPhone: true },
                    { label: "Email", value: fir.lawyer_email }
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      {item.isPhone && item.value ? (
                        <p className="font-semibold mt-1 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {item.value}
                        </p>
                      ) : (
                        <p className="font-semibold mt-1">{item.value || "N/A"}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}