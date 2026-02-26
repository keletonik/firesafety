import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export const metadata: Metadata = {
  title: "Personal Finance Manager",
  description: "CSV in, clean spend analysis out. Personal-only budgeting and spending tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 ml-64">
            <TopBar />
            <main className="p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
