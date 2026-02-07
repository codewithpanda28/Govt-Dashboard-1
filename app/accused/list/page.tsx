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
  Search, Eye, Users, RefreshCw, Phone, AlertCircle,
  ChevronLeft, Filter, UserCheck, UserX, User, HelpCircle,
  Shield, Download, AlertTriangle, History, ChevronDown,
  ChevronUp, Link2, CreditCard
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

interface AccusedWithHistory {
  id: number
  fir_id: number
  name: string
  father_name: string
  age: number | string
  gender: string
  mobile: string
  aadhaar: string
  full_address: string
  accused_type: string
  created_at: string
  fir_number?: string
  district_name?: string
  thana_name?: string
  case_status?: string
  incident_date?: string
  previousCases: PreviousCase[]
  occurrence_count: number
}

export default function AccusedListPage() {
  const router = useRouter()
  const [accusedList, setAccusedList] = useState<AccusedWithHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [expandedRow, setExpandedRow] = useState<number | null>(null)

  useEffect(() => {
    checkAuth()
    loadAccusedList()
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
      // Check in accused_details
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
          previousCases.push({
            fir_id: f.id,
            fir_number: f.fir_number,
            district_name: f.district_name,
            thana_name: f.thana_name,
            case_status: f.case_status,
            incident_date: f.incident_date,
            role: "Accused"
          })
        })
      }

      // Check in bailer_details
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
          if (!previousCases.find(pc => pc.fir_id === f.id)) {
            previousCases.push({
              fir_id: f.id,
              fir_number: f.fir_number,
              district_name: f.district_name,
              thana_name: f.thana_name,
              case_status: f.case_status,
              incident_date: f.incident_date,
              role: "Bailer"
            })
          }
        })
      }
    } catch (err) {
      console.error("Error getting previous cases:", err)
    }

    return previousCases
  }

  const loadAccusedList = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      console.log("📋 Loading accused list with history...")

      // Load all accused
      const { data: accusedData, error: fetchError } = await supabase
        .from("accused_details")
        .select("*")
        .order("created_at", { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
        toast.error("Failed to load accused list")
        return
      }

      // Get FIR details
      const firIds = [...new Set(accusedData?.map(a => a.fir_id) || [])]
      const { data: firData } = await supabase
        .from("fir_records")
        .select("id, fir_number, district_name, thana_name, case_status, incident_date")
        .in("id", firIds)

      const firMap = new Map(firData?.map(f => [f.id, f]) || [])

      // Get previous cases for each accused
      const enrichedData: AccusedWithHistory[] = []
      
      for (const accused of accusedData || []) {
        const fir = firMap.get(accused.fir_id)
        const previousCases = await getPreviousCases(accused.mobile, accused.aadhaar, accused.fir_id)
        
        enrichedData.push({
          ...accused,
          fir_number: fir?.fir_number || `FIR-${accused.fir_id}`,
          district_name: fir?.district_name,
          thana_name: fir?.thana_name,
          case_status: fir?.case_status,
          incident_date: fir?.incident_date,
          previousCases,
          occurrence_count: previousCases.length + 1
        })
      }

      // Sort by occurrence count (repeat offenders first)
      enrichedData.sort((a, b) => b.occurrence_count - a.occurrence_count)

      setAccusedList(enrichedData)
      
      if (isRefresh) {
        toast.success("List refreshed with history!")
      }
      
      console.log("✅ Loaded", enrichedData.length, "accused with history")

    } catch (err: any) {
      setError(err.message)
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadAccusedList(true)
  }

  const filteredList = accusedList.filter(accused => {
    const search = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery || 
      accused.name?.toLowerCase().includes(search) ||
      accused.father_name?.toLowerCase().includes(search) ||
      accused.mobile?.includes(search) ||
      accused.fir_number?.toLowerCase().includes(search) ||
      accused.aadhaar?.includes(search)
    
    const matchesStatus = statusFilter === "all" || 
      accused.accused_type?.toLowerCase() === statusFilter.toLowerCase()
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || "unknown"
    const config: Record<string, { bg: string, icon: any }> = {
      unknown: { bg: "bg-gray-100 text-gray-700 border-gray-200", icon: HelpCircle },
      known: { bg: "bg-blue-100 text-blue-700 border-blue-200", icon: User },
      arrested: { bg: "bg-green-100 text-green-700 border-green-200", icon: Shield },
      absconding: { bg: "bg-red-100 text-red-700 border-red-200", icon: UserX },
      bailed: { bg: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: UserCheck },
    }
    const { bg, icon: Icon } = config[statusLower] || config.unknown
    return (
      <Badge className={`${bg} font-medium text-xs border`}>
        <Icon className="h-3 w-3 mr-1" />
        {status || "Unknown"}
      </Badge>
    )
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

  const getInitials = (name: string) => {
    return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || "?"
  }

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
  }

  const hasActiveFilters = searchQuery || statusFilter !== "all"

  const exportToCSV = () => {
    const headers = ["Name", "Father Name", "Age", "Gender", "Mobile", "Aadhaar", "FIR Number", "Status", "Total Cases"]
    const rows = filteredList.map(a => [
      a.name || "",
      a.father_name || "",
      a.age || "",
      a.gender || "",
      a.mobile || "",
      a.aadhaar || "",
      a.fir_number || "",
      a.accused_type || "",
      a.occurrence_count
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `Accused_List_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    toast.success("CSV exported successfully!")
  }

  const toggleExpandRow = (accusedId: number) => {
    setExpandedRow(expandedRow === accusedId ? null : accusedId)
  }

  // Statistics
  const stats = {
    total: accusedList.length,
    known: accusedList.filter(a => a.accused_type?.toLowerCase() === 'known').length,
    arrested: accusedList.filter(a => a.accused_type?.toLowerCase() === 'arrested').length,
    absconding: accusedList.filter(a => a.accused_type?.toLowerCase() === 'absconding').length,
    bailed: accusedList.filter(a => a.accused_type?.toLowerCase() === 'bailed').length,
    unknown: accusedList.filter(a => !a.accused_type || a.accused_type?.toLowerCase() === 'unknown').length,
    repeatOffenders: accusedList.filter(a => a.occurrence_count > 1).length
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
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Accused Database</h1>
              <p className="text-muted-foreground text-sm">
                Total: {accusedList.length} | Showing: {filteredList.length} records
                {stats.repeatOffenders > 0 && (
                  <span className="text-yellow-700 font-semibold ml-2">
                    • {stats.repeatOffenders} Repeat Offenders
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

        {/* Repeat Offenders Alert */}
        {stats.repeatOffenders > 0 && (
          <Card className="border-2 border-yellow-300 bg-yellow-50">
            <CardContent className="py-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-yellow-800">Repeat Offenders Detected!</p>
                <p className="text-sm text-yellow-700">
                  {stats.repeatOffenders} person(s) appear in multiple cases. Check history column for details.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-primary", icon: Users },
            { label: "Known", value: stats.known, color: "text-blue-600", icon: User },
            { label: "Arrested", value: stats.arrested, color: "text-green-600", icon: Shield },
            { label: "Absconding", value: stats.absconding, color: "text-red-600", icon: UserX },
            { label: "Bailed", value: stats.bailed, color: "text-yellow-600", icon: UserCheck },
            { label: "Unknown", value: stats.unknown, color: "text-gray-600", icon: HelpCircle },
            { label: "Repeat", value: stats.repeatOffenders, color: "text-orange-600", icon: AlertTriangle },
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
                Filters
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, mobile, aadhaar, FIR number..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background min-w-[150px]"
              >
                <option value="all">All Types</option>
                <option value="unknown">Unknown</option>
                <option value="known">Known</option>
                <option value="arrested">Arrested</option>
                <option value="absconding">Absconding</option>
                <option value="bailed">Bailed</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Accused Records with Complete History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center">
                <RefreshCw className="h-10 w-10 animate-spin mx-auto text-primary" />
                <p className="mt-4 text-muted-foreground">Loading accused with history...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-semibold text-lg">No accused found</p>
                <p className="text-muted-foreground mb-6">
                  {accusedList.length === 0 
                    ? "Add accused through FIR registration" 
                    : "Try adjusting your filters"
                  }
                </p>
                {accusedList.length > 0 && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Filters
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
                      <TableHead className="font-bold">STATUS</TableHead>
                      <TableHead className="font-bold">MOBILE</TableHead>
                      <TableHead className="font-bold">AADHAAR</TableHead>
                      <TableHead className="font-bold">FIR NUMBER</TableHead>
                      <TableHead className="font-bold text-center">HISTORY</TableHead>
                      <TableHead className="font-bold text-center">ACTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.map((accused) => {
                      const hasHistory = accused.previousCases && accused.previousCases.length > 0
                      const isExpanded = expandedRow === accused.id

                      return (
                        <>
                          {/* Main Row */}
                          <TableRow 
                            key={accused.id} 
                            className={`hover:bg-muted/50 transition-colors ${hasHistory ? "bg-yellow-50/30" : ""}`}
                          >
                            <TableCell>
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                {getInitials(accused.name)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div>
                                  <p className="font-semibold">{accused.name || "N/A"}</p>
                                  <p className="text-xs text-muted-foreground">S/o {accused.father_name || "N/A"}</p>
                                </div>
                                {hasHistory && (
                                  <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">
                                    {accused.occurrence_count}x
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{accused.age || "-"} yrs</p>
                                <p className="text-xs text-muted-foreground">{accused.gender || "-"}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(accused.accused_type)}</TableCell>
                            <TableCell>
                              {accused.mobile ? (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-green-600" />
                                  <span className="text-sm">{accused.mobile}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {accused.aadhaar ? (
                                <div className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3 text-blue-600" />
                                  <span className="text-xs font-mono">{accused.aadhaar}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-mono text-xs font-semibold">{accused.fir_number}</p>
                                <p className="text-[10px] text-muted-foreground">{accused.thana_name}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {hasHistory ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => toggleExpandRow(accused.id)}
                                  className="h-8 px-2"
                                >
                                  <History className="h-3 w-3 mr-1 text-yellow-600" />
                                  <span className="text-xs">{accused.previousCases.length}</span>
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
                                onClick={() => router.push(`/fir/${accused.fir_id}`)}
                                className="h-8"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View FIR
                              </Button>
                            </TableCell>
                          </TableRow>

                          {/* Expanded History Row */}
                          {isExpanded && hasHistory && (
                            <TableRow key={`${accused.id}-history`} className="bg-yellow-50 border-l-4 border-yellow-400">
                              <TableCell colSpan={9} className="p-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2 mb-3">
                                    <History className="h-5 w-5 text-yellow-700" />
                                    <h3 className="font-bold text-yellow-900">
                                      Criminal History ({accused.previousCases.length} previous case{accused.previousCases.length > 1 ? 's' : ''})
                                    </h3>
                                  </div>
                                  
                                  <div className="grid gap-3">
                                    {accused.previousCases.map((prevCase, idx) => (
                                      <Card key={idx} className="border-2 border-yellow-200 bg-white">
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
                                                  <Badge variant="outline" className="text-[10px]">
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

                                  <div className="mt-3 p-3 bg-yellow-100 rounded-lg border border-yellow-300">
                                    <p className="text-xs text-yellow-900">
                                      <AlertTriangle className="h-3 w-3 inline mr-1" />
                                      <strong>Repeat Offender Alert:</strong> This person has appeared in {accused.occurrence_count} total case(s). 
                                      Matched by {accused.mobile ? 'Mobile' : ''}{accused.mobile && accused.aadhaar ? ' and ' : ''}{accused.aadhaar ? 'Aadhaar' : ''}.
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
      </div>
    </div>
  )
}