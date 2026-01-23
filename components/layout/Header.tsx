"use client"

import { User } from "@/lib/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { UserCircle, Shield, Building2 } from "lucide-react"

interface HeaderProps {
  user: User | null
  title?: string
}

export function Header({ user, title = "Dashboard" }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 sm:h-20 items-center gap-2 sm:gap-4 border-b-2 border-primary/30 bg-gradient-to-r from-primary via-primary to-primary/95 text-primary-foreground gov-shadow-lg">
      <div className="flex flex-1 items-center gap-2 sm:gap-4 px-3 sm:px-6 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="hidden sm:flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-secondary/20 border-2 border-secondary/40 flex-shrink-0">
            <Shield className="h-5 w-5 sm:h-7 sm:w-7 text-secondary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate">{title}</h1>
            <p className="hidden sm:flex text-xs text-primary-foreground/80 items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span className="truncate">Government Railway Police Portal</span>
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 flex-shrink-0">
        <div className="hidden md:flex flex-col items-end text-right mr-2 sm:mr-4">
          <p className="text-sm font-semibold truncate max-w-[150px]">{user?.full_name}</p>
          <p className="text-xs text-primary-foreground/80 truncate max-w-[150px]">{user?.designation}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 border-2 border-primary-foreground/20 w-9 h-9 sm:w-10 sm:h-10">
              <UserCircle className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 sm:w-64 gov-shadow-lg">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold text-foreground">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <p className="text-xs font-medium text-primary">{user?.designation}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <a href="/profile" className="w-full">Profile Settings</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}


