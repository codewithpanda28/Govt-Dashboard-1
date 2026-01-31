"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/auth"
import { Header } from "@/components/layout/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft, User, Phone, MapPin, FileText, Calendar,
  Edit, AlertCircle, CreditCard, RefreshCw, Mail
} from "lucide-react"

interface AccusedDetails {
  id: number
  fir_id: number
  name: string
  father_name: string | null
  mother_name: string | null
  age: number | null
  gender: string | null
  date_of_birth: string | null
  mobile: string | null
  email: string | null
  aadhaar: string | null
  pan_no: string | null
  full_address: string | null
  state: string | null
  district: string | null
  pin_code: string | null
  accused_type: string | null
  photo_url: string | null
  identification_marks: string | null
  previous_cases: number | null
  previous_convictions: number | null
  is_habitual_offender: boolean
  created_at: string
}

interface FIRDetails {
  id: number
  fir_number: string
  incident_date: string | null
  incident_time: string | null
  brief_description: string | null
  case_status: string | null
  district_name: string | null
  thana_name: string | null
}

export default function AccusedDetailPage() {
  const params = useParams()
  const router = useRouter()
  const accusedId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [accused, setAccused] = useState<AccusedDetails | null>(null)
  const [fir, setFir] = useState<FIRDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataVersion, setDataVersion] = useState(0)

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)
    } catch (err) {
      console.error("User error:", err)
    }
  }

  const loadAccusedDetails = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      console.log("📋 Loading accused details for ID:", accusedId)

      const { data: accusedData, error: accusedError } = await supabase
        .from("accused_details")
        .select("*")
        .eq("id", accusedId)
        .single()

      if (accusedError) {
        console.error("❌ Accused error:", accusedError)
        setError(accusedError.message)
        return
      }

      if (!accusedData) {
        setError("Accused not found")
        return
      }

      console.log("✅ Accused loaded:", accusedData)
      setAccused(accusedData)

      if (accusedData?.fir_id) {
        const { data: firData, error: firError } = await supabase
          .from("fir_records")
          .select("id, fir_number, incident_date, incident_time, brief_description, case_status, district_name, thana_name")
          .eq("id", accusedData.fir_id)
          .single()

        if (firError) {
          console.error("⚠️ FIR error:", firError)
        } else {
          console.log("✅ FIR loaded:", firData)
          setFir(firData)
        }
      }

      setDataVersion(prev => prev + 1)

    } catch (error: any) {
      console.error("❌ Error loading accused details:", error)
      setError(error.message || "Failed to load accused details")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [accusedId])

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (accusedId) {
      loadAccusedDetails()
    }
  }, [accusedId, loadAccusedDetails])

  useEffect(() => {
    const checkForEditUpdate = () => {
      const updateData = localStorage.getItem('accused_updated')
      if (updateData) {
        try {
          const parsed = JSON.parse(updateData)
          console.log("🔄 Accused update detected:", parsed)

          if (parsed.accusedId === accusedId || parsed.accusedId === parseInt(accusedId)) {
            console.log("✅ Matching accused, refreshing data...")
            localStorage.removeItem('accused_updated')
            loadAccusedDetails(true)
          }
        } catch (e) {
          console.error("Parse error:", e)
          localStorage.removeItem('accused_updated')
        }
      }
    }

    checkForEditUpdate()

    const handleFocus = () => {
      console.log("🔄 Window focused, checking for accused updates...")
      checkForEditUpdate()
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("🔄 Tab visible, checking for accused updates...")
        checkForEditUpdate()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [accusedId, loadAccusedDetails])

  const handleRefresh = () => {
    loadAccusedDetails(true)
  }

  const formatDate = (dateString: string | null) => {
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

  const getAccusedTypeBadge = (type: string | null) => {
    const config: Record<string, string> = {
      unknown: "bg-gray-100 text-gray-700",
      known: "bg-blue-100 text-blue-700",
      arrested: "bg-green-100 text-green-700",
      absconding: "bg-red-100 text-red-700",
      bailed: "bg-yellow-100 text-yellow-700"
    }
    const cls = config[type?.toLowerCase() || "unknown"] || "bg-gray-100 text-gray-700"
    return <Badge className={cls}>{type?.toUpperCase() || "UNKNOWN"}</Badge>
  }

  const getInitials = (name: string) => {
    return name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"
  }

  // ✅ Changed: Edit button ab FIR page pe le jayega
  const goToEdit = () => {
    if (fir?.id) {
      router.push(`/fir/${fir.id}`)
    }
  }

  const goToFIR = () => {
    if (fir?.id) {
      router.push(`/fir/${fir.id}`)
    }
  }

  const goBack = () => {
    router.push("/accused/list")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} title="Accused Details" />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto"></div>
            <p className="mt-3 text-gray-500">Loading details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !accused) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} title="Accused Details" />
        <div className="flex items-center justify-center py-20 px-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="font-medium text-gray-900 mb-2">
                {error ? "Error Loading Data" : "Accused Not Found"}
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {error || "The requested accused person could not be found."}
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={goBack}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to List
                </Button>
                {error && (
                  <Button onClick={() => loadAccusedDetails()}>
                    Try Again
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50" key={dataVersion}>
      <Header user={user} title="Accused Details" />

      {/* Action Header */}
      <div className="bg-white border-b px-4 lg:px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{accused.name}</h1>
            <p className="text-sm text-gray-500">
              {accused.father_name && `S/o ${accused.father_name}`}
              {accused.age && ` | Age: ${accused.age} years`}
              {accused.gender && ` | ${accused.gender}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Button variant="outline" size="sm" onClick={goBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {/* ✅ Changed: Button ab FIR page pe le jayega */}
            <Button size="sm" onClick={goToEdit} disabled={!fir}>
              <Edit className="mr-2 h-4 w-4" />
              Edit FIR
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          
          <div className="lg:col-span-1 space-y-6">
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  {accused.photo_url ? (
                    <img 
                      src={accused.photo_url} 
                      alt={accused.name}
                      className="w-40 h-40 rounded-lg object-cover mx-auto border-2 border-gray-200 shadow-md"
                    />
                  ) : (
                    <div className="w-40 h-40 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto shadow-md">
                      <span className="text-5xl font-bold text-white">
                        {getInitials(accused.name)}
                      </span>
                    </div>
                  )}
                  
                  <h2 className="mt-4 text-xl font-bold text-gray-900">
                    {accused.name}
                  </h2>

                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {getAccusedTypeBadge(accused.accused_type)}
                    {accused.gender && <Badge variant="outline">{accused.gender}</Badge>}
                    {accused.age && <Badge variant="secondary">{accused.age} yrs</Badge>}
                    {accused.is_habitual_offender && (
                      <Badge className="bg-red-100 text-red-700">⚠️ Habitual</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 bg-blue-50">
                <CardTitle className="text-sm">Quick Information</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {accused.mobile && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500">Mobile</span>
                      <p className="font-medium text-gray-900">{accused.mobile}</p>
                    </div>
                  </div>
                )}

                {accused.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500">Email</span>
                      <p className="font-medium text-gray-900 truncate">{accused.email}</p>
                    </div>
                  </div>
                )}

                {accused.aadhaar && (
                  <div className="flex items-center gap-3 text-sm">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-xs text-gray-500">Aadhaar</span>
                      <p className="font-medium text-gray-900 font-mono">{accused.aadhaar}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <div>
                    <span className="text-xs text-gray-500">Registered On</span>
                    <p className="font-medium text-gray-900">{formatDate(accused.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            
            {fir && (
              <Card>
                <CardHeader className="bg-blue-50 border-b py-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      Related FIR
                    </span>
                    <Button size="sm" variant="outline" onClick={goToFIR}>
                      View FIR
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-gray-500">FIR Number</label>
                      <p className="font-semibold text-blue-600">{fir.fir_number}</p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Incident Date</label>
                      <p className="font-medium text-gray-900">
                        {formatDate(fir.incident_date)}
                        {fir.incident_time && ` at ${fir.incident_time}`}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Location</label>
                      <p className="font-medium text-gray-900">
                        {[fir.thana_name, fir.district_name].filter(Boolean).join(", ") || "N/A"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Status</label>
                      <Badge variant="outline" className="mt-1">
                        {fir.case_status || "Unknown"}
                      </Badge>
                    </div>
                    {fir.brief_description && (
                      <div className="sm:col-span-2">
                        <label className="text-xs text-gray-500">Description</label>
                        <p className="font-medium text-gray-900 text-sm">{fir.brief_description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="bg-green-50 border-b py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-green-600" />
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-gray-500">Full Name</label>
                    <p className="font-medium text-gray-900">{accused.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Age / Gender</label>
                    <p className="font-medium text-gray-900">
                      {accused.age || "N/A"} years / {accused.gender || "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Father&apos;s Name</label>
                    <p className="font-medium text-gray-900">{accused.father_name || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Mother&apos;s Name</label>
                    <p className="font-medium text-gray-900">{accused.mother_name || "N/A"}</p>
                  </div>
                  {accused.date_of_birth && (
                    <div>
                      <label className="text-xs text-gray-500">Date of Birth</label>
                      <p className="font-medium text-gray-900">{formatDate(accused.date_of_birth)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-purple-50 border-b py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-purple-600" />
                  Address Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500">Full Address</label>
                    <p className="font-medium text-gray-900">{accused.full_address || "N/A"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {accused.state && (
                      <div>
                        <label className="text-xs text-gray-500">State</label>
                        <p className="font-medium text-gray-900">{accused.state}</p>
                      </div>
                    )}
                    {accused.district && (
                      <div>
                        <label className="text-xs text-gray-500">District</label>
                        <p className="font-medium text-gray-900">{accused.district}</p>
                      </div>
                    )}
                    {accused.pin_code && (
                      <div>
                        <label className="text-xs text-gray-500">PIN Code</label>
                        <p className="font-medium text-gray-900">{accused.pin_code}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-amber-50 border-b py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-amber-600" />
                  Identification
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs text-gray-500">Aadhaar Number</label>
                    <p className="font-medium text-gray-900 font-mono">{accused.aadhaar || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">PAN Number</label>
                    <p className="font-medium text-gray-900 font-mono">{accused.pan_no || "N/A"}</p>
                  </div>
                  {accused.identification_marks && (
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-500">Identification Marks</label>
                      <p className="font-medium text-gray-900">{accused.identification_marks}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {(accused.previous_cases || accused.previous_convictions || accused.is_habitual_offender) && (
              <Card>
                <CardHeader className="bg-red-50 border-b py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    Criminal History
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">
                        {accused.previous_cases || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Previous Cases</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-900">
                        {accused.previous_convictions || 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Convictions</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className={`text-2xl font-bold ${accused.is_habitual_offender ? "text-red-600" : "text-green-600"}`}>
                        {accused.is_habitual_offender ? "Yes" : "No"}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Habitual Offender</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}