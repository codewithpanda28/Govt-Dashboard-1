"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Search, Eye, Shield, RefreshCw, Phone, AlertCircle, MapPin,
  ChevronLeft, Filter, Download, Calendar, Users, History,
  ChevronDown, ChevronUp, Link2, CreditCard, AlertTriangle,
  UserX
} from "lucide-react"
import { toast } from "sonner"

interface PreviousCase {
  fir_id: number
  fir_number: string
  district_name: string
  thana_name: string
  case_status: string
  incident_date: string
  role: string
}

interface BailerWithHistory {
  id: number
  fir_id: number
  name: string
  father_name: string
  age: number | string
  gender: string
  mobile: string
  aadhaar: string
  full_address: string
  created_at: string
  fir_number?: string
  district_name?: string
  thana_name?: string
  case_status?: string
  incident_date?: string
  previousCases: PreviousCase[]
  occurrence_count: number
}

export default function BailListPage() {
  const router = useRouter()
  const [bailerList, setBailerList] = useState<BailerWithHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  useEffect(() => {
    checkAuth()
    loadBailerList()
  }, [])

  // Check for updates from edit page
  useEffect(() => {
    const checkForEditUpdate = () => {
      const updateData = localStorage.getItem('fir_updated')
      if (updateData) {
        localStorage.removeItem('fir_updated')
        loadBailerList(true)
      }
    }

    checkForEditUpdate()

    const handleFocus = () => checkForEditUpdate()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Check on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const updateData = localStorage.getItem('fir_updated')
        if (updateData) {
          localStorage.removeItem('fir_updated')
          loadBailerList(true)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  // Get Previous Cases for a person
  const getPreviousCases = async (
    mobile: string | null, 
    aadhaar: string | null, 
    currentFirId: number
  ): Promise<PreviousCase[]> => {
    const previousCases: PreviousCase[] = []

    if (!mobile && !aadhaar) return previousCases

    try {
      // Check in bailer_details (previous bailer cases)
      let bailerQuery = supabase
        .from("bailer_details")
        .select("fir_id")
        .neq("fir_id", currentFirId)

      if (mobile && aadhaar) {
        bailerQuery = bailerQuery.or(`mobile.eq.${mobile},aadhaar.eq.${aadhaar}`)
      } else if (mobile) {
        bailerQuery = bailerQuery.eq("mobile", mobile)
      } else if (aadhaar) {
        bailerQuery = bailerQuery.eq("aadhaar", aadhaar)
      }

      const { data: bailerRecords } = await bailerQuery

      if (bailerRecords && bailerRecords.length > 0) {
        const firIds = [...new Set(bailerRecords.map(b => b.fir_id))]
        const { data: firs } = await supabase
          .from("fir_records")
          .select("id, fir_number, district_name, thana_name, case_status, incident_date")
          .in("id", firIds)

        firs?.forEach(f => {
          previousCases.push({
            fir_id: f.id,
            fir_number: f.fir_number,
            district_name: f.district_name,
            thana_name: f.thana_name,
            case_status: f.case_status,
            incident_date: f.incident_date,
            role: "Bailer"
          })
        })
      }

      // Check in accused_details (if this person was accused before)
      let accusedQuery = supabase
        .from("accused_details")
        .select("fir_id")
        .neq("fir_id", currentFirId)

      if (mobile && aadhaar) {
        accusedQuery = accusedQuery.or(`mobile.eq.${mobile},aadhaar.eq.${aadhaar}`)
      } else if (mobile) {
        accusedQuery = accusedQuery.eq("mobile", mobile)
      } else if (aadhaar) {
        accusedQuery = accusedQuery.eq("aadhaar", aadhaar)
      }

      const { data: accusedRecords } = await accusedQuery

      if (accusedRecords && accusedRecords.length > 0) {
        const firIds = [...new Set(accusedRecords.map(a => a.fir_id))]
        const { data: firs } = await supabase
          .from("fir_records")
          .select("id, fir_number, district_name, thana_name, case_status, incident_date")
          .in("id", firIds)

        firs?.forEach(f => {
          if (!previousCases.find(pc => pc.fir_id === f.id)) {
            previousCases.push({
              fir_id: f.id,
              fir_number: f.fir_number,
              district_name: f.district_name,
              thana_name: f.thana_name,
              case_status: f.case_status,
              incident_date: f.incident_date,
              role: "Accused"
            })
          }
        })
      }
    } catch (err) {
      console.error("Error getting previous cases:", err)
    }

    return previousCases
  }

  const loadBailerList = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      console.log("📋 Loading bailer list with history...")

      // Load all bailers
      const { data: bailerData, error: fetchError } = await supabase
        .from("bailer_details")
        .select("*")
        .order("created_at", { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
        toast.error("Failed to load bailer list")
        return
      }

      // Get FIR details
      const firIds = [...new Set(bailerData?.map(b => b.fir_id) || [])]
      const { data: firData } = await supabase
        .from("fir_records")
        .select("id, fir_number, district_name, thana_name, case_status, incident_date")
        .in("id", firIds)

      const firMap = new Map(firData?.map(f => [f.id, f]) || [])

      // Get previous cases for each bailer
      const enrichedData: BailerWithHistory[] = []
      
      for (const bailer of bailerData || []) {
        const fir = firMap.get(bailer.fir_id)
        const previousCases = await getPreviousCases(bailer.mobile, bailer.aadhaar, bailer.fir_id)
        
        enrichedData.push({
          ...bailer,
          fir_number: fir?.fir_number || `FIR-${bailer.fir_id}`,
          district_name: fir?.district_name,
          thana_name: fir?.thana_name,
          case_status: fir?.case_status,
          incident_date: fir?.incident_date,
          previousCases,
          occurrence_count: previousCases.length + 1
        })
      }

      // Sort by occurrence count (repeat bailers/criminals first)
      enrichedData.sort((a, b) => b.occurrence_count - a.occurrence_count)

      setBailerList(enrichedData)
      
      if (isRefresh) {
        toast.success("List refreshed with history!")
      }
      
      console.log("✅ Loaded", enrichedData.length, "bailers with history")

    } catch (err: any) {
      setError(err.message)
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadBailerList(true)
  }

  const filteredList = bailerList.filter(bailer => {
    const search = searchQuery.toLowerCase()
    return !searchQuery || 
      bailer.name?.toLowerCase().includes(search) ||
      bailer.father_name?.toLowerCase().includes(search) ||
      bailer.mobile?.includes(search) ||
      bailer.fir_number?.toLowerCase().includes(search) ||
      bailer.aadhaar?.includes(search) ||
      bailer.full_address?.toLowerCase().includes(search)
  })

  const getInitials = (name: string) => {
    return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || "?"
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-"
    try {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
      })
    } catch {
      return dateStr
    }
  }

  const getCaseStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "open"
    const config: Record<string, { bg: string; text: string; label: string }> = {
      open: { bg: "bg-orange-100", text: "text-orange-700", label: "Open" },
      closed: { bg: "bg-gray-100", text: "text-gray-700", label: "Closed" },
      under_investigation: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Investigating" },
      in_court: { bg: "bg-indigo-100", text: "text-indigo-700", label: "In Court" },
      disposed: { bg: "bg-green-100", text: "text-green-700", label: "Disposed" },
    }
    const { bg, text, label } = config[s] || config.open
    return <Badge className={`${bg} ${text} text-[10px]`}>{label}</Badge>
  }

  const toggleExpandRow = (bailerId: number) => {
    setExpandedRow(expandedRow === bailerId ? null : bailerId)
  }

  const clearFilters = () => {
    setSearchQuery("")
  }

  const hasActiveFilters = searchQuery.length > 0

  const exportToCSV = () => {
    const headers = ["Name", "Father Name", "Age", "Gender", "Mobile", "Aadhaar", "Address", "FIR Number", "Total Cases", "Date"]
    const rows = filteredList.map(b => [
      b.name || "",
      b.father_name || "",
      b.age || "",
      b.gender || "",
      b.mobile || "",
      b.aadhaar || "",
      b.full_address || "",
      b.fir_number || "",
      b.occurrence_count,
      formatDate(b.created_at)
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `Bailer_List_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    toast.success("CSV exported successfully!")
  }

  // Statistics
  const stats = {
    total: bailerList.length,
    withMobile: bailerList.filter(b => b.mobile).length,
    withAddress: bailerList.filter(b => b.full_address).length,
    withAadhaar: bailerList.filter(b => b.aadhaar).length,
    repeatBailers: bailerList.filter(b => b.occurrence_count > 1).length,
    wasAccused: bailerList.filter(b => b.previousCases.some(pc => pc.role === "Accused")).length
  }

  return (
    <div className="min-h-screen bg-background p-4 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Shield className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Bailer Database</h1>
              <p className="text-muted-foreground text-sm">
                Total: {bailerList.length} | Showing: {filteredList.length} records
                {stats.repeatBailers > 0 && (
                  <span className="text-yellow-700 font-semibold ml-2">
                    • {stats.repeatBailers} Repeat Bailers
                  </span>
                )}
                {stats.wasAccused > 0 && (
                  <span className="text-red-700 font-semibold ml-2">
                    • {stats.wasAccused} Were Accused
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredList.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="border-2 border-red-200 bg-red-50">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <span className="text-red-700 text-sm flex-1">{error}</span>
              <Button size="sm" variant="outline" onClick={handleRefresh}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Suspicious Bailer Alert */}
        {stats.wasAccused > 0 && (
          <Card className="border-2 border-red-300 bg-red-50">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-800">⚠️ Suspicious Bailers Detected!</p>
                <p className="text-sm text-red-700">
                  {stats.wasAccused} bailer(s) have previous criminal history as accused. Check history carefully!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Repeat Bailers Alert */}
        {stats.repeatBailers > 0 && (
          <Card className="border-2 border-yellow-300 bg-yellow-50">
            <CardContent className="py-4 flex items-center gap-3">
              <History className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800">Repeat Bailers Found!</p>
                <p className="text-sm text-yellow-700">
                  {stats.repeatBailers} person(s) appear in multiple cases. Check history column for details.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-yellow-600", icon: Shield },
            { label: "With Mobile", value: stats.withMobile, color: "text-green-600", icon: Phone },
            { label: "With Address", value: stats.withAddress, color: "text-blue-600", icon: MapPin },
            { label: "With Aadhaar", value: stats.withAadhaar, color: "text-purple-600", icon: CreditCard },
            { label: "Repeat", value: stats.repeatBailers, color: "text-orange-600", icon: History },
            { label: "Ex-Accused", value: stats.wasAccused, color: "text-red-600", icon: UserX },
          ].map((stat, i) => (
            <Card key={i} className="border-2">
              <CardContent className="py-4 text-center">
                <stat.icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                Search
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, mobile, aadhaar, FIR number, address..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-600" />
              Bailer Records with Complete History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center">
                <RefreshCw className="h-10 w-10 animate-spin mx-auto text-yellow-600" />
                <p className="mt-4 text-muted-foreground">Loading bailers with history...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 text-center">
                <Shield className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-semibold text-lg">No bailers found</p>
                <p className="text-muted-foreground mb-6">
                  {bailerList.length === 0 
                    ? "Add bailers through FIR registration" 
                    : "Try adjusting your search"
                  }
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold w-12"></TableHead>
                      <TableHead className="font-bold">NAME</TableHead>
                      <TableHead className="font-bold">AGE / GENDER</TableHead>
                      <TableHead className="font-bold">MOBILE</TableHead>
                      <TableHead className="font-bold">AADHAAR</TableHead>
                      <TableHead className="font-bold">FIR NUMBER</TableHead>
                      <TableHead className="font-bold text-center">HISTORY</TableHead>
                      <TableHead className="font-bold text-center">ACTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.map((bailer) => {
                      const hasHistory = bailer.previousCases && bailer.previousCases.length > 0
                      const wasAccused = bailer.previousCases.some(pc => pc.role === "Accused")
                      const isExpanded = expandedRow === bailer.id

                      return (
                        <>
                          {/* Main Row */}
                          <TableRow 
                            key={bailer.id} 
                            className={`hover:bg-muted/50 transition-colors ${
                              wasAccused ? "bg-red-50/50" : hasHistory ? "bg-yellow-50/30" : ""
                            }`}
                          >
                            <TableCell>
                              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm ${
                                wasAccused 
                                  ? "bg-red-100 text-red-700" 
                                  : "bg-yellow-100 text-yellow-700"
                              }`}>
                                {getInitials(bailer.name)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-semibold flex items-center gap-2">
                                    {bailer.name || "N/A"}
                                    {wasAccused && (
                                      <Badge className="bg-red-100 text-red-700 text-[10px]">
                                        Ex-Accused
                                      </Badge>
                                    )}
                                  </p>
                                  <p className="text-xs text-muted-foreground">S/o {bailer.father_name || "N/A"}</p>
                                </div>
                                {hasHistory && (
                                  <Badge className={`text-[10px] ${
                                    wasAccused 
                                      ? "bg-red-100 text-red-700" 
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}>
                                    {bailer.occurrence_count}x
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{bailer.age || "-"} yrs</p>
                                <p className="text-xs text-muted-foreground">{bailer.gender || "-"}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {bailer.mobile ? (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-green-600" />
                                  <span className="text-sm">{bailer.mobile}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {bailer.aadhaar ? (
                                <div className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3 text-blue-600" />
                                  <span className="text-xs font-mono">{bailer.aadhaar}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-mono text-xs font-semibold">{bailer.fir_number}</p>
                                <p className="text-[10px] text-muted-foreground">{bailer.thana_name}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {hasHistory ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleExpandRow(bailer.id)}
                                  className={`h-8 px-2 ${
                                    wasAccused 
                                      ? "border-red-300 hover:bg-red-50" 
                                      : "border-yellow-300 hover:bg-yellow-50"
                                  }`}
                                >
                                  <History className={`h-3 w-3 mr-1 ${
                                    wasAccused ? "text-red-600" : "text-yellow-600"
                                  }`} />
                                  <span className="text-xs">{bailer.previousCases.length}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="h-3 w-3 ml-1" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3 ml-1" />
                                  )}
                                </Button>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  No History
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/fir/${bailer.fir_id}`)}
                                className="h-8"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View FIR
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded History Row */}
                          {isExpanded && hasHistory && (
                            <TableRow 
                              key={`${bailer.id}-history`} 
                              className={`border-l-4 ${
                                wasAccused 
                                  ? "bg-red-50 border-red-400" 
                                  : "bg-yellow-50 border-yellow-400"
                              }`}
                            >
                              <TableCell colSpan={8} className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 mb-3">
                                    <History className={`h-5 w-5 ${
                                      wasAccused ? "text-red-700" : "text-yellow-700"
                                    }`} />
                                    <h3 className={`font-bold ${
                                      wasAccused ? "text-red-900" : "text-yellow-900"
                                    }`}>
                                      Complete History ({bailer.previousCases.length} previous case{bailer.previousCases.length > 1 ? 's' : ''})
                                    </h3>
                                    {wasAccused && (
                                      <Badge className="bg-red-600 text-white text-xs">
                                        <AlertTriangle className="h-3 w-3 mr-1" />
                                        Criminal Background
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="grid gap-3">
                                    {bailer.previousCases.map((prevCase, idx) => (
                                      <Card 
                                        key={idx} 
                                        className={`border-2 ${
                                          prevCase.role === "Accused"
                                            ? "border-red-200 bg-white"
                                            : "border-yellow-200 bg-white"
                                        }`}
                                      >
                                        <CardContent className="p-4">
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                                              <div>
                                                <p className="text-xs text-muted-foreground mb-1">FIR Number</p>
                                                <p className="font-mono font-bold text-sm">{prevCase.fir_number}</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-muted-foreground mb-1">Location</p>
                                                <p className="text-sm font-medium">{prevCase.thana_name}</p>
                                                <p className="text-xs text-muted-foreground">{prevCase.district_name}</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-muted-foreground mb-1">Incident Date</p>
                                                <p className="text-sm font-medium">{formatDate(prevCase.incident_date)}</p>
                                              </div>
                                              <div>
                                                <p className="text-xs text-muted-foreground mb-1">Role & Status</p>
                                                <div className="flex gap-1 flex-wrap">
                                                  <Badge 
                                                    className={`text-[10px] ${
                                                      prevCase.role === "Accused"
                                                        ? "bg-red-100 text-red-700 border-red-300"
                                                        : "bg-yellow-100 text-yellow-700 border-yellow-300"
                                                    } border`}
                                                  >
                                                    {prevCase.role === "Accused" ? "🚨 " : "🛡️ "}
                                                    {prevCase.role}
                                                  </Badge>
                                                  {getCaseStatusBadge(prevCase.case_status)}
                                                </div>
                                              </div>
                                            </div>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => router.push(`/fir/${prevCase.fir_id}`)}
                                              className="whitespace-nowrap"
                                            >
                                              <Link2 className="h-3 w-3 mr-1" />
                                              View Case
                                            </Button>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>

                                  <div className={`mt-3 p-3 rounded-lg border ${
                                    wasAccused 
                                      ? "bg-red-100 border-red-300" 
                                      : "bg-yellow-100 border-yellow-300"
                                  }`}>
                                    <p className={`text-xs ${
                                      wasAccused ? "text-red-900" : "text-yellow-900"
                                    }`}>
                                      {wasAccused ? (
                                        <>
                                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                                          <strong>⚠️ High Risk Alert:</strong> This bailer has previous criminal record as ACCUSED. 
                                          Appeared in {bailer.occurrence_count} total case(s). 
                                          Matched by {bailer.mobile ? 'Mobile' : ''}{bailer.mobile && bailer.aadhaar ? ' and ' : ''}{bailer.aadhaar ? 'Aadhaar' : ''}.
                                        </>
                                      ) : (
                                        <>
                                          <History className="h-3 w-3 inline mr-1" />
                                          <strong>Repeat Bailer:</strong> This person has appeared as bailer in {bailer.occurrence_count} total case(s). 
                                          Matched by {bailer.mobile ? 'Mobile' : ''}{bailer.mobile && bailer.aadhaar ? ' and ' : ''}{bailer.aadhaar ? 'Aadhaar' : ''}.
                                        </>
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Count */}
        {!loading && filteredList.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {filteredList.length} of {bailerList.length} bailer{bailerList.length !== 1 ? "s" : ""}
            {hasActiveFilters && " (filtered)"}
          </p>
        )}
      </div>
    </div>
  )
}