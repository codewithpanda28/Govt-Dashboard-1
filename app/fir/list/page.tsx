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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Search, Eye, Edit, MoreHorizontal, FileText, Plus, 
  RefreshCw, AlertCircle, Download, ChevronLeft, 
  User, Users, AlertTriangle
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

interface Person {
  id: number
  fir_id: number
  name: string
  father_name: string
  age: number
  gender: string
  mobile: string
  email: string
  aadhaar: string
  state_name: string
  district_name: string
  full_address: string
  pin_code: string
}

interface PersonWithFIRs extends Person {
  fir_numbers: string[]
  occurrence_count: number
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
  const [modalData, setModalData] = useState<PersonWithFIRs[]>([])
  const [modalLoading, setModalLoading] = useState(false)
  const [selectedFirNumber, setSelectedFirNumber] = useState("")

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

      // Fetch FIRs
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

      // Fetch accused counts
      const { data: accusedCounts } = await supabase
        .from("accused_details")
        .select("fir_id")

      // Fetch bailer counts
      const { data: bailerCounts } = await supabase
        .from("bailer_details")
        .select("fir_id")

      // Count accused and bailers for each FIR
      const accusedCountMap: Record<number, number> = {}
      const bailerCountMap: Record<number, number> = {}

      accusedCounts?.forEach(a => {
        accusedCountMap[a.fir_id] = (accusedCountMap[a.fir_id] || 0) + 1
      })

      bailerCounts?.forEach(b => {
        bailerCountMap[b.fir_id] = (bailerCountMap[b.fir_id] || 0) + 1
      })

      // Merge counts with FIR data
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

  // 🆕 Fetch Accused Details for specific FIR
  const fetchAccusedDetails = async (firId: number, firNumber: string) => {
    try {
      setModalLoading(true)
      setModalType("accused")
      setSelectedFirNumber(firNumber)
      setShowModal(true)

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

      // Add FIR number to each record
      const enrichedData = (data || []).map(person => ({
        ...person,
        fir_numbers: [firNumber],
        occurrence_count: 1
      }))

      setModalData(enrichedData)
    } catch (err: any) {
      console.error("Error:", err)
      toast.error("Something went wrong")
    } finally {
      setModalLoading(false)
    }
  }

  // 🆕 Fetch Bailer Details for specific FIR
  const fetchBailerDetails = async (firId: number, firNumber: string) => {
    try {
      setModalLoading(true)
      setModalType("bailer")
      setSelectedFirNumber(firNumber)
      setShowModal(true)

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

      // Add FIR number to each record
      const enrichedData = (data || []).map(person => ({
        ...person,
        fir_numbers: [firNumber],
        occurrence_count: 1
      }))

      setModalData(enrichedData)
    } catch (err: any) {
      console.error("Error:", err)
      toast.error("Something went wrong")
    } finally {
      setModalLoading(false)
    }
  }

  // 🆕 Fetch ALL Accused with repetition check
  const fetchAllAccusedWithRepetition = async () => {
    try {
      setModalLoading(true)
      setModalType("all-accused")
      setSelectedFirNumber("All FIRs")
      setShowModal(true)

      // Get all accused
      const { data: accusedData, error } = await supabase
        .from("accused_details")
        .select("*, fir_id")
        .order("name")

      if (error) {
        console.error("Accused fetch error:", error)
        toast.error("Failed to load accused details")
        return
      }

      // Create FIR ID to FIR number map
      const firMap: Record<number, string> = {}
      firList.forEach(fir => {
        firMap[fir.id] = fir.fir_number
      })

      // Group by name + mobile/aadhaar for repetition detection
      const groupedData: Record<string, PersonWithFIRs> = {}

      accusedData?.forEach(person => {
        // Create unique key (name + mobile or name + aadhaar)
        const key = `${person.name?.toLowerCase()}_${person.mobile || person.aadhaar || person.id}`
        
        if (!groupedData[key]) {
          groupedData[key] = {
            ...person,
            fir_numbers: [firMap[person.fir_id] || `FIR-${person.fir_id}`],
            occurrence_count: 1
          }
        } else {
          groupedData[key].fir_numbers.push(firMap[person.fir_id] || `FIR-${person.fir_id}`)
          groupedData[key].occurrence_count += 1
        }
      })

      // Convert to array and sort by occurrence count
      const finalData = Object.values(groupedData).sort((a, b) => 
        b.occurrence_count - a.occurrence_count
      )

      setModalData(finalData)
    } catch (err: any) {
      console.error("Error:", err)
      toast.error("Something went wrong")
    } finally {
      setModalLoading(false)
    }
  }

