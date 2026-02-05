"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  BarChart3, FileText, Building2, MapPin, AlertTriangle,
  Users, UserCheck, Calendar, Train, Search, Download,
  Printer, RefreshCw, Loader2, Filter,
  FileSearch, Eye, Clock, CheckCircle, XCircle
} from "lucide-react"
import { toast } from "sonner"

interface FIRRecord {
  id: number
  fir_number: string
  case_status: string
  incident_date: string
  state_name: string
  zone_name: string
  district_name: string
  thana_name: string
  train_number_manual: string
  train_name_manual: string
  accused_type: string
  created_at: string
}

export default function ReportsPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [firRecords, setFirRecords] = useState<FIRRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<FIRRecord[]>([])

  // Dropdown data
  const [districts, setDistricts] = useState<any[]>([])
  const [thanas, setThanas] = useState<any[]>([])
  const [crimes, setCrimes] = useState<any[]>([])

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    closed: 0,
    disposed: 0
  })

  // Filters
  const [filters, setFilters] = useState({
    fir_number: "",
    district_id: "",
    thana_id: "",
    crime_type: "",
    accused_name: "",
    bailer_name: "",
    train_number: "",
    date_from: "",
    date_to: "",
    status: ""
  })

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      setLoading(true)

      // Check auth
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Load dropdowns
      const [districtsRes, thanasRes, crimesRes] = await Promise.all([
        supabase.from("districts").select("*").order("id"),
        supabase.from("thanas").select("*").order("id"),
        supabase.from("crimes").select("*").order("crime_name")
      ])

      setDistricts(districtsRes.data || [])
      setThanas(thanasRes.data || [])
      setCrimes(crimesRes.data || [])

      // Load all FIR records
      const { data: firData, error } = await supabase
        .from("fir_records")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("FIR load error:", error)
        toast.error("Failed to load data")
        return
      }

      setFirRecords(firData || [])
      setFilteredRecords(firData || [])
      calculateStats(firData || [])

    } catch (err: any) {
      console.error("Error:", err)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (records: FIRRecord[]) => {
    setStats({
      total: records.length,
      open: records.filter(r => 
        r.case_status === "open" || 
        r.case_status === "registered" || 
        r.case_status === "under_investigation"
      ).length,
      closed: records.filter(r => r.case_status === "closed").length,
      disposed: records.filter(r => r.case_status === "disposed").length
    })
  }

  const getName = (item: any): string => {
    if (!item) return ""
    return item.name || item.state_name || item.zone_name || item.district_name || 
           item.thana_name || item.court_name || item.crime_name || ""
  }

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const handleSearch = async () => {
    try {
      setSearching(true)
      let filtered = [...firRecords]

      // FIR Number filter
      if (filters.fir_number.trim()) {
        filtered = filtered.filter(r => 
          r.fir_number?.toLowerCase().includes(filters.fir_number.toLowerCase())
        )
      }

      // District filter
      if (filters.district_id) {
        const district = districts.find(d => d.id === parseInt(filters.district_id))
        if (district) {
          const districtName = getName(district)
          filtered = filtered.filter(r => 
            r.district_name?.toLowerCase() === districtName.toLowerCase()
          )
        }
      }

      // Thana filter
      if (filters.thana_id) {
        const thana = thanas.find(t => t.id === parseInt(filters.thana_id))
        if (thana) {
          const thanaName = getName(thana)
          filtered = filtered.filter(r => 
            r.thana_name?.toLowerCase() === thanaName.toLowerCase()
          )
        }
      }

      // Crime type filter
      if (filters.crime_type) {
        filtered = filtered.filter(r => 
          r.accused_type?.toLowerCase().includes(filters.crime_type.toLowerCase())
        )
      }

      // Train number filter
      if (filters.train_number.trim()) {
        filtered = filtered.filter(r => 
          r.train_number_manual?.toLowerCase().includes(filters.train_number.toLowerCase()) ||
          r.train_name_manual?.toLowerCase().includes(filters.train_number.toLowerCase())
        )
      }

      // Date range filter
      if (filters.date_from) {
        filtered = filtered.filter(r => r.incident_date >= filters.date_from)
      }
      if (filters.date_to) {
        filtered = filtered.filter(r => r.incident_date <= filters.date_to)
      }

      // Status filter
      if (filters.status) {
        filtered = filtered.filter(r => r.case_status === filters.status)
      }

      // Accused name filter
      if (filters.accused_name.trim()) {
        const { data: accusedData } = await supabase
          .from("accused_details")
          .select("fir_id")
          .ilike("name", `%${filters.accused_name}%`)

        const firIds = accusedData?.map(a => a.fir_id) || []
        filtered = filtered.filter(r => firIds.includes(r.id))
      }

      // Bailer name filter
      if (filters.bailer_name.trim()) {
        const { data: bailerData } = await supabase
          .from("bailer_details")
          .select("fir_id")
          .ilike("name", `%${filters.bailer_name}%`)

        const firIds = bailerData?.map(b => b.fir_id) || []
        filtered = filtered.filter(r => firIds.includes(r.id))
      }

      setFilteredRecords(filtered)
      calculateStats(filtered)
      toast.success(`Found ${filtered.length} records`)

    } catch (err: any) {
      console.error("Search error:", err)
      toast.error("Search failed")
    } finally {
      setSearching(false)
    }
  }

  const clearFilters = () => {
    setFilters({
      fir_number: "",
      district_id: "",
      thana_id: "",
      crime_type: "",
      accused_name: "",
      bailer_name: "",
      train_number: "",
      date_from: "",
      date_to: "",
      status: ""
    })
    setFilteredRecords(firRecords)
    calculateStats(firRecords)
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

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase().replace(/ /g, "_") || "open"
    const config: Record<string, { bg: string, label: string }> = {
      open: { bg: "bg-orange-100 text-orange-700", label: "OPEN" },
      registered: { bg: "bg-blue-100 text-blue-700", label: "REGISTERED" },
      under_investigation: { bg: "bg-yellow-100 text-yellow-700", label: "UNDER INVESTIGATION" },
      chargesheet_filed: { bg: "bg-purple-100 text-purple-700", label: "CHARGESHEET FILED" },
      in_court: { bg: "bg-indigo-100 text-indigo-700", label: "IN COURT" },
      closed: { bg: "bg-gray-100 text-gray-700", label: "CLOSED" },
      disposed: { bg: "bg-green-100 text-green-700", label: "DISPOSED" }
    }
    const { bg, label } = config[statusLower] || config.open
    return <Badge className={`${bg} font-medium text-xs`}>{label}</Badge>
  }

  const exportToCSV = () => {
    try {
      setExporting(true)
      
      const headers = ["S.No", "FIR Number", "Date", "District", "Thana", "Crime Type", "Train No.", "Train Name", "Status"]
      const rows = filteredRecords.map((record, index) => [
        index + 1,
        record.fir_number || "",
        formatDate(record.incident_date),
        record.district_name || "",
        record.thana_name || "",
        record.accused_type || "",
        record.train_number_manual || "",
        record.train_name_manual || "",
        record.case_status || ""
      ])

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `FIR_Report_${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      toast.success("Report exported successfully!")
    } catch (err) {
      toast.error("Export failed")
    } finally {
      setExporting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const goToFIRDetail = (id: number) => {
    router.push(`/fir/${id}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-gray-600" />
          <p className="mt-3 text-gray-600">Loading Reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6 print:p-2">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="bg-white border border-gray-300 rounded-lg p-4 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-gray-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
                <p className="text-sm text-gray-500">Generate and export FIR reports</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={loadInitialData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={exporting || filteredRecords.length === 0}>
                {exporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-4">
          <h1 className="text-xl font-bold">FIR Report</h1>
          <p className="text-sm text-gray-600">Generated on: {new Date().toLocaleDateString("en-IN")}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Records</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Open Cases</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.open}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Closed</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.closed}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-full">
                  <XCircle className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Disposed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.disposed}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-2 print:hidden">
          <CardHeader className="bg-gray-50 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* FIR Number */}
              <div>
                <Label className="text-gray-700 flex items-center gap-1">
                  <FileSearch className="h-4 w-4" />
                  FIR Number
                </Label>
                <Input
                  className="mt-1 bg-white"
                  placeholder="Search FIR No..."
                  value={filters.fir_number}
                  onChange={(e) => handleFilterChange("fir_number", e.target.value)}
                />
              </div>

              {/* District */}
              <div>
                <Label className="text-gray-700 flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  District
                </Label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded bg-white"
                  value={filters.district_id}
                  onChange={(e) => handleFilterChange("district_id", e.target.value)}
                >
                  <option value="">-- All Districts --</option>
                  {districts.map(d => (
                    <option key={d.id} value={d.id}>{getName(d)}</option>
                  ))}
                </select>
              </div>

              {/* Thana */}
              <div>
                <Label className="text-gray-700 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Thana
                </Label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded bg-white"
                  value={filters.thana_id}
                  onChange={(e) => handleFilterChange("thana_id", e.target.value)}
                >
                  <option value="">-- All Thanas --</option>
                  {thanas.map(t => (
                    <option key={t.id} value={t.id}>{getName(t)}</option>
                  ))}
                </select>
              </div>

              {/* Crime Type */}
              <div>
                <Label className="text-gray-700 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Crime Type
                </Label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded bg-white"
                  value={filters.crime_type}
                  onChange={(e) => handleFilterChange("crime_type", e.target.value)}
                >
                  <option value="">-- All Crime Types --</option>
                  {crimes.map(c => (
                    <option key={c.id} value={c.crime_name}>{c.crime_name}</option>
                  ))}
                </select>
              </div>

              {/* Accused Name */}
              <div>
                <Label className="text-gray-700 flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Accused Name
                </Label>
                <Input
                  className="mt-1 bg-white"
                  placeholder="Search accused..."
                  value={filters.accused_name}
                  onChange={(e) => handleFilterChange("accused_name", e.target.value)}
                />
              </div>

              {/* Bailer Name */}
              <div>
                <Label className="text-gray-700 flex items-center gap-1">
                  <UserCheck className="h-4 w-4" />
                  Bailer Name
                </Label>
                <Input
                  className="mt-1 bg-white"
                  placeholder="Search bailer..."
                  value={filters.bailer_name}
                  onChange={(e) => handleFilterChange("bailer_name", e.target.value)}
                />
              </div>

              {/* Train Number */}
              <div>
                <Label className="text-gray-700 flex items-center gap-1">
                  <Train className="h-4 w-4" />
                  Train No./Name
                </Label>
                <Input
                  className="mt-1 bg-white"
                  placeholder="Search train..."
                  value={filters.train_number}
                  onChange={(e) => handleFilterChange("train_number", e.target.value)}
                />
              </div>

              {/* Status */}
              <div>
                <Label className="text-gray-700">Status</Label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded bg-white"
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <option value="">-- All Status --</option>
                  <option value="open">Open</option>
                  <option value="registered">Registered</option>
                  <option value="under_investigation">Under Investigation</option>
                  <option value="chargesheet_filed">Chargesheet Filed</option>
                  <option value="in_court">In Court</option>
                  <option value="closed">Closed</option>
                  <option value="disposed">Disposed</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <Label className="text-gray-700 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Date From
                </Label>
                <Input
                  type="date"
                  className="mt-1 bg-white"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange("date_from", e.target.value)}
                />
              </div>

              {/* Date To */}
              <div>
                <Label className="text-gray-700 flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Date To
                </Label>
                <Input
                  type="date"
                  className="mt-1 bg-white"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange("date_to", e.target.value)}
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex gap-3 mt-6">
              <Button 
                onClick={handleSearch} 
                disabled={searching}
                className="bg-gray-800 hover:bg-gray-900"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card className="border-2">
          <CardHeader className="bg-gray-50 border-b pb-4 print:bg-white">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Results ({filteredRecords.length} records)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="font-semibold text-gray-600">No records found</p>
                <p className="text-gray-400 text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 print:bg-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 border-b">#</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 border-b">FIR NUMBER</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 border-b">DATE</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 border-b">DISTRICT</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 border-b">THANA</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 border-b">CRIME TYPE</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 border-b">TRAIN</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 border-b">STATUS</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-700 border-b print:hidden">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredRecords.map((record, index) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-3 py-3 text-sm">{index + 1}</td>
                        <td className="px-3 py-3 text-sm font-medium text-blue-600">{record.fir_number}</td>
                        <td className="px-3 py-3 text-sm">{formatDate(record.incident_date)}</td>
                        <td className="px-3 py-3 text-sm">{record.district_name || "-"}</td>
                        <td className="px-3 py-3 text-sm">{record.thana_name || "-"}</td>
                        <td className="px-3 py-3 text-sm">{record.accused_type || "-"}</td>
                        <td className="px-3 py-3 text-sm">
                          {record.train_number_manual || "-"}
                          {record.train_name_manual && (
                            <span className="text-gray-500 text-xs block">{record.train_name_manual}</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-sm">
                          {getStatusBadge(record.case_status)}
                        </td>
                        <td className="px-3 py-3 text-sm print:hidden">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => goToFIRDetail(record.id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Section */}
        {filteredRecords.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
            
            {/* District Wise Summary */}
            <Card className="border-2">
              <CardHeader className="bg-gray-50 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  District Wise Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold">District</th>
                        <th className="px-3 py-2 text-center font-bold">Total</th>
                        <th className="px-3 py-2 text-center font-bold">Open</th>
                        <th className="px-3 py-2 text-center font-bold">Closed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(() => {
                        const grouped = filteredRecords.reduce((acc: any, r) => {
                          const key = r.district_name || "Unknown"
                          if (!acc[key]) acc[key] = { total: 0, open: 0, closed: 0 }
                          acc[key].total++
                          if (["open", "registered", "under_investigation"].includes(r.case_status)) {
                            acc[key].open++
                          } else if (r.case_status === "closed" || r.case_status === "disposed") {
                            acc[key].closed++
                          }
                          return acc
                        }, {})
                        return Object.entries(grouped)
                          .sort((a: any, b: any) => b[1].total - a[1].total)
                          .map(([key, val]: [string, any]) => (
                            <tr key={key} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium">{key}</td>
                              <td className="px-3 py-2 text-center font-bold">{val.total}</td>
                              <td className="px-3 py-2 text-center text-orange-600">{val.open}</td>
                              <td className="px-3 py-2 text-center text-green-600">{val.closed}</td>
                            </tr>
                          ))
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Crime Wise Summary */}
            <Card className="border-2">
              <CardHeader className="bg-gray-50 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Crime Wise Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold">Crime Type</th>
                        <th className="px-3 py-2 text-center font-bold">Total</th>
                        <th className="px-3 py-2 text-center font-bold">Open</th>
                        <th className="px-3 py-2 text-center font-bold">Closed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(() => {
                        const grouped = filteredRecords.reduce((acc: any, r) => {
                          const key = r.accused_type || "Unknown"
                          if (!acc[key]) acc[key] = { total: 0, open: 0, closed: 0 }
                          acc[key].total++
                          if (["open", "registered", "under_investigation"].includes(r.case_status)) {
                            acc[key].open++
                          } else if (r.case_status === "closed" || r.case_status === "disposed") {
                            acc[key].closed++
                          }
                          return acc
                        }, {})
                        return Object.entries(grouped)
                          .sort((a: any, b: any) => b[1].total - a[1].total)
                          .map(([key, val]: [string, any]) => (
                            <tr key={key} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium">{key}</td>
                              <td className="px-3 py-2 text-center font-bold">{val.total}</td>
                              <td className="px-3 py-2 text-center text-orange-600">{val.open}</td>
                              <td className="px-3 py-2 text-center text-green-600">{val.closed}</td>
                            </tr>
                          ))
                      })()}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}