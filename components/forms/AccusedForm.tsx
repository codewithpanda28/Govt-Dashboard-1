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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { format, differenceInYears } from "date-fns"
import { 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  AlertCircle,
  Camera,
  Shield,
  Users
} from "lucide-react"

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
    defaultValues: initialData || {
      previous_cases: 0,
      previous_convictions: 0,
      is_habitual_offender: false,
    },
  })

  const firId = watch("fir_id")
  const age = watch("age")
  const dateOfBirth = watch("date_of_birth")
  const currentAddress = watch("current_address")
  const stateId = watch("state_id")

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
      const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
      const years = differenceInYears(new Date(), dob)
      if (years > 0 && years <= 120) {
        setValue("age", years)
      }
    }
  }, [dateOfBirth, setValue])

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/login")
        return
      }
      setUser(currentUser)

      const [states, districts, policeStations] = await Promise.all([
        supabase.from("states").select("*").eq("is_active", true).order("name"),
        supabase.from("districts").select("*").eq("is_active", true).order("name"),
        supabase.from("police_stations").select("*").eq("is_active", true).order("name"),
      ])

      setMasterData({
        states: states.data || [],
        districts: districts.data || [],
        policeStations: policeStations.data || [],
      })

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
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Photo size must be less than 2MB",
          variant: "destructive",
        })
        return
      }
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onError = (errors: any) => {
    console.log("❌ Validation Errors:", errors)
    const firstError = Object.values(errors)[0] as any
    toast({
      title: "Validation Error",
      description: firstError?.message || "Please check all required fields",
      variant: "destructive",
    })
  }

  const onSubmit = async (data: AccusedInput) => {
    console.log("🔥 Accused Form Submitted!", data)
    
    if (!user) {
      toast({
        title: "Error",
        description: "User session expired. Please login again.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    
    try {
      let photoUrl = data.photo_url
      if (photoFile) {
        console.log("📷 Uploading photo...")
        try {
          photoUrl = await uploadPhoto(photoFile)
        } catch (photoError) {
          console.log("⚠️ Photo upload failed, continuing without photo")
          photoUrl = null
        }
      }

      const accusedData = {
        fir_id: data.fir_id,
        full_name: data.full_name,
        alias_name: data.alias_name || null,
        gender: data.gender,
        age: data.age,
        date_of_birth: data.date_of_birth
          ? (typeof data.date_of_birth === 'string' 
              ? data.date_of_birth 
              : format(data.date_of_birth, "yyyy-MM-dd"))
          : null,
        // ❌ REMOVED: is_minor (auto-calculated by database)
        mobile_number: data.mobile_number || null,
        father_name: data.father_name || null,
        mother_name: data.mother_name || null,
        parentage: data.parentage || null,
        current_address: data.current_address,
        permanent_address: data.permanent_address || data.current_address,
        district_id: data.district_id || null,
        state_id: data.state_id || null,
        pincode: data.pincode || null,
        aadhar_number: data.aadhar_number || null,
        pan_number: data.pan_number || null,
        photo_url: photoUrl || null,
        identification_marks: data.identification_marks || null,
        previous_cases: data.previous_cases || 0,
        previous_convictions: data.previous_convictions || 0,
        is_habitual_offender: data.is_habitual_offender || false,
        created_by: user.id,
      }

      console.log("📦 Accused Data to save:", accusedData)

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
        title: "✅ Success",
        description: isEdit
          ? "Accused updated successfully"
          : "Accused added successfully",
      })

      if (isEdit) {
        setTimeout(() => router.push("/accused/list"), 1500)
      }
    } catch (error: any) {
      console.log("❌ Error:", error)
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

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6">
        {/* FIR Selection */}
        <Card className="border-2 border-amber-200">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
            <CardTitle className="flex items-center gap-2 text-amber-900">
              <FileText className="h-5 w-5" />
              Link to FIR
            </CardTitle>
            <CardDescription>Select the FIR this accused is linked to</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label htmlFor="fir_id">
                FIR Number <span className="text-red-500">*</span>
              </Label>
              <Select
                value={firId?.toString() || ""}
                onValueChange={(value) => setValue("fir_id", parseInt(value))}
                disabled={!!searchParams.get("fir_id")}
              >
                <SelectTrigger className="h-11">
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
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.fir_id.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Personal Details */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <User className="h-5 w-5" />
              Personal Details
            </CardTitle>
            <CardDescription>Basic information about the accused</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Photo Upload - Full Width */}
              <div className="md:col-span-2 lg:col-span-1 flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 bg-gray-50">
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-40 h-40 object-cover rounded-lg shadow-lg"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        setPhotoFile(null)
                        setPhotoPreview("")
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Camera className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <Label htmlFor="photo" className="cursor-pointer">
                      <div className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        Upload Photo
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Max 2MB, JPG/PNG</p>
                    </Label>
                    <Input
                      id="photo"
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="full_name" 
                  {...register("full_name")} 
                  placeholder="Enter full name"
                  className="h-11"
                />
                {errors.full_name && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.full_name.message}
                  </p>
                )}
              </div>

              {/* Alias Name */}
              <div className="space-y-2">
                <Label htmlFor="alias_name">Alias / Nickname</Label>
                <Input 
                  id="alias_name" 
                  {...register("alias_name")} 
                  placeholder="Known as..."
                  className="h-11"
                />
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label>
                  Gender <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-4 pt-2">
                  {["Male", "Female", "Other"].map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value={g}
                        {...register("gender")}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm">{g}</span>
                    </label>
                  ))}
                </div>
                {errors.gender && (
                  <p className="text-sm text-red-500">{errors.gender.message}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  {...register("date_of_birth")}
                  className="h-11"
                />
              </div>

              {/* Age */}
              <div className="space-y-2">
                <Label htmlFor="age">
                  Age <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="age"
                  type="number"
                  min="1"
                  max="120"
                  {...register("age", { valueAsNumber: true })}
                  placeholder="Years"
                  className="h-11"
                />
                {errors.age && (
                  <p className="text-sm text-red-500">{errors.age.message}</p>
                )}
                {age && age < 18 && (
                  <Badge variant="destructive" className="mt-1">
                    ⚠️ MINOR (Under 18)
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Family */}
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Users className="h-5 w-5" />
              Contact & Family Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mobile_number" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Mobile Number
                </Label>
                <Input 
                  id="mobile_number" 
                  {...register("mobile_number")} 
                  placeholder="10 digit number"
                  className="h-11"
                />
                {errors.mobile_number && (
                  <p className="text-sm text-red-500">{errors.mobile_number.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  {...register("email")} 
                  placeholder="example@email.com"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="father_name">Father's Name</Label>
                <Input 
                  id="father_name" 
                  {...register("father_name")} 
                  placeholder="S/o..."
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mother_name">Mother's Name</Label>
                <Input 
                  id="mother_name" 
                  {...register("mother_name")} 
                  placeholder="Mother's name"
                  className="h-11"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="parentage">Complete Parentage</Label>
                <Textarea 
                  id="parentage" 
                  {...register("parentage")} 
                  placeholder="S/o... R/o..."
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Details */}
        <Card className="border-2 border-purple-200">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
            <CardTitle className="flex items-center gap-2 text-purple-900">
              <MapPin className="h-5 w-5" />
              Address Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="current_address">
                  Current Address <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="current_address"
                  rows={3}
                  {...register("current_address")}
                  placeholder="House No., Street, Landmark, City"
                  className="resize-none"
                />
                {errors.current_address && (
                  <p className="text-sm text-red-500">{errors.current_address.message}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="same_address"
                  className="w-4 h-4 text-purple-600 rounded"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setValue("permanent_address", currentAddress)
                    } else {
                      setValue("permanent_address", "")
                    }
                  }}
                />
                <Label htmlFor="same_address" className="cursor-pointer">
                  Permanent address same as current address
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="permanent_address">Permanent Address</Label>
                <Textarea
                  id="permanent_address"
                  rows={3}
                  {...register("permanent_address")}
                  placeholder="Native place address"
                  className="resize-none"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="state_id">State</Label>
                  <Select
                    value={stateId?.toString() || ""}
                    onValueChange={(value) => {
                      setValue("state_id", parseInt(value))
                      setValue("district_id", undefined)
                    }}
                  >
                    <SelectTrigger className="h-11">
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
                    onValueChange={(value) => setValue("district_id", parseInt(value))}
                    disabled={!stateId}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select district" />
                    </SelectTrigger>
                    <SelectContent>
                      {masterData.districts
                        .filter((d: any) => d.state_id === stateId)
                        .map((district: any) => (
                          <SelectItem key={district.id} value={district.id.toString()}>
                            {district.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input 
                    id="pincode" 
                    {...register("pincode")} 
                    placeholder="6 digits"
                    className="h-11"
                  />
                  {errors.pincode && (
                    <p className="text-sm text-red-500">{errors.pincode.message}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Identification */}
        <Card className="border-2 border-indigo-200">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50">
            <CardTitle className="flex items-center gap-2 text-indigo-900">
              <Shield className="h-5 w-5" />
              Identification Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="aadhar_number">Aadhar Number</Label>
                <Input 
                  id="aadhar_number" 
                  {...register("aadhar_number")} 
                  placeholder="XXXX-XXXX-XXXX"
                  className="h-11"
                />
                {errors.aadhar_number && (
                  <p className="text-sm text-red-500">{errors.aadhar_number.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pan_number">PAN Number</Label>
                <Input
                  id="pan_number"
                  {...register("pan_number")}
                  placeholder="ABCDE1234F"
                  className="h-11 uppercase"
                />
                {errors.pan_number && (
                  <p className="text-sm text-red-500">{errors.pan_number.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="identification_marks">Identification Marks</Label>
                <Textarea
                  id="identification_marks"
                  rows={3}
                  {...register("identification_marks")}
                  placeholder="Scars, tattoos, birthmarks, etc."
                  className="resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Criminal History */}
        <Card className="border-2 border-red-200">
          <CardHeader className="bg-gradient-to-r from-red-50 to-rose-50">
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="h-5 w-5" />
              Criminal History
            </CardTitle>
            <CardDescription>Previous criminal records and history</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="previous_cases">Previous Cases</Label>
                <Input
                  id="previous_cases"
                  type="number"
                  min="0"
                  defaultValue={0}
                  {...register("previous_cases", { valueAsNumber: true })}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="previous_convictions">Previous Convictions</Label>
                <Input
                  id="previous_convictions"
                  type="number"
                  min="0"
                  defaultValue={0}
                  {...register("previous_convictions", { valueAsNumber: true })}
                  className="h-11"
                />
              </div>

              <div className="flex items-center gap-2 pt-8">
                <input
                  type="checkbox"
                  id="is_habitual_offender"
                  {...register("is_habitual_offender")}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <Label htmlFor="is_habitual_offender" className="cursor-pointer font-semibold">
                  Habitual Offender
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-4 justify-end pt-4 border-t-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            className="min-w-[150px] bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </span>
            ) : (
              <span>{isEdit ? "Update Accused" : "Submit & Save"}</span>
            )}
          </Button>
        </div>
      </form>

      <Dialog open={showBailDialog} onOpenChange={setShowBailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>✅ Accused Added Successfully</DialogTitle>
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