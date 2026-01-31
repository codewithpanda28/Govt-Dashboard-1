"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase/client"
import { Header } from "@/components/layout/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Scale,
  Search,
  Eye,
  Edit,
  MoreHorizontal,
  Filter,
  Calendar,
  X,
  RefreshCw,
  AlertCircle,
  User,
  IndianRupee,
  Gavel,
  Clock,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface BailRecord {
  id: number
  fir_id: number
  accused_id: number
  bail_date: string
  court_name: string
  bail_amount: number | null
  custody_status: string
  bailer_name: string | null
  surety_amount: number | null
  next_hearing_date: string | null
  remarks: string | null
  created_at: string
  // Relations
  fir_records?: {
    id: number
    fir_number: string
  }
  accused_details?: {
    id: number
    name: string
  }
}

interface Stats {
  total: number
  approved: number
  pending: number
  rejected: number
  cancelled: number
}

export default function BailListPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [bailRecords, setBailRecords] = useState<BailRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState<Stats>({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    cancelled: 0
  })
  const itemsPerPage = 10

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadBailRecords()
      loadStats()
    }
  }, [user, currentPage, searchQuery, statusFilter, dateFrom, dateTo])

  const loadUser = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push("/login")
      return
    }
    setUser(currentUser)
  }

  const loadStats = async () => {
    try {
      // Get all FIR IDs for this police station
      const { data: firData } = await supabase
        .from("fir_records")
        .select("id")
        .eq("police_station_id", user?.police_station_id)
        .eq("is_deleted", false)

      const firIds = firData?.map(f => f.id) || []

      if (firIds.length === 0) {
        setStats({ total: 0, approved: 0, pending: 0, rejected: 0, cancelled: 0 })
        return
      }

      // Total
      const { count: total } = await supabase
        .from("bail_details")
        .select("*", { count: "exact", head: true })
        .in("fir_id", firIds)

      // Approved
      const { count: approved } = await supabase
        .from("bail_details")
        .select("*", { count: "exact", head: true })
        .in("fir_id", firIds)
        .eq("custody_status", "bail")

      // Pending
      const { count: pending } = await supabase
        .from("bail_details")
        .select("*", { count: "exact", head: true })
        .in("fir_id", firIds)
        .eq("custody_status", "pending")

      // Rejected
      const { count: rejected } = await supabase
        .from("bail_details")
        .select("*", { count: "exact", head: true })
        .in("fir_id", firIds)
        .eq("custody_status", "rejected")

      // Cancelled
      const { count: cancelled } = await supabase
        .from("bail_details")
        .select("*", { count: "exact", head: true })
        .in("fir_id", firIds)
        .eq("custody_status", "cancelled")

      setStats({
        total: total || 0,
        approved: approved || 0,
        pending: pending || 0,
        rejected: rejected || 0,
        cancelled: cancelled || 0
      })
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }

  const loadBailRecords = async () => {
    try {
      setLoading(true)

      // Get all FIR IDs for this police station
      const { data: firData } = await supabase
        .from("fir_records")
        .select("id")
        .eq("police_station_id", user?.police_station_id)
        .eq("is_deleted", false)

      const firIds = firData?.map(f => f.id) || []

      if (firIds.length === 0) {
        setBailRecords([])
        setTotalCount(0)
        setLoading(false)
        return
      }

      let query = supabase
        .from("bail_details")
        .select(`
          *,
          fir_records!inner(id, fir_number),
          accused_details(id, name)
        `, { count: "exact" })
        .in("fir_id", firIds)
        .order("created_at", { ascending: false })

      // Search filter
      if (searchQuery) {
        query = query.or(`
          fir_records.fir_number.ilike.%${searchQuery}%,
          accused_details.name.ilike.%${searchQuery}%,
          bailer_name.ilike.%${searchQuery}%
        `)
      }

      // Status filter
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("custody_status", statusFilter)
      }

      // Date filters
      if (dateFrom) {
        query = query.gte("bail_date", dateFrom)
      }
      if (dateTo) {
        query = query.lte("bail_date", dateTo)
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      setBailRecords(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error("Error loading bail records:", error)
      setBailRecords([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
    setDateFrom("")
    setDateTo("")
    setCurrentPage(1)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    try {
      return format(new Date(dateString), "dd MMM yyyy")
    } catch {
      return dateString
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
      bail: {
        bg: "bg-green-50",
        border: "border-green-200",
        text: "text-green-700",
        label: "APPROVED"
      },
      pending: {
        bg: "bg-yellow-50",
        border: "border-yellow-200",
        text: "text-yellow-700",
        label: "PENDING"
      },
      rejected: {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-700",
        label: "REJECTED"
      },
      cancelled: {
        bg: "bg-gray-50",
        border: "border-gray-200",
        text: "text-gray-700",
        label: "CANCELLED"
      },
      custody: {
        bg: "bg-orange-50",
        border: "border-orange-200",
        text: "text-orange-700",
        label: "IN CUSTODY"
      }
    }

    const config = statusConfig[status?.toLowerCase()] || {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-700",
      label: status?.toUpperCase() || "UNKNOWN"
    }

    return (
      <Badge className={`${config.bg} ${config.border} ${config.text} border-2 font-bold px-3 py-1 rounded-lg`}>
        {config.label}
      </Badge>
    )
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <div className="page-wrapper">
      <Header user={user} title="Bail List" />

      <div className="page-container page-section space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Total Bails */}
          <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gov-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">Total Bails</p>
                  <p className="text-4xl font-bold text-blue-900 mt-2">{stats.total}</p>
                </div>
                <div className="h-14 w-14 bg-blue-100 rounded-xl flex items-center justify-center border-2 border-blue-200 gov-shadow">
                  <Scale className="h-7 w-7 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Approved */}
          <Card className="border-2 border-green-100 bg-gradient-to-br from-green-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gov-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-600 uppercase tracking-wide">Approved</p>
                  <p className="text-4xl font-bold text-green-900 mt-2">{stats.approved}</p>
                </div>
                <div className="h-14 w-14 bg-green-100 rounded-xl flex items-center justify-center border-2 border-green-200 gov-shadow">
                  <Gavel className="h-7 w-7 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending */}
          <Card className="border-2 border-yellow-100 bg-gradient-to-br from-yellow-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gov-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-yellow-600 uppercase tracking-wide">Pending</p>
                  <p className="text-4xl font-bold text-yellow-900 mt-2">{stats.pending}</p>
                </div>
                <div className="h-14 w-14 bg-yellow-100 rounded-xl flex items-center justify-center border-2 border-yellow-200 gov-shadow">
                  <Clock className="h-7 w-7 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rejected */}
          <Card className="border-2 border-red-100 bg-gradient-to-br from-red-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gov-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-red-600 uppercase tracking-wide">Rejected</p>
                  <p className="text-4xl font-bold text-red-900 mt-2">{stats.rejected}</p>
                </div>
                <div className="h-14 w-14 bg-red-100 rounded-xl flex items-center justify-center border-2 border-red-200 gov-shadow">
                  <X className="h-7 w-7 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cancelled */}
          <Card className="border-2 border-gray-100 bg-gradient-to-br from-gray-50 to-white hover:shadow-xl hover:scale-[1.02] transition-all duration-200 gov-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Cancelled</p>
                  <p className="text-4xl font-bold text-gray-900 mt-2">{stats.cancelled}</p>
                </div>
                <div className="h-14 w-14 bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200 gov-shadow">
                  <AlertCircle className="h-7 w-7 text-gray-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Card */}
        <Card className="border-2 border-primary/20 gov-shadow-lg overflow-hidden">
          {/* Header - WITHOUT ADD BUTTON */}
          <CardHeader className="border-b-2 border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center border-2 border-primary/20 gov-shadow">
                <Scale className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-primary">
                  Bail Records
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1 font-semibold">
                  Total {totalCount} records found
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 lg:p-6">
            {/* Filters */}
            <div className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-200 rounded-xl p-5 mb-6 gov-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center border-2 border-primary/20">
                  <Filter className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-bold text-primary uppercase tracking-wide">Filters</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                  <Input
                    placeholder="Search FIR/Accused..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-10 bg-white border-2 border-gray-300 rounded-lg focus:border-primary font-medium"
                  />
                </div>

                {/* Status */}
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="bg-white border-2 border-gray-300 rounded-lg focus:border-primary font-medium">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="bail">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="custody">In Custody</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date From */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                  <Input
                    type="date"
                    placeholder="From Date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-10 bg-white border-2 border-gray-300 rounded-lg focus:border-primary font-medium"
                  />
                </div>

                {/* Date To */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                  <Input
                    type="date"
                    placeholder="To Date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-10 bg-white border-2 border-gray-300 rounded-lg focus:border-primary font-medium"
                  />
                </div>

                {/* Clear Button */}
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="bg-white border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 hover:text-red-700 font-bold rounded-lg transition-all"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto gov-shadow-lg"></div>
                <p className="mt-4 text-base font-semibold text-primary">Loading bail records...</p>
              </div>
            ) : bailRecords.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-primary/20 rounded-xl bg-gradient-to-br from-primary/5 to-transparent">
                <div className="mx-auto h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 border-2 border-primary/20">
                  <Scale className="h-10 w-10 text-primary" />
                </div>
                <p className="font-bold text-primary text-xl">No bail records found</p>
                <p className="text-sm text-gray-600 mt-2">
                  {searchQuery || statusFilter !== "all" || dateFrom || dateTo
                    ? "Try adjusting your filters"
                    : "Bail records will appear here when you add FIRs with bailer details"}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-hidden border-2 border-gray-200 rounded-xl gov-shadow">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-primary to-primary/95 border-b-2 border-primary-foreground/20">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          S.No.
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          FIR Number
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Accused Name
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Bail Date
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Court Name
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Bail Amount
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-white uppercase tracking-wider">
                          Bailer Name
                        </th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-white uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y-2 divide-gray-100">
                      {bailRecords.map((bail, index) => (
                        <tr key={bail.id} className="hover:bg-primary/5 transition-colors">
                          <td className="px-4 py-4 text-sm font-bold text-gray-600">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </td>
                          <td className="px-4 py-4">
                            <Link
                              href={`/fir/${bail.fir_id}`}
                              className="font-bold text-primary hover:underline"
                            >
                              {bail.fir_records?.fir_number || `FIR-${bail.fir_id}`}
                            </Link>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center border-2 border-blue-200">
                                <User className="h-4 w-4 text-blue-600" />
                              </div>
                              <span className="font-semibold text-gray-900">
                                {bail.accused_details?.name || "Unknown"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-gray-700">
                            {formatDate(bail.bail_date)}
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-gray-700">
                            {bail.court_name || "-"}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1 font-bold text-green-700">
                              <IndianRupee className="h-4 w-4" />
                              {bail.bail_amount ? bail.bail_amount.toLocaleString('en-IN') : "-"}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm font-semibold text-gray-700">
                            {bail.bailer_name || "-"}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {getStatusBadge(bail.custody_status)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="font-semibold text-primary hover:bg-primary/10 border-2 border-transparent hover:border-primary/20"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="border-2 border-gray-200">
                                <DropdownMenuItem 
                                  onClick={() => router.push(`/bail/${bail.id}`)}
                                  className="font-semibold"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => router.push(`/bail/${bail.id}/edit`)}
                                  className="font-semibold"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Status
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                  {bailRecords.map((bail) => (
                    <div 
                      key={bail.id} 
                      className="border-2 border-primary/20 rounded-xl p-4 bg-gradient-to-br from-white to-primary/5 gov-shadow hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <Link
                            href={`/fir/${bail.fir_id}`}
                            className="font-bold text-primary text-lg hover:underline block"
                          >
                            {bail.fir_records?.fir_number || `FIR-${bail.fir_id}`}
                          </Link>
                          <p className="text-sm font-semibold text-gray-700 mt-1">
                            {bail.accused_details?.name || "Unknown"}
                          </p>
                          <div className="mt-2">
                            {getStatusBadge(bail.custody_status)}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="font-semibold border-2 border-primary/20 hover:bg-primary hover:text-white"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="border-2 border-gray-200">
                            <DropdownMenuItem 
                              onClick={() => router.push(`/bail/${bail.id}`)}
                              className="font-semibold"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => router.push(`/bail/${bail.id}/edit`)}
                              className="font-semibold"
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Status
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="space-y-2 text-sm font-medium bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bail Date:</span>
                          <span className="font-semibold text-gray-900">{formatDate(bail.bail_date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Court:</span>
                          <span className="font-semibold text-gray-900">{bail.court_name || "-"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bail Amount:</span>
                          <span className="font-bold text-green-700 flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {bail.bail_amount ? bail.bail_amount.toLocaleString('en-IN') : "-"}
                          </span>
                        </div>
                        {bail.bailer_name && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bailer:</span>
                            <span className="font-semibold text-gray-900">{bail.bailer_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t-2 border-gray-200 gap-4">
                    <p className="text-sm text-gray-600 font-semibold">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                      {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} records
                    </p>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="font-bold border-2 border-gray-300 hover:border-primary hover:bg-primary hover:text-white disabled:opacity-50"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>

                      <div className="hidden sm:flex items-center gap-2">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum
                          if (totalPages <= 5) {
                            pageNum = i + 1
                          } else if (currentPage <= 3) {
                            pageNum = i + 1
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i
                          } else {
                            pageNum = currentPage - 2 + i
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-10 font-bold border-2 ${
                                currentPage === pageNum 
                                  ? 'border-primary/20' 
                                  : 'border-gray-300 hover:border-primary hover:bg-primary hover:text-white'
                              }`}
                            >
                              {pageNum}
                            </Button>
                          )
                        })}
                      </div>

                      <span className="sm:hidden text-sm font-bold text-gray-700 px-3 py-1.5 bg-gray-100 rounded-lg border-2 border-gray-200">
                        {currentPage} / {totalPages}
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="font-bold border-2 border-gray-300 hover:border-primary hover:bg-primary hover:text-white disabled:opacity-50"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}