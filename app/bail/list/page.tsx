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
  Search, Eye, Shield, RefreshCw, Phone, AlertCircle, MapPin,
  ChevronLeft, Filter, Download, Calendar, Users
} from "lucide-react"
import { toast } from "sonner"

interface Bailer {
  id: number
  fir_id: number
  name: string
  father_name: string
  age: number
  gender: string
  mobile: string
  aadhaar: string
  full_address: string
  created_at: string
  fir_number?: string
}

export default function BailListPage() {
  const router = useRouter()
  const [bailerList, setBailerList] = useState<Bailer[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    checkAuth()
    loadBailerList()
  }, [])

  // Check for updates from edit page
  useEffect(() => {
    const checkForEditUpdate = () => {
      const updateData = localStorage.getItem('fir_updated')
      if (updateData) {
        localStorage.removeItem('fir_updated')
        loadBailerList(true)
      }
    }

    checkForEditUpdate()

    const handleFocus = () => checkForEditUpdate()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  // Check on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const updateData = localStorage.getItem('fir_updated')
        if (updateData) {
          localStorage.removeItem('fir_updated')
          loadBailerList(true)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
    }
  }

  const loadBailerList = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const { data, error: fetchError } = await supabase
        .from("bailer_details")
        .select(`*, fir_records (id, fir_number)`)
        .order("created_at", { ascending: false })

      if (fetchError) {
        // Fallback to simple query
        const { data: simpleData, error: simpleError } = await supabase
          .from("bailer_details")
          .select("*")
          .order("created_at", { ascending: false })

        if (simpleError) {
          setError(simpleError.message)
          toast.error("Failed to load bailer list")
          return
        }
        setBailerList(simpleData || [])
        if (isRefresh) toast.success("List refreshed!")
        return
      }

      const mappedData = data?.map(item => ({
        ...item,
        fir_number: item.fir_records?.fir_number || `FIR-${item.fir_id}`
      })) || []

      setBailerList(mappedData)
      if (isRefresh) toast.success("List refreshed!")
    } catch (err: any) {
      setError(err.message)
      toast.error("Something went wrong")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    loadBailerList(true)
  }

  const filteredList = bailerList.filter(bailer => {
    const search = searchQuery.toLowerCase()
    return !searchQuery || 
      bailer.name?.toLowerCase().includes(search) ||
      bailer.father_name?.toLowerCase().includes(search) ||
      bailer.mobile?.includes(search) ||
      bailer.fir_number?.toLowerCase().includes(search) ||
      bailer.full_address?.toLowerCase().includes(search)
  })

  const getInitials = (name: string) => {
    return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || "?"
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
  }

  const hasActiveFilters = searchQuery.length > 0

  const exportToCSV = () => {
    const headers = ["Name", "Father Name", "Mobile", "Aadhaar", "Address", "FIR Number", "Date"]
    const rows = filteredList.map(b => [
      b.name || "",
      b.father_name || "",
      b.mobile || "",
      b.aadhaar || "",
      b.full_address || "",
      b.fir_number || "",
      formatDate(b.created_at)
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `Bailer_List_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    toast.success("CSV exported successfully!")
  }

  // Statistics
  const stats = {
    total: bailerList.length,
    withMobile: bailerList.filter(b => b.mobile).length,
    withAddress: bailerList.filter(b => b.full_address).length,
    withAadhaar: bailerList.filter(b => b.aadhaar).length,
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
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Shield className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Bailer List</h1>
              <p className="text-muted-foreground text-sm">
                Total: {bailerList.length} | Showing: {filteredList.length} records
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Bailers", value: stats.total, color: "text-yellow-600", icon: Shield },
            { label: "With Mobile", value: stats.withMobile, color: "text-green-600", icon: Phone },
            { label: "With Address", value: stats.withAddress, color: "text-blue-600", icon: MapPin },
            { label: "With Aadhaar", value: stats.withAadhaar, color: "text-purple-600", icon: Users },
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
                Search
              </CardTitle>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, mobile, FIR number, address..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-2">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-600" />
              Bailer Records
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center">
                <div className="animate-spin h-10 w-10 border-4 border-yellow-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading bailers...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="py-16 text-center">
                <Shield className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-semibold text-lg">No bailers found</p>
                <p className="text-muted-foreground mb-6">
                  {bailerList.length === 0 
                    ? "Add bailers through FIR registration" 
                    : "Try adjusting your search"
                  }
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters}>
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold w-12"></TableHead>
                      <TableHead className="font-bold">NAME</TableHead>
                      <TableHead className="font-bold">MOBILE</TableHead>
                      <TableHead className="font-bold">ADDRESS</TableHead>
                      <TableHead className="font-bold">FIR NUMBER</TableHead>
                      <TableHead className="font-bold">DATE</TableHead>
                      <TableHead className="font-bold text-center">ACTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.map((bailer) => (
                      <TableRow 
                        key={bailer.id} 
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/fir/${bailer.fir_id}`)}
                      >
                        <TableCell>
                          <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-sm">
                            {getInitials(bailer.name)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold">{bailer.name || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">S/o {bailer.father_name || "N/A"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {bailer.mobile ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <span>{bailer.mobile}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {bailer.full_address ? (
                            <div className="flex items-start gap-2 max-w-[200px]">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                              <span className="line-clamp-2 text-sm">{bailer.full_address}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-semibold text-primary">
                            {bailer.fir_number}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatDate(bailer.created_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/fir/${bailer.fir_id}`)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View FIR
                          </Button>
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
            Showing {filteredList.length} of {bailerList.length} bailer{bailerList.length !== 1 ? "s" : ""}
            {hasActiveFilters && " (filtered)"}
          </p>
        )}
      </div>
    </div>
  )
}