import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import {
    FileText,
    FileCheck,
    Users,
    Package,
    Plus,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useDatabase } from "@/DatabaseContext"
import { useSettings } from "@/hooks/useSettings"

export function Dashboard() {
    const { db } = useDatabase()
    const { settings } = useSettings()
    const [stats, setStats] = useState({
        invoicesCount: 0,
        estimatesCount: 0,
        clientsCount: 0,
        productsCount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        recentInvoices: [] as any[],
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (db) {
            loadStats()
        }
    }, [db])

    const loadStats = async () => {
        if (!db) return
        try {
            setLoading(true)
            // Counts
            const invoicesRes = await db.query("SELECT COUNT(*) as count FROM invoices")
            const estimatesRes = await db.query("SELECT COUNT(*) as count FROM estimates")
            const clientsRes = await db.query("SELECT COUNT(*) as count FROM clients")
            const productsRes = await db.query("SELECT COUNT(*) as count FROM products")

            // Sums
            const paidRes = await db.query("SELECT SUM(total) as total FROM invoices WHERE status = 'paid'")
            const pendingRes = await db.query("SELECT SUM(total) as total FROM invoices WHERE status = 'sent'")

            // Recent
            const recentRes = await db.query("SELECT * FROM invoices ORDER BY createdAt DESC LIMIT 4")

            setStats({
                invoicesCount: invoicesRes.values?.[0]?.count || 0,
                estimatesCount: estimatesRes.values?.[0]?.count || 0,
                clientsCount: clientsRes.values?.[0]?.count || 0,
                productsCount: productsRes.values?.[0]?.count || 0,
                paidAmount: paidRes.values?.[0]?.total || 0,
                pendingAmount: pendingRes.values?.[0]?.total || 0,
                recentInvoices: recentRes.values || [],
            })
        } catch (e) {
            console.error("Error loading dashboard stats", e)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-full p-4 text-muted-foreground">Loading dashboard...</div>
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount).replace('$', '₹')
    }

    return (
        <div className="flex flex-col min-h-full pb-4">
            {/* Header */}
            <header className="px-4 py-4 safe-area-top bg-primary text-white">
                <h1 className="text-xl font-bold pt-2.5">
                    {settings.companyName || "My Company"}
                </h1>

                <div className="mt-4 flex items-end justify-between">
                    <div>
                        <p className="text-[10px] uppercase tracking-wide opacity-80 mb-0.5">Revenue</p>
                        <p className="text-3xl font-bold leading-none">
                            {formatCurrency(stats.paidAmount)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wide opacity-80 mb-0.5">Pending</p>
                        <p className="text-sm font-medium opacity-90">
                            {formatCurrency(stats.pendingAmount)}
                        </p>
                    </div>
                </div>
            </header>

            {/* Quick Actions */}
            <div className="px-4 py-3 bg-card border-b">
                <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-8 text-xs" asChild>
                        <Link to="/invoices/new">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Invoice
                        </Link>
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" asChild>
                        <Link to="/estimates/new">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Estimate
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="px-4 pt-4">
                <div className="grid grid-cols-4 gap-2">
                    <Link to="/invoices">
                        <Card className="border-0 shadow-sm hover:bg-muted/50 transition-colors">
                            <CardContent className="p-2.5 text-center">
                                <FileText className="w-4 h-4 text-primary mx-auto mb-1" />
                                <p className="text-lg font-semibold leading-none">{stats.invoicesCount}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Invoices</p>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link to="/estimates">
                        <Card className="border-0 shadow-sm hover:bg-muted/50 transition-colors">
                            <CardContent className="p-2.5 text-center">
                                <FileCheck className="w-4 h-4 text-chart-2 mx-auto mb-1" />
                                <p className="text-lg font-semibold leading-none">{stats.estimatesCount}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Estimates</p>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link to="/clients">
                        <Card className="border-0 shadow-sm hover:bg-muted/50 transition-colors">
                            <CardContent className="p-2.5 text-center">
                                <Users className="w-4 h-4 text-chart-3 mx-auto mb-1" />
                                <p className="text-lg font-semibold leading-none">{stats.clientsCount}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Clients</p>
                            </CardContent>
                        </Card>
                    </Link>
                    <Link to="/products">
                        <Card className="border-0 shadow-sm hover:bg-muted/50 transition-colors">
                            <CardContent className="p-2.5 text-center">
                                <Package className="w-4 h-4 text-chart-4 mx-auto mb-1" />
                                <p className="text-lg font-semibold leading-none">{stats.productsCount}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Products</p>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="px-4 pt-4">
                <div className="grid grid-cols-2 gap-2">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-1.5 text-primary">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-medium">Paid</span>
                            </div>
                            <p className="text-base font-semibold mt-1">
                                {/* This would be Count of paid invoices, simplified logic for now */}
                                {stats.invoicesCount > 0 ? "~" : 0}
                            </p>
                            <p className="text-[10px] text-muted-foreground">invoices</p>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-3">
                            <div className="flex items-center gap-1.5 text-chart-4">
                                <ArrowDownRight className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-medium">Pending</span>
                            </div>
                            <p className="text-base font-semibold mt-1">
                                {stats.invoicesCount > 0 ? "~" : 0}
                            </p>
                            <p className="text-[10px] text-muted-foreground">invoices</p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Recent Invoices */}
            <div className="px-4 pt-4 flex-1">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-semibold">Recent Invoices</h2>
                    <Link to="/invoices" className="text-[10px] text-primary font-medium">
                        View all
                    </Link>
                </div>
                {stats.recentInvoices.length === 0 ? (
                    <Card className="border-0 shadow-sm">
                        <CardContent className="py-6 text-center">
                            <FileText className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">No invoices yet</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-1.5">
                        {stats.recentInvoices.map((invoice) => (
                            <Card key={invoice.id} className="border-0 shadow-sm">
                                <CardContent className="p-2.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                                <FileText className="w-3 h-3 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-medium leading-none">{invoice.invoiceNumber}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">{invoice.clientName}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-semibold">{formatCurrency(invoice.total)}</p>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium bg-muted text-muted-foreground">
                                                {invoice.status}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
