"use client"

import { useEffect, useState } from "react"
import { getCurrentUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase/client"
import { Header } from "@/components/layout/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  FileText, 
  Search, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  X
} from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface FIR {
  id: number
  fir_number: string
  incident_date: string
  incident_time: string
  brief_description: string
  case_status: string
}

export default function MyFIRsPage() {
  const [user, setUser] = useState<any>(null)
  const [firs, setFirs] = useState<FIR[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadFIRs()
    }
  }, [user, currentPage, searchTerm, statusFilter, dateFrom, dateTo])

  const loadUser = async () => {
    const currentUser = await getCurrentUser()
    setUser(currentUser)
  }

  const loadFIRs = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from("fir_records")
        .select("*", { count: "exact" })
        .eq("police_station_id", user.police_station_id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })

      // Search filter
      if (searchTerm) {
        query = query.ilike("fir_number", `%${searchTerm}%`)
      }

      // Status filter
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("case_status", statusFilter)
      }

      // Date filters
      if (dateFrom) {
        query = query.gte("incident_date", dateFrom)
      }
      if (dateTo) {
        query = query.lte("incident_date", dateTo)
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) throw error

      setFirs(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error("Error loading FIRs:", error)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setDateFrom("")
    setDateTo("")
    setCurrentPage(1)
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string, text: string, label: string }> = {
      registered: { 
        bg: "bg-blue-50", 
        text: "text-blue-700", 
        label: "Registered" 
      },
      under_investigation: { 
        bg: "bg-yellow-50", 
        text: "text-yellow-700", 
        label: "Under Investigation" 
      },
      chargesheet_filed: { 
        bg: "bg-green-50", 
        text: "text-green-700", 
        label: "Chargesheet Filed" 
      },
      closed: { 
        bg: "bg-gray-100", 
        text: "text-gray-700", 
        label: "Closed" 
      },
    }
    const { bg, text, label } = config[status] || { 
      bg: "bg-gray-100", 
      text: "text-gray-700", 
      label: status 
    }
    return (
      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${bg} ${text}`}>
        {label}
      </span>
    )
  }

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} title="My FIRs" />
      
      <div className="p-4 lg:p-6">
        <Card>
          {/* Header */}
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">
                  FIR Records
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Total {totalCount} records found
                </p>
              </div>
              <Button asChild>
                <Link href="/fir/add">
                  <FileText className="mr-2 h-4 w-4" />
                  Add New FIR
                </Link>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 lg:p-6">
            {/* Filters */}
            <div className="bg-gray-50 border rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Filters</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search FIR number..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-9 bg-white"
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
                  <SelectTrigger className="bg-white">
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

                {/* Date From */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    placeholder="From Date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-9 bg-white"
                  />
                </div>

                {/* Date To */}
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="date"
                    placeholder="To Date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="pl-9 bg-white"
                  />
                </div>

                {/* Clear Button */}
                <Button 
                  variant="outline" 
                  onClick={clearFilters}
                  className="bg-white"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
                <p className="mt-3 text-sm text-gray-500">Loading FIRs...</p>
              </div>
            ) : firs.length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-gray-900">No FIRs found</p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchTerm || statusFilter !== "all" || dateFrom || dateTo
                    ? "Try adjusting your filters"
                    : "Start by adding your first FIR"}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-hidden border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          FIR Number
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {firs.map((fir) => (
                        <tr key={fir.id}>
                          <td className="px-4 py-4">
                            <span className="font-medium text-gray-900">
                              {fir.fir_number}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {format(new Date(fir.incident_date), "dd MMM yyyy")}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {fir.incident_time}
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm text-gray-600 line-clamp-2 max-w-xs">
                              {fir.brief_description}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            {getStatusBadge(fir.case_status)}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/fir/${fir.id}`}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {firs.map((fir) => (
                    <div key={fir.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="font-semibold text-gray-900">
                            {fir.fir_number}
                          </span>
                          <div className="mt-1">
                            {getStatusBadge(fir.case_status)}
                          </div>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/fir/${fir.id}`}>
                            View
                          </Link>
                        </Button>
                      </div>
                      
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {fir.brief_description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(fir.incident_date), "dd MMM yyyy")}
                        </span>
                        <span>
                          {fir.incident_time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                      {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} records
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      
                      <span className="text-sm text-gray-600 px-3">
                        Page {currentPage} of {totalPages}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
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