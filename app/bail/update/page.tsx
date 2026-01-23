"use client"

import { Header } from "@/components/layout/Header"
import { BailForm } from "@/components/forms/BailForm"
import { getCurrentUser } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"

export default function UpdateBailPage() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const currentUser = await getCurrentUser()
    setUser(currentUser)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} title="Update Bail Status" />
      <div className="p-4 sm:p-6 lg:p-8">
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-1 h-10 bg-secondary rounded-full"></div>
              Update Bail/Custody Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BailForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


