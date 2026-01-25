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
  UserPlus, 
  Scale, 
  Lock, 
  Clock, 
  Calendar, 
  ArrowRight,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface Stats {
  todayFIRs: number
  monthFIRs: number
  bailCases: number
  custodyCases: number
}

interface RecentFIR {
  id: number
  fir_number: string
  incident_date: string
  incident_time: string
  brief_description: string
  case_status: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<Stats>({
    todayFIRs: 0,
    monthFIRs: 0,
    bailCases: 0,
    custodyCases: 0,
  })
  const [recentFIRs, setRecentFIRs] = useState<RecentFIR[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser()

      if (!currentUser || !currentUser.police_station_id) {
        setLoading(false)
        return
      }

      setUser(currentUser)

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      
      const todayStr = today.toISOString().split("T")[0]
      const monthStr = monthStart.toISOString().split("T")[0]

      const todayQuery = await supabase
        .from("fir_records")
        .select("*", { count: "exact", head: true })
        .eq("police_station_id", currentUser.police_station_id)
        .eq("is_deleted", false)
        .gte("incident_date", todayStr)

      const monthQuery = await supabase
        .from("fir_records")
        .select("*", { count: "exact", head: true })
        .eq("police_station_id", currentUser.police_station_id)
        .eq("is_deleted", false)
        .gte("incident_date", monthStr)

      const firIds = await supabase
        .from("fir_records")
        .select("id")
        .eq("police_station_id", currentUser.police_station_id)
        .eq("is_deleted", false)

      const bailQuery = await supabase
        .from("bail_details")
        .select("*", { count: "exact", head: true })
        .eq("custody_status", "bail")
        .in("fir_id", firIds.data?.map((f) => f.id) || [])

      const custodyQuery = await supabase
        .from("bail_details")
        .select("*", { count: "exact", head: true })
        .eq("custody_status", "custody")
        .in("fir_id", firIds.data?.map((f) => f.id) || [])

      setStats({
        todayFIRs: todayQuery.count || 0,
        monthFIRs: monthQuery.count || 0,
        bailCases: bailQuery.count || 0,
        custodyCases: custodyQuery.count || 0,
      })

      const { data: recentData } = await supabase
        .from("fir_records")
        .select("*")
        .eq("police_station_id", currentUser.police_station_id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(5)

      setRecentFIRs(recentData || [])
    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { className: string, label: string }> = {
      registered: { 
        className: "bg-blue-100 text-blue-800 border-blue-200", 
        label: "Registered" 
      },
      under_investigation: { 
        className: "bg-yellow-100 text-yellow-800 border-yellow-200", 
        label: "Under Investigation" 
      },
      chargesheet_filed: { 
        className: "bg-green-100 text-green-800 border-green-200", 
        label: "Chargesheet Filed" 
      },
      closed: { 
        className: "bg-gray-100 text-gray-800 border-gray-200", 
        label: "Closed" 
      },
    }
    const { className, label } = config[status] || { 
      className: "bg-gray-100 text-gray-800 border-gray-200", 
      label: status 
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${className}`}>
        {label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} title="Dashboard" />
      
      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Today's FIRs */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Today's FIRs</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.todayFIRs}</p>
                  <p className="text-xs text-gray-400 mt-1">Registered today</p>
                </div>
                <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month's FIRs */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">This Month</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.monthFIRs}</p>
                  <p className="text-xs text-gray-400 mt-1">{format(new Date(), "MMMM yyyy")}</p>
                </div>
                <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bail Cases */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Bail Cases</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.bailCases}</p>
                  <p className="text-xs text-gray-400 mt-1">Currently on bail</p>
                </div>
                <div className="h-12 w-12 bg-amber-50 rounded-lg flex items-center justify-center">
                  <Scale className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Custody Cases */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">In Custody</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.custodyCases}</p>
                  <p className="text-xs text-gray-400 mt-1">Under police custody</p>
                </div>
                <div className="h-12 w-12 bg-red-50 rounded-lg flex items-center justify-center">
                  <Lock className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-gray-900">Quick Actions</CardTitle>
            <CardDescription className="text-sm text-gray-500">
              Common tasks and shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/fir/add">
                  <FileText className="mr-2 h-4 w-4" />
                  Add FIR
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/accused/add">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Accused
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent FIRs */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-gray-900">
                  Recent FIRs
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  Latest 5 FIR records
                </CardDescription>
              </div>
              {recentFIRs.length > 0 && (
                <Button asChild variant="outline" size="sm">
                  <Link href="/fir/list">
                    View All
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentFIRs.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-gray-200 rounded-lg bg-gray-50">
                <AlertCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <p className="font-medium text-gray-900">No FIRs found</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  Start by adding your first FIR
                </p>
                <Button asChild size="sm">
                  <Link href="/fir/add">
                    <FileText className="mr-2 h-4 w-4" />
                    Add FIR
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-hidden border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        FIR Number
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">
                        Date & Time
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                        Description
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentFIRs.map((fir) => (
                      <tr key={fir.id}>
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">{fir.fir_number}</div>
                          <div className="text-xs text-gray-500 sm:hidden mt-1">
                            {format(new Date(fir.incident_date), "dd MMM yyyy")}
                          </div>
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          <div className="text-sm text-gray-900">
                            {format(new Date(fir.incident_date), "dd MMM yyyy")}
                          </div>
                          <div className="text-xs text-gray-500">{fir.incident_time}</div>
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <p className="text-sm text-gray-600 line-clamp-2 max-w-xs">
                            {fir.brief_description}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(fir.case_status)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/fir/${fir.id}`}>
                              View
                            </Link>
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
      </div>
    </div>
  )
}