import { useEffect, useState } from "react"
import { Search, Package, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useDatabase } from "@/DatabaseContext"

interface Product {
    id: string
    name: string
    price: number
    unit: string
}

interface ProductSelectorProps {
    onSelect: (product: Product) => void
    onCancel: () => void
}

export function ProductSelector({ onSelect, onCancel }: ProductSelectorProps) {
    const { db } = useDatabase()
    const [products, setProducts] = useState<Product[]>([])
    const [search, setSearch] = useState("")

    useEffect(() => {
        const fetchProducts = async () => {
            if (!db) return
            const result = await db.query("SELECT * FROM products ORDER BY name ASC")
            setProducts(result.values as Product[] || [])
        }
        fetchProducts()
    }, [db])

    const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col safe-area-top safe-area-bottom">
            <div className="flex items-center gap-2 p-4 border-b">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search product..."
                        className="pl-8"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {search && (
                    <Card onClick={() => onSelect({ id: '', name: search, price: 0, unit: 'unit' })} className="cursor-pointer hover:bg-accent border-dashed">
                        <CardContent className="p-3 flex items-center gap-3 text-primary">
                            <Plus className="w-5 h-5" />
                            <div className="font-medium">Add "{search}"</div>
                        </CardContent>
                    </Card>
                )}
                {filtered.map(product => (
                    <Card key={product.id} onClick={() => onSelect(product)} className="cursor-pointer hover:bg-accent">
                        <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-chart-4/10 flex items-center justify-center">
                                    <Package className="w-4 h-4 text-chart-4" />
                                </div>
                                <div>
                                    <p className="font-medium">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">{product.price > 0 ? `₹${product.price}/${product.unit}` : 'Custom Price'}</p>
                                </div>
                            </div>
                            <Plus className="w-4 h-4 text-muted-foreground" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
