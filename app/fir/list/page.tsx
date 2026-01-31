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
  RefreshCw, Filter, AlertCircle, Download, Printer,
  Calendar, MapPin, User as UserIcon, ChevronLeft,
  Scale, Clock, CheckCircle, XCircle, Gavel
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
  updated_at: string
  brief_description: string
  io_name: string
  law_sections_text: string
}

export default function FIRListPage() {
  const router = useRouter()
  const [firList, setFirList] = useState<FIR[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

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

      const { data, error: fetchError } = await supabase
        .from("fir_records")
        .select("*")
        .order("created_at", { ascending: false })

      if (fetchError) {
        console.error("FIR fetch error:", fetchError)
        setError(fetchError.message)
        toast.error("Failed to load FIRs")
        return
      }

      setFirList(data || [])
      if (isRefresh) {
        toast.success("FIR list refreshed!")
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

  const handleRefresh = () => {
    loadFIRList(true)
  }

  const filteredList = firList.filter(fir => {
    const search = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery || 
      fir.fir_number?.toLowerCase().includes(search) ||
      fir.district_name?.toLowerCase().includes(search) ||
      fir.thana_name?.toLowerCase().includes(search) ||
      fir.io_name?.toLowerCase().includes(search) ||
      fir.law_sections_text?.toLowerCase().includes(search) ||
      fir.brief_description?.toLowerCase().includes(search)
    
    const matchesStatus = statusFilter === "all" || 
      fir.case_status?.toLowerCase().replace(/ /g, "_") === statusFilter.toLowerCase()
    
    let matchesDate = true
    if (dateFrom && fir.incident_date) {
      matchesDate = new Date(fir.incident_date) >= new Date(dateFrom)
    }
    if (dateTo && fir.incident_date && matchesDate) {
      matchesDate = new Date(fir.incident_date) <= new Date(dateTo)
    }
    
    return matchesSearch && matchesStatus && matchesDate
  })

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase().replace(/ /g, "_") || "open"
    const config: Record<string, { bg: string, icon: any }> = {
      open: { bg: "bg-orange-100 text-orange-700 border-orange-200", icon: Clock },
      registered: { bg: "bg-blue-100 text-blue-700 border-blue-200", icon: FileText },
      under_investigation: { bg: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: Search },
      chargesheet_filed: { bg: "bg-purple-100 text-purple-700 border-purple-200", icon: Scale },
      in_court: { bg: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: Gavel },
      closed: { bg: "bg-gray-100 text-gray-700 border-gray-200", icon: XCircle },
      disposed: { bg: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle },
    }
    const { bg, icon: Icon } = config[statusLower] || config.open
    return (
      <Badge className={`${bg} font-medium text-xs border`}>
        <Icon className="h-3 w-3 mr-1" />
        {status || "Unknown"}
      </Badge>
    )
  }

  const formatDate = (date: string) => {
    if (!date) return "N/A"
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
    setDateFrom("")
    setDateTo("")
  }

  const hasActiveFilters = searchQuery || statusFilter !== "all" || dateFrom || dateTo

  const exportToCSV = () => {
    const headers = ["FIR Number", "Status", "District", "Thana", "IO Name", "Incident Date", "Created Date"]
    const rows = filteredList.map(fir => [
      fir.fir_number,
      fir.case_status,
      fir.district_name || "",
      fir.thana_name || "",
      fir.io_name || "",
      formatDate(fir.incident_date),
      formatDate(fir.created_at)
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
    toast.success("CSV exported successfully!")
  }

  // Statistics
  const stats = {
    total: firList.length,
    open: firList.filter(f => f.case_status?.toLowerCase() === "open").length,
    registered: firList.filter(f => f.case_status?.toLowerCase() === "registered").length,
    underInvestigation: firList.filter(f => f.case_status?.toLowerCase().includes("investigation")).length,
    inCourt: firList.filter(f => f.case_status?.toLowerCase().includes("court")).length,
    closed: firList.filter(f => f.case_status?.toLowerCase() === "closed").length,
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
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">FIR Records</h1>
              <p className="text-muted-foreground text-sm">
                Total: {firList.length} | Showing: {filteredList.length} records
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
            <Button size="sm" asChild>
              <Link href="/fir/add">
                <Plus className="h-4 w-4 mr-2" /> Add FIR
              </Link>
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

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-primary", icon: FileText },
            { label: "Open", value: stats.open, color: "text-orange-600", icon: Clock },
            { label: "Registered", value: stats.registered, color: "text-blue-600", icon: FileText },
            { label: "Investigating", value: stats.underInvestigation, color: "text-yellow-600", icon: Search },
            { label: "In Court", value: stats.inCourt, color: "text-indigo-600", icon: Gavel },
            { label: "Closed", value: stats.closed, color: "text-gray-600", icon: XCircle },
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search FIR, district, IO name..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-background"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="registered">Registered</option>
                <option value="under_investigation">Under Investigation</option>
                <option value="chargesheet_filed">Chargesheet Filed</option>
                <option value="in_court">In Court</option>
                <option value="closed">Closed</option>
                <option value="disposed">Disposed</option>
              </select>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From Date"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To Date"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              FIR List
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading FIRs...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-semibold text-lg">No FIRs found</p>
                <p className="text-muted-foreground mb-6">
                  {firList.length === 0 
                    ? "Start by adding your first FIR" 
                    : "Try adjusting your filters"
                  }
                </p>
                {firList.length === 0 ? (
                  <Button asChild>
                    <Link href="/fir/add">
                      <Plus className="h-4 w-4 mr-2" /> Add First FIR
                    </Link>
                  </Button>
                ) : (
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
                      <TableHead className="font-bold">FIR NUMBER</TableHead>
                      <TableHead className="font-bold">STATUS</TableHead>
                      <TableHead className="font-bold">LOCATION</TableHead>
                      <TableHead className="font-bold">IO NAME</TableHead>
                      <TableHead className="font-bold">DATE</TableHead>
                      <TableHead className="font-bold text-right">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.map((fir) => (
                      <TableRow 
                        key={fir.id} 
                        className="hover:bg-muted/50 cursor-pointer transition-colors" 
                        onClick={() => router.push(`/fir/${fir.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-semibold">{fir.fir_number}</p>
                            {fir.accused_type && (
                              <Badge variant="outline" className="text-xs mt-1">
                                {fir.accused_type}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(fir.case_status)}</TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium">{fir.district_name || "N/A"}</p>
                              {fir.thana_name && (
                                <p className="text-xs text-muted-foreground">{fir.thana_name}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {fir.io_name ? (
                            <div className="flex items-center gap-2">
                              <UserIcon className="h-4 w-4 text-muted-foreground" />
                              <span>{fir.io_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDate(fir.incident_date)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { 
                                e.stopPropagation()
                                router.push(`/fir/${fir.id}`) 
                              }}>
                                <Eye className="h-4 w-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { 
                                e.stopPropagation()
                                router.push(`/fir/${fir.id}/edit`) 
                              }}>
                                <Edit className="h-4 w-4 mr-2" /> Edit FIR
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
          </CardContent>
        </Card>

        {/* Results Count */}
        {!loading && filteredList.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing {filteredList.length} of {firList.length} FIR{firList.length !== 1 ? "s" : ""}
            {hasActiveFilters && " (filtered)"}
          </p>
        )}
      </div>
    </div>
  )
}