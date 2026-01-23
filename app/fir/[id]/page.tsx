"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase/client"
import { Header } from "@/components/layout/Header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit, Printer, UserPlus, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

export default function FIRDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [fir, setFir] = useState<any>(null)
  const [accused, setAccused] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      const { data: firData, error: firError } = await supabase
        .from("fir_records")
        .select(`
          *,
          modus_operandi:modus_operandi_id (*),
          train:train_id (*),
          station:station_id (*),
          police_station:police_station_id (*),
          railway_district:railway_district_id (*)
        `)
        .eq("id", params.id)
        .single()

      if (firError) throw firError
      setFir(firData)

      const { data: accusedData } = await supabase
        .from("accused_persons")
        .select("*")
        .eq("fir_id", params.id)
        .order("created_at", { ascending: false })

      setAccused(accusedData || [])
    } catch (error) {
      console.error("Error loading FIR:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!fir) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} title="FIR Not Found" />
        <div className="p-4 lg:p-6">
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">FIR not found</p>
              <Button asChild className="mt-4">
                <Link href="/fir/list">Back to List</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const canEdit = user?.id === fir.created_by

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} title={`FIR: ${fir.fir_number}`} />
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {canEdit && (
            <Button asChild>
              <Link href={`/fir/edit/${fir.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button asChild>
            <Link href={`/accused/add?fir_id=${fir.id}`}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Accused
            </Link>
          </Button>
        </div>

        {/* Basic Details */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">FIR Number</p>
              <p className="font-semibold">{fir.fir_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge>{fir.case_status.replace("_", " ").toUpperCase()}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Incident Date</p>
              <p className="font-semibold">
                {format(new Date(fir.incident_date), "dd MMM yyyy")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Incident Time</p>
              <p className="font-semibold">{fir.incident_time}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Police Station</p>
              <p className="font-semibold">{fir.police_station?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Railway District</p>
              <p className="font-semibold">{fir.railway_district?.name}</p>
            </div>
          </CardContent>
        </Card>

        {/* Location Details */}
        <Card>
          <CardHeader>
            <CardTitle>Location Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {fir.train && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Train Number</p>
                  <p className="font-semibold">{fir.train.train_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Train Name</p>
                  <p className="font-semibold">{fir.train.train_name}</p>
                </div>
              </>
            )}
            {fir.train_number_manual && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Train Number</p>
                  <p className="font-semibold">{fir.train_number_manual}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Train Name</p>
                  <p className="font-semibold">{fir.train_name_manual}</p>
                </div>
              </>
            )}
            {fir.station && (
              <div>
                <p className="text-sm text-muted-foreground">Station</p>
                <p className="font-semibold">
                  {fir.station.station_code} - {fir.station.station_name}
                </p>
              </div>
            )}
            {fir.station_name_manual && (
              <div>
                <p className="text-sm text-muted-foreground">Station</p>
                <p className="font-semibold">{fir.station_name_manual}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Crime Details */}
        <Card>
          <CardHeader>
            <CardTitle>Crime Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Modus Operandi</p>
              <p className="font-semibold">{fir.modus_operandi?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Law Sections</p>
              <p className="font-semibold">{fir.law_sections_text || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Brief Description</p>
              <p className="mt-1">{fir.brief_description}</p>
            </div>
            {fir.detailed_description && (
              <div>
                <p className="text-sm text-muted-foreground">Detailed Description</p>
                <p className="mt-1 whitespace-pre-wrap">{fir.detailed_description}</p>
              </div>
            )}
            {fir.property_stolen && (
              <div>
                <p className="text-sm text-muted-foreground">Property Stolen</p>
                <p className="mt-1">{fir.property_stolen}</p>
              </div>
            )}
            {fir.estimated_value && (
              <div>
                <p className="text-sm text-muted-foreground">Estimated Value</p>
                <p className="font-semibold">₹{fir.estimated_value.toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accused Persons */}
        <Card>
          <CardHeader>
            <CardTitle>Accused Persons ({accused.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {accused.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                No accused persons added yet
              </p>
            ) : (
              <div className="space-y-4">
                {accused.map((acc) => (
                  <div
                    key={acc.id}
                    className="border rounded-lg p-4 hover:bg-accent/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{acc.full_name}</h4>
                          {acc.is_minor && (
                            <Badge variant="warning">MINOR</Badge>
                          )}
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Age: </span>
                            <span>{acc.age} years</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Gender: </span>
                            <span>{acc.gender}</span>
                          </div>
                          {acc.mobile_number && (
                            <div>
                              <span className="text-muted-foreground">Mobile: </span>
                              <span>{acc.mobile_number}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/accused/list?accused_id=${acc.id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


