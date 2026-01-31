"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    checkAndRedirect()
  }, [])

  const checkAndRedirect = async () => {
    try {
      const user = await getCurrentUser()
      if (user) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    } catch (error) {
      console.error("Error checking user:", error)
      router.push("/login")
    }
  }

  return (
    <div className="page-wrapper">
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    </div>
  )
}

