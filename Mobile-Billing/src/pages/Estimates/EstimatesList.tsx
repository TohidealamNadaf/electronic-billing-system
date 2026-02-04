import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Plus, Search, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useDatabase } from "@/DatabaseContext"

export function EstimatesList() {
    const { db } = useDatabase()
    const [estimates, setEstimates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        if (db) {
            loadEstimates()
        }
    }, [db])

    const loadEstimates = async () => {
        if (!db) return
        try {
            setLoading(true)
            const result = await db.query("SELECT * FROM estimates ORDER BY createdAt DESC")
            if (result.values) {
                setEstimates(result.values)
            }
        } catch (error) {
            console.error("Error loading estimates:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredEstimates = estimates.filter(est =>
        est.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        est.estimateNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-10">
                <h1 className="text-lg font-semibold">Estimates</h1>
                <Button size="sm" asChild>
                    <Link to="/estimates/new">
                        <Plus className="w-4 h-4 mr-1" /> New
                    </Link>
                </Button>
            </header>

            {/* Search */}
            <div className="p-4 bg-background border-b">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search estimates..."
                        className="pl-9 bg-muted/50 border-0"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredEstimates.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>No estimates found</p>
                    </div>
                ) : (
                    filteredEstimates.map((estimate) => (
                        <Link to={`/estimates/${estimate.id}`} key={estimate.id}>
                            <Card className="active:scale-[0.98] transition-transform">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-sm">{estimate.estimateNumber}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${estimate.status === 'accepted' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                estimate.status === 'rejected' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    'bg-muted text-muted-foreground'
                                            }`}>
                                            {estimate.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-sm">{estimate.clientName || "Unknown Client"}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{estimate.date}</p>
                                        </div>
                                        <span className="font-bold text-primary">
                                            {formatCurrency(estimate.total)}
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
