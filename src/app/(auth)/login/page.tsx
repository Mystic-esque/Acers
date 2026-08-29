"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<{isOpen: boolean, message: string}>({isOpen: false, message: ''});
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (action: "login" | "signup") => {
    setLoading(true);
    let error;

    if (action === "signup") {
      const res = await supabase.auth.signUp({
        email,
        password,
      });
      error = res.error;
    } else {
      const res = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      error = res.error;
    }

    setLoading(false);

    if (error) {
      setModalState({ isOpen: true, message: error.message });
    } else {
      router.push("/library");
    }
  };

  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen p-8"
      style={{ backgroundColor: "#F8F4EC" }}
    >
      <div 
        className="w-full max-w-sm rounded-3xl p-8 md:p-10 shadow-xl"
        style={{ backgroundColor: "#FFFDF8", border: "1px solid #E8E2D8" }}
      >
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "#2D2A26" }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F8F4EC"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <h1 
            className="text-2xl font-bold tracking-tight text-center"
            style={{ color: "#2D2A26", fontFamily: "var(--font-space-mono)" }}
          >
            Welcome back
          </h1>
          <p className="text-sm mt-2 text-center" style={{ color: "#6B6358" }}>
            Enter your email to sign in or create an account
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8A7D6B", fontFamily: "var(--font-space-mono)" }}>
              Email
            </label>
            <Input 
              id="email" 
              type="email" 
              placeholder="you@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl bg-white"
              style={{ borderColor: "#E8E2D8" }}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider" style={{ color: "#8A7D6B", fontFamily: "var(--font-space-mono)" }}>
              Password
            </label>
            <Input 
              id="password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl bg-white"
              style={{ borderColor: "#E8E2D8" }}
            />
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <Button 
              className="w-full h-11 rounded-xl text-sm font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ backgroundColor: "#2D2A26", color: "#F8F4EC", fontFamily: "var(--font-space-mono)" }}
              onClick={() => handleAuth("login")}
              disabled={loading || !email || !password}
            >
              Sign In
            </Button>
            <Button 
              variant="outline"
              className="w-full h-11 rounded-xl text-sm font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
              style={{ borderColor: "#2D2A26", color: "#2D2A26", fontFamily: "var(--font-space-mono)" }}
              onClick={() => handleAuth("signup")}
              disabled={loading || !email || !password}
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
      <Modal 
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ isOpen: false, message: '' })}
        title="Authentication Error"
        description={modalState.message}
        confirmText="OK"
      />
    </main>
  );
}
