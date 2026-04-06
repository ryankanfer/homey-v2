import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Development only route to bypass Supabase email rate limits
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email') || 'rkanfer@bhsusa.com';
  const role = searchParams.get('role') || 'agent';

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Generate the magic link using the admin API (this does NOT send an email)
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      data: { role },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Redirect the developer directly to the hashed action link
  // This simulates exactly what happens when you click the link in your email
  return NextResponse.redirect(data.properties.action_link);
}
