import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request) {
  try {
    const { loginId, password } = await request.json();

    if (
      loginId !== process.env.ADMIN_LOGIN_ID ||
      password !== process.env.ADMIN_LOGIN_PASSWORD
    ) {
      return NextResponse.json(
        {
          ok: false,
          message: "IDまたはパスワードが違います。",
        },
        { status: 401 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email: process.env.SUPABASE_ADMIN_EMAIL,
        password: process.env.SUPABASE_ADMIN_PASSWORD,
      });

    if (error || !data.session) {
      console.error(error);

      return NextResponse.json(
        {
          ok: false,
          message: "管理画面への接続に失敗しました。",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        ok: false,
        message: "ログイン処理に失敗しました。",
      },
      { status: 500 }
    );
  }
}
