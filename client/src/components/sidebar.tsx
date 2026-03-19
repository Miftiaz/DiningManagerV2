import { Link, useNavigate, useLocation } from "react-router-dom"
import { toast } from "sonner"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { LogOut, LayoutDashboard, Layers, Gift, Calendar, ReceiptText } from "lucide-react"

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    title: "Manage Border",
    icon: Layers,
    href: "/manage-border",
  },
  {
    title: "Manage Feast Token",
    icon: Gift,
    href: "/manage-feast-token",
  },
  {
    title: "Adjust Dining Month",
    icon: Calendar,
    href: "/adjust-dining-month",
  },
  {
    title: "Transactions",
    icon: ReceiptText,
    href: "/transactions",
  },
]

export function AppSidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    localStorage.clear()
    toast.success('Logged out successfully');
    navigate("/login")
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-row items-center justify-between">
        <h2 className="text-lg font-semibold px-2 group-data-[collapsible=icon]:hidden">Dining Manager</h2>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.href}>
                    <Link to={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="text-red-500"/>
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
