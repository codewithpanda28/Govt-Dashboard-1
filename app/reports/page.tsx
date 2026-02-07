"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import {
  LayoutDashboard, FilePlus, FileText, Users, Scale,
  User, LogOut, Menu, X, Shield, BarChart3,
  Building2, MapPin, AlertTriangle, UserCheck, Calendar,
  Train, Search, Download, Printer, RefreshCw, Loader2,
  Filter, FileSearch, Eye, Clock, CheckCircle, XCircle,
  History, AlertOctagon, ChevronRight, ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { logout } from "@/lib/auth"
import { toast } from "sonner"

// Sidebar Component
const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fir/add", label: "Add FIR", icon: FilePlus },
  { href: "/fir/list", label: "FIRs List", icon: FileText },
  { href: "/accused/list", label: "Accused List", icon: Users },
  { href: "/bail/list", label: "Bail List", icon: Scale },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
]

function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-white border-2 border-primary-foreground/30 shadow-lg hover:bg-primary/90 transition-all"
      >
        {isMobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 bg-gradient-to-b from-primary via-primary to-primary/95 text-white transition-transform duration-300 ease-in-out lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col overflow-hidden">
          <div className="flex h-24 items-center justify-center border-b-2 border-primary-foreground/20 px-4 bg-primary/50">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-secondary/20 border-2 border-secondary/40">
                <Shield className="h-8 w-8 text-secondary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Railway Police</h1>
                <p className="text-xs text-primary-foreground/70">Data Management System</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                    isActive
                      ? "bg-secondary text-primary shadow-lg scale-[1.02] border-2 border-secondary/50"
                      : "text-primary-foreground/90 hover:bg-primary-foreground/15 hover:text-white hover:scale-[1.01] border-2 border-transparent"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="border-t-2 border-primary-foreground/20 p-4 bg-primary/50">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-primary-foreground/90 hover:bg-destructive/20 hover:text-white rounded-xl py-3"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}

// Interfaces
interface PreviousCase {
  fir_id: number
  fir_number: string
  role: string
}

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
  accused_count?: number
  bailer_count?: number
  repeat_offenders?: number
  suspicious_bailers?: number
}

