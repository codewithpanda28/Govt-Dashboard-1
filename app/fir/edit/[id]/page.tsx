"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase/client"
import { Header } from "@/components/layout/Header"
import { FIRForm } from "@/components/forms/FIRForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function EditFIRPage() {
  const params = useParams()
  const [user, setUser] = useState<any>(null)
  const [fir, setFir] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [params.id])

  const loadData = async () => {
    try {
      const currentUser = await getCurrentUser()
      setUser(currentUser)

      const { data, error } = await supabase
        .from("fir_records")
        .select("*")
        .eq("id", params.id)
        .single()

      if (error) throw error

      if (data.created_by !== currentUser?.id) {
        throw new Error("You don't have permission to edit this FIR")
      }

      // Parse law_sections if it's a string
      if (typeof data.law_sections === 'string') {
        data.law_sections = JSON.parse(data.law_sections)
      }

      setFir(data)
    } catch (error) {
      console.error("Error loading FIR:", error)
    } finally {
      setLoading(false)
    }
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
              <p className="text-muted-foreground">FIR not found or you don't have permission to edit it</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} title={`Edit FIR: ${fir.fir_number}`} />
      <div className="p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Edit FIR</CardTitle>
          </CardHeader>
          <CardContent>
            <FIRForm initialData={fir} isEdit={true} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


