import type { Metadata, Viewport } from "next";
import { Newsreader, Public_Sans } from "next/font/google";
import { getRawSnapshot } from "@/lib/data";
import Nav from "@/components/Nav";
import Tooltip from "@/components/Tooltip";
import AskDrawer from "@/components/AskDrawer";
import AskDrawerProvider from "@/components/AskDrawerProvider";
import "./globals.css";
import "./customization.css";
import "./redesign.css";
const newsreader = Newsreader({
    subsets: ["latin"],
    weight: ["400", "500"],
    style: ["normal", "italic"],
    variable: "--font-newsreader",
    display: "swap",
});
const publicSans = Public_Sans({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    variable: "--font-public-sans",
    display: "swap",
});
export const metadata: Metadata = {
    title: "MoMoney",
    description: "Private personal-finance dashboard",
    robots: { index: false, follow: false },
    appleWebApp: {
        capable: true,
        title: "MoMoney",
        statusBarStyle: "default",
    },
    icons: {
        icon: [
            { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: "/icons/apple-touch-icon.png",
    },
};
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: "#2b6cb8",
};
export default async function RootLayout({ children, }: {
    children: React.ReactNode;
}) {
    const demo = (await getRawSnapshot())?.demo === true;
    return (<html lang="en" className={`${newsreader.variable} ${publicSans.variable}`}>
      <head>
        
        <meta name="apple-mobile-web-app-capable" content="yes"/>
      </head>
      <body>
        {demo && (<div className="rd-preview">
            Demo workspace · synthetic data · import your own CSV to get started
          </div>)}
        <AskDrawerProvider>
          <Nav />
          <main>{children}</main>
          <Tooltip />
          <AskDrawer />
        </AskDrawerProvider>
      </body>
    </html>);
}
