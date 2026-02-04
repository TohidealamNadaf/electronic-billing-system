import type { ReactNode } from "react"
import { useLocation, Link } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    FileText,
    Users,
    Package,
    FileCheck,
    Settings as SettingsIcon,
} from "lucide-react"

const navItems = [
    { title: "Home", href: "/", icon: LayoutDashboard },
    { title: "Invoices", href: "/invoices", icon: FileText },
    { title: "Estimates", href: "/estimates", icon: FileCheck },
    { title: "Clients", href: "/clients", icon: Users },
    { title: "Products", href: "/products", icon: Package },
    { title: "Settings", href: "/settings", icon: SettingsIcon },
]

export function MobileShell({ children }: { children: ReactNode }) {
    const location = useLocation()
    const pathname = location.pathname

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/"
        return pathname.startsWith(href)
    }

    return (
        <div
            className="flex flex-col min-h-[100dvh] max-w-md mx-auto bg-background shadow-lg overflow-hidden relative"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 35px)' }}
        >
            <main className="flex-1 pb-16 overflow-y-auto w-full">
                {children}
            </main>

            <nav
                className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t w-full max-w-md mx-auto"
                style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 15px)' }}
            >
                <div className="flex items-center justify-around h-14">
                    {navItems.map((item) => {
                        const active = isActive(item.href)
                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors relative",
                                    active ? "text-primary" : "text-muted-foreground"
                                )}
                            >
                                {active && (
                                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary mx-3 rounded-full" />
                                )}
                                <item.icon className={cn("w-5 h-5", active && "stroke-[2.5px] fill-primary/10")} />
                                <span className="text-[10px] font-medium">{item.title}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
