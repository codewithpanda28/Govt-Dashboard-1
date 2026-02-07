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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, Eye, Edit, MoreHorizontal, FileText, Plus, 
  RefreshCw, AlertCircle, Download, ChevronLeft, 
  User, Users, AlertTriangle, Phone,
  ChevronDown, ChevronUp, History, Link2, X
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

interface FIR {
  id: number
  fir_number: string
  case_status: string
  accused_type: string
  state_name: string
  zone_name: string
  district_name: string
  thana_name: string
  incident_date: string
  created_at: string
  accused_count?: number
  bailer_count?: number
}

interface PreviousCase {
  fir_id: number
  fir_number: string
  district_name: string
  thana_name: string
  case_status: string
  incident_date: string
  role: string
}

interface PersonWithHistory {
  id: number
  fir_id: number
  name: string
  father_name: string | null
  age: number | string | null
  gender: string | null
  mobile: string | null
  email: string | null
  aadhaar: string | null
  pan: string | null
  state_name: string | null
  district_name: string | null
  full_address: string | null
  pin_code: string | null
  accused_type?: string | null
  accused_id?: number | null
  accused_name?: string | null
  fir_number?: string
  fir_district?: string
  fir_thana?: string
  fir_status?: string
  fir_date?: string
  previousCases: PreviousCase[]
  occurrence_count: number
}

// Modal Component
const Modal = ({ isOpen, onClose, title, subtitle, children }: any) => {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-xl">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {children}
        </div>
      </div>
    </div>
  )
}

