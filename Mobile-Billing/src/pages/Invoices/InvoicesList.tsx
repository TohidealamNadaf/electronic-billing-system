import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Plus, Search, FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDatabase } from "@/DatabaseContext"

interface Invoice {
    id: string
    invoiceNumber: string
    clientName: string
    total: number
    status: string
    date: string
}

export function InvoicesList() {
    const { db } = useDatabase()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchInvoices()
    }, [db])

    const fetchInvoices = async () => {
        if (!db) return
        try {
            setLoading(true)
            const result = await db.query("SELECT * FROM invoices ORDER BY createdAt DESC")
            setInvoices(result.values as Invoice[])
        } catch (error) {
            console.error("Error fetching invoices:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredInvoices = invoices.filter((inv) =>
        inv.clientName?.toLowerCase().includes(search.toLowerCase()) ||
        inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase())
    )

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount)
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Invoices</h1>
                <Button size="sm" asChild>
                    <Link to="new">
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                    </Link>
                </Button>
            </div>

            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search invoices..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid gap-2">
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredInvoices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {search ? "No invoices found" : "No invoices yet"}
                    </div>
                ) : (
                    filteredInvoices.map((inv) => (
                        <Link key={inv.id} to={inv.id}>
                            <Card className="hover:bg-accent/50 transition-colors">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <FileText className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold">{inv.invoiceNumber}</p>
                                            <p className="text-xs text-muted-foreground">{inv.clientName}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{formatCurrency(inv.total)}</p>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${inv.status === 'paid' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                            }`}>
                                            {inv.status}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
