import React from "react"
import { Outlet } from "react-router-dom"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./sidebar"

export default function Layout() {
  return (
    <SidebarProvider>
      <div className="dark">
        <AppSidebar />
      </div>
      <SidebarInset>
        <main className="flex-1 overflow-auto p-8">
          <div className="mb-4 md:hidden">
            <SidebarTrigger />
          </div>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}