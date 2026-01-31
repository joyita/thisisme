// src/app/layout.tsx
import type { Metadata } from "next";
import { Rubik, Besley } from "next/font/google";
import "./globals.css";
import { PassportProvider } from "@/context/PassportContext";
import { Toaster } from "react-hot-toast";

const rubik = Rubik({ variable: "--font-rubik", subsets: ["latin"], display: "swap" });
const besley = Besley({ variable: "--font-besley", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Pupil Passport",
  description: "Empowering caregivers to create handover documents for children with Special Educational Needs and Disabilities (SEND)",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${rubik.variable} ${besley.variable} antialiased`} suppressHydrationWarning>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <PassportProvider>{children}</PassportProvider>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#581c87',
              color: '#fff',
              padding: '16px',
              borderRadius: '8px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}
