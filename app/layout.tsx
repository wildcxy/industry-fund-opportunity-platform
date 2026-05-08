import type { Metadata } from "next";

import "./globals.css";

import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "行业基金机会捕捉平台",
  description: "行业机会发现、基金筛选、对比与观察的一体化前端演示平台。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">{children}</main>
      </body>
    </html>
  );
}
