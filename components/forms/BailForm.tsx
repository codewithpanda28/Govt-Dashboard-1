"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { bailSchema, type BailInput } from "@/lib/validations/schemas"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/auth"
import { createAuditLog } from "@/lib/utils/audit-log"
import { uploadDocument } from "@/lib/utils/file-upload"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"

interface BailFormProps {
  initialData?: any
}

export function BailForm({ initialData }: BailFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [masterData, setMasterData] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [accused, setAccused] = useState<any>(null)
  const [documentFile, setDocumentFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<BailInput>({
    resolver: zodResolver(bailSchema),
    defaultValues: initialData || {},
  })

  const custodyStatus = watch("custody_status")
  const [courtSelectValue, setCourtSelectValue] = useState<string>("")

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const prefillAccused = searchParams.get("accused_id")
    if (prefillAccused && !initialData) {
      loadAccusedData(parseInt(prefillAccused))
    }
  }, [searchParams, initialData])

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/login")
        return
      }
      setUser(currentUser)

      const [courts, states, districts] = await Promise.all([
        supabase.from("courts").select("*").eq("is_active", true).order("court_name"),
        supabase.from("states").select("*").eq("is_active", true).order("name"),
        supabase.from("districts").select("*").eq("is_active", true).order("name"),
      ])

      setMasterData({
        courts: courts.data || [],
        states: states.data || [],
        districts: districts.data || [],
      })

      if (initialData) {
        Object.keys(initialData).forEach((key) => {
          if (key.includes("date") && initialData[key]) {
            setValue(key as any, new Date(initialData[key]))
          } else {
            setValue(key as any, initialData[key])
          }
        })
        if (initialData.court_id) {
          setCourtSelectValue(initialData.court_id.toString())
        }
        if (initialData.accused_id) {
          loadAccusedData(initialData.accused_id)
        }
      }
    } catch (error) {
      console.error("Error loading form data:", error)
    }
  }

  const loadAccusedData = async (accusedId: number) => {
    try {
      const { data } = await supabase
        .from("accused_persons")
        .select(`
          *,
          fir_records:fir_id (*)
        `)
        .eq("id", accusedId)
        .single()

      if (data) {
        setAccused(data)
        setValue("accused_id", data.id)
        setValue("fir_id", data.fir_id)
      } else {
        toast({
          title: "Error",
          description: "Accused person not found",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error loading accused:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load accused data",
        variant: "destructive",
      })
    }
  }

  const onSubmit = async (data: BailInput) => {
    console.log("Form submitted with data:", data)
    
    if (!user) {
      toast({
        title: "Error",
        description: "User not found. Please login again.",
        variant: "destructive",
      })
      return
    }

    // Validate required fields based on custody status
    if (!data.accused_id || !data.fir_id) {
      toast({
        title: "Error",
        description: "Accused and FIR information is required. Please select an accused person first.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Upload document if provided
      let documentUrl = ""
      if (documentFile) {
        documentUrl = await uploadDocument(documentFile)
      }

      const bailData: any = {
        accused_id: data.accused_id,
        fir_id: data.fir_id,
        custody_status: data.custody_status,
        created_by: user.id,
      }

      // Add bail-specific fields
      if (data.custody_status === "bail") {
        if (data.court_id) {
          bailData.court_id = data.court_id
        }
        if (data.court_name_manual) {
          bailData.court_name_manual = data.court_name_manual
        }
        if (data.bail_order_number) {
          bailData.bail_order_number = data.bail_order_number
        }
        if (data.bail_date) {
          bailData.bail_date = format(data.bail_date, "yyyy-MM-dd")
        }
        if (data.bail_amount !== undefined) {
          bailData.bail_amount = data.bail_amount
        }
        if (data.next_hearing_date) {
          bailData.next_hearing_date = format(data.next_hearing_date, "yyyy-MM-dd")
        }
        if (data.bail_conditions) {
          bailData.bail_conditions = data.bail_conditions
        }
        if (data.bailer_name) {
          bailData.bailer_name = data.bailer_name
        }
        if (data.bailer_relation) {
          bailData.bailer_relation = data.bailer_relation
        }
        if (data.bailer_parentage) {
          bailData.bailer_parentage = data.bailer_parentage
        }
        if (data.bailer_address) {
          bailData.bailer_address = data.bailer_address
        }
        if (data.bailer_state) {
          bailData.bailer_state = data.bailer_state
        }
        if (data.bailer_district) {
          bailData.bailer_district = data.bailer_district
        }
        if (data.bailer_gender) {
          bailData.bailer_gender = data.bailer_gender
        }
        if (data.bailer_age) {
          bailData.bailer_age = data.bailer_age
        }
        if (data.bailer_mobile) {
          bailData.bailer_mobile = data.bailer_mobile
        }
        if (documentUrl) {
          bailData.bail_document = documentUrl
        }
      }

      // Add custody-specific fields
      if (data.custody_status === "custody") {
        if (data.custody_location) {
          bailData.custody_location = data.custody_location
        }
        if (data.custody_from_date) {
          bailData.custody_from_date = format(data.custody_from_date, "yyyy-MM-dd")
        }
      }

      // Add absconding-specific fields
      if (data.custody_status === "absconding") {
        if (data.custody_from_date) {
          bailData.custody_from_date = format(data.custody_from_date, "yyyy-MM-dd")
        }
        if (data.bail_conditions) {
          bailData.absconding_remarks = data.bail_conditions
        }
      }

      console.log("Submitting bail data:", bailData)
      
      const { data: result, error } = await supabase
        .from("bail_details")
        .insert(bailData)
        .select()
        .single()

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }
      
      console.log("Bail data inserted successfully:", result)

      await createAuditLog({
        userId: user.id,
        action: "CREATE",
        table: "bail_details",
        recordId: result.id,
        summary: `Bail status updated for accused ${accused?.full_name || ""}`,
      })

      toast({
        title: "Success",
        description: "Bail status updated successfully",
      })

      setTimeout(() => router.push("/accused/list"), 1500)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update bail status",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!masterData || !user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading form...</p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, (errors) => {
      console.log("Form validation errors:", errors)
      toast({
        title: "Validation Error",
        description: "Please check the form and fix the errors before submitting.",
        variant: "destructive",
      })
    })} className="space-y-8">
      {/* Validation Errors Summary */}
      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-destructive/10 border-2 border-destructive/30 rounded-lg">
          <p className="text-sm font-semibold text-destructive mb-2">Please fix the following errors:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
            {Object.entries(errors).map(([key, error]: [string, any]) => {
              // Map field keys to user-friendly names
              const fieldLabels: Record<string, string> = {
                accused_id: "Accused",
                fir_id: "FIR",
                custody_status: "Custody Status",
                court_name_manual: "Court Name",
                bail_order_number: "Bail Order Number",
                bail_date: "Bail Date",
                bailer_name: "Bailer Name",
                bailer_relation: "Bailer Relation",
                bailer_address: "Bailer Address",
                bailer_state: "Bailer State",
                bailer_district: "Bailer District",
                bailer_gender: "Bailer Gender",
                bailer_age: "Bailer Age",
                custody_location: "Custody Location",
                custody_from_date: "From Date",
              }
              
              const fieldName = fieldLabels[key] || key.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())
              const errorMessage = error?.message || "is required"
              
              return (
                <li key={key}>
                  <span className="font-medium">{fieldName}</span>: {errorMessage}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      
      {/* Accused Info (Readonly) */}
      {accused && (
        <div className="p-5 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 gov-shadow">
          <h3 className="font-bold text-lg text-primary mb-3">Accused Information</h3>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">Name: </span>
              <span className="font-medium">{accused.full_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">FIR: </span>
              <span className="font-medium">
                {accused.fir_records?.fir_number || "N/A"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Custody Status */}
      <div className="space-y-4 sm:space-y-5">
        <h2 className="form-section-title text-lg sm:text-xl">Custody Status</h2>
        <div className="space-y-3">
          <Label htmlFor="custody_status" className="text-sm sm:text-base">
            Status <span className="text-danger font-bold">*</span>
          </Label>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
            {["bail", "custody", "absconding"].map((status) => (
              <label key={status} className="flex items-center gap-2">
                <input
                  type="radio"
                  value={status}
                  {...register("custody_status")}
                  className="w-4 h-4"
                />
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </label>
            ))}
          </div>
          {errors.custody_status && (
            <p className="text-sm text-danger">
              {errors.custody_status.message}
            </p>
          )}
        </div>
      </div>

      {/* Bail Details */}
      {custodyStatus === "bail" && (
        <div className="space-y-4 sm:space-y-5">
          <h2 className="form-section-title text-lg sm:text-xl">Bail Details</h2>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="court_id">Court</Label>
              <Select
                value={courtSelectValue}
                onValueChange={(value) => {
                  setCourtSelectValue(value)
                  if (value === "manual") {
                    setValue("court_id", undefined)
                    setValue("court_name_manual", undefined)
                  } else {
                    setValue("court_id", parseInt(value))
                    setValue("court_name_manual", undefined)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select court" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  {masterData.courts.map((court: any) => (
                    <SelectItem key={court.id} value={court.id.toString()}>
                      {court.court_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {courtSelectValue === "manual" && (
              <div className="space-y-2">
                <Label htmlFor="court_name_manual">
                  Court Name <span className="text-danger">*</span>
                </Label>
                <Input
                  id="court_name_manual"
                  {...register("court_name_manual")}
                />
                {errors.court_name_manual && (
                  <p className="text-sm text-danger">
                    {errors.court_name_manual.message}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="bail_order_number">
                Bail Order Number <span className="text-danger">*</span>
              </Label>
              <Input id="bail_order_number" {...register("bail_order_number")} />
              {errors.bail_order_number && (
                <p className="text-sm text-danger">
                  {errors.bail_order_number.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bail_date">
                Bail Date <span className="text-danger">*</span>
              </Label>
              <Input
                id="bail_date"
                type="date"
                {...register("bail_date", { valueAsDate: true })}
              />
              {errors.bail_date && (
                <p className="text-sm text-danger">{errors.bail_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bail_amount">Bail Amount (₹)</Label>
              <Input
                id="bail_amount"
                type="number"
                step="0.01"
                min="0"
                {...register("bail_amount", { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="next_hearing_date">Next Hearing Date</Label>
              <Input
                id="next_hearing_date"
                type="date"
                {...register("next_hearing_date", { valueAsDate: true })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bail_conditions">Bail Conditions</Label>
              <Textarea
                id="bail_conditions"
                rows={3}
                {...register("bail_conditions")}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bail_document">Bail Order Document (PDF)</Label>
              <Input
                id="bail_document"
                type="file"
                accept="application/pdf"
                onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">Max 5MB, PDF only</p>
            </div>
          </div>

          {/* Bailer Details */}
          <div className="space-y-5 mt-8 pt-6 border-t-2 border-primary/20">
            <h3 className="text-lg font-bold text-primary pb-2 border-b-2 border-primary/30">Bailer Details</h3>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bailer_name">
                  Name <span className="text-danger">*</span>
                </Label>
                <Input id="bailer_name" {...register("bailer_name")} />
                {errors.bailer_name && (
                  <p className="text-sm text-danger">
                    {errors.bailer_name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bailer_relation">
                  Relation <span className="text-danger">*</span>
                </Label>
                <Input id="bailer_relation" {...register("bailer_relation")} />
                {errors.bailer_relation && (
                  <p className="text-sm text-danger">
                    {errors.bailer_relation.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bailer_parentage">Parentage</Label>
                <Input id="bailer_parentage" {...register("bailer_parentage")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bailer_mobile">Mobile</Label>
                <Input id="bailer_mobile" {...register("bailer_mobile")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="bailer_address">
                  Address <span className="text-danger">*</span>
                </Label>
                <Textarea
                  id="bailer_address"
                  rows={2}
                  {...register("bailer_address")}
                />
                {errors.bailer_address && (
                  <p className="text-sm text-danger">
                    {errors.bailer_address.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bailer_state">
                  State <span className="text-danger">*</span>
                </Label>
                <Input id="bailer_state" {...register("bailer_state")} />
                {errors.bailer_state && (
                  <p className="text-sm text-danger">
                    {errors.bailer_state.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bailer_district">
                  District <span className="text-danger">*</span>
                </Label>
                <Input id="bailer_district" {...register("bailer_district")} />
                {errors.bailer_district && (
                  <p className="text-sm text-danger">
                    {errors.bailer_district.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bailer_gender">
                  Gender <span className="text-danger">*</span>
                </Label>
                <Select
                  value={watch("bailer_gender") || ""}
                  onValueChange={(value) => setValue("bailer_gender", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.bailer_gender && (
                  <p className="text-sm text-danger">
                    {errors.bailer_gender.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bailer_age">
                  Age <span className="text-danger">*</span> (Min 21)
                </Label>
                <Input
                  id="bailer_age"
                  type="number"
                  min="21"
                  {...register("bailer_age", { valueAsNumber: true })}
                />
                {errors.bailer_age && (
                  <p className="text-sm text-danger">
                    {errors.bailer_age.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custody Details */}
      {custodyStatus === "custody" && (
        <div className="space-y-4 sm:space-y-5">
          <h2 className="form-section-title text-lg sm:text-xl">Custody Details</h2>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="custody_location" className="text-sm sm:text-base">
                Custody Location <span className="text-danger font-bold">*</span>
              </Label>
              <Input id="custody_location" {...register("custody_location")} />
              {errors.custody_location && (
                <p className="text-sm text-danger font-medium">
                  {errors.custody_location.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="custody_from_date" className="text-sm sm:text-base">
                From Date <span className="text-danger font-bold">*</span>
              </Label>
              <Input
                id="custody_from_date"
                type="date"
                max={format(new Date(), "yyyy-MM-dd")}
                {...register("custody_from_date", { valueAsDate: true })}
              />
              {errors.custody_from_date && (
                <p className="text-sm text-danger font-medium">
                  {errors.custody_from_date.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Absconding Details */}
      {custodyStatus === "absconding" && (
        <div className="space-y-5">
          <h2 className="form-section-title">Absconding Details</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="absconding_since">Since Date</Label>
              <Input
                id="absconding_since"
                type="date"
                {...register("custody_from_date", { valueAsDate: true })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="absconding_remarks">Remarks</Label>
              <Textarea
                id="absconding_remarks"
                rows={3}
                {...register("bail_conditions")}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t-2 border-primary/20">
        <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto sm:min-w-[180px]">
          {loading ? "Saving..." : "Update Bail Status"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} size="lg" className="w-full sm:w-auto sm:min-w-[120px]">
          Cancel
        </Button>
      </div>
    </form>
  )
}


