import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { SidebarProvider } from '@/context/SidebarContext';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vipey.co",
  description: "Vipey.co",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <meta name="clickaine-site-verification" content="169b0b63b16cef2dd79d0986d61bccee4a907ab47ee721c4ee3cb910af6bc196e25e7388e28e56095f36ec187f6e90378f1046da5894a82506487f20d26c9173" />
     <meta name="83c1a3a837d3dd8fa2f3fede1099ff405dd2fb2d" content="83c1a3a837d3dd8fa2f3fede1099ff405dd2fb2d" />
     <meta name="a49b024a75a9fc68ed4b1462f2f0b9f3e0652121" content="a49b024a75a9fc68ed4b1462f2f0b9f3e0652121" />
     <meta name="referrer" content="no-referrer-when-downgrade" />
      
      <body className={`${inter.variable} antialiased font-sans`}>
        <Toaster />
          <SidebarProvider>{children}</SidebarProvider>
      </body>
    </html>
  );
}