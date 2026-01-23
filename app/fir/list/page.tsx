"use client"

import { useEffect, useState } from "react"
import { getCurrentUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase/client"
import { Header } from "@/components/layout/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Eye, Edit } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FIR {
  id: number
  fir_number: string
  incident_date: string
  incident_time: string
  brief_description: string
  case_status: string
  modus_operandi: { name: string } | null
}

export default function FIRListPage() {
  const [user, setUser] = useState<any>(null)
  const [firs, setFirs] = useState<FIR[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadFIRs()
    }
  }, [user, searchTerm, statusFilter, dateFrom, dateTo, page])

  const loadUser = async () => {
    const currentUser = await getCurrentUser()
    setUser(currentUser)
  }

  const loadFIRs = async () => {
    if (!user?.police_station_id) return

    setLoading(true)
    try {
      let query = supabase
        .from("fir_records")
        .select(`
          *,
          modus_operandi:modus_operandi_id (name)
        `)
        .eq("police_station_id", user.police_station_id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })

      if (searchTerm) {
        query = query.ilike("fir_number", `%${searchTerm}%`)
      }

      if (statusFilter !== "all") {
        query = query.eq("case_status", statusFilter)
      }

      if (dateFrom) {
        query = query.gte("incident_date", dateFrom)
      }

      if (dateTo) {
        query = query.lte("incident_date", dateTo)
      }

      const { data, error } = await query.range(
        (page - 1) * pageSize,
        page * pageSize - 1
      )

      if (error) throw error
      setFirs(data || [])
    } catch (error) {
      console.error("Error loading FIRs:", error)
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

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} title="My FIRs" />
      <div className="p-4 lg:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>FIR Records</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search FIR number..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="registered">Registered</SelectItem>
                  <SelectItem value="under_investigation">Under Investigation</SelectItem>
                  <SelectItem value="chargesheet_filed">Chargesheet Filed</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="From Date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setPage(1)
                }}
              />
              <Input
                type="date"
                placeholder="To Date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(1)
                }}
              />
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading...</p>
              </div>
            ) : firs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No FIRs found
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">FIR No</th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Crime</th>
                        <th className="text-left p-2">Status</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {firs.map((fir) => (
                        <tr key={fir.id} className="border-b hover:bg-accent/50">
                          <td className="p-2 font-medium">{fir.fir_number}</td>
                          <td className="p-2">
                            {format(new Date(fir.incident_date), "dd MMM yyyy")}
                          </td>
                          <td className="p-2">{fir.incident_time}</td>
                          <td className="p-2">
                            <div className="max-w-xs truncate">
                              {fir.brief_description}
                            </div>
                          </td>
                          <td className="p-2">{getStatusBadge(fir.case_status)}</td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              <Button asChild variant="ghost" size="icon">
                                <Link href={`/fir/${fir.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={firs.length < pageSize}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