// Main Reports Component
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

  // Advanced Stats
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    closed: 0,
    disposed: 0,
    totalAccused: 0,
    totalBailers: 0,
    repeatOffenders: 0,
    suspiciousBailers: 0
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
    status: "",
    show_repeat_offenders: false,
    show_suspicious_bailers: false
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

      // Load all FIR records with enhanced data
      await loadFIRRecordsWithDetails()

    } catch (err: any) {
      console.error("Error:", err)
      toast.error("Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const loadFIRRecordsWithDetails = async () => {
    try {
      // Load FIR records
      const { data: firData, error } = await supabase
        .from("fir_records")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("FIR load error:", error)
        toast.error("Failed to load FIR data")
        return
      }

      // Load all accused and bailers
      const { data: allAccused } = await supabase
        .from("accused_details")
        .select("fir_id, mobile, aadhaar, name")

      const { data: allBailers } = await supabase
        .from("bailer_details")
        .select("fir_id, mobile, aadhaar, name")

      // Create maps for quick lookup
      const accusedByFir = new Map<number, any[]>()
      const bailerByFir = new Map<number, any[]>()

      allAccused?.forEach(a => {
        if (!accusedByFir.has(a.fir_id)) accusedByFir.set(a.fir_id, [])
        accusedByFir.get(a.fir_id)?.push(a)
      })

      allBailers?.forEach(b => {
        if (!bailerByFir.has(b.fir_id)) bailerByFir.set(b.fir_id, [])
        bailerByFir.get(b.fir_id)?.push(b)
      })

      // Detect repeat offenders and suspicious bailers
      const enrichedRecords: FIRRecord[] = []
      let totalRepeatOffenders = 0
      let totalSuspiciousBailers = 0
      let totalAccusedCount = 0
      let totalBailerCount = 0

      for (const fir of firData || []) {
        const accusedList = accusedByFir.get(fir.id) || []
        const bailerList = bailerByFir.get(fir.id) || []

        totalAccusedCount += accusedList.length
        totalBailerCount += bailerList.length

        // Check for repeat offenders in this FIR
        let repeatOffendersInFir = 0
        for (const accused of accusedList) {
          if (accused.mobile || accused.aadhaar) {
            const previousCases = await getPreviousCasesCount(
              accused.mobile, 
              accused.aadhaar, 
              fir.id,
              "accused"
            )
            if (previousCases > 0) repeatOffendersInFir++
          }
        }

        // Check for suspicious bailers in this FIR
        let suspiciousBailersInFir = 0
        for (const bailer of bailerList) {
          if (bailer.mobile || bailer.aadhaar) {
            const wasAccused = await wasPersonAccused(
              bailer.mobile, 
              bailer.aadhaar, 
              fir.id
            )
            if (wasAccused) suspiciousBailersInFir++
          }
        }

        totalRepeatOffenders += repeatOffendersInFir
        totalSuspiciousBailers += suspiciousBailersInFir

        enrichedRecords.push({
          ...fir,
          accused_count: accusedList.length,
          bailer_count: bailerList.length,
          repeat_offenders: repeatOffendersInFir,
          suspicious_bailers: suspiciousBailersInFir
        })
      }

      setFirRecords(enrichedRecords)
      setFilteredRecords(enrichedRecords)
      
      calculateStats(enrichedRecords, {
        totalAccused: totalAccusedCount,
        totalBailers: totalBailerCount,
        repeatOffenders: totalRepeatOffenders,
        suspiciousBailers: totalSuspiciousBailers
      })

      console.log("✅ Loaded", enrichedRecords.length, "FIRs with enhanced data")

    } catch (err) {
      console.error("Error loading FIR details:", err)
    }
  }

  const getPreviousCasesCount = async (
    mobile: string | null, 
    aadhaar: string | null, 
    currentFirId: number,
    table: "accused" | "bailer"
  ): Promise<number> => {
    if (!mobile && !aadhaar) return 0

    try {
      const tableName = table === "accused" ? "accused_details" : "bailer_details"
      let query = supabase
        .from(tableName)
        .select("fir_id", { count: "exact", head: true })
        .neq("fir_id", currentFirId)

      if (mobile && aadhaar) {
        query = query.or(`mobile.eq.${mobile},aadhaar.eq.${aadhaar}`)
      } else if (mobile) {
        query = query.eq("mobile", mobile)
      } else if (aadhaar) {
        query = query.eq("aadhaar", aadhaar)
      }

      const { count } = await query
      return count || 0
    } catch {
      return 0
    }
  }

  const wasPersonAccused = async (
    mobile: string | null, 
    aadhaar: string | null, 
    currentFirId: number
  ): Promise<boolean> => {
    if (!mobile && !aadhaar) return false

    try {
      let query = supabase
        .from("accused_details")
        .select("id", { count: "exact", head: true })
        .neq("fir_id", currentFirId)

      if (mobile && aadhaar) {
        query = query.or(`mobile.eq.${mobile},aadhaar.eq.${aadhaar}`)
      } else if (mobile) {
        query = query.eq("mobile", mobile)
      } else if (aadhaar) {
        query = query.eq("aadhaar", aadhaar)
      }

      const { count } = await query
      return (count || 0) > 0
    } catch {
      return false
    }
  }

  const calculateStats = (records: FIRRecord[], extras?: any) => {
    setStats({
      total: records.length,
      open: records.filter(r => 
        r.case_status === "open" || 
        r.case_status === "registered" || 
        r.case_status === "under_investigation"
      ).length,
      closed: records.filter(r => r.case_status === "closed").length,
      disposed: records.filter(r => r.case_status === "disposed").length,
      totalAccused: extras?.totalAccused || 0,
      totalBailers: extras?.totalBailers || 0,
      repeatOffenders: extras?.repeatOffenders || 0,
      suspiciousBailers: extras?.suspiciousBailers || 0
    })
  }

  const getName = (item: any): string => {
    if (!item) return ""
    return item.name || item.state_name || item.zone_name || item.district_name || 
           item.thana_name || item.court_name || item.crime_name || ""
  }

  const handleFilterChange = (field: string, value: string | boolean) => {
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

      // Repeat offenders filter
      if (filters.show_repeat_offenders) {
        filtered = filtered.filter(r => (r.repeat_offenders || 0) > 0)
      }

      // Suspicious bailers filter
      if (filters.show_suspicious_bailers) {
        filtered = filtered.filter(r => (r.suspicious_bailers || 0) > 0)
      }

      setFilteredRecords(filtered)
      
      // Recalculate stats for filtered data
      const totalAccused = filtered.reduce((sum, r) => sum + (r.accused_count || 0), 0)
      const totalBailers = filtered.reduce((sum, r) => sum + (r.bailer_count || 0), 0)
      const repeatOffenders = filtered.reduce((sum, r) => sum + (r.repeat_offenders || 0), 0)
      const suspiciousBailers = filtered.reduce((sum, r) => sum + (r.suspicious_bailers || 0), 0)
      
      calculateStats(filtered, { totalAccused, totalBailers, repeatOffenders, suspiciousBailers })
      
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
      status: "",
      show_repeat_offenders: false,
      show_suspicious_bailers: false
    })
    setFilteredRecords(firRecords)
    
    // Recalculate original stats
    const totalAccused = firRecords.reduce((sum, r) => sum + (r.accused_count || 0), 0)
    const totalBailers = firRecords.reduce((sum, r) => sum + (r.bailer_count || 0), 0)
    const repeatOffenders = firRecords.reduce((sum, r) => sum + (r.repeat_offenders || 0), 0)
    const suspiciousBailers = firRecords.reduce((sum, r) => sum + (r.suspicious_bailers || 0), 0)
    
    calculateStats(firRecords, { totalAccused, totalBailers, repeatOffenders, suspiciousBailers })
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
      under_investigation: { bg: "bg-yellow-100 text-yellow-700", label: "INVESTIGATING" },
      chargesheet_filed: { bg: "bg-purple-100 text-purple-700", label: "CHARGESHEET" },
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
      
      const headers = [
        "S.No", "FIR Number", "Date", "District", "Thana", "Crime Type", 
        "Train No.", "Train Name", "Status", "Accused", "Bailers", 
        "Repeat Offenders", "Suspicious Bailers"
      ]
      
      const rows = filteredRecords.map((record, index) => [
        index + 1,
        record.fir_number || "",
        formatDate(record.incident_date),
        record.district_name || "",
        record.thana_name || "",
        record.accused_type || "",
        record.train_number_manual || "",
        record.train_name_manual || "",
        record.case_status || "",
        record.accused_count || 0,
        record.bailer_count || 0,
        record.repeat_offenders || 0,
        record.suspicious_bailers || 0
      ])

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `FIR_Enhanced_Report_${new Date().toISOString().split('T')[0]}.csv`
      link.click()

      toast.success("Enhanced report exported successfully!")
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

  // Navigate to Lists
  const navigateToAccusedList = () => {
    router.push('/accused/list')
  }

  const navigateToBailList = () => {
    router.push('/bail/list')
  }

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="lg:ml-72">
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
              <p className="mt-3 text-muted-foreground">Loading Enhanced Reports...</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Sidebar />
      
      <div className="lg:ml-72">
        <div className="min-h-screen bg-background p-4 lg:p-6 print:p-2">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Header */}
            <div className="bg-white border-2 rounded-lg p-4 print:hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Enhanced Reports & Analytics</h1>
                    <p className="text-sm text-muted-foreground">
                      Advanced FIR reports with criminal history tracking
                    </p>
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
            <div className="hidden print:block text-center mb-4 border-b-2 pb-4">
              <h1 className="text-xl font-bold">Enhanced FIR Report</h1>
              <p className="text-sm text-gray-600">Generated on: {new Date().toLocaleDateString("en-IN")}</p>
              <p className="text-xs text-gray-500">Total Records: {filteredRecords.length}</p>
            </div>

            {/* Enhanced Stats Cards - CLICKABLE */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 print:grid-cols-4">
              {[
                { label: "Total FIRs", value: stats.total, color: "text-primary", icon: FileText, bg: "bg-blue-100", link: "/fir/list" },
                { label: "Open", value: stats.open, color: "text-orange-600", icon: Clock, bg: "bg-orange-100", link: null },
                { label: "Closed", value: stats.closed, color: "text-gray-600", icon: XCircle, bg: "bg-gray-100", link: null },
                { label: "Disposed", value: stats.disposed, color: "text-green-600", icon: CheckCircle, bg: "bg-green-100", link: null },
                { label: "Total Accused", value: stats.totalAccused, color: "text-red-600", icon: Users, bg: "bg-red-100", link: "/accused/list" },
                { label: "Total Bailers", value: stats.totalBailers, color: "text-yellow-600", icon: Shield, bg: "bg-yellow-100", link: "/bail/list" },
                { label: "Repeat Offenders", value: stats.repeatOffenders, color: "text-purple-600", icon: History, bg: "bg-purple-100", link: "/accused/list" },
                { label: "Suspicious Bailers", value: stats.suspiciousBailers, color: "text-pink-600", icon: AlertOctagon, bg: "bg-pink-100", link: "/bail/list" },
              ].map((stat, i) => (
                <Card 
                  key={i} 
                  className={`border-2 ${stat.link ? "cursor-pointer hover:scale-105 transition-transform" : ""}`}
                  onClick={() => stat.link && router.push(stat.link)}
                >
                  <CardContent className="py-3 text-center relative">
                    {stat.link && (
                      <ExternalLink className="absolute top-1 right-1 h-3 w-3 text-gray-400" />
                    )}
                    <div className={`p-2 ${stat.bg} rounded-full w-fit mx-auto mb-2`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Alert Cards - CLICKABLE */}
            {(stats.repeatOffenders > 0 || stats.suspiciousBailers > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:hidden">
                {stats.repeatOffenders > 0 && (
                  <Card 
                    className="border-2 border-purple-300 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors"
                    onClick={() => router.push('/accused/list')}
                  >
                    <CardContent className="py-4 flex items-center gap-3">
                      <History className="h-5 w-5 text-purple-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-purple-800">
                          {stats.repeatOffenders} Repeat Offenders Detected!
                        </p>
                        <p className="text-sm text-purple-700">
                          Found across {filteredRecords.filter(r => (r.repeat_offenders || 0) > 0).length} FIRs
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-purple-600" />
                    </CardContent>
                  </Card>
                )}
                {stats.suspiciousBailers > 0 && (
                  <Card 
                    className="border-2 border-pink-300 bg-pink-50 cursor-pointer hover:bg-pink-100 transition-colors"
                    onClick={() => router.push('/bail/list')}
                  >
                    <CardContent className="py-4 flex items-center gap-3">
                      <AlertOctagon className="h-5 w-5 text-pink-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-pink-800">
                          {stats.suspiciousBailers} Suspicious Bailers Found!
                        </p>
                        <p className="text-sm text-pink-700">
                          Bailers with criminal history as accused
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-pink-600" />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Filters */}
            <Card className="border-2 print:hidden">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="h-5 w-5 text-primary" />
                  Advanced Search & Filters
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  
                  {/* FIR Number */}
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <FileSearch className="h-4 w-4" />
                      FIR Number
                    </Label>
                    <Input
                      className="mt-1"
                      placeholder="Search FIR No..."
                      value={filters.fir_number}
                      onChange={(e) => handleFilterChange("fir_number", e.target.value)}
                    />
                  </div>

                  {/* District */}
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      District
                    </Label>
                    <select
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
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
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Thana
                    </Label>
                    <select
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
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
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      Crime Type
                    </Label>
                    <select
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
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
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Accused Name
                    </Label>
                    <Input
                      className="mt-1"
                      placeholder="Search accused..."
                      value={filters.accused_name}
                      onChange={(e) => handleFilterChange("accused_name", e.target.value)}
                    />
                  </div>

                  {/* Bailer Name */}
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <UserCheck className="h-4 w-4" />
                      Bailer Name
                    </Label>
                    <Input
                      className="mt-1"
                      placeholder="Search bailer..."
                      value={filters.bailer_name}
                      onChange={(e) => handleFilterChange("bailer_name", e.target.value)}
                    />
                  </div>

                  {/* Train Number */}
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Train className="h-4 w-4" />
                      Train No./Name
                    </Label>
                    <Input
                      className="mt-1"
                      placeholder="Search train..."
                      value={filters.train_number}
                      onChange={(e) => handleFilterChange("train_number", e.target.value)}
                    />
                  </div>

                  {/* Status */}
                  <div>
                    <Label className="text-sm font-semibold">Status</Label>
                    <select
                      className="w-full mt-1 px-3 py-2 border rounded-lg bg-background"
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
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Date From
                    </Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange("date_from", e.target.value)}
                    />
                  </div>

                  {/* Date To */}
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Date To
                    </Label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={filters.date_to}
                      onChange={(e) => handleFilterChange("date_to", e.target.value)}
                    />
                  </div>
                </div>

                {/* Special Filters */}
                <div className="mt-4 pt-4 border-t">
                  <Label className="text-sm font-semibold mb-3 block">Special Filters</Label>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.show_repeat_offenders}
                        onChange={(e) => handleFilterChange("show_repeat_offenders", e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm flex items-center gap-1">
                        <History className="h-4 w-4 text-purple-600" />
                        Show only FIRs with Repeat Offenders
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.show_suspicious_bailers}
                        onChange={(e) => handleFilterChange("show_suspicious_bailers", e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm flex items-center gap-1">
                        <AlertOctagon className="h-4 w-4 text-pink-600" />
                        Show only FIRs with Suspicious Bailers
                      </span>
                    </label>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="flex gap-3 mt-6">
                  <Button 
                    onClick={handleSearch} 
                    disabled={searching}
                  >
                    {searching ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4 mr-2" />
                    )}
                    Search
                  </Button>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear All Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card className="border-2">
              <CardHeader className="bg-muted/30 border-b pb-4 print:bg-white">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Results ({filteredRecords.length} records)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {filteredRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="font-semibold text-lg">No records found</p>
                    <p className="text-muted-foreground text-sm">Try adjusting your filters</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 print:bg-gray-200">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-bold border-b">#</th>
                          <th className="px-3 py-3 text-left text-xs font-bold border-b">FIR NUMBER</th>
                          <th className="px-3 py-3 text-left text-xs font-bold border-b">DATE</th>
                          <th className="px-3 py-3 text-left text-xs font-bold border-b">DISTRICT</th>
                          <th className="px-3 py-3 text-left text-xs font-bold border-b">THANA</th>
                          <th className="px-3 py-3 text-left text-xs font-bold border-b">CRIME</th>
                          <th className="px-3 py-3 text-left text-xs font-bold border-b">TRAIN</th>
                          <th className="px-3 py-3 text-center text-xs font-bold border-b">ACCUSED</th>
                          <th className="px-3 py-3 text-center text-xs font-bold border-b">BAILERS</th>
                          <th className="px-3 py-3 text-center text-xs font-bold border-b print:hidden">ALERTS</th>
                          <th className="px-3 py-3 text-left text-xs font-bold border-b">STATUS</th>
                          <th className="px-3 py-3 text-center text-xs font-bold border-b print:hidden">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredRecords.map((record, index) => {
                          const hasAlerts = (record.repeat_offenders || 0) > 0 || (record.suspicious_bailers || 0) > 0
                          
                          return (
                            <tr 
                              key={record.id} 
                              className={`hover:bg-muted/50 ${
                                hasAlerts ? "bg-yellow-50/30" : ""
                              }`}
                            >
                              <td className="px-3 py-3 text-sm">{index + 1}</td>
                              <td className="px-3 py-3">
                                <span className="text-sm font-semibold text-primary cursor-pointer hover:underline"
                                  onClick={() => goToFIRDetail(record.id)}
                                >
                                  {record.fir_number}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-sm">{formatDate(record.incident_date)}</td>
                              <td className="px-3 py-3 text-sm">{record.district_name || "-"}</td>
                              <td className="px-3 py-3 text-sm">{record.thana_name || "-"}</td>
                              <td className="px-3 py-3 text-sm">{record.accused_type || "-"}</td>
                              <td className="px-3 py-3 text-sm">
                                {record.train_number_manual || "-"}
                                {record.train_name_manual && (
                                  <span className="text-muted-foreground text-xs block">
                                    {record.train_name_manual}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-center">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs cursor-pointer hover:bg-red-50"
                                  onClick={() => router.push('/accused/list')}
                                >
                                  {record.accused_count || 0}
                                </Badge>
                              </td>
                              <td className="px-3 py-3 text-center">
                                <Badge 
                                  variant="outline" 
                                  className="text-xs cursor-pointer hover:bg-yellow-50"
                                  onClick={() => router.push('/bail/list')}
                                >
                                  {record.bailer_count || 0}
                                </Badge>
                              </td>
                              <td className="px-3 py-3 text-center print:hidden">
                                <div className="flex gap-1 justify-center">
                                  {(record.repeat_offenders || 0) > 0 && (
                                    <Badge 
                                      className="bg-purple-100 text-purple-700 text-[10px] cursor-pointer hover:bg-purple-200"
                                      onClick={() => router.push('/accused/list')}
                                    >
                                      <History className="h-3 w-3 mr-1" />
                                      {record.repeat_offenders}
                                    </Badge>
                                  )}
                                  {(record.suspicious_bailers || 0) > 0 && (
                                    <Badge 
                                      className="bg-pink-100 text-pink-700 text-[10px] cursor-pointer hover:bg-pink-200"
                                      onClick={() => router.push('/bail/list')}
                                    >
                                      <AlertOctagon className="h-3 w-3 mr-1" />
                                      {record.suspicious_bailers}
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                {getStatusBadge(record.case_status)}
                              </td>
                              <td className="px-3 py-3 text-center print:hidden">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => goToFIRDetail(record.id)}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary Sections */}
            {filteredRecords.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
                
                {/* District Wise Summary */}
                <Card className="border-2">
                  <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      District Wise Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto max-h-80">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold">District</th>
                            <th className="px-3 py-2 text-center font-bold">Total</th>
                            <th className="px-3 py-2 text-center font-bold">Open</th>
                            <th className="px-3 py-2 text-center font-bold">Closed</th>
                            <th className="px-3 py-2 text-center font-bold print:hidden">Alerts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(() => {
                            const grouped = filteredRecords.reduce((acc: any, r) => {
                              const key = r.district_name || "Unknown"
                              if (!acc[key]) acc[key] = { 
                                total: 0, open: 0, closed: 0, 
                                repeat_offenders: 0, suspicious_bailers: 0 
                              }
                              acc[key].total++
                              if (["open", "registered", "under_investigation"].includes(r.case_status)) {
                                acc[key].open++
                              } else if (r.case_status === "closed" || r.case_status === "disposed") {
                                acc[key].closed++
                              }
                              acc[key].repeat_offenders += (r.repeat_offenders || 0)
                              acc[key].suspicious_bailers += (r.suspicious_bailers || 0)
                              return acc
                            }, {})
                            return Object.entries(grouped)
                              .sort((a: any, b: any) => b[1].total - a[1].total)
                              .map(([key, val]: [string, any]) => (
                                <tr key={key} className="hover:bg-muted/50">
                                  <td className="px-3 py-2 font-medium">{key}</td>
                                  <td className="px-3 py-2 text-center font-bold">{val.total}</td>
                                  <td className="px-3 py-2 text-center text-orange-600">{val.open}</td>
                                  <td className="px-3 py-2 text-center text-green-600">{val.closed}</td>
                                  <td className="px-3 py-2 text-center print:hidden">
                                    <div className="flex gap-1 justify-center">
                                      {val.repeat_offenders > 0 && (
                                        <Badge className="bg-purple-100 text-purple-700 text-[10px]">
                                          {val.repeat_offenders}
                                        </Badge>
                                      )}
                                      {val.suspicious_bailers > 0 && (
                                        <Badge className="bg-pink-100 text-pink-700 text-[10px]">
                                          {val.suspicious_bailers}
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
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
                  <CardHeader className="bg-muted/30 border-b pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-primary" />
                      Crime Wise Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="overflow-x-auto max-h-80">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left font-bold">Crime Type</th>
                            <th className="px-3 py-2 text-center font-bold">Total</th>
                            <th className="px-3 py-2 text-center font-bold">Open</th>
                            <th className="px-3 py-2 text-center font-bold">Closed</th>
                            <th className="px-3 py-2 text-center font-bold print:hidden">Alerts</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {(() => {
                            const grouped = filteredRecords.reduce((acc: any, r) => {
                              const key = r.accused_type || "Unknown"
                              if (!acc[key]) acc[key] = { 
                                total: 0, open: 0, closed: 0,
                                repeat_offenders: 0, suspicious_bailers: 0
                              }
                              acc[key].total++
                              if (["open", "registered", "under_investigation"].includes(r.case_status)) {
                                acc[key].open++
                              } else if (r.case_status === "closed" || r.case_status === "disposed") {
                                acc[key].closed++
                              }
                              acc[key].repeat_offenders += (r.repeat_offenders || 0)
                              acc[key].suspicious_bailers += (r.suspicious_bailers || 0)
                              return acc
                            }, {})
                            return Object.entries(grouped)
                              .sort((a: any, b: any) => b[1].total - a[1].total)
                              .map(([key, val]: [string, any]) => (
                                <tr key={key} className="hover:bg-muted/50">
                                  <td className="px-3 py-2 font-medium">{key}</td>
                                  <td className="px-3 py-2 text-center font-bold">{val.total}</td>
                                  <td className="px-3 py-2 text-center text-orange-600">{val.open}</td>
                                  <td className="px-3 py-2 text-center text-green-600">{val.closed}</td>
                                  <td className="px-3 py-2 text-center print:hidden">
                                    <div className="flex gap-1 justify-center">
                                      {val.repeat_offenders > 0 && (
                                        <Badge className="bg-purple-100 text-purple-700 text-[10px]">
                                          {val.repeat_offenders}
                                        </Badge>
                                      )}
                                      {val.suspicious_bailers > 0 && (
                                        <Badge className="bg-pink-100 text-pink-700 text-[10px]">
                                          {val.suspicious_bailers}
                                        </Badge>
                                      )}
                                    </div>
                                  </td>
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

            {/* Results Count */}
            {!loading && filteredRecords.length > 0 && (
              <p className="text-sm text-muted-foreground text-center print:mt-4">
                Showing {filteredRecords.length} of {firRecords.length} total FIR records
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}