export const metadata = {
  title: "Shift Board",
  description: "スタッフシフト管理システム",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
