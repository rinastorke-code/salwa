import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { createCenterSession } from '@/lib/center-session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'الرجاء إدخال اسم المستخدم وكلمة السر' }, { status: 400 });
    }

    // 1. الاتصال بـ Supabase باستخدام Service Role لتخطي RLS والتمكن من قراءة التشفير
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 2. البحث عن المركز وجلب الـ Hash
    const { data: center, error } = await supabase
      .from('centers') 
      .select('id, location_id, username, password_hash, is_active')
      .eq('username', username)
      .single();

    if (error || !center) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' }, { status: 401 });
    }

    // التأكد من أن المركز مفعّل
    if (center.is_active === false) {
      return NextResponse.json({ error: 'هذا الحساب موقوف، يرجى مراجعة الإدارة' }, { status: 403 });
    }

    // 3. مطابقة كلمة السر مع التشفير المحفوظ
    const isPasswordValid = await bcrypt.compare(password, center.password_hash);
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' }, { status: 401 });
    }

    // 4. إنشاء الجلسة في المتصفح
    await createCenterSession({ 
      location_id: center.location_id, 
      username: center.username 
    });

    return NextResponse.json({ success: true, location_id: center.location_id });

  } catch (err) {
    console.error('Login Error:', err);
    return NextResponse.json({ error: 'حدث خطأ داخلي في الخادم' }, { status: 500 });
  }
}
