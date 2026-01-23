"use client"

import { useEffect, useState } from "react"
import { getCurrentUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase/client"
import { Header } from "@/components/layout/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Eye, Scale } from "lucide-react"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"

interface Accused {
  id: number
  full_name: string
  age: number
  gender: string
  mobile_number: string | null
  photo_url: string | null
  is_minor: boolean
  fir_records: { fir_number: string } | null
  bail_details: { custody_status: string } | null
}

export default function AccusedListPage() {
  const [user, setUser] = useState<any>(null)
  const [accused, setAccused] = useState<Accused[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [genderFilter, setGenderFilter] = useState<string>("all")
  const [selectedAccused, setSelectedAccused] = useState<any>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadAccused()
    }
  }, [user, searchTerm, genderFilter])

  const loadUser = async () => {
    const currentUser = await getCurrentUser()
    setUser(currentUser)
  }

  const loadAccused = async () => {
    if (!user?.police_station_id) return

    setLoading(true)
    try {
      const firIds = (
        await supabase
          .from("fir_records")
          .select("id")
          .eq("police_station_id", user.police_station_id)
          .eq("is_deleted", false)
      ).data?.map((f) => f.id) || []

      let query = supabase
        .from("accused_persons")
        .select(`
          *,
          fir_records:fir_id (fir_number)
        `)
        .in("fir_id", firIds)
        .order("created_at", { ascending: false })

      if (searchTerm) {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,mobile_number.ilike.%${searchTerm}%`
        )
      }

      if (genderFilter !== "all") {
        query = query.eq("gender", genderFilter)
      }

      const { data, error } = await query

      if (error) throw error

      // Load bail details separately
      const accusedIds = (data || []).map((a: any) => a.id)
      const { data: bailData } = await supabase
        .from("bail_details")
        .select("accused_id, custody_status")
        .in("accused_id", accusedIds)

      // Map bail status to accused
      const accusedWithBail = (data || []).map((acc: any) => {
        const bail = bailData?.find((b: any) => b.accused_id === acc.id)
        return {
          ...acc,
          bail_details: bail ? [bail] : null,
        }
      })

      setAccused(accusedWithBail)
    } catch (error) {
      console.error("Error loading accused:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) return <Badge variant="outline">No Status</Badge>
    const variants: Record<string, "default" | "success" | "warning" | "destructive"> = {
      bail: "success",
      custody: "warning",
      absconding: "destructive",
    }
    return (
      <Badge variant={variants[status] || "default"}>
        {status.toUpperCase()}
      </Badge>
    )
  }

  const viewDetails = async (accusedId: number) => {
    const { data } = await supabase
      .from("accused_persons")
      .select(`
        *,
        fir_records:fir_id (*),
        bail_details:bail_details!accused_id (*)
      `)
      .eq("id", accusedId)
      .single()

    setSelectedAccused(data)
    setShowDetailsDialog(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} title="Accused List" />
      <div className="p-4 lg:p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Accused Persons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or mobile..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading...</p>
              </div>
            ) : accused.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No accused persons found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Photo</th>
                      <th className="text-left p-2">Name</th>
                      <th className="text-left p-2">Age</th>
                      <th className="text-left p-2">Gender</th>
                      <th className="text-left p-2">Mobile</th>
                      <th className="text-left p-2">FIR No</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accused.map((acc) => (
                      <tr key={acc.id} className="border-b hover:bg-accent/50">
                        <td className="p-2">
                          {acc.photo_url ? (
                            <img
                              src={acc.photo_url}
                              alt={acc.full_name}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                              <span className="text-xs">No Photo</span>
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{acc.full_name}</span>
                            {acc.is_minor && (
                              <Badge variant="warning">MINOR</Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2">{acc.age}</td>
                        <td className="p-2">{acc.gender}</td>
                        <td className="p-2">{acc.mobile_number || "N/A"}</td>
                        <td className="p-2">
                          {acc.fir_records?.fir_number || "N/A"}
                        </td>
                        <td className="p-2">
                          {getStatusBadge(
                            acc.bail_details?.[0]?.custody_status || null
                          )}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => viewDetails(acc.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <Link href={`/bail/update?accused_id=${acc.id}`}>
                                <Scale className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
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

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Accused Details</DialogTitle>
            <DialogDescription>
              Complete information about the accused person
            </DialogDescription>
          </DialogHeader>
          {selectedAccused && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-semibold">{selectedAccused.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Age</p>
                  <p className="font-semibold">{selectedAccused.age} years</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p className="font-semibold">{selectedAccused.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mobile</p>
                  <p className="font-semibold">
                    {selectedAccused.mobile_number || "N/A"}
                  </p>
                </div>
                {selectedAccused.aadhar_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Aadhar</p>
                    <p className="font-semibold">
                      {selectedAccused.aadhar_number}
                    </p>
                  </div>
                )}
                {selectedAccused.pan_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">PAN</p>
                    <p className="font-semibold">{selectedAccused.pan_number}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Address</p>
                <p className="font-semibold">{selectedAccused.current_address}</p>
              </div>
              {selectedAccused.identification_marks && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    Identification Marks
                  </p>
                  <p className="font-semibold">
                    {selectedAccused.identification_marks}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

