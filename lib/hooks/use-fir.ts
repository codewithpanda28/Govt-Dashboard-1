import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/auth"

export async function getNextFIRNumber(policeStationId: number): Promise<string> {
  const { data } = await supabase
    .from("fir_records")
    .select("fir_number")
    .eq("police_station_id", policeStationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single()

  if (!data) {
    return "FIR-001"
  }

  const match = data.fir_number.match(/(\d+)$/)
  if (match) {
    const num = parseInt(match[1]) + 1
    return `FIR-${num.toString().padStart(3, "0")}`
  }

  return "FIR-001"
}

export async function getMasterData() {
  const [states, districts, railwayDistricts, trains, stations, modusOperandi, lawSections] =
    await Promise.all([
      supabase.from("states").select("*").eq("is_active", true).order("name"),
      supabase.from("districts").select("*").eq("is_active", true).order("name"),
      supabase.from("railway_districts").select("*").eq("is_active", true).order("name"),
      supabase.from("trains").select("*").eq("is_active", true).order("train_number"),
      supabase.from("railway_stations").select("*").eq("is_active", true).order("station_name"),
      supabase.from("modus_operandi").select("*").eq("is_active", true).order("name"),
      supabase.from("law_sections").select("*").eq("is_active", true).order("section_code"),
    ])

  return {
    states: states.data || [],
    districts: districts.data || [],
    railwayDistricts: railwayDistricts.data || [],
    trains: trains.data || [],
    stations: stations.data || [],
    modusOperandi: modusOperandi.data || [],
    lawSections: lawSections.data || [],
  }
}


