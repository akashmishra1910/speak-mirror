import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";
import Link from "next/link";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#050508",
};

export const metadata: Metadata = {
  title: "SpeakMirror | See how you sound to others",
  description: "Improve your communication skills by recording your speech and getting actionable, AI-driven feedback on your confidence, clarity, and more.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SpeakMirror",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} antialiased`}>
      <body className="flex flex-col min-h-screen relative overflow-x-hidden font-sans bg-[#050508]">
        {/* Obsidian Space Baseline: Diluted Cosmic Nebulas & Grid Matrix */}
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-[#050508]">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[160px] animate-blob" />
          <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[160px] animate-blob animation-delay-2000" />
          <div className="absolute bottom-[-10%] left-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/4 blur-[180px] animate-blob animation-delay-4000" />
          {/* Layout Grid Matrix */}
          <div className="absolute inset-0 grid-matrix opacity-100" />
        </div>

        <AuthProvider>
          <Navbar />
          <main className="flex-1 pt-16 relative z-10">
            {children}
          </main>
          <footer className="border-t border-white/5 bg-[#050508]/80 py-8 relative z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 font-light">
              <div>
                &copy; {new Date().getFullYear()} SpeakMirror. All rights reserved.
              </div>
              <div className="flex gap-6">
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
