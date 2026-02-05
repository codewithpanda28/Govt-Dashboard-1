"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  Users,
  Scale,
  User,
  LogOut,
  Menu,
  X,
  Shield,
  BarChart3
} from "lucide-react"
import { cn } from "@/lib/utils/cn"
import { Button } from "@/components/ui/button"
import { logout } from "@/lib/auth"
import { useRouter } from "next/navigation"
import { useState } from "react"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/fir/add", label: "Add FIR", icon: FilePlus },
  { href: "/fir/list", label: "FIRs List", icon: FileText },
  { href: "/accused/list", label: "Accused List", icon: Users },
  { href: "/bail/list", label: "Bail List", icon: Scale },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] flex items-center justify-center w-12 h-12 rounded-lg bg-primary text-white border-2 border-primary-foreground/30 shadow-lg hover:bg-primary/90 transition-all gov-shadow"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <Menu className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 bg-gradient-to-b from-primary via-primary to-primary/95 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 gov-shadow-lg",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ height: '100vh', maxHeight: '100vh' }}
      >
        <div className="flex h-full flex-col overflow-hidden">
          {/* Logo */}
          <div className="flex h-24 items-center justify-center border-b-2 border-primary-foreground/20 px-4 sm:px-6 bg-primary/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-secondary/20 border-2 border-secondary/40">
                <Shield className="h-8 w-8 text-secondary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Railway Police</h1>
                <p className="text-xs text-primary-foreground/70">Data Management System</p>
              </div>
            </div>
          </div>

          {/* Menu */}
          <nav className="flex-1 space-y-2 p-4 overflow-y-auto overflow-x-hidden">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 gov-shadow",
                    isActive
                      ? "bg-secondary text-primary shadow-lg scale-[1.02] border-2 border-secondary/50"
                      : "text-primary-foreground/90 hover:bg-primary-foreground/15 hover:text-white hover:scale-[1.01] border-2 border-transparent"
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "text-primary")} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="border-t-2 border-primary-foreground/20 p-4 bg-primary/50 flex-shrink-0">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-primary-foreground/90 hover:bg-destructive/20 hover:text-white border-2 border-primary-foreground/20 rounded-xl py-3 font-semibold transition-all"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}