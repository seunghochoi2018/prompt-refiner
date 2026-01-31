import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt Refiner - Fix Your AI-Generated Images",
  description: "Upload AI-generated images, analyze artifacts, and get improved prompts for better results. Works with Midjourney, DALL-E, Stable Diffusion, Sora, and more.",
  keywords: ["AI image", "prompt engineering", "Midjourney", "DALL-E", "Stable Diffusion", "AI art", "prompt optimizer"],
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0ea5e9",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
