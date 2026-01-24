"use client"

import { Suspense, useEffect, useState } from "react"
import { Header } from "@/components/layout/Header"
import { BailForm } from "@/components/forms/BailForm"
import { getCurrentUser } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function UpdateBailContent() {
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
            <Suspense fallback={<FormLoading />}>
              <BailForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FormLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <span className="ml-2 text-muted-foreground">Loading form...</span>
    </div>
  )
}

export default function UpdateBailPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <UpdateBailContent />
    </Suspense>
  )
}

function PageLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}