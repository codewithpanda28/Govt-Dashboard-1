"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/Header"
import { FIRForm } from "@/components/forms/FIRForm"
import { getCurrentUser } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AddFIRPage() {
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
      <Header user={user} title="Add FIR" />
      <div className="p-4 sm:p-6 lg:p-8">
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 sm:gap-3">
              <div className="w-1 h-8 sm:h-10 bg-secondary rounded-full"></div>
              <span className="text-xl sm:text-2xl">Create New FIR Record</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FIRForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

