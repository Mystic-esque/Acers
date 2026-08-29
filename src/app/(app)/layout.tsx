import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/AppSidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#F8F4EC]">
      <AppSidebar userEmail={user.email || ""} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen md:pl-0 pt-16 md:pt-0">
        {/* pt-16 on mobile for the fixed header height */}
        {children}
      </div>
    </div>
  );
}
