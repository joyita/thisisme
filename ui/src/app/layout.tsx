// src/app/layout.tsx
import type { Metadata } from "next";
import { Rubik, Besley } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { PassportProvider } from "@/context/PassportContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { Toaster } from "react-hot-toast";

const rubik = Rubik({ variable: "--font-rubik", subsets: ["latin"], display: "swap" });
const besley = Besley({ variable: "--font-besley", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "ThisIsMe - Care Coordination Platform",
  description: "Empowering caregivers to create and share coordination documents for children with Special Educational Needs and Disabilities (SEND)",
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
        <AuthProvider>
          <NotificationProvider>
            <PassportProvider>{children}</PassportProvider>
          </NotificationProvider>
        </AuthProvider>
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