  // 🆕 Fetch ALL Bailers with repetition check
  const fetchAllBailersWithRepetition = async () => {
    try {
      setModalLoading(true)
      setModalType("all-bailer")
      setSelectedFirNumber("All FIRs")
      setShowModal(true)

      // Get all bailers
      const { data: bailerData, error } = await supabase
        .from("bailer_details")
        .select("*, fir_id")
        .order("name")

      if (error) {
        console.error("Bailer fetch error:", error)
        toast.error("Failed to load bailer details")
        return
      }

      // Create FIR ID to FIR number map
      const firMap: Record<number, string> = {}
      firList.forEach(fir => {
        firMap[fir.id] = fir.fir_number
      })

      // Group by name + mobile/aadhaar for repetition detection
      const groupedData: Record<string, PersonWithFIRs> = {}

      bailerData?.forEach(person => {
        // Create unique key (name + mobile or name + aadhaar)
        const key = `${person.name?.toLowerCase()}_${person.mobile || person.aadhaar || person.id}`
        
        if (!groupedData[key]) {
          groupedData[key] = {
            ...person,
            fir_numbers: [firMap[person.fir_id] || `FIR-${person.fir_id}`],
            occurrence_count: 1
          }
        } else {
          groupedData[key].fir_numbers.push(firMap[person.fir_id] || `FIR-${person.fir_id}`)
          groupedData[key].occurrence_count += 1
        }
      })

      // Convert to array and sort by occurrence count
      const finalData = Object.values(groupedData).sort((a, b) => 
        b.occurrence_count - a.occurrence_count
      )

      setModalData(finalData)
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
    if (s === "open") return <Badge className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0">Open</Badge>
    if (s === "closed") return <Badge className="bg-gray-100 text-gray-700 text-[10px] px-1.5 py-0">Closed</Badge>
    if (s.includes("investigation")) return <Badge className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0">Investigating</Badge>
    if (s.includes("court")) return <Badge className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0">In Court</Badge>
    if (s === "disposed") return <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">Disposed</Badge>
    return <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">{status}</Badge>
  }

  const formatDate = (date: string) => {
    if (!date) return "-"
    try {
      return new Date(date).toLocaleDateString("en-IN", {
        day: "2-digit", month: "2-digit", year: "numeric"
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

  // Stats
  const stats = {
    total: firList.length,
    open: firList.filter(f => f.case_status?.toLowerCase() === "open").length,
    closed: firList.filter(f => f.case_status?.toLowerCase() === "closed").length,
  }

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
            <div className="flex gap-2">
              {/* 🆕 All Accused/Bailer Buttons */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAllAccusedWithRepetition} 
                className="h-8 text-xs bg-blue-50 hover:bg-blue-100 border-blue-300"
              >
                <User className="h-3 w-3 mr-1" />
                All Accused
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAllBailersWithRepetition} 
                className="h-8 text-xs bg-green-50 hover:bg-green-100 border-green-300"
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
              <div className="animate-spin h-8 w-8 border-3 border-gray-300 border-t-gray-600 rounded-full mx-auto"></div>
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
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3 text-center">Accused</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3 text-center">Bailer</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3">Date of FIR</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3">Status</TableHead>
                    <TableHead className="text-xs font-bold text-gray-700 py-2 px-3 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredList.map((fir, index) => (
                    <TableRow 
                      key={fir.id} 
                      className="hover:bg-gray-50 border-b"
                    >
                      <TableCell className="text-xs py-2 px-3 text-gray-600">{index + 1}</TableCell>
                      <TableCell 
                        className="text-xs py-2 px-3 font-medium text-blue-600 cursor-pointer hover:underline"
                        onClick={() => router.push(`/fir/${fir.id}`)}
                      >
                        {fir.fir_number}
                      </TableCell>
                      <TableCell className="text-xs py-2 px-3 text-gray-600">{fir.state_name || "-"}</TableCell>
                      <TableCell className="text-xs py-2 px-3 text-gray-600">{fir.district_name || "-"}</TableCell>
                      
                      {/* Clickable Accused Count */}
                      <TableCell className="text-xs py-2 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if ((fir.accused_count || 0) > 0) {
                              fetchAccusedDetails(fir.id, fir.fir_number)
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                            (fir.accused_count || 0) > 0 
                              ? "bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer" 
                              : "bg-gray-100 text-gray-400 cursor-default"
                          }`}
                          disabled={(fir.accused_count || 0) === 0}
                        >
                          {fir.accused_count || 0}
                        </button>
                      </TableCell>
                      
                      {/* Clickable Bailer Count */}
                      <TableCell className="text-xs py-2 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if ((fir.bailer_count || 0) > 0) {
                              fetchBailerDetails(fir.id, fir.fir_number)
                            }
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                            (fir.bailer_count || 0) > 0 
                              ? "bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer" 
                              : "bg-gray-100 text-gray-400 cursor-default"
                          }`}
                          disabled={(fir.bailer_count || 0) === 0}
                        >
                          {fir.bailer_count || 0}
                        </button>
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
                            <DropdownMenuItem 
                              onClick={(e) => { 
                                e.stopPropagation()
                                router.push(`/fir/${fir.id}`) 
                              }}
                              className="text-xs"
                            >
                              <Eye className="h-3 w-3 mr-2" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={(e) => { 
                                e.stopPropagation()
                                router.push(`/fir/${fir.id}/edit`) 
                              }}
                              className="text-xs"
                            >
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

        {/* Footer */}
        {!loading && filteredList.length > 0 && (
          <p className="text-[10px] text-gray-400 text-center">
            Showing {filteredList.length} of {firList.length} records
          </p>
        )}
      </div>

      {/* 🆕 Modal for Accused/Bailer Details - TABLE FORMAT */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              {modalType === "accused" || modalType === "all-accused" ? (
                <>
                  <User className="h-4 w-4 text-blue-600" />
                  <span>Accused Details</span>
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 text-green-600" />
                  <span>Bailer Details</span>
                </>
              )}
              <Badge variant="outline" className="ml-2 text-xs">
                FIR: {selectedFirNumber}
              </Badge>
              {modalData.filter(p => p.occurrence_count > 1).length > 0 && (
                <Badge className="ml-1 bg-red-100 text-red-700 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Repeating Found
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
            {modalLoading ? (
              <div className="py-8 text-center">
                <div className="animate-spin h-6 w-6 border-2 border-gray-300 border-t-gray-600 rounded-full mx-auto"></div>
                <p className="mt-2 text-xs text-gray-500">Loading...</p>
              </div>
            ) : modalData.length === 0 ? (
              <div className="py-8 text-center">
                <User className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No {modalType.includes("accused") ? "accused" : "bailer"} found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className={modalType.includes("accused") ? "bg-blue-50" : "bg-green-50"}>
                      <TableHead className="text-xs font-bold py-2">Sl</TableHead>
                      <TableHead className="text-xs font-bold py-2">Name</TableHead>
                      <TableHead className="text-xs font-bold py-2">Father</TableHead>
                      <TableHead className="text-xs font-bold py-2">Age/Gender</TableHead>
                      <TableHead className="text-xs font-bold py-2">Aadhaar</TableHead>
                      <TableHead className="text-xs font-bold py-2">Mobile</TableHead>
                      <TableHead className="text-xs font-bold py-2">Address</TableHead>
                      <TableHead className="text-xs font-bold py-2">State/District</TableHead>
                      <TableHead className="text-xs font-bold py-2">PIN</TableHead>
                      {(modalType === "all-accused" || modalType === "all-bailer") && (
                        <TableHead className="text-xs font-bold py-2">FIR Numbers</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modalData.map((person, idx) => (
                      <TableRow 
                        key={person.id} 
                        className={`hover:bg-gray-50 ${
                          person.occurrence_count > 1 ? "bg-yellow-50" : ""
                        }`}
                      >
                        <TableCell className="text-xs py-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                            modalType.includes("accused") ? "bg-blue-500" : "bg-green-500"
                          }`}>
                            {idx + 1}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs py-2 font-medium">
                          {person.name || "-"}
                          {person.occurrence_count > 1 && (
                            <Badge className="ml-1 bg-red-100 text-red-600 text-[10px]">
                              {person.occurrence_count}x
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs py-2">{person.father_name || "-"}</TableCell>
                        <TableCell className="text-xs py-2">
                          {person.age || "-"}/{person.gender?.[0]?.toUpperCase() || "-"}
                        </TableCell>
                        <TableCell className="text-xs py-2">{person.aadhaar || "-"}</TableCell>
                        <TableCell className="text-xs py-2">{person.mobile || "-"}</TableCell>
                        <TableCell className="text-xs py-2 max-w-[200px] truncate" title={person.full_address || ""}>
                          {person.full_address || "-"}
                        </TableCell>
                        <TableCell className="text-xs py-2">
                          {[person.district_name, person.state_name].filter(Boolean).join(", ") || "-"}
                        </TableCell>
                        <TableCell className="text-xs py-2">{person.pin_code || "-"}</TableCell>
                        {(modalType === "all-accused" || modalType === "all-bailer") && (
                          <TableCell className="text-xs py-2">
                            <div className="flex flex-wrap gap-1">
                              {person.fir_numbers.map((firNo, i) => (
                                <Badge 
                                  key={i} 
                                  variant="outline" 
                                  className="text-[10px] px-1 py-0 cursor-pointer hover:bg-gray-100"
                                  onClick={() => {
                                    const fir = firList.find(f => f.fir_number === firNo)
                                    if (fir) {
                                      setShowModal(false)
                                      router.push(`/fir/${fir.id}`)
                                    }
                                  }}
                                >
                                  {firNo}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="border-t pt-3 flex justify-between items-center">
            <div className="text-xs text-gray-500">
              Total: {modalData.length} {modalType.includes("accused") ? "Accused" : "Bailer"}(s)
              {modalData.filter(p => p.occurrence_count > 1).length > 0 && (
                <span className="ml-2 text-red-600 font-medium">
                  • {modalData.filter(p => p.occurrence_count > 1).length} Repeating
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowModal(false)} className="text-xs h-7">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}