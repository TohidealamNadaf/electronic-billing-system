import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDatabase } from "@/DatabaseContext"

export function ProductEntry() {
    const { db } = useDatabase()
    const navigate = useNavigate()
    const { id } = useParams()
    const isNew = !id

    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        price: "",
        unit: "pcs",
    })

    useEffect(() => {
        if (!isNew && db) {
            loadProduct()
        }
    }, [id, db])

    const loadProduct = async () => {
        if (!db || !id) return
        try {
            const result = await db.query("SELECT * FROM products WHERE id = ?", [id])
            if (result.values && result.values.length > 0) {
                const prod = result.values[0]
                setFormData({
                    ...prod,
                    price: prod.price.toString()
                })
            }
        } catch (error) {
            console.error("Error loading product:", error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!db || !formData.name || !formData.price) return

        try {
            setLoading(true)
            const priceVal = parseFloat(formData.price)

            if (isNew) {
                const newId = crypto.randomUUID()
                await db.run(
                    "INSERT INTO products (id, name, description, price, unit) VALUES (?, ?, ?, ?, ?)",
                    [newId, formData.name, formData.description, priceVal, formData.unit]
                )
            } else {
                await db.run(
                    "UPDATE products SET name = ?, description = ?, price = ?, unit = ? WHERE id = ?",
                    [formData.name, formData.description, priceVal, formData.unit, id]
                )
            }
            navigate("/products")
        } catch (error) {
            console.error("Error saving product:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!db || !id || !confirm("Are you sure you want to delete this product?")) return
        try {
            setLoading(true)
            await db.run("DELETE FROM products WHERE id = ?", [id])
            navigate("/products")
        } catch (error) {
            console.error("Error deleting product:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-background">
            <header className="flex items-center justify-between px-4 py-3 border-b bg-card">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-lg font-semibold">{isNew ? "New Product" : "Edit Product"}</h1>
                </div>
                {!isNew && (
                    <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive">
                        <Trash className="w-5 h-5" />
                    </Button>
                )}
            </header>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                        id="name"
                        placeholder="Product Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                        id="description"
                        placeholder="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="price">Price *</Label>
                        <Input
                            id="price"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="unit">Unit</Label>
                        <Input
                            id="unit"
                            placeholder="pcs"
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        />
                    </div>
                </div>
            </form>

            <div className="p-4 border-t bg-card mt-auto safe-area-bottom">
                <Button className="w-full" onClick={handleSubmit} disabled={loading}>
                    {loading ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Product</>}
                </Button>
            </div>
        </div>
    )
}
