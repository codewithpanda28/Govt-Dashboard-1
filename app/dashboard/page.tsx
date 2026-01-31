"use client"

import { useEffect, useState } from "react"
import { getCurrentUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase/client"
import { Header } from "@/components/layout/Header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Scale, 
  Lock, 
  Users,
  UserX,
  Building2,
  MapPin,
  UserCheck,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  BarChart3,
  User,
  ShieldCheck,
  Info
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"

interface Stats {
  totalDistricts: number
  totalThanas: number
  totalFIRs: number
  totalAccused: number
  totalVictims: number
  totalBailers: number
  totalBailed: number
  totalCustody: number
}

interface RecentFIR {
  id: number
  fir_number: string
  incident_date: string
  incident_time: string
  brief_description: string
  case_status: string
  accused_count?: number
  victim_count?: number
  bailer_count?: number
  accused_names?: string[]
  victim_names?: string[]
  bailer_names?: string[]
  district_name?: string
  thana_name?: string
}

interface TopAccused {
  id: number
  name: string
  father_name: string | null
  age: number | null
  gender: string | null
  mobile: string | null
  accused_type: string | null
  fir_number: string
  fir_id: number
}

interface TopBailer {
  id: number
  name: string
  father_name: string | null
  mobile: string | null
  aadhaar: string | null
  fir_number: string
  fir_id: number
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats>({
    totalDistricts: 0,
    totalThanas: 0,
    totalFIRs: 0,
    totalAccused: 0,
    totalVictims: 0,
    totalBailers: 0,
    totalBailed: 0,
    totalCustody: 0,
  })
  const [recentFIRs, setRecentFIRs] = useState<RecentFIR[]>([])
  const [topAccused, setTopAccused] = useState<TopAccused[]>([])
  const [topBailers, setTopBailers] = useState<TopBailer[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // 🔥 User location info
  const [userThanaName, setUserThanaName] = useState<string>("")
  const [userDistrictName, setUserDistrictName] = useState<string>("")
  const [accessLevel, setAccessLevel] = useState<string>("limited")

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // 🔥🔥🔥 MAIN FUNCTION WITH ROLE-BASED FILTERING 🔥🔥🔥
  const loadData = async () => {
    try {
      console.log("🔄 Loading dashboard data...")
      
      const currentUser = await getCurrentUser()
      console.log("👤 Current user:", currentUser)

      if (!currentUser) {
        console.error("❌ No user found - redirecting to login")
        window.location.href = '/login'
        return
      }

      setUser(currentUser)

      // 🔥 GET USER'S ROLE AND ASSIGNED LOCATIONS
      const userRole = currentUser.role || 'station_officer'
      const userThanaId = currentUser.thana_id
      const userDistrictId = currentUser.district_id

      console.log("🔐 User Access Level:", {
        email: currentUser.email,
        role: userRole,
        thana_id: userThanaId,
        district_id: userDistrictId
      })

      // 🔥 FETCH THANA NAME IF ASSIGNED
      if (userThanaId) {
        const { data: thanaData } = await supabase
          .from("thanas")
          .select("name")
          .eq("id", userThanaId)
          .single()
        
        if (thanaData) {
          setUserThanaName(thanaData.name)
          console.log("🏢 User's Thana:", thanaData.name)
        }
      }

      // 🔥 FETCH DISTRICT NAME IF ASSIGNED
      if (userDistrictId) {
        const { data: districtData } = await supabase
          .from("districts")
          .select("name")
          .eq("id", userDistrictId)
          .single()
        
        if (districtData) {
          setUserDistrictName(districtData.name)
          console.log("🏛️ User's District:", districtData.name)
        }
      }

      // 🔥 DETERMINE ACCESS LEVEL
      const isAdmin = ['super_admin', 'admin'].includes(userRole)
      const isDistrictAdmin = userRole === 'district_admin'
      
      if (isAdmin) {
        setAccessLevel("admin")
      } else if (isDistrictAdmin) {
        setAccessLevel("district")
      } else {
        setAccessLevel("thana")
      }

      // 🔥🔥🔥 BUILD FIR QUERY BASED ON ROLE 🔥🔥🔥
      let firQuery = supabase.from("fir_records").select("*")

      // Add is_deleted filter if column exists
      try {
        firQuery = firQuery.eq("is_deleted", false)
      } catch (e) {
        console.log("is_deleted column might not exist, continuing without filter")
      }

      // 🔥 APPLY ROLE-BASED FILTER
      if (isAdmin) {
        // Admin sees ALL FIRs
        console.log("👑 ADMIN - Showing ALL FIRs (no filter)")
      } else if (isDistrictAdmin && userDistrictId) {
        // District Admin sees only their district's FIRs
        console.log("🏛️ DISTRICT ADMIN - Filtering by district_id:", userDistrictId)
        firQuery = firQuery.eq("district_id", userDistrictId)
      } else if (userThanaId) {
        // Station Officer sees only their thana's FIRs
        console.log("🏢 STATION OFFICER - Filtering by thana_id:", userThanaId)
        firQuery = firQuery.eq("thana_id", userThanaId)
      } else {
        // No assignment - show empty data
        console.warn("⚠️ User has NO thana_id or district_id! Showing empty dashboard.")
        setStats({
          totalDistricts: 0,
          totalThanas: 0,
          totalFIRs: 0,
          totalAccused: 0,
          totalVictims: 0,
          totalBailers: 0,
          totalBailed: 0,
          totalCustody: 0,
        })
        setRecentFIRs([])
        setTopAccused([])
        setTopBailers([])
        setMonthlyData([])
        setLoading(false)
        return
      }

      // Execute query
      const { data: firRecords, error: firError } = await firQuery

      if (firError) {
        console.error("❌ Error fetching FIRs:", firError)
        
        // Retry without is_deleted filter
        let retryQuery = supabase.from("fir_records").select("*")
        
        if (isAdmin) {
          // No filter
        } else if (isDistrictAdmin && userDistrictId) {
          retryQuery = retryQuery.eq("district_id", userDistrictId)
        } else if (userThanaId) {
          retryQuery = retryQuery.eq("thana_id", userThanaId)
        }

        const { data: retryData, error: retryError } = await retryQuery

        if (retryError) {
          console.error("❌ Retry also failed:", retryError)
          setLoading(false)
          return
        }

        console.log("✅ FIRs found (retry):", retryData?.length || 0)
        const firIdArray = (retryData || []).map((f) => f.id)
        await loadStats(firIdArray, retryData || [])
        await loadTopAccused(firIdArray, retryData || [])
        await loadTopBailers(firIdArray, retryData || [])
        setLoading(false)
        return
      }

      console.log("✅ FIRs found for user:", firRecords?.length || 0)

      if (!firRecords || firRecords.length === 0) {
        console.log("⚠️ No FIRs found for this user's area")
        setStats({
          totalDistricts: userDistrictId ? 1 : 0,
          totalThanas: userThanaId ? 1 : 0,
          totalFIRs: 0,
          totalAccused: 0,
          totalVictims: 0,
          totalBailers: 0,
          totalBailed: 0,
          totalCustody: 0,
        })
        setRecentFIRs([])
        setTopAccused([])
        setTopBailers([])
        loadMonthlyData([])
        setLoading(false)
        return
      }

      const firIdArray = firRecords.map((f) => f.id)
      
      await loadStats(firIdArray, firRecords)
      await loadTopAccused(firIdArray, firRecords)
      await loadTopBailers(firIdArray, firRecords)

    } catch (error) {
      console.error("❌ Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async (firIdArray: number[], firRecords: any[]) => {
    console.log("📊 Loading stats for", firIdArray.length, "FIRs")

    if (firIdArray.length === 0) {
      setStats({
        totalDistricts: 0,
        totalThanas: 0,
        totalFIRs: 0,
        totalAccused: 0,
        totalVictims: 0,
        totalBailers: 0,
        totalBailed: 0,
        totalCustody: 0,
      })
      setRecentFIRs([])
      loadMonthlyData([])
      return
    }

    const totalFIRs = firRecords.length

    // Total Accused
    const { count: accusedCount } = await supabase
      .from("accused_details")
      .select("*", { count: "exact", head: true })
      .in("fir_id", firIdArray)

    console.log("✅ Total accused:", accusedCount)

    // Total Victims
    const { count: victimCount } = await supabase
      .from("victim_details")
      .select("*", { count: "exact", head: true })
      .in("fir_id", firIdArray)

    console.log("✅ Total victims:", victimCount)

    // Total Bailers
    const { count: bailerCount } = await supabase
      .from("bailer_details")
      .select("*", { count: "exact", head: true })
      .in("fir_id", firIdArray)

    console.log("✅ Total bailers:", bailerCount)

    // Total Bailed
    let bailedCount = 0
    const { count: bailCount1 } = await supabase
      .from("bail_details")
      .select("*", { count: "exact", head: true })
      .eq("custody_status", "bail")
      .in("fir_id", firIdArray)

    if (bailCount1) {
      bailedCount = bailCount1
    } else {
      const { count: bailCount2 } = await supabase
        .from("bail_details")
        .select("*", { count: "exact", head: true })
        .in("fir_id", firIdArray)
      bailedCount = bailCount2 || 0
    }

    console.log("✅ Total bailed:", bailedCount)

    // Total Custody
    const { count: custodyCount } = await supabase
      .from("accused_details")
      .select("*", { count: "exact", head: true })
      .eq("accused_type", "arrested")
      .in("fir_id", firIdArray)

    console.log("✅ Total custody:", custodyCount)

    // Get unique districts and thanas
    const uniqueDistricts = new Set(firRecords.map(f => f.district_name || f.district_id).filter(Boolean))
    const uniqueThanas = new Set(firRecords.map(f => f.thana_name || f.thana_id).filter(Boolean))

    const finalStats = {
      totalDistricts: uniqueDistricts.size || 1,
      totalThanas: uniqueThanas.size || 1,
      totalFIRs: totalFIRs,
      totalAccused: accusedCount || 0,
      totalVictims: victimCount || 0,
      totalBailers: bailerCount || 0,
      totalBailed: bailedCount,
      totalCustody: custodyCount || 0,
    }
    
    console.log("📊 Final Stats:", finalStats)
    setStats(finalStats)

    await loadRecentFIRs(firRecords)
    loadMonthlyData(firRecords)
  }

  const loadTopAccused = async (firIdArray: number[], firRecords: any[]) => {
    if (firIdArray.length === 0) {
      setTopAccused([])
      return
    }

    console.log("👤 Loading Top 10 Accused...")
    
    const { data: accusedData } = await supabase
      .from("accused_details")
      .select("*")
      .in("fir_id", firIdArray)
      .order("created_at", { ascending: false })
      .limit(10)

    const accusedWithFIR = (accusedData || []).map(acc => {
      const fir = firRecords.find(f => f.id === acc.fir_id)
      return {
        id: acc.id,
        name: acc.name || "Unknown",
        father_name: acc.father_name,
        age: acc.age,
        gender: acc.gender,
        mobile: acc.mobile,
        accused_type: acc.accused_type,
        fir_number: fir?.fir_number || "N/A",
        fir_id: acc.fir_id
      }
    })

    console.log("✅ Top 10 Accused loaded:", accusedWithFIR.length)
    setTopAccused(accusedWithFIR)
  }

  const loadTopBailers = async (firIdArray: number[], firRecords: any[]) => {
    if (firIdArray.length === 0) {
      setTopBailers([])
      return
    }

    console.log("🛡️ Loading Top 10 Bailers...")
    
    const { data: bailerData } = await supabase
      .from("bailer_details")
      .select("*")
      .in("fir_id", firIdArray)
      .order("created_at", { ascending: false })
      .limit(10)

    const bailersWithFIR = (bailerData || []).map(b => {
      const fir = firRecords.find(f => f.id === b.fir_id)
      return {
        id: b.id,
        name: b.name || "Unknown",
        father_name: b.father_name,
        mobile: b.mobile,
        aadhaar: b.aadhaar,
        fir_number: fir?.fir_number || "N/A",
        fir_id: b.fir_id
      }
    })

    console.log("✅ Top 10 Bailers loaded:", bailersWithFIR.length)
    setTopBailers(bailersWithFIR)
  }

  const loadRecentFIRs = async (firRecords: any[]) => {
    if (firRecords.length === 0) {
      setRecentFIRs([])
      return
    }

    const sortedFIRs = firRecords
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 6)

    const recentFirIds = sortedFIRs.map(f => f.id)
    
    const { data: accusedForRecent } = await supabase
      .from("accused_details")
      .select("*")
      .in("fir_id", recentFirIds)

    const { data: victimsForRecent } = await supabase
      .from("victim_details")
      .select("*")
      .in("fir_id", recentFirIds)

    const { data: bailersForRecent } = await supabase
      .from("bailer_details")
      .select("*")
      .in("fir_id", recentFirIds)

    const formattedFIRs = sortedFIRs.map((fir: any) => {
      const firAccused = accusedForRecent?.filter(a => a.fir_id === fir.id) || []
      const firVictims = victimsForRecent?.filter(v => v.fir_id === fir.id) || []
      const firBailers = bailersForRecent?.filter(b => b.fir_id === fir.id) || []

      return {
        id: fir.id,
        fir_number: fir.fir_number || "N/A",
        incident_date: fir.incident_date || "",
        incident_time: fir.incident_time || "",
        brief_description: fir.brief_description || "",
        case_status: fir.case_status || "open",
        accused_count: firAccused.length,
        victim_count: firVictims.length,
        bailer_count: firBailers.length,
        accused_names: firAccused.map(a => a.name || "Unknown"),
        victim_names: firVictims.map(v => v.name || "Unknown"),
        bailer_names: firBailers.map(b => b.name || "Unknown"),
        district_name: fir.district_name || "N/A",
        thana_name: fir.thana_name || "N/A",
      }
    })

    setRecentFIRs(formattedFIRs)
  }

  const loadMonthlyData = (firRecords: any[]) => {
    const monthlyFIRs = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const monthFirs = firRecords.filter(fir => {
        if (!fir.incident_date) return false
        const firDate = new Date(fir.incident_date)
        return firDate >= monthStart && firDate <= monthEnd
      })

      monthlyFIRs.push({
        month: format(monthStart, "MMM yyyy"),
        firs: monthFirs.length
      })
    }

    setMonthlyData(monthlyFIRs)
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string, label: string }> = {
      registered: { className: "bg-blue-50 text-blue-700 border-2 border-blue-200 font-semibold", label: "Registered" },
      under_investigation: { className: "bg-yellow-50 text-yellow-700 border-2 border-yellow-200 font-semibold", label: "Under Investigation" },
      chargesheet_filed: { className: "bg-green-50 text-green-700 border-2 border-green-200 font-semibold", label: "Chargesheet Filed" },
      closed: { className: "bg-gray-50 text-gray-700 border-2 border-gray-200 font-semibold", label: "Closed" },
      open: { className: "bg-emerald-50 text-emerald-700 border-2 border-emerald-200 font-semibold", label: "Open" },
    }
    const { className, label } = config[status] || { className: "bg-gray-50 text-gray-700 border-2 border-gray-200 font-semibold", label: status }
    return <Badge variant="outline" className={className}>{label}</Badge>
  }

  const getAccusedTypeBadge = (type: string | null) => {
    const config: Record<string, string> = {
      unknown: "bg-gray-100 text-gray-700",
      known: "bg-blue-100 text-blue-700",
      arrested: "bg-red-100 text-red-700",
      absconding: "bg-orange-100 text-orange-700",
      bailed: "bg-green-100 text-green-700"
    }
    const cls = config[type?.toLowerCase() || "unknown"] || "bg-gray-100 text-gray-700"
    return <Badge className={cls}>{type?.toUpperCase() || "UNKNOWN"}</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/10">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mx-auto gov-shadow-lg"></div>
          <p className="mt-6 text-base font-semibold text-primary">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrapper">
      <Header user={user} title="Dashboard" />
      
      <div className="page-container page-section space-y-6">
        
        {/* 🔥 USER INFO BANNER */}
        <Card className="bg-gradient-to-r from-primary/5 to-secondary/5 border-2 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center border-2 border-primary/20">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-primary">Welcome, {user?.full_name}</h2>
                  <p className="text-sm text-gray-600">{user?.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-primary/10 text-primary border border-primary/20">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  {user?.role?.replace(/_/g, ' ').toUpperCase()}
                </Badge>
                {userThanaName && (
                  <Badge className="bg-blue-100 text-blue-700 border border-blue-200">
                    <Building2 className="h-3 w-3 mr-1" />
                    {userThanaName}
                  </Badge>
                )}
                {userDistrictName && (
                  <Badge className="bg-green-100 text-green-700 border border-green-200">
                    <MapPin className="h-3 w-3 mr-1" />
                    {userDistrictName}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 🔥 ACCESS LEVEL NOTICE */}
        {accessLevel !== "admin" && (
          <Card className="bg-amber-50 border-2 border-amber-200">
            <CardContent className="p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-amber-800">Limited Data View</p>
                <p className="text-sm text-amber-700">
                  You are viewing data for <strong>{userThanaName || userDistrictName || 'your assigned area'}</strong> only.
                  {stats.totalFIRs === 0 && " No FIRs have been registered for your area yet."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid - 8 Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Districts */}
          <Card className="border-2 border-purple-100 bg-gradient-to-br from-purple-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gov-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-600 uppercase tracking-wide">Total Districts</p>
                  <p className="text-4xl font-bold text-purple-900 mt-2">{stats.totalDistricts}</p>
                  <p className="text-xs text-purple-600/70 mt-1 font-medium">
                    {accessLevel === "admin" ? "All areas" : "Your area"}
                  </p>
                </div>
                <div className="h-14 w-14 bg-purple-100 rounded-xl flex items-center justify-center border-2 border-purple-200 gov-shadow">
                  <MapPin className="h-7 w-7 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Thanas */}
          <Card className="border-2 border-indigo-100 bg-gradient-to-br from-indigo-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gov-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">Total Thanas</p>
                  <p className="text-4xl font-bold text-indigo-900 mt-2">{stats.totalThanas}</p>
                  <p className="text-xs text-indigo-600/70 mt-1 font-medium">Police stations</p>
                </div>
                <div className="h-14 w-14 bg-indigo-100 rounded-xl flex items-center justify-center border-2 border-indigo-200 gov-shadow">
                  <Building2 className="h-7 w-7 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total FIRs */}
          <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gov-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Total FIRs</p>
                  <p className="text-4xl font-bold text-blue-900 mt-2">{stats.totalFIRs}</p>
                  <p className="text-xs text-blue-600/70 mt-1 font-medium">
                    {accessLevel === "admin" ? "All cases" : "Your cases"}
                  </p>
                </div>
                <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center border-2 border-blue-200 gov-shadow">
                  <FileText className="h-7 w-7 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Accused */}
          <Card className="border-2 border-orange-100 bg-gradient-to-br from-orange-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gov-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-orange-600 uppercase tracking-wide">Total Accused</p>
                  <p className="text-4xl font-bold text-orange-900 mt-2">{stats.totalAccused}</p>
                  <p className="text-xs text-orange-600/70 mt-1 font-medium">From your FIRs</p>
                </div>
                <div className="h-14 w-14 bg-orange-100 rounded-xl flex items-center justify-center border-2 border-orange-200 gov-shadow">
                  <Users className="h-7 w-7 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Victims */}
          <Card className="border-2 border-cyan-100 bg-gradient-to-br from-cyan-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gov-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-cyan-600 uppercase tracking-wide">Total Victims</p>
                  <p className="text-4xl font-bold text-cyan-900 mt-2">{stats.totalVictims}</p>
                  <p className="text-xs text-cyan-600/70 mt-1 font-medium">All victims</p>
                </div>
                <div className="h-14 w-14 bg-cyan-100 rounded-xl flex items-center justify-center border-2 border-cyan-200 gov-shadow">
                  <UserCheck className="h-7 w-7 text-cyan-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Bailers */}
          <Card className="border-2 border-emerald-100 bg-gradient-to-br from-emerald-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gov-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-emerald-600 uppercase tracking-wide">Total Bailers</p>
                  <p className="text-4xl font-bold text-emerald-900 mt-2">{stats.totalBailers}</p>
                  <p className="text-xs text-emerald-600/70 mt-1 font-medium">All bailers</p>
                </div>
                <div className="h-14 w-14 bg-emerald-100 rounded-xl flex items-center justify-center border-2 border-emerald-200 gov-shadow">
                  <ShieldCheck className="h-7 w-7 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Bailed */}
          <Card className="border-2 border-amber-100 bg-gradient-to-br from-amber-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gov-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-600 uppercase tracking-wide">Total Bailed</p>
                  <p className="text-4xl font-bold text-amber-900 mt-2">{stats.totalBailed}</p>
                  <p className="text-xs text-amber-600/70 mt-1 font-medium">On bail</p>
                </div>
                <div className="h-14 w-14 bg-amber-100 rounded-xl flex items-center justify-center border-2 border-amber-200 gov-shadow">
                  <Scale className="h-7 w-7 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Custody Cases */}
          <Card className="border-2 border-red-100 bg-gradient-to-br from-red-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gov-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-600 uppercase tracking-wide">Custody Cases</p>
                  <p className="text-4xl font-bold text-red-900 mt-2">{stats.totalCustody}</p>
                  <p className="text-xs text-red-600/70 mt-1 font-medium">In custody</p>
                </div>
                <div className="h-14 w-14 bg-red-100 rounded-xl flex items-center justify-center border-2 border-red-200 gov-shadow">
                  <Lock className="h-7 w-7 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graphs Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Graph 1: Monthly FIRs Trend */}
          <Card className="border-2 border-primary/20 gov-shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="border-b-2 border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
              <CardTitle className="flex items-center gap-3 text-primary">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center border-2 border-primary/20">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <span className="text-lg font-bold">FIRs Trend</span>
                  <CardDescription className="text-xs mt-0.5">Last 6 months overview</CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    stroke="#9ca3af"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="firs" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    name="FIRs"
                    dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Graph 2: Case Status Distribution */}
          <Card className="border-2 border-secondary/20 gov-shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="border-b-2 border-secondary/10 bg-gradient-to-r from-secondary/5 to-transparent">
              <CardTitle className="flex items-center gap-3 text-primary">
                <div className="h-10 w-10 bg-secondary/10 rounded-lg flex items-center justify-center border-2 border-secondary/20">
                  <BarChart3 className="h-5 w-5 text-secondary" />
                </div>
                <div>
                  <span className="text-lg font-bold">Case Status</span>
                  <CardDescription className="text-xs mt-0.5">Distribution overview</CardDescription>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={[
                  { status: "Open", count: Math.max(0, stats.totalFIRs - stats.totalCustody - stats.totalBailed) },
                  { status: "Custody", count: stats.totalCustody },
                  { status: "Bailed", count: stats.totalBailed },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="status" 
                    tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }}
                    stroke="#9ca3af"
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: '#6b7280' }}
                    stroke="#9ca3af"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--secondary))" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top 10 Accused & Top 10 Bailers */}
        <div className="grid gap-6 lg:grid-cols-2">
          
          {/* Top 10 Accused */}
          <Card className="border-2 border-orange-200 gov-shadow-lg">
            <CardHeader className="border-b-2 border-orange-100 bg-gradient-to-r from-orange-50 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center border-2 border-orange-200">
                    <User className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-orange-700">Top 10 Accused</CardTitle>
                    <CardDescription className="text-xs">
                      {accessLevel === "admin" ? "Recently added" : "From your area"}
                    </CardDescription>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="border-orange-200 text-orange-700 hover:bg-orange-50">
                  <Link href="/accused/list">
                    View All
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {topAccused.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <UserX className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium">No accused found</p>
                  {accessLevel !== "admin" && (
                    <p className="text-sm text-gray-400 mt-1">No accused in your assigned area</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {topAccused.map((accused, index) => (
                    <div 
                      key={accused.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{accused.name}</p>
                          <p className="text-xs text-gray-500">
                            {accused.father_name && `S/o ${accused.father_name}`}
                            {accused.age && ` • ${accused.age} yrs`}
                            {accused.gender && ` • ${accused.gender}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getAccusedTypeBadge(accused.accused_type)}
                        <Link 
                          href={`/fir/${accused.fir_id}`}
                          className="block text-xs text-blue-600 hover:underline mt-1"
                        >
                          {accused.fir_number}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top 10 Bailers */}
          <Card className="border-2 border-emerald-200 gov-shadow-lg">
            <CardHeader className="border-b-2 border-emerald-100 bg-gradient-to-r from-emerald-50 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-emerald-100 rounded-lg flex items-center justify-center border-2 border-emerald-200">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-emerald-700">Top 10 Bailers</CardTitle>
                    <CardDescription className="text-xs">
                      {accessLevel === "admin" ? "Recently added" : "From your area"}
                    </CardDescription>
                  </div>
                </div>
                <Button asChild variant="outline" size="sm" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                  <Link href="/bailers/list">
                    View All
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {topBailers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="font-medium">No bailers found</p>
                  {accessLevel !== "admin" && (
                    <p className="text-sm text-gray-400 mt-1">No bailers in your assigned area</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {topBailers.map((bailer, index) => (
                    <div 
                      key={bailer.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-emerald-50 transition-colors border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{bailer.name}</p>
                          <p className="text-xs text-gray-500">
                            {bailer.father_name && `S/o ${bailer.father_name}`}
                            {bailer.mobile && ` • ${bailer.mobile}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-emerald-100 text-emerald-700">BAILER</Badge>
                        <Link 
                          href={`/fir/${bailer.fir_id}`}
                          className="block text-xs text-blue-600 hover:underline mt-1"
                        >
                          {bailer.fir_number}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent FIRs Table */}
        <Card className="border-2 border-primary/20 gov-shadow-lg">
          <CardHeader className="pb-4 border-b-2 border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center border-2 border-primary/20">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold text-primary">
                    Recent FIRs {accessLevel !== "admin" && userThanaName && `(${userThanaName})`}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Latest {recentFIRs.length} FIR records
                  </CardDescription>
                </div>
              </div>
              {recentFIRs.length > 0 && (
                <Button asChild variant="outline" size="sm" className="border-2 border-primary/20 text-primary hover:bg-primary hover:text-white font-semibold transition-all">
                  <Link href="/fir/list">
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {recentFIRs.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-primary/20 rounded-xl bg-gradient-to-br from-primary/5 to-transparent">
                <div className="mx-auto h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 border-2 border-primary/20">
                  <AlertCircle className="h-10 w-10 text-primary" />
                </div>
                <p className="font-bold text-primary text-xl">No FIRs found</p>
                <p className="text-sm text-gray-600 mt-2 mb-6">
                  {accessLevel === "admin" 
                    ? "Start by adding your first FIR to get started"
                    : `No FIRs registered for ${userThanaName || userDistrictName || 'your area'} yet.`
                  }
                </p>
                <Button asChild size="lg" className="font-semibold">
                  <Link href="/fir/add">
                    <FileText className="mr-2 h-5 w-5" />
                    Add Your First FIR
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden border-2 border-gray-200 rounded-xl gov-shadow">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-primary to-primary/95 border-b-2 border-primary-foreground/20">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          FIR Number
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Accused
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Victims
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Bailers
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-4 text-right text-xs font-bold text-white uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y-2 divide-gray-100">
                      {recentFIRs.map((fir) => (
                        <tr key={fir.id} className="hover:bg-primary/5 transition-colors">
                          <td className="px-4 py-4">
                            <div className="font-bold text-primary">{fir.fir_number}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-semibold text-gray-900">
                              {fir.incident_date ? format(new Date(fir.incident_date), "dd MMM yyyy") : "N/A"}
                            </div>
                            <div className="text-xs text-gray-600 font-medium">{fir.incident_time || "N/A"}</div>
                          </td>
                          <td className="px-4 py-4">
                            {fir.accused_count === 0 ? (
                              <div className="flex items-center text-gray-400">
                                <UserX className="h-4 w-4 mr-1" />
                                <span className="text-xs font-medium">Unknown</span>
                              </div>
                            ) : (
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {fir.accused_names?.[0]}
                                </div>
                                {fir.accused_count! > 1 && (
                                  <div className="text-xs text-gray-600 font-medium">
                                    +{fir.accused_count! - 1} more
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {fir.victim_count === 0 ? (
                              <span className="text-xs text-gray-400 font-medium">-</span>
                            ) : (
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {fir.victim_names?.[0]}
                                </div>
                                {fir.victim_count! > 1 && (
                                  <div className="text-xs text-gray-600 font-medium">
                                    +{fir.victim_count! - 1} more
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {fir.bailer_count === 0 ? (
                              <span className="text-xs text-gray-400 font-medium">-</span>
                            ) : (
                              <div>
                                <div className="text-sm font-semibold text-gray-900">
                                  {fir.bailer_names?.[0]}
                                </div>
                                {fir.bailer_count! > 1 && (
                                  <div className="text-xs text-gray-600 font-medium">
                                    +{fir.bailer_count! - 1} more
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {getStatusBadge(fir.case_status)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Button asChild variant="ghost" size="sm" className="font-semibold text-primary hover:bg-primary/10 border-2 border-transparent hover:border-primary/20">
                              <Link href={`/fir/${fir.id}`}>
                                View
                                <ArrowRight className="ml-1 h-4 w-4" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y-2 divide-gray-100">
                  {recentFIRs.map((fir) => (
                    <div key={fir.id} className="p-4 hover:bg-primary/5 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="font-bold text-primary">{fir.fir_number}</div>
                          <div className="text-xs text-gray-600 mt-1 font-medium">
                            {fir.incident_date ? format(new Date(fir.incident_date), "dd MMM yyyy") : "N/A"} • {fir.incident_time || "N/A"}
                          </div>
                        </div>
                        {getStatusBadge(fir.case_status)}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start">
                          <span className="text-gray-600 w-20 font-semibold">Accused:</span>
                          {fir.accused_count === 0 ? (
                            <span className="text-gray-400 font-medium">Unknown</span>
                          ) : (
                            <span className="font-semibold text-gray-900">
                              {fir.accused_names?.[0]}
                              {fir.accused_count! > 1 && ` +${fir.accused_count! - 1}`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start">
                          <span className="text-gray-600 w-20 font-semibold">Victims:</span>
                          {fir.victim_count === 0 ? (
                            <span className="text-gray-400 font-medium">-</span>
                          ) : (
                            <span className="font-semibold text-gray-900">
                              {fir.victim_names?.[0]}
                              {fir.victim_count! > 1 && ` +${fir.victim_count! - 1}`}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start">
                          <span className="text-gray-600 w-20 font-semibold">Bailers:</span>
                          {fir.bailer_count === 0 ? (
                            <span className="text-gray-400 font-medium">-</span>
                          ) : (
                            <span className="font-semibold text-gray-900">
                              {fir.bailer_names?.[0]}
                              {fir.bailer_count! > 1 && ` +${fir.bailer_count! - 1}`}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <Button asChild variant="outline" size="sm" className="w-full mt-4 font-semibold border-2 border-primary/20 text-primary hover:bg-primary hover:text-white">
                        <Link href={`/fir/${fir.id}`}>
                          View Details
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}