"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Library, Target, User, LogOut, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AppSidebarProps {
  userEmail: string;
}

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { name: "Library", href: "/library", icon: Library },
    { name: "Assessment", href: "/assess", icon: Target },
  ];

  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail)}&background=2D2A26&color=F8F4EC`;

  const sidebarContent = (
    <div className="flex flex-col h-[100dvh] md:h-screen bg-[#2D2A26] border-r border-[#1A1816] w-64 pt-6 pb-4 px-4 flex-shrink-0 text-[#F8F4EC]">
      {/* Brand */}
      <div className="mb-10 px-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#F8F4EC] flex items-center justify-center text-[#2D2A26]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <span className="font-mono font-bold text-xl text-[#F8F4EC] tracking-tight">acers</span>
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                isActive
                  ? "bg-[#1A1816] text-white font-medium"
                  : "text-[#D0C9BC] hover:bg-[#3D3A36] hover:text-white"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-[#8A7D6B]"}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile Area */}
      <div className="mt-auto pt-4 border-t border-[#3D3A36]">
        <Link 
          href="/profile" 
          onClick={() => setIsOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-colors mb-2 ${
            pathname.startsWith("/profile") ? "bg-[#1A1816]" : "hover:bg-[#3D3A36]"
          }`}
        >
          <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#F8F4EC] truncate">
              {userEmail.split('@')[0]}
            </p>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-red-400 hover:bg-red-950/50"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#FFFDF8] border-b border-[#E8E2D8] flex items-center px-4 z-40">
        <button onClick={() => setIsOpen(true)} className="p-2 -ml-2 text-[#2D2A26]">
          <Menu className="w-6 h-6" />
        </button>
        <div className="mx-auto flex items-center gap-2">
           <div className="w-6 h-6 rounded-md bg-[#2D2A26] flex items-center justify-center text-[#F8F4EC]">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
           </div>
           <span className="font-mono font-bold text-lg text-[#2D2A26] tracking-tight">acers</span>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:self-start md:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {sidebarContent}
        {/* Mobile Close Button */}
        {isOpen && (
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden absolute top-4 right-4 p-2 text-[#F8F4EC] bg-[#1A1816] rounded-full shadow-md"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </>
  );
}
