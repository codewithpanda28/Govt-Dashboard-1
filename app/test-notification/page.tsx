"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function TestNotification() {
  const [open, setOpen] = useState(false)

  return (
    <div className="page-wrapper">
      <div className="page-container">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-8">Notification Test</h1>
          
        {/* Method 1: Simple Dropdown */}
        <div className="mb-8">
          <p className="mb-2 text-sm text-gray-500">Method 1: DropdownMenu</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  3
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem>
                📩 New FIR Assigned
              </DropdownMenuItem>
              <DropdownMenuItem>
                ✅ Bail Approved
              </DropdownMenuItem>
              <DropdownMenuItem>
                ⚠️ Court Date Tomorrow
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Method 2: Simple onClick */}
        <div className="mb-8">
          <p className="mb-2 text-sm text-gray-500">Method 2: Simple Button</p>
          <Button 
            variant="outline" 
            onClick={() => alert("Notification clicked!")}
            className="relative"
          >
            <Bell className="h-5 w-5 mr-2" />
            Click Me
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
              5
            </span>
          </Button>
        </div>

        {/* Method 3: State based */}
        <div>
          <p className="mb-2 text-sm text-gray-500">Method 3: State Toggle</p>
          <Button 
            variant={open ? "default" : "outline"}
            onClick={() => setOpen(!open)}
          >
            <Bell className="h-5 w-5 mr-2" />
            {open ? "Close" : "Open"} Notifications
          </Button>
          
          {open && (
            <div className="mt-4 p-4 bg-white rounded-lg shadow-lg border max-w-xs mx-auto">
              <p className="font-semibold mb-2">Notifications</p>
              <div className="space-y-2 text-sm text-left">
                <div className="p-2 bg-blue-50 rounded">📩 New FIR Assigned</div>
                <div className="p-2 bg-green-50 rounded">✅ Bail Approved</div>
                <div className="p-2 bg-yellow-50 rounded">⚠️ Court Date Tomorrow</div>
              </div>
            </div>
          )}
        </div>
        </div>
    </div>
  )
}
}
