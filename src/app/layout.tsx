import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "../styles.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Singest — Indian Equity Markets Dashboard",
  description:
    "Singest: real-time stock screening, market overview, and news for Indian equity markets.",
  openGraph: {
    title: "Singest — Indian Equity Markets Dashboard",
    description: "Real-time stock screening, market overview, and news for Indian equity markets.",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('singest-theme');var d=document.documentElement;if(t==='light'){d.classList.remove('dark');d.classList.add('light');}else{d.classList.remove('light');d.classList.add('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <div className="page-transition">{children}</div>
      </body>
    </html>
  );
}
