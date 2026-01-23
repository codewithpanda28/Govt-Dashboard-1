"use client"

import { useEffect, useState } from "react"
import { getCurrentUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase/client"
import { Header } from "@/components/layout/Header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, UserPlus, Scale, Lock } from "lucide-react"
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
    const interval = setInterval(loadData, 5 * 60 * 1000) // Refresh every 5 minutes
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

      // Get today's FIRs
      const { count: todayCount } = await supabase
        .from("fir_records")
        .select("*", { count: "exact", head: true })
        .eq("police_station_id", currentUser.police_station_id)
        .eq("is_deleted", false)
        .gte("incident_date", today.toISOString().split("T")[0])

      // Get month's FIRs
      const { count: monthCount } = await supabase
        .from("fir_records")
        .select("*", { count: "exact", head: true })
        .eq("police_station_id", currentUser.police_station_id)
        .eq("is_deleted", false)
        .gte("incident_date", monthStart.toISOString().split("T")[0])

      // Get bail cases
      const { count: bailCount } = await supabase
        .from("bail_details")
        .select("*", { count: "exact", head: true })
        .eq("custody_status", "bail")
        .in(
          "fir_id",
          (
            await supabase
              .from("fir_records")
              .select("id")
              .eq("police_station_id", currentUser.police_station_id)
              .eq("is_deleted", false)
          ).data?.map((f) => f.id) || []
        )

      // Get custody cases
      const { count: custodyCount } = await supabase
        .from("bail_details")
        .select("*", { count: "exact", head: true })
        .eq("custody_status", "custody")
        .in(
          "fir_id",
          (
            await supabase
              .from("fir_records")
              .select("id")
              .eq("police_station_id", currentUser.police_station_id)
              .eq("is_deleted", false)
          ).data?.map((f) => f.id) || []
        )

      setStats({
        todayFIRs: todayCount || 0,
        monthFIRs: monthCount || 0,
        bailCases: bailCount || 0,
        custodyCases: custodyCount || 0,
      })

      // Get recent FIRs
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
    const variants: Record<string, "default" | "success" | "warning" | "destructive"> = {
      registered: "default",
      under_investigation: "warning",
      chargesheet_filed: "success",
      closed: "destructive",
    }
    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace("_", " ").toUpperCase()}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} title="Dashboard" />
      <div className="p-4 lg:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's FIRs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayFIRs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month's FIRs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthFIRs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bail Cases</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bailCases}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custody Cases</CardTitle>
              <Lock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.custodyCases}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
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
          </CardContent>
        </Card>

        {/* Recent FIRs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent FIRs</CardTitle>
            <CardDescription>Latest 5 FIR records</CardDescription>
          </CardHeader>
          <CardContent>
            {recentFIRs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No FIRs found</p>
            ) : (
              <div className="space-y-4">
                {recentFIRs.map((fir) => (
                  <div
                    key={fir.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/fir/${fir.id}`}
                          className="font-semibold hover:text-primary"
                        >
                          {fir.fir_number}
                        </Link>
                        {getStatusBadge(fir.case_status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(fir.incident_date), "dd MMM yyyy")} at{" "}
                        {fir.incident_time}
                      </p>
                      <p className="text-sm mt-1 line-clamp-1">{fir.brief_description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {recentFIRs.length > 0 && (
              <div className="mt-4 text-center">
                <Button asChild variant="outline">
                  <Link href="/fir/list">View All FIRs</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


