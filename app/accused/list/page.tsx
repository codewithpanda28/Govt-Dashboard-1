"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { supabase } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Search, 
  Eye, 
  Edit, 
  MoreHorizontal, 
  User,
  Users,
  Bell,
  LogOut,
  UserCircle,
  Plus,
  Filter,
  RefreshCw
} from "lucide-react"
import Link from "next/link"

interface Accused {
  id: number
  full_name: string
  alias_name: string | null
  age: number
  gender: string
  mobile_number: string | null
  photo_url: string | null
  custody_status: string | null
  fir_id: number
  created_at: string
}

interface FIR {
  id: number
  fir_number: string
}

interface Notification {
  id: number
  title: string
  message: string
  created_at: string
  is_read: boolean
}

export default function AccusedListPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [accusedList, setAccusedList] = useState<(Accused & { fir?: FIR })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [genderFilter, setGenderFilter] = useState("all")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    if (user) {
      loadAccusedList()
      loadNotifications()
    }
  }, [user])

  const loadUser = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push("/login")
      return
    }
    setUser(currentUser)
  }

  const loadNotifications = async () => {
    // Demo notifications - replace with actual API call
    setNotifications([
      {
        id: 1,
        title: "New FIR Assigned",
        message: "FIR-004 has been assigned to you",
        created_at: new Date().toISOString(),
        is_read: false
      },
      {
        id: 2,
        title: "Bail Status Updated",
        message: "Accused Panda's bail has been approved",
        created_at: new Date(Date.now() - 3600000).toISOString(),
        is_read: false
      },
      {
        id: 3,
        title: "Court Date Reminder",
        message: "Hearing for FIR-003 is scheduled tomorrow",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        is_read: true
      }
    ])
  }

  const loadAccusedList = async () => {
    try {
      setLoading(true)

      const { data: accusedData, error } = await supabase
        .from("accused_persons")
        .select(`
          *,
          fir_records!inner(id, fir_number)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      const formattedData = accusedData?.map(item => ({
        ...item,
        fir: item.fir_records
      })) || []

      setAccusedList(formattedData)
    } catch (error) {
      console.error("Error loading accused list:", error)
      
      // Fallback: Load without join if fir_records join fails
      try {
        const { data: simpleData } = await supabase
          .from("accused_persons")
          .select("*")
          .order("created_at", { ascending: false })
        
        setAccusedList(simpleData || [])
      } catch (e) {
        console.error("Fallback also failed:", e)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const markNotificationAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  // Filter accused list
  const filteredList = accusedList.filter(accused => {
    const matchesSearch = 
      accused.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      accused.mobile_number?.includes(searchQuery) ||
      accused.alias_name?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesGender = genderFilter === "all" || accused.gender.toLowerCase() === genderFilter.toLowerCase()
    
    return matchesSearch && matchesGender
  })

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return <Badge variant="outline" className="text-gray-500">No Status</Badge>
    }
    
    const statusConfig: Record<string, { className: string; label: string }> = {
      bail: { className: "bg-green-100 text-green-700 border-green-200", label: "BAIL" },
      custody: { className: "bg-red-100 text-red-700 border-red-200", label: "CUSTODY" },
      absconding: { className: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "ABSCONDING" },
      released: { className: "bg-blue-100 text-blue-700 border-blue-200", label: "RELEASED" },
    }
    
    const config = statusConfig[status.toLowerCase()] || { 
      className: "bg-gray-100 text-gray-700", 
      label: status.toUpperCase() 
    }
    
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-cyan-500',
    ]
    const index = name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16">
          <h1 className="text-xl font-semibold text-gray-900">Accused List</h1>
          
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            {/* <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[11px] font-medium text-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="font-semibold">Notifications</span>
                  {unreadCount > 0 && (
                    <Badge variant="secondary">{unreadCount} new</Badge>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <DropdownMenuItem 
                        key={notification.id}
                        className={`px-4 py-3 cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''}`}
                        onClick={() => markNotificationAsRead(notification.id)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm ${!notification.is_read ? 'font-semibold' : 'font-medium'}`}>
                              {notification.title}
                            </p>
                            {!notification.is_read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    ))
                  )}
                </div>
                <div className="border-t px-4 py-2">
                  <Button variant="ghost" size="sm" className="w-full text-blue-600">
                    View all notifications
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu> */}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <span className="hidden md:inline text-sm font-medium">
                    {user?.full_name || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-4 lg:p-6">
        {/* Stats Card */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Accused Persons</p>
                <p className="text-2xl font-bold">{accusedList.length}</p>
              </div>
              <div className="ml-auto">
                <Button asChild>
                  <Link href="/accused/add">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Accused
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, alias or mobile..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadAccusedList}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent mx-auto"></div>
                  <p className="mt-4 text-sm text-gray-500">Loading accused list...</p>
                </div>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="font-medium text-gray-900">No accused found</p>
                <p className="text-sm text-gray-500 mt-1">
                  {searchQuery || genderFilter !== "all" 
                    ? "Try adjusting your filters" 
                    : "Add your first accused person"}
                </p>
                {!searchQuery && genderFilter === "all" && (
                  <Button asChild className="mt-4">
                    <Link href="/accused/add">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Accused
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-20">Photo</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-center">Age</TableHead>
                      <TableHead className="text-center">Gender</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>FIR No</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredList.map((accused) => (
                      <TableRow key={accused.id} className="hover:bg-gray-50">
                        <TableCell>
                          {accused.photo_url ? (
                            <img
                              src={accused.photo_url}
                              alt={accused.full_name}
                              className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                              onError={(e) => {
                                // If image fails to load, show initials
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                target.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <div 
                            className={`h-12 w-12 rounded-full ${getAvatarColor(accused.full_name)} flex items-center justify-center text-white font-semibold ${accused.photo_url ? 'hidden' : ''}`}
                          >
                            {getInitials(accused.full_name)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900">{accused.full_name}</p>
                            {accused.alias_name && (
                              <p className="text-xs text-gray-500">a.k.a. {accused.alias_name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{accused.age}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="capitalize">
                            {accused.gender}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {accused.mobile_number || (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link 
                            href={`/fir/${accused.fir_id}`}
                            className="text-blue-600 hover:underline font-medium"
                          >
                            {accused.fir?.fir_number || `FIR-${accused.fir_id}`}
                          </Link>
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(accused.custody_status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/accused/${accused.id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {/* ✅ YEH LINE FIX KARI - EDIT ROUTE */}
                              <DropdownMenuItem onClick={() => router.push(`/accused/${accused.id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Count */}
        {!loading && filteredList.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredList.length} of {accusedList.length} accused persons
          </div>
        )}
      </div>
    </div>
  )
}