import { Sidebar } from "@/components/layout/Sidebar"

export default function BailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-72">
        {children}
      </main>
    </div>
  )
}


