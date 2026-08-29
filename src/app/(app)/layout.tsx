import { AppSidebar } from "@/components/AppSidebar";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-bg text-text">
      <AppSidebar />
      <main className="min-h-screen px-4 py-6 pt-16 md:ml-60 md:px-6 md:pt-6">
        {children}
      </main>
    </div>
  );
}
