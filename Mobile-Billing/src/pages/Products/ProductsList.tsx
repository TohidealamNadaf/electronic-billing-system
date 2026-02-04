import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Plus, Search, Package } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDatabase } from "@/DatabaseContext"

interface Product {
    id: string
    name: string
    description: string
    price: number
    unit: string
}

export function ProductsList() {
    const { db } = useDatabase()
    const [products, setProducts] = useState<Product[]>([])
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchProducts()
    }, [db])

    const fetchProducts = async () => {
        if (!db) return
        try {
            setLoading(true)
            const result = await db.query("SELECT * FROM products ORDER BY name ASC")
            setProducts(result.values as Product[])
        } catch (error) {
            console.error("Error fetching products:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(search.toLowerCase())
    )

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
    }

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Products</h1>
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
                    placeholder="Search products..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid gap-2">
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {search ? "No products found" : "No products yet"}
                    </div>
                ) : (
                    filteredProducts.map((product) => (
                        <Link key={product.id} to={product.id}>
                            <Card className="hover:bg-accent/50 transition-colors">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-chart-4/10 flex items-center justify-center shrink-0">
                                        <Package className="w-5 h-5 text-chart-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">{product.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{product.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{formatCurrency(product.price)}</p>
                                        <p className="text-xs text-muted-foreground">/{product.unit}</p>
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
