import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'MindAssist — Sri Lanka\'s First Tri-Lingual Mental Health Platform',
  description:
    'Clinically-grounded, culturally-adapted mental health support in English, Sinhala & Tamil. Free screening, AI-guided therapy, and specialist consultations.',
  keywords: [
    'mental health',
    'Sri Lanka',
    'Sinhala',
    'Tamil',
    'PHQ-9',
    'GAD-7',
    'therapy',
    'counselling',
    'mindassist',
  ],
  openGraph: {
    title: 'MindAssist — Peace of Mind, In Your Language',
    description:
      'Sri Lanka\'s first tri-lingual mental health assistant. Clinically validated screening, AI-powered support, and specialist consultations — free and accessible.',
    url: 'https://mindassist-live.web.app',
    siteName: 'MindAssist',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MindAssist — Sri Lanka\'s First Tri-Lingual Mental Health Platform',
    description:
      'Free mental health support in English, Sinhala & Tamil. PHQ-9/GAD-7 screening, AI therapy, specialist consultations.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
