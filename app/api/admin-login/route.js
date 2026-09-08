import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { loginId, password } = await request.json();

    const correctId = process.env.ADMIN_LOGIN_ID;
    const correctPassword = process.env.ADMIN_LOGIN_PASSWORD;

    if (!correctId || !correctPassword) {
      return NextResponse.json(
        {
          ok: false,
          message: "ログイン設定が見つかりません。",
        },
        { status: 500 }
      );
    }

    if (
      loginId === correctId &&
      password === correctPassword
    ) {
      return NextResponse.json({
        ok: true,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        message: "IDまたはパスワードが違います。",
      },
      { status: 401 }
    );
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
