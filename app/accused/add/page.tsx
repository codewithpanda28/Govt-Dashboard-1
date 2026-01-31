"use client"

import { Suspense, useEffect, useState } from "react"
import { Header } from "@/components/layout/Header"
import { AccusedForm } from "@/components/forms/AccusedForm"
import { getCurrentUser } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function AddAccusedContent() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const currentUser = await getCurrentUser()
    setUser(currentUser)
  }

  return (
    <div className="page-wrapper">
      <Header user={user} title="Add Accused" />
      <div className="page-container">
        <Card>
          <CardHeader>
            <CardTitle>Add Accused Person</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<FormLoading />}>
              <AccusedForm />
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

export default function AddAccusedPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <AddAccusedContent />
    </Suspense>
  )
}

function PageLoading() {
  return (
    <div className="page-wrapper flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  )
}
