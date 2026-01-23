"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { accusedSchema, type AccusedInput } from "@/lib/validations/schemas"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/auth"
import { createAuditLog } from "@/lib/utils/audit-log"
import { uploadPhoto } from "@/lib/utils/file-upload"
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { format, differenceInYears } from "date-fns"

interface AccusedFormProps {
  initialData?: any
  isEdit?: boolean
}

export function AccusedForm({ initialData, isEdit = false }: AccusedFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [masterData, setMasterData] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [firs, setFirs] = useState<any[]>([])
  const [showBailDialog, setShowBailDialog] = useState(false)
  const [newAccusedId, setNewAccusedId] = useState<number | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>("")

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AccusedInput>({
    resolver: zodResolver(accusedSchema),
    defaultValues: initialData || {},
  })

  const firId = watch("fir_id")
  const age = watch("age")
  const dateOfBirth = watch("date_of_birth")
  const sameAsCurrent = watch("permanent_address") === watch("current_address")

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const prefillFIR = searchParams.get("fir_id")
    if (prefillFIR && !isEdit) {
      setValue("fir_id", parseInt(prefillFIR))
    }
  }, [searchParams, setValue, isEdit])

  useEffect(() => {
    if (dateOfBirth) {
      const years = differenceInYears(new Date(), new Date(dateOfBirth))
      if (years > 0 && years <= 120) {
        setValue("age", years)
      }
    }
  }, [dateOfBirth, setValue])

  useEffect(() => {
    if (age && age < 18) {
      toast({
        title: "Minor Detected",
        description: "This person is a minor. Special procedures may apply.",
        variant: "default",
      })
    }
  }, [age, toast])

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/login")
        return
      }
      setUser(currentUser)

      // Load master data
      const [states, districts, policeStations] = await Promise.all([
        supabase.from("states").select("*").eq("is_active", true).order("name"),
        supabase.from("districts").select("*").eq("is_active", true).order("name"),
        supabase
          .from("police_stations")
          .select("*")
          .eq("is_active", true)
          .order("name"),
      ])

      setMasterData({
        states: states.data || [],
        districts: districts.data || [],
        policeStations: policeStations.data || [],
      })

      // Load FIRs for current user's station
      if (currentUser.police_station_id) {
        const { data: firsData } = await supabase
          .from("fir_records")
          .select("id, fir_number, incident_date")
          .eq("police_station_id", currentUser.police_station_id)
          .eq("is_deleted", false)
          .order("created_at", { ascending: false })
          .limit(100)

        setFirs(firsData || [])
      }

      if (initialData) {
        Object.keys(initialData).forEach((key) => {
          if (key === "date_of_birth" && initialData[key]) {
            setValue(key, new Date(initialData[key]))
          } else {
            setValue(key as any, initialData[key])
          }
        })
        if (initialData.photo_url) {
          setPhotoPreview(initialData.photo_url)
        }
      }
    } catch (error) {
      console.error("Error loading form data:", error)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: AccusedInput) => {
    if (!user) return

    setLoading(true)
    try {
      // Upload photo if provided
      let photoUrl = data.photo_url
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile)
      }

      const accusedData = {
        ...data,
        date_of_birth: data.date_of_birth
          ? format(data.date_of_birth, "yyyy-MM-dd")
          : null,
        photo_url: photoUrl,
        permanent_address: sameAsCurrent
          ? data.current_address
          : data.permanent_address,
        created_by: user.id,
      }

      let result
      if (isEdit && initialData?.id) {
        const { data: updated, error } = await supabase
          .from("accused_persons")
          .update(accusedData)
          .eq("id", initialData.id)
          .select()
          .single()

        if (error) throw error
        result = updated

        await createAuditLog({
          userId: user.id,
          action: "UPDATE",
          table: "accused_persons",
          recordId: initialData.id,
          summary: `Accused ${data.full_name} updated`,
        })
      } else {
        const { data: inserted, error } = await supabase
          .from("accused_persons")
          .insert(accusedData)
          .select()
          .single()

        if (error) throw error
        result = inserted

        await createAuditLog({
          userId: user.id,
          action: "CREATE",
          table: "accused_persons",
          recordId: result.id,
          summary: `Accused ${data.full_name} added to FIR`,
        })

        setNewAccusedId(result.id)
        setShowBailDialog(true)
      }

      toast({
        title: "Success",
        description: isEdit
          ? "Accused updated successfully"
          : "Accused added successfully",
      })

      if (!isEdit && !showBailDialog) {
        setTimeout(() => router.push("/accused/list"), 1500)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save accused",
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

  const totalSteps = 6

  return (
    <>
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Step {currentStep} of {totalSteps}
          </span>
          <span className="text-sm text-muted-foreground">
            {Math.round((currentStep / totalSteps) * 100)}%
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Link to FIR */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Link to FIR</h2>
            <div className="space-y-2">
              <Label htmlFor="fir_id">
                FIR <span className="text-danger">*</span>
              </Label>
              <Select
                value={firId?.toString() || ""}
                onValueChange={(value) => setValue("fir_id", parseInt(value))}
                disabled={!!searchParams.get("fir_id")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select FIR" />
                </SelectTrigger>
                <SelectContent>
                  {firs.map((fir) => (
                    <SelectItem key={fir.id} value={fir.id.toString()}>
                      {fir.fir_number} - {format(new Date(fir.incident_date), "dd MMM yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.fir_id && (
                <p className="text-sm text-danger">{errors.fir_id.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Personal Details */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Personal Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Full Name <span className="text-danger">*</span>
                </Label>
                <Input id="full_name" {...register("full_name")} />
                {errors.full_name && (
                  <p className="text-sm text-danger">{errors.full_name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="alias_name">Alias Name</Label>
                <Input id="alias_name" {...register("alias_name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">
                  Gender <span className="text-danger">*</span>
                </Label>
                <div className="flex gap-4">
                  {["Male", "Female", "Other"].map((g) => (
                    <label key={g} className="flex items-center gap-2">
                      <input
                        type="radio"
                        value={g}
                        {...register("gender")}
                        className="w-4 h-4"
                      />
                      {g}
                    </label>
                  ))}
                </div>
                {errors.gender && (
                  <p className="text-sm text-danger">{errors.gender.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="age">
                  Age <span className="text-danger">*</span>
                </Label>
                <Input
                  id="age"
                  type="number"
                  min="1"
                  max="120"
                  {...register("age", { valueAsNumber: true })}
                />
                {errors.age && (
                  <p className="text-sm text-danger">{errors.age.message}</p>
                )}
                {age && age < 18 && (
                  <Badge variant="warning" className="mt-2">
                    ⚠️ MINOR
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  {...register("date_of_birth", { valueAsDate: true })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Contact & Family */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Contact & Family</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mobile_number">Mobile Number</Label>
                <Input id="mobile_number" {...register("mobile_number")} />
                {errors.mobile_number && (
                  <p className="text-sm text-danger">
                    {errors.mobile_number.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && (
                  <p className="text-sm text-danger">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="father_name">Father Name</Label>
                <Input id="father_name" {...register("father_name")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mother_name">Mother Name</Label>
                <Input id="mother_name" {...register("mother_name")} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="parentage">Parentage</Label>
                <Textarea id="parentage" {...register("parentage")} />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Address */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Address</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_address">
                  Current Address <span className="text-danger">*</span>
                </Label>
                <Textarea
                  id="current_address"
                  rows={3}
                  {...register("current_address")}
                />
                {errors.current_address && (
                  <p className="text-sm text-danger">
                    {errors.current_address.message}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="same_address"
                  checked={sameAsCurrent}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setValue("permanent_address", watch("current_address"))
                    }
                  }}
                />
                <Label htmlFor="same_address">Same as current address</Label>
              </div>
              {!sameAsCurrent && (
                <div className="space-y-2">
                  <Label htmlFor="permanent_address">Permanent Address</Label>
                  <Textarea
                    id="permanent_address"
                    rows={3}
                    {...register("permanent_address")}
                  />
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="state_id">State</Label>
                  <Select
                    value={watch("state_id")?.toString() || ""}
                    onValueChange={(value) => {
                      setValue("state_id", parseInt(value))
                      setValue("district_id", undefined)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterData.states.map((state: any) => (
                        <SelectItem key={state.id} value={state.id.toString()}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district_id">District</Label>
                  <Select
                    value={watch("district_id")?.toString() || ""}
                    onValueChange={(value) =>
                      setValue("district_id", parseInt(value))
                    }
                    disabled={!watch("state_id")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterData.districts
                        .filter(
                          (d: any) => d.state_id === watch("state_id")
                        )
                        .map((district: any) => (
                          <SelectItem
                            key={district.id}
                            value={district.id.toString()}
                          >
                            {district.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" {...register("pincode")} />
                  {errors.pincode && (
                    <p className="text-sm text-danger">
                      {errors.pincode.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Identification */}
        {currentStep === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Identification</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="aadhar_number">Aadhar Number</Label>
                <Input id="aadhar_number" {...register("aadhar_number")} />
                {errors.aadhar_number && (
                  <p className="text-sm text-danger">
                    {errors.aadhar_number.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="pan_number">PAN Number</Label>
                <Input
                  id="pan_number"
                  {...register("pan_number")}
                  placeholder="ABCDE1234F"
                />
                {errors.pan_number && (
                  <p className="text-sm text-danger">
                    {errors.pan_number.message}
                  </p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="photo">Photo</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handlePhotoChange}
                />
                {photoPreview && (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="mt-2 w-32 h-32 object-cover rounded"
                  />
                )}
                <p className="text-xs text-muted-foreground">
                  Max 2MB, JPG or PNG
                </p>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="identification_marks">Identification Marks</Label>
                <Textarea
                  id="identification_marks"
                  rows={3}
                  {...register("identification_marks")}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Criminal History */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Criminal History</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="previous_cases">Previous Cases</Label>
                <Input
                  id="previous_cases"
                  type="number"
                  min="0"
                  {...register("previous_cases", { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previous_convictions">Previous Convictions</Label>
                <Input
                  id="previous_convictions"
                  type="number"
                  min="0"
                  {...register("previous_convictions", {
                    valueAsNumber: true,
                  })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_habitual_offender"
                    {...register("is_habitual_offender")}
                  />
                  <Label htmlFor="is_habitual_offender">
                    Habitual Offender
                  </Label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          {currentStep < totalSteps ? (
            <Button
              type="button"
              onClick={() => setCurrentStep((s) => Math.min(totalSteps, s + 1))}
            >
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update Accused" : "Submit"}
            </Button>
          )}
        </div>
      </form>

      <Dialog open={showBailDialog} onOpenChange={setShowBailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accused Added Successfully</DialogTitle>
            <DialogDescription>
              Would you like to update bail status for this accused now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBailDialog(false)
                router.push("/accused/list")
              }}
            >
              Later
            </Button>
            <Button
              onClick={() => {
                setShowBailDialog(false)
                router.push(`/bail/update?accused_id=${newAccusedId}`)
              }}
            >
              Update Bail Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


