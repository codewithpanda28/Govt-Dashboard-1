import { supabase } from '@/lib/supabase/client'
import { createAuditLog } from '@/lib/utils/audit-log'

export interface User {
  id: string
  auth_id: string
  employee_id: string
  email: string
  mobile: string
  full_name: string
  designation: string | null
  role: 'super_admin' | 'district_admin' | 'station_officer' | 'data_operator' | 'viewer'
  police_station_id: number | null
  railway_district_id: number | null
  // ✅ ADDED: Aliases for dashboard compatibility
  thana_id?: number | null
  district_id?: number | null
  is_active: boolean
  is_first_login: boolean
  last_login: string | null
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error('Session error:', sessionError)
      return null
    }

    if (!session?.user) {
      return null
    }

    // Try with is_active check first
    let { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', session.user.id)
      .eq('is_active', true)
      .single()

    // If not found, try without is_active filter (for debugging)
    if (error && error.code === 'PGRST116') {
      const { data: inactiveUser } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single()
      
      if (inactiveUser) {
        console.warn('⚠️ User found but is_active = false')
        // ✅ ADD ALIASES before returning
        const userWithAliases: User = {
          ...inactiveUser,
          thana_id: inactiveUser.police_station_id,
          district_id: inactiveUser.railway_district_id,
        }
        return userWithAliases
      }
    }

    if (error) {
      console.error('Error fetching user:', error)
      return null
    }

    if (!data) {
      return null
    }

    // ✅ ADD ALIASES: Map police_station_id to thana_id and railway_district_id to district_id
    const userWithAliases: User = {
      ...data,
      thana_id: data.police_station_id,
      district_id: data.railway_district_id,
    }

    return userWithAliases
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function checkAuth(): Promise<{ user: User | null; redirect: string | null }> {
  const user = await getCurrentUser()

  if (!user) {
    return { user: null, redirect: '/login' }
  }

  // Check if user has required role
  if (!['super_admin', 'district_admin', 'station_officer', 'data_operator'].includes(user.role)) {
    return { user: null, redirect: '/login' }
  }

  // Check if first login
  if (user.is_first_login) {
    return { user, redirect: '/change-password' }
  }

  return { user, redirect: null }
}

export async function login(email: string, password: string) {
  try {
    console.log('🔐 Starting login for:', email)
    
    // Step 1: Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      console.error('❌ Auth error:', error)
      throw new Error(error.message || 'Invalid email or password')
    }

    if (!data.user) {
      console.error('❌ No user data returned from auth')
      throw new Error('Login failed: No user data returned')
    }

    console.log('✅ Auth successful, user ID:', data.user.id)

    // Step 2: Wait for session to be established
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Step 3: Get user from our users table - try multiple approaches
    let user: User | null = null
    
    // First try: Use getCurrentUser (with is_active check)
    user = await getCurrentUser()
    
    if (!user) {
      console.log('⚠️ User not found with getCurrentUser, trying direct query...')
      
      // Second try: Direct query without is_active filter (in case user is inactive)
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', data.user.id)
        .single()

      if (userError) {
        console.error('❌ Error fetching user:', userError)
        
        // Check if it's a "not found" error
        if (userError.code === 'PGRST116') {
          throw new Error(
            `User account not found in database. Auth ID: ${data.user.id}. ` +
            `Please run this SQL to link the user:\n` +
            `INSERT INTO users (auth_id, employee_id, email, mobile, full_name, designation, role, police_station_id, railway_district_id, is_first_login)\n` +
            `SELECT id, 'EMP001', '${email}', '9876543210', 'Officer Name', 'SHO', 'station_officer', 1, 1, true\n` +
            `FROM auth.users WHERE id = '${data.user.id}';`
          )
        }
        
        throw new Error(`Database error: ${userError.message}`)
      }

      if (!userData) {
        throw new Error('User account not found in database. Please contact administrator.')
      }

      // ✅ ADD ALIASES
      user = {
        ...userData,
        thana_id: userData.police_station_id,
        district_id: userData.railway_district_id,
      } as User
      console.log('✅ User found via direct query:', user.email)
    } else {
      console.log('✅ User found via getCurrentUser:', user.email)
    }

    // Step 4: Validate user account
    if (!user.is_active) {
      console.error('❌ User account is inactive')
      throw new Error('Your account has been deactivated. Please contact administrator.')
    }

    if (!user.role) {
      console.error('❌ User has no role')
      throw new Error('User account is missing role. Please contact administrator.')
    }

    // ✅ UPDATED: Allow all valid roles
    const allowedRoles = ['super_admin', 'district_admin', 'station_officer', 'data_operator']
    if (!allowedRoles.includes(user.role)) {
      console.error('❌ User role not allowed:', user.role)
      throw new Error(
        `You do not have permission to access this portal. Your role is: ${user.role}. ` +
        `Required roles: ${allowedRoles.join(', ')}.`
      )
    }

    if (user.police_station_id === null && user.role === 'station_officer') {
      console.warn('⚠️ Station officer has no police_station_id')
    }

    console.log('✅ User validation passed:', {
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      is_first_login: user.is_first_login,
      thana_id: user.thana_id,
      district_id: user.district_id,
    })

    // Step 5: Update last login (non-blocking)
    supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)
      .then(({ error }) => {
        if (error) console.error('⚠️ Error updating last login:', error)
      })

    // Step 6: Log login (non-blocking)
    createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      table: 'users',
      summary: `User ${user.email} logged in`,
    }).catch(err => console.error('⚠️ Audit log error:', err))

    console.log('✅ Login successful!')
    return { user, session: data.session }
  } catch (error: any) {
    console.error('❌ Login function error:', error)
    throw error
  }
}

export async function logout() {
  const user = await getCurrentUser()
  
  if (user) {
    await createAuditLog({
      userId: user.id,
      action: 'LOGOUT',
      table: 'users',
      summary: `User ${user.email} logged out`,
    })
  }

  await supabase.auth.signOut()
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error('No active session')
  }

  // Verify current password
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: session.user.email!,
    password: currentPassword,
  })

  if (verifyError) {
    throw new Error('Current password is incorrect')
  }

  // Update password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (updateError) {
    throw updateError
  }

  // Update is_first_login
  const user = await getCurrentUser()
  if (user) {
    await supabase
      .from('users')
      .update({ is_first_login: false })
      .eq('id', user.id)

    await createAuditLog({
      userId: user.id,
      action: 'UPDATE',
      table: 'users',
      summary: 'Password changed',
    })
  }
}