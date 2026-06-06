import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { Toaster } from "react-hot-toast";

import "highlight.js/styles/github.css";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EngiLearn AI — Your AI Instructor",
  description:
    "Generate a personalized syllabus and learn any topic step-by-step with an adaptive AI instructor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${lora.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <Providers>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{ style: { fontSize: "14px" } }}
          />
        </Providers>
      </body>
    </html>
  );
}