export default function FIRListPage() {
  const router = useRouter()
  const [firList, setFirList] = useState<FIR[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Modal States
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<"accused" | "bailer" | "all-accused" | "all-bailer">("accused")
  const [modalData, setModalData] = useState<PersonWithHistory[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [selectedFirNumber, setSelectedFirNumber] = useState("")

  // Expanded History States
  const [expandedPerson, setExpandedPerson] = useState<number | null>(null)

  useEffect(() => {
    checkAuth()
    loadFIRList()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  const loadFIRList = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const { data: firData, error: fetchError } = await supabase
        .from("fir_records")
        .select("*")
        .order("created_at", { ascending: false })

      if (fetchError) {
        console.error("FIR fetch error:", fetchError)
        setError(fetchError.message)
        toast.error("Failed to load FIRs")
        return
      }

      const { data: accusedCounts } = await supabase
        .from("accused_details")
        .select("fir_id")

      const { data: bailerCounts } = await supabase
        .from("bailer_details")
        .select("fir_id")

      const accusedCountMap: Record<number, number> = {}
      const bailerCountMap: Record<number, number> = {}

      accusedCounts?.forEach(a => {
        accusedCountMap[a.fir_id] = (accusedCountMap[a.fir_id] || 0) + 1
      })

      bailerCounts?.forEach(b => {
        bailerCountMap[b.fir_id] = (bailerCountMap[b.fir_id] || 0) + 1
      })

      const enrichedData = (firData || []).map(fir => ({
        ...fir,
        accused_count: accusedCountMap[fir.id] || 0,
        bailer_count: bailerCountMap[fir.id] || 0
      }))

      setFirList(enrichedData)
      if (isRefresh) {
        toast.success("Refreshed!")
      }
    } catch (err: any) {
      console.error("Error:", err)
      setError(err.message)
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
      setRefreshing(false)
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
        const firIds = Array.from(new Set(accusedRecords.map(a => a.fir_id)))
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
        const firIds = Array.from(new Set(bailerRecords.map(b => b.fir_id)))
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

  // Fetch Accused Details for specific FIR with history
  const fetchAccusedDetails = async (firId: number, firNumber: string) => {
    try {
      setModalLoading(true)
      setModalType("accused")
      setSelectedFirNumber(firNumber)
      setShowModal(true)
      setExpandedPerson(null)

      const { data, error } = await supabase
        .from("accused_details")
        .select("*")
        .eq("fir_id", firId)
        .order("name")

      if (error) {
        console.error("Accused fetch error:", error)
        toast.error("Failed to load accused details")
        return
      }

      const fir = firList.find(f => f.id === firId)

      const enrichedData: PersonWithHistory[] = []
      
      for (const person of data || []) {
        const previousCases = await getPreviousCases(person.mobile, person.aadhaar, firId)
        enrichedData.push({
          ...person,
          fir_number: firNumber,
          fir_district: fir?.district_name,
          fir_thana: fir?.thana_name,
          fir_status: fir?.case_status,
          fir_date: fir?.incident_date,
          previousCases,
          occurrence_count: previousCases.length + 1
        })
      }

      setModalData(enrichedData)
    } catch (err: any) {
      console.error("Error:", err)
      toast.error("Something went wrong")
    } finally {
      setModalLoading(false)
    }
  }

  // Fetch Bailer Details for specific FIR with history
  const fetchBailerDetails = async (firId: number, firNumber: string) => {
    try {
      setModalLoading(true)
      setModalType("bailer")
      setSelectedFirNumber(firNumber)
      setShowModal(true)
      setExpandedPerson(null)

      const { data, error } = await supabase
        .from("bailer_details")
        .select("*")
        .eq("fir_id", firId)
        .order("name")

      if (error) {
        console.error("Bailer fetch error:", error)
        toast.error("Failed to load bailer details")
        return
      }

      const { data: accusedData } = await supabase
        .from("accused_details")
        .select("id, name")
        .eq("fir_id", firId)

      const accusedMap = new Map(accusedData?.map(a => [a.id, a.name]) || [])

      const fir = firList.find(f => f.id === firId)

      const enrichedData: PersonWithHistory[] = []
      
      for (const person of data || []) {
        const previousCases = await getPreviousCases(person.mobile, person.aadhaar, firId)
        enrichedData.push({
          ...person,
          accused_name: person.accused_id ? accusedMap.get(person.accused_id) || person.accused_name : person.accused_name,
          fir_number: firNumber,
          fir_district: fir?.district_name,
          fir_thana: fir?.thana_name,
          fir_status: fir?.case_status,
          fir_date: fir?.incident_date,
          previousCases,
          occurrence_count: previousCases.length + 1
        })
      }

      setModalData(enrichedData)
    } catch (err: any) {
      console.error("Error:", err)
      toast.error("Something went wrong")
    } finally {
      setModalLoading(false)
    }
  }

  // Fetch ALL Accused with history
  const fetchAllAccusedWithHistory = async () => {
    try {
      setModalLoading(true)
      setModalType("all-accused")
      setSelectedFirNumber("All FIRs")
      setShowModal(true)
      setExpandedPerson(null)

      const { data: accusedData, error } = await supabase
        .from("accused_details")
        .select("*")
        .order("name")

      if (error) {
        console.error("Accused fetch error:", error)
        toast.error("Failed to load accused details")
        return
      }

      const firMap = new Map(firList.map(f => [f.id, f]))

      const enrichedData: PersonWithHistory[] = []
      
      for (const person of accusedData || []) {
        const fir = firMap.get(person.fir_id)
        const previousCases = await getPreviousCases(person.mobile, person.aadhaar, person.fir_id)
        enrichedData.push({
          ...person,
          fir_number: fir?.fir_number,
          fir_district: fir?.district_name,
          fir_thana: fir?.thana_name,
          fir_status: fir?.case_status,
          fir_date: fir?.incident_date,
          previousCases,
          occurrence_count: previousCases.length + 1
        })
      }

      enrichedData.sort((a, b) => b.occurrence_count - a.occurrence_count)

      setModalData(enrichedData)
    } catch (err: any) {
      console.error("Error:", err)
      toast.error("Something went wrong")
    } finally {
      setModalLoading(false)
    }
  }

  // Fetch ALL Bailers with history
  const fetchAllBailersWithHistory = async () => {
    try {
      setModalLoading(true)
      setModalType("all-bailer")
      setSelectedFirNumber("All FIRs")
      setShowModal(true)
      setExpandedPerson(null)

      const { data: bailerData, error } = await supabase
        .from("bailer_details")
        .select("*")
        .order("name")

      if (error) {
        console.error("Bailer fetch error:", error)
        toast.error("Failed to load bailer details")
        return
      }

      const firMap = new Map(firList.map(f => [f.id, f]))

      const { data: allAccused } = await supabase
        .from("accused_details")
        .select("id, name, fir_id")

      const accusedMap = new Map(allAccused?.map(a => [a.id, a.name]) || [])

      const enrichedData: PersonWithHistory[] = []
      
      for (const person of bailerData || []) {
        const fir = firMap.get(person.fir_id)
        const previousCases = await getPreviousCases(person.mobile, person.aadhaar, person.fir_id)
        enrichedData.push({
          ...person,
          accused_name: person.accused_id ? accusedMap.get(person.accused_id) || person.accused_name : person.accused_name,
          fir_number: fir?.fir_number,
          fir_district: fir?.district_name,
          fir_thana: fir?.thana_name,
          fir_status: fir?.case_status,
          fir_date: fir?.incident_date,
          previousCases,
          occurrence_count: previousCases.length + 1
        })
      }

      enrichedData.sort((a, b) => b.occurrence_count - a.occurrence_count)

      setModalData(enrichedData)
    } catch (err: any) {
      console.error("Error:", err)
      toast.error("Something went wrong")
    } finally {
      setModalLoading(false)
    }
  }

  const handleRefresh = () => {
    loadFIRList(true)
  }

  const filteredList = firList.filter(fir => {
    const search = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery || 
      fir.fir_number?.toLowerCase().includes(search) ||
      fir.state_name?.toLowerCase().includes(search) ||
      fir.district_name?.toLowerCase().includes(search)
    
    const matchesStatus = statusFilter === "all" || 
      fir.case_status?.toLowerCase() === statusFilter.toLowerCase()
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || "open"
    const config: Record<string, { bg: string; text: string; label: string }> = {
      open: { bg: "bg-orange-100", text: "text-orange-700", label: "Open" },
      closed: { bg: "bg-gray-100", text: "text-gray-700", label: "Closed" },
      under_investigation: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Investigating" },
      in_court: { bg: "bg-indigo-100", text: "text-indigo-700", label: "In Court" },
      disposed: { bg: "bg-green-100", text: "text-green-700", label: "Disposed" },
      chargesheet_filed: { bg: "bg-purple-100", text: "text-purple-700", label: "Chargesheet" }
    }
    const { bg, text, label } = config[s] || config.open
    return <Badge className={`${bg} ${text} text-[10px] px-1.5 py-0`}>{label}</Badge>
  }

  const getAccusedTypeBadge = (type: string | null | undefined) => {
    const t = type?.toLowerCase() || "unknown"
    const config: Record<string, { bg: string; text: string; label: string }> = {
      unknown: { bg: "bg-gray-100", text: "text-gray-700", label: "UNKNOWN" },
      known: { bg: "bg-blue-100", text: "text-blue-700", label: "KNOWN" },
      arrested: { bg: "bg-red-100", text: "text-red-700", label: "ARRESTED" },
      absconding: { bg: "bg-orange-100", text: "text-orange-700", label: "ABSCONDING" },
      bailed: { bg: "bg-green-100", text: "text-green-700", label: "BAILED" }
    }
    const { bg, text, label } = config[t] || config.unknown
    return <Badge className={`${bg} ${text} text-[10px] border`}>{label}</Badge>
  }

  const formatDate = (date: string) => {
    if (!date) return "-"
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric"
      })
    } catch {
      return date
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
  }

  const exportToCSV = () => {
    const headers = ["Sl", "FIR No.", "State", "District", "Accused", "Bailer", "Date", "Status"]
    const rows = filteredList.map((fir, idx) => [
      idx + 1,
      fir.fir_number,
      fir.state_name || "",
      fir.district_name || "",
      fir.accused_count || 0,
      fir.bailer_count || 0,
      formatDate(fir.incident_date),
      fir.case_status
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `FIR_List_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    toast.success("Exported!")
  }

  const stats = {
    total: firList.length,
    open: firList.filter(f => f.case_status?.toLowerCase() === "open").length,
    closed: firList.filter(f => f.case_status?.toLowerCase() === "closed").length,
  }

  const repeatOffendersCount = modalData.filter(p => p.occurrence_count > 1).length

  return (
    <div className="min-h-screen bg-gray-50 p-2 lg:p-4">
      <div className="max-w-7xl mx-auto space-y-3">
        
        {/* Header */}
        <div className="bg-white border rounded p-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-bold text-gray-800">FIR List</h1>
                <p className="text-xs text-gray-500">
                  Total: {stats.total} | Open: {stats.open} | Closed: {stats.closed}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAllAccusedWithHistory} 
                className="h-8 text-xs bg-red-50 hover:bg-red-100 border-red-300 text-red-700"
              >
                <User className="h-3 w-3 mr-1" />
                All Accused
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAllBailersWithHistory} 
                className="h-8 text-xs bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
              >
                <Users className="h-3 w-3 mr-1" />
                All Bailers
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-8 text-xs">
                <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredList.length === 0} className="h-8 text-xs">
                <Download className="h-3 w-3 mr-1" />
                Export
              </Button>
              <Button size="sm" asChild className="h-8 text-xs">
                <Link href="/fir/add">
                  <Plus className="h-3 w-3 mr-1" /> Add FIR
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-2 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-700 text-xs flex-1">{error}</span>
            <Button size="sm" variant="outline" onClick={handleRefresh} className="h-6 text-xs">
              Retry
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border rounded p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search FIR number, state, district..."
                className="pl-8 h-8 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 px-2 text-xs border rounded bg-white"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="under_investigation">Under Investigation</option>
              <option value="in_court">In Court</option>
              <option value="disposed">Disposed</option>
            </select>
            {(searchQuery || statusFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border rounded">
          <div className="border-b bg-gray-50 px-3 py-2">
            <h2 className="text-sm font-semibold text-gray-700">FIR Records ({filteredList.length})</h2>
          </div>
          
          {loading ? (
            <div className="py-12 text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-3 text-xs text-gray-500">Loading...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-sm text-gray-600">No FIRs found</p>
              <p className="text-xs text-gray-400 mb-4">
                {firList.length === 0 ? "Add your first FIR" : "Adjust filters"}
              </p>
              {firList.length === 0 ? (
                <Button size="sm" asChild className="text-xs">
                  <Link href="/fir/add"><Plus className="h-3 w-3 mr-1" /> Add FIR</Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3 w-12">Sl</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3">FIR No.</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3">State</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3">Dist</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3 text-center">No. of Accused</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3 text-center">No. of Bailer</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3">Date of FIR</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3">Status</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.map((fir, index) => (
                    <TableRow key={fir.id} className="hover:bg-gray-50 border-b">
                      <TableCell className="text-xs py-2 px-3 text-gray-600">{index + 1}</TableCell>
                      <TableCell 
                        className="text-xs py-2 px-3 font-medium text-blue-600 cursor-pointer hover:underline"
                        onClick={() => router.push(`/fir/${fir.id}`)}
                      >
                        {fir.fir_number}
                      </TableCell>
                      <TableCell className="text-xs py-2 px-3 text-gray-600">{fir.state_name || "-"}</TableCell>
                      <TableCell className="text-xs py-2 px-3 text-gray-600">{fir.district_name || "-"}</TableCell>
                      
                      <TableCell className="text-xs py-2 px-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            if ((fir.accused_count || 0) > 0) {
                              fetchAccusedDetails(fir.id, fir.fir_number)
                            }
                          }}
                          disabled={(fir.accused_count || 0) === 0}
                          className={`h-7 px-2 text-xs ${
                            (fir.accused_count || 0) > 0 
                              ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100" 
                              : ""
                          }`}
                        >
                          <User className="h-3 w-3 mr-1" />
                          {fir.accused_count || 0}
                        </Button>
                      </TableCell>
                      
                      <TableCell className="text-xs py-2 px-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            if ((fir.bailer_count || 0) > 0) {
                              fetchBailerDetails(fir.id, fir.fir_number)
                            }
                          }}
                          disabled={(fir.bailer_count || 0) === 0}
                          className={`h-7 px-2 text-xs ${
                            (fir.bailer_count || 0) > 0 
                              ? "bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100" 
                              : ""
                          }`}
                        >
                          <Users className="h-3 w-3 mr-1" />
                          {fir.bailer_count || 0}
                        </Button>
                      </TableCell>
                      
                      <TableCell className="text-xs py-2 px-3 text-gray-600">{formatDate(fir.incident_date)}</TableCell>
                      <TableCell className="text-xs py-2 px-3">{getStatusBadge(fir.case_status)}</TableCell>
                      <TableCell className="text-xs py-2 px-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => router.push(`/fir/${fir.id}`)} className="text-xs">
                              <Eye className="h-3 w-3 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/fir/${fir.id}/edit`)} className="text-xs">
                              <Edit className="h-3 w-3 mr-2" /> Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {!loading && filteredList.length > 0 && (
          <p className="text-[0.6rem] text-gray-400 text-center">
            Showing {filteredList.length} of {firList.length} records
          </p>
        )}
      </div>

      {/* Modal for Accused/Bailer Details with History */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={
          modalType === "accused" ? "Accused List" :
          modalType === "bailer" ? "Bailer List" :
          modalType === "all-accused" ? "All Accused Database" :
          "All Bailers Database"
        }
        subtitle={`FIR: ${selectedFirNumber} | Total: ${modalData.length}${repeatOffendersCount > 0 ? ` | Repeat: ${repeatOffendersCount}` : ''}`}
      >
        {modalLoading ? (
          <div className="py-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-blue-600" />
            <p className="mt-3 text-sm text-gray-500">Loading details with history...</p>
          </div>
        ) : modalData.length === 0 ? (
          <div className="py-12 text-center">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No records found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Alert for repeat offenders */}
            {repeatOffendersCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-800 text-sm">Repeat Offenders Found!</p>
                  <p className="text-xs text-yellow-700">{repeatOffendersCount} person(s) appear in multiple cases</p>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className={`border-b-2 ${modalType.includes("accused") ? "bg-red-50" : "bg-blue-50"}`}>
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-bold">#</th>
                    <th className="px-3 py-3 text-left text-xs font-bold">NAME</th>
                    {modalType.includes("bailer") && (
                      <th className="px-3 py-3 text-left text-xs font-bold">BAILER FOR</th>
                    )}
                    <th className="px-3 py-3 text-left text-xs font-bold">FATHER NAME</th>
                    <th className="px-3 py-3 text-left text-xs font-bold">AGE/GENDER</th>
                    {modalType.includes("accused") && (
                      <th className="px-3 py-3 text-left text-xs font-bold">STATUS</th>
                    )}
                    <th className="px-3 py-3 text-left text-xs font-bold">MOBILE</th>
                    <th className="px-3 py-3 text-left text-xs font-bold">AADHAAR</th>
                    {(modalType === "all-accused" || modalType === "all-bailer") && (
                      <th className="px-3 py-3 text-left text-xs font-bold">FIR NO.</th>
                    )}
                    <th className="px-3 py-3 text-left text-xs font-bold">ADDRESS</th>
                    <th className="px-3 py-3 text-center text-xs font-bold">HISTORY</th>
                    <th className="px-3 py-3 text-center text-xs font-bold">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {modalData.map((person, idx) => {
                    const hasHistory = person.previousCases && person.previousCases.length > 0
                    const isExpanded = expandedPerson === person.id

                    return (
                      <>
                        <tr 
                          key={person.id} 
                          className={`hover:bg-gray-50 ${hasHistory ? "bg-yellow-50/50" : ""}`}
                        >
                          <td className="px-3 py-3 text-xs">{idx + 1}</td>
                          <td className="px-3 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              {person.name}
                              {hasHistory && (
                                <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">
                                  {person.occurrence_count}x
                                </Badge>
                              )}
                            </div>
                          </td>
                          {modalType.includes("bailer") && (
                            <td className="px-3 py-3">
                              {person.accused_name ? (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-300 border text-xs">
                                  <Link2 className="h-3 w-3 mr-1" />
                                  {person.accused_name}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-xs italic">Not Linked</span>
                              )}
                            </td>
                          )}
                          <td className="px-3 py-3 text-xs">{person.father_name || "-"}</td>
                          <td className="px-3 py-3 text-xs">{person.age || "-"} / {person.gender || "-"}</td>
                          {modalType.includes("accused") && (
                            <td className="px-3 py-3">{getAccusedTypeBadge(person.accused_type)}</td>
                          )}
                          <td className="px-3 py-3 text-xs">
                            {person.mobile ? (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-green-600" />
                                {person.mobile}
                              </span>
                            ) : "-"}
                          </td>
                          <td className="px-3 py-3 text-xs font-mono">{person.aadhaar || "-"}</td>
                          {(modalType === "all-accused" || modalType === "all-bailer") && (
                            <td className="px-3 py-3 text-xs font-mono text-blue-600 font-semibold">
                              {person.fir_number || "-"}
                            </td>
                          )}
                          <td className="px-3 py-3 text-xs max-w-[150px] truncate">
                            {person.full_address || "-"}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {hasHistory ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs bg-yellow-50 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                                onClick={() => setExpandedPerson(isExpanded ? null : person.id)}
                              >
                                <History className="h-3 w-3 mr-1" />
                                {person.previousCases!.length}
                                {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                              </Button>
                            ) : (
                              <span className="text-gray-400 text-xs">None</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setShowModal(false)
                                router.push(`/fir/${person.fir_id}`)
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                          </td>
                        </tr>
                        
                        {/* Expanded History Row */}
                        {isExpanded && hasHistory && (
                          <tr>
                            <td colSpan={modalType.includes("bailer") ? 12 : 11} className="px-3 py-3 bg-yellow-50">
                              <div className="pl-6">
                                <p className="font-semibold text-sm mb-3 flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                  Previous Cases ({person.previousCases!.length}) - This person appeared in other cases
                                </p>
                                <div className="overflow-x-auto border rounded-lg">
                                  <table className="w-full text-xs">
                                    <thead className="bg-yellow-100">
                                      <tr>
                                        <th className="px-3 py-2 text-left font-bold">FIR Number</th>
                                        <th className="px-3 py-2 text-left font-bold">District</th>
                                        <th className="px-3 py-2 text-left font-bold">Thana</th>
                                        <th className="px-3 py-2 text-left font-bold">Date</th>
                                        <th className="px-3 py-2 text-left font-bold">Role</th>
                                        <th className="px-3 py-2 text-left font-bold">Status</th>
                                        <th className="px-3 py-2 text-center font-bold">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y">
                                      {person.previousCases!.map((pc, pcIdx) => (
                                        <tr key={pcIdx} className="hover:bg-gray-50">
                                          <td className="px-3 py-2 font-mono font-semibold text-blue-600">
                                            {pc.fir_number}
                                          </td>
                                          <td className="px-3 py-2">{pc.district_name || "-"}</td>
                                          <td className="px-3 py-2">{pc.thana_name || "-"}</td>
                                          <td className="px-3 py-2">{formatDate(pc.incident_date)}</td>
                                          <td className="px-3 py-2">
                                            <Badge className={`text-[10px] ${
                                              pc.role === "Accused" 
                                                ? "bg-red-100 text-red-700" 
                                                : "bg-blue-100 text-blue-700"
                                            }`}>
                                              {pc.role}
                                            </Badge>
                                          </td>
                                          <td className="px-3 py-2">{getStatusBadge(pc.case_status)}</td>
                                          <td className="px-3 py-2 text-center">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-6 text-xs"
                                              onClick={() => {
                                                setShowModal(false)
                                                router.push(`/fir/${pc.fir_id}`)
                                              }}
                                            >
                                              <Eye className="h-3 w-3" />
                                            </Button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Footer */}
            <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Total: {modalData.length}</span>
                {repeatOffendersCount > 0 && (
                  <span className="ml-4 text-yellow-700 font-semibold">
                    • Repeat: {repeatOffendersCount}
                  </span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}