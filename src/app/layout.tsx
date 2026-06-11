import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import Link from "next/link";
import { CookieConsent } from "@/components/CookieConsent";
import { SupportWidget } from "@/components/SupportWidget";
import { PageTransition } from "@/components/PageTransition";
import NextTopLoader from "nextjs-toploader";

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
    <html lang="en" className={`${jakarta.variable} antialiased`} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen relative overflow-x-hidden font-sans bg-themeBeige text-themeText dark:bg-gray-950 dark:text-slate-100 transition-colors duration-300">
        {/* Obsidian Space Baseline: Diluted Cosmic Nebulas & Grid Matrix */}
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-gradient-to-br from-[#E0F2FE] via-[#FAF8F5] to-[#E0F2FE] bg-[length:200%_200%] animate-gradient-xy dark:from-transparent dark:via-transparent dark:to-transparent dark:bg-[#050508]">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/5 blur-[160px] animate-blob dark:block hidden" />
          <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/5 blur-[160px] animate-blob animation-delay-2000 dark:block hidden" />
          <div className="absolute bottom-[-10%] left-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/4 blur-[180px] animate-blob animation-delay-4000 dark:block hidden" />
          {/* Layout Grid Matrix */}
          <div className="absolute inset-0 grid-matrix opacity-20 dark:opacity-100" />
        </div>

        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <NextTopLoader
              color="linear-gradient(to right, #38bdf8, #0284c7, #6366f1)"
              initialPosition={0.08}
              crawlSpeed={200}
              height={3}
              crawl={true}
              showSpinner={false}
              easing="ease"
              speed={200}
              shadow="0 0 10px #0284c7, 0 0 5px #0284c7"
            />
            <Navbar />
            <CookieConsent />
            <SupportWidget />
            <main className="flex-1 pt-16 relative z-10">
              <PageTransition>{children}</PageTransition>
            </main>
            <footer className="border-t border-slate-200/50 bg-white/30 backdrop-blur-md dark:border-white/5 dark:bg-[#050508]/80 py-8 relative z-10 transition-colors duration-300">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-zinc-500 font-light">
                <div>
                  &copy; {new Date().getFullYear()} SpeakMirror. All rights reserved.
                </div>
                <div className="flex gap-6 font-medium sm:font-light">
                  <Link href="/terms" className="hover:text-themeText dark:hover:text-white transition-colors">
                    Terms of Service
                  </Link>
                  <Link href="/privacy" className="hover:text-themeText dark:hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </div>
              </div>
            </footer>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

