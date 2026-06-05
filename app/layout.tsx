import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "테니스 대진표 자동 생성기",
  description: "인원수, 코트수, 시간만 입력하면 대진표를 자동으로 생성합니다.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
