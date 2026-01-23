"use client"

import { Header } from "@/components/layout/Header"
import { AccusedForm } from "@/components/forms/AccusedForm"
import { getCurrentUser } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"

export default function AddAccusedPage() {
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
      <Header user={user} title="Add Accused" />
      <div className="p-4 lg:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Add Accused Person</CardTitle>
          </CardHeader>
          <CardContent>
            <AccusedForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


