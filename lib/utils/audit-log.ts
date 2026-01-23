import { supabase } from '@/lib/supabase/client'

export async function createAuditLog({
  userId,
  action,
  table,
  recordId,
  summary,
  ipAddress,
}: {
  userId: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW'
  table: string
  recordId?: number
  summary: string
  ipAddress?: string
}) {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: action,
      table_name: table,
      record_id: recordId,
      changes_summary: summary,
      ip_address: ipAddress || 'unknown',
      timestamp: new Date().toISOString(),
    })

    if (error) {
      console.error('Audit log error:', error)
    }
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}


