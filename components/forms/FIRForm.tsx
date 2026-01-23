"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { firSchema, type FIRInput } from "@/lib/validations/schemas"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/auth"
import { createAuditLog } from "@/lib/utils/audit-log"
import { getNextFIRNumber, getMasterData } from "@/lib/hooks/use-fir"
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
import { MultiSelect } from "@/components/ui/multi-select"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { format } from "date-fns"

interface FIRFormProps {
  initialData?: any
  isEdit?: boolean
}

export function FIRForm({ initialData, isEdit = false }: FIRFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [masterData, setMasterData] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [showAddAccusedDialog, setShowAddAccusedDialog] = useState(false)
  const [newFIRId, setNewFIRId] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FIRInput>({
    resolver: zodResolver(firSchema),
    defaultValues: initialData || {},
  })

  const modusOperandiId = watch("modus_operandi_id")
  const trainId = watch("train_id")
  const stationId = watch("station_id")
  const [trainSelectValue, setTrainSelectValue] = useState<string>("")
  const [stationSelectValue, setStationSelectValue] = useState<string>("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/login")
        return
      }
      setUser(currentUser)

      const data = await getMasterData()
      setMasterData(data)

      if (!isEdit && currentUser.police_station_id) {
        const nextFIR = await getNextFIRNumber(currentUser.police_station_id)
        setValue("fir_number", nextFIR)
        setValue("police_station_id", currentUser.police_station_id)
        setValue("railway_district_id", currentUser.railway_district_id || 0)
      }

      if (initialData) {
        Object.keys(initialData).forEach((key) => {
          if (key === "incident_date") {
            setValue(key, new Date(initialData[key]))
          } else {
            setValue(key as any, initialData[key])
          }
        })
        if (initialData.train_id) {
          setTrainSelectValue(initialData.train_id.toString())
        }
        if (initialData.station_id) {
          setStationSelectValue(initialData.station_id.toString())
        }
      }
    } catch (error) {
      console.error("Error loading form data:", error)
    }
  }

  useEffect(() => {
    if (trainId && masterData) {
      const train = masterData.trains.find((t: any) => t.id === trainId)
      if (train) {
        setValue("train_name_manual", train.train_name)
        setValue("train_number_manual", train.train_number)
      }
    }
  }, [trainId, masterData, setValue])

  useEffect(() => {
    if (stationId && masterData) {
      const station = masterData.stations.find((s: any) => s.id === stationId)
      if (station) {
        setValue("station_name_manual", station.station_name)
      }
    }
  }, [stationId, masterData, setValue])

  const onSubmit = async (data: FIRInput) => {
    if (!user) return

    setLoading(true)
    try {
      const firData = {
        ...data,
        incident_date: format(data.incident_date, "yyyy-MM-dd"),
        law_sections: data.law_sections || [],
        law_sections_text: masterData?.lawSections
          .filter((ls: any) => data.law_sections?.includes(ls.id))
          .map((ls: any) => ls.section_code)
          .join(", "),
        created_by: user.id,
      }

      let result
      if (isEdit && initialData?.id) {
        const { data: updated, error } = await supabase
          .from("fir_records")
          .update(firData)
          .eq("id", initialData.id)
          .select()
          .single()

        if (error) throw error
        result = updated

        await createAuditLog({
          userId: user.id,
          action: "UPDATE",
          table: "fir_records",
          recordId: initialData.id,
          summary: `FIR ${data.fir_number} updated`,
        })
      } else {
        const { data: inserted, error } = await supabase
          .from("fir_records")
          .insert(firData)
          .select()
          .single()

        if (error) throw error
        result = inserted

        await createAuditLog({
          userId: user.id,
          action: "CREATE",
          table: "fir_records",
          recordId: result.id,
          summary: `FIR ${data.fir_number} created`,
        })

        setNewFIRId(result.id)
        setShowAddAccusedDialog(true)
      }

      toast({
        title: "Success",
        description: isEdit ? "FIR updated successfully" : "FIR created successfully",
      })

      if (!isEdit && !showAddAccusedDialog) {
        setTimeout(() => router.push("/fir/list"), 1500)
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save FIR",
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

  const selectedModus = masterData.modusOperandi.find(
    (m: any) => m.id === modusOperandiId
  )
  const showPropertySection =
    selectedModus?.name?.toLowerCase().includes("theft") ||
    selectedModus?.name?.toLowerCase().includes("robbery")

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Details */}
        <div className="space-y-4 sm:space-y-5">
          <h2 className="form-section-title text-lg sm:text-xl">Basic Details</h2>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            <div className="space-y-2.5">
              <Label htmlFor="fir_number" className="text-base">
                FIR Number <span className="text-danger font-bold">*</span>
              </Label>
              <Input
                id="fir_number"
                {...register("fir_number")}
                readOnly={isEdit}
              />
              {errors.fir_number && (
                <p className="text-sm text-danger font-medium">{errors.fir_number.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident_date">
                Incident Date <span className="text-danger">*</span>
              </Label>
              <Input
                id="incident_date"
                type="date"
                max={format(new Date(), "yyyy-MM-dd")}
                {...register("incident_date", {
                  valueAsDate: true,
                })}
              />
              {errors.incident_date && (
                <p className="text-sm text-danger">{errors.incident_date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident_time">
                Incident Time <span className="text-danger">*</span>
              </Label>
              <Input
                id="incident_time"
                type="time"
                {...register("incident_time")}
              />
              {errors.incident_time && (
                <p className="text-sm text-danger">{errors.incident_time.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-4 sm:space-y-5">
          <h2 className="form-section-title text-lg sm:text-xl">Location Details</h2>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="train_id">Train</Label>
              <Select
                value={trainSelectValue}
                onValueChange={(value) => {
                  setTrainSelectValue(value)
                  if (value === "manual") {
                    setValue("train_id", undefined)
                  } else {
                    setValue("train_id", parseInt(value))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select train" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  {masterData.trains.map((train: any) => (
                    <SelectItem key={train.id} value={train.id.toString()}>
                      {train.train_number} - {train.train_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {trainSelectValue === "manual" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="train_number_manual">Train Number</Label>
                  <Input
                    id="train_number_manual"
                    {...register("train_number_manual")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="train_name_manual">Train Name</Label>
                  <Input
                    id="train_name_manual"
                    {...register("train_name_manual")}
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="station_id">Station</Label>
              <Select
                value={stationSelectValue}
                onValueChange={(value) => {
                  setStationSelectValue(value)
                  if (value === "manual") {
                    setValue("station_id", undefined)
                  } else {
                    setValue("station_id", parseInt(value))
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  {masterData.stations.map((station: any) => (
                    <SelectItem key={station.id} value={station.id.toString()}>
                      {station.station_code} - {station.station_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {stationSelectValue === "manual" && (
              <div className="space-y-2">
                <Label htmlFor="station_name_manual">Station Name</Label>
                <Input
                  id="station_name_manual"
                  {...register("station_name_manual")}
                />
              </div>
            )}
          </div>
        </div>

        {/* Crime Details */}
        <div className="space-y-4 sm:space-y-5">
          <h2 className="form-section-title text-lg sm:text-xl">Crime Details</h2>
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="modus_operandi_id">
                Modus Operandi <span className="text-danger">*</span>
              </Label>
              <Select
                value={modusOperandiId?.toString() || ""}
                onValueChange={(value) =>
                  setValue("modus_operandi_id", parseInt(value))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select modus operandi" />
                </SelectTrigger>
                <SelectContent>
                  {masterData.modusOperandi.map((mo: any) => (
                    <SelectItem key={mo.id} value={mo.id.toString()}>
                      {mo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.modus_operandi_id && (
                <p className="text-sm text-danger">
                  {errors.modus_operandi_id.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="law_sections">
                Law Sections <span className="text-danger">*</span>
              </Label>
              <MultiSelect
                options={masterData.lawSections.map((ls: any) => ({
                  label: `${ls.section_code} - ${ls.description}`,
                  value: ls.id,
                }))}
                selected={watch("law_sections") || []}
                onChange={(values) =>
                  setValue(
                    "law_sections",
                    values.map((v) => (typeof v === "string" ? parseInt(v) : v))
                  )
                }
                placeholder="Select law sections"
              />
              {errors.law_sections && (
                <p className="text-sm text-danger">{errors.law_sections.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="brief_description">
              Brief Description <span className="text-danger">*</span>
            </Label>
            <Textarea
              id="brief_description"
              rows={3}
              {...register("brief_description")}
              placeholder="50-500 characters"
            />
            {errors.brief_description && (
              <p className="text-sm text-danger">
                {errors.brief_description.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="detailed_description">Detailed Description</Label>
            <Textarea
              id="detailed_description"
              rows={5}
              {...register("detailed_description")}
              placeholder="Maximum 2000 characters"
            />
            {errors.detailed_description && (
              <p className="text-sm text-danger">
                {errors.detailed_description.message}
              </p>
            )}
          </div>
        </div>

        {/* Property Section */}
        {showPropertySection && (
          <div className="space-y-4 sm:space-y-5">
            <h2 className="form-section-title text-lg sm:text-xl">Property Details</h2>
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="property_stolen">Property Stolen</Label>
                <Textarea
                  id="property_stolen"
                  rows={3}
                  {...register("property_stolen")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_value">Estimated Value (₹)</Label>
                <Input
                  id="estimated_value"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("estimated_value", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t-2 border-primary/20">
          <Button type="submit" disabled={loading} size="lg" className="w-full sm:w-auto sm:min-w-[150px]">
            {loading ? "Saving..." : isEdit ? "Update FIR" : "Submit FIR"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            size="lg"
            className="w-full sm:w-auto sm:min-w-[120px]"
          >
            Cancel
          </Button>
        </div>
      </form>

      <Dialog open={showAddAccusedDialog} onOpenChange={setShowAddAccusedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>FIR Created Successfully</DialogTitle>
            <DialogDescription>
              Would you like to add accused persons to this FIR now?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddAccusedDialog(false)
                router.push("/fir/list")
              }}
            >
              Later
            </Button>
            <Button
              onClick={() => {
                setShowAddAccusedDialog(false)
                router.push(`/accused/add?fir_id=${newFIRId}`)
              }}
            >
              Add Accused Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

