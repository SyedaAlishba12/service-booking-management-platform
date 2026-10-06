import type { ReactNode } from "react";
import Footer from "./Footer";
import Navbar from "./Navbar";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({
  children,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main>{children}</main>

      <Footer />
    </div>
  );
}