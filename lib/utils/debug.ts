// Debug utility to check Supabase connection
export async function checkSupabaseConnection() {
  if (typeof window === 'undefined') {
    return { error: 'This function must run on the client side' }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const checks = {
    hasUrl: !!url,
    hasKey: !!key,
    urlFormat: url?.startsWith('https://') || false,
    keyLength: key?.length || 0,
  }

  return {
    ...checks,
    allGood: checks.hasUrl && checks.hasKey && checks.urlFormat && checks.keyLength > 0,
  }
}


