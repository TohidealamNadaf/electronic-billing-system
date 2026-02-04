import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save, Trash, Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { useDatabase } from "@/DatabaseContext"
import { ClientSelector } from "@/components/client-selector"
import { ProductSelector } from "@/components/product-selector"
import { usePdfGenerator } from "@/hooks/usePdfGenerator"
import { PrintInvoice } from "../Print/PrintInvoice"
import { Share2 } from "lucide-react"

interface LineItem {
    id: string
    productId: string
    productName: string
    quantity: number
    price: number
    total: number
}

export function InvoiceEntry() {
    const { db, save } = useDatabase()
    const navigate = useNavigate()
    const { id } = useParams()
    const isNew = !id

    const [loading, setLoading] = useState(false)
    const [selectingClient, setSelectingClient] = useState(false)
    const [addingProduct, setAddingProduct] = useState(false)

    const [formData, setFormData] = useState({
        invoiceNumber: "",
        clientId: "",
        clientName: "",
        date: new Date().toISOString().split('T')[0],
        dueDate: "",
        status: "draft",
        subtotal: 0,
        tax: 0,
        total: 0
    })

    const [items, itemsSet] = useState<LineItem[]>([])

    useEffect(() => {
        if (isNew) {
            // Generate number
            setFormData(prev => ({ ...prev, invoiceNumber: `INV-${Date.now().toString().slice(-6)}` }))
        } else if (db) {
            loadInvoice()
        }
    }, [id, db])

    // Recalculate totals
    useEffect(() => {
        const sub = items.reduce((acc, item) => acc + item.total, 0)
        const tax = sub * 0; // 0% tax for simple version, can add setting later
        const tot = sub + tax
        setFormData(prev => ({ ...prev, subtotal: sub, tax, total: tot }))
    }, [items])

    const loadInvoice = async () => {
        if (!db || !id) return
        try {
            const result = await db.query("SELECT * FROM invoices WHERE id = ?", [id])
            if (result.values && result.values.length > 0) {
                setFormData(result.values[0])

                // Load items
                const itemsRes = await db.query("SELECT * FROM invoice_items WHERE invoiceId = ?", [id])
                if (itemsRes.values) itemsSet(itemsRes.values as LineItem[])
            }
        } catch (error) {
            console.error("Error loading invoice:", error)
        }
    }

    const handleSave = async () => {
        if (!db || !formData.clientId) {
            alert("Please select a client")
            return
        }

        try {
            setLoading(true)
            const invoiceId = isNew ? crypto.randomUUID() : id!

            const query = isNew
                ? "INSERT INTO invoices (id, invoiceNumber, clientId, clientName, date, dueDate, subtotal, tax, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                : "UPDATE invoices SET invoiceNumber = ?, clientId = ?, clientName = ?, date = ?, dueDate = ?, subtotal = ?, tax = ?, total = ?, status = ? WHERE id = ?"

            const params = isNew
                ? [invoiceId, formData.invoiceNumber, formData.clientId, formData.clientName, formData.date, formData.dueDate, formData.subtotal, formData.tax, formData.total, formData.status]
                : [formData.invoiceNumber, formData.clientId, formData.clientName, formData.date, formData.dueDate, formData.subtotal, formData.tax, formData.total, formData.status, invoiceId]

            await db.run(query, params)

            // Save Items (Delete all and recreate for simplicity)
            if (!isNew) {
                await db.run("DELETE FROM invoice_items WHERE invoiceId = ?", [invoiceId])
            }

            for (const item of items) {
                await db.run(
                    "INSERT INTO invoice_items (id, invoiceId, productId, productName, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    [item.id || crypto.randomUUID(), invoiceId, item.productId, item.productName, item.quantity, item.price, item.total]
                )
            }

            // Persist to store (Web)
            await save()

            navigate("/invoices")
        } catch (error) {
            console.error("Error saving invoice:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!db || !id || !confirm("Delete this invoice?")) return
        await db.run("DELETE FROM invoice_items WHERE invoiceId = ?", [id])
        await db.run("DELETE FROM invoices WHERE id = ?", [id])
        navigate("/invoices")
    }



    const { generateAndShare, isGenerating } = usePdfGenerator()
    const [companySettings, setCompanySettings] = useState<any>({})

    const loadSettings = async () => {
        if (!db) return
        const setRes = await db.query("SELECT * FROM settings")
        if (setRes.values) {
            const settingsMap: any = {}
            setRes.values.forEach((s: any) => {
                settingsMap[s.key] = s.value
            })
            setCompanySettings(settingsMap)
        }
    }

    useEffect(() => {
        if (db) loadSettings()
    }, [db])

    const handleSharePdf = async () => {
        // Ensure data is up to date (we use the current formData + items)
        // Delay slightly to ensure render if needed, though hidden div keeps it sync
        await generateAndShare('invoice-print-hidden', `Invoice-${formData.invoiceNumber}`)
    }

    const addItem = (product: any) => {
        const newItem: LineItem = {
            id: crypto.randomUUID(),
            productId: product.id,
            productName: product.name,
            quantity: 1,
            price: product.price,
            total: product.price
        }
        itemsSet([...items, newItem])
        setAddingProduct(false)
    }

    const updateQuantity = (itemId: string, delta: number) => {
        itemsSet(items.map(item => {
            if (item.id === itemId) {
                const q = Math.max(1, item.quantity + delta)
                return { ...item, quantity: q, total: q * item.price }
            }
            return item
        }))
    }

    const removeItem = (itemId: string) => {
        itemsSet(items.filter(i => i.id !== itemId))
    }

    return (
        <div className="flex flex-col h-full bg-background relative">
            {selectingClient && (
                <ClientSelector
                    onSelect={(c) => {
                        setFormData(prev => ({ ...prev, clientId: c.id, clientName: c.name }))
                        setSelectingClient(false)
                    }}
                    onCancel={() => setSelectingClient(false)}
                />
            )}
            {addingProduct && (
                <ProductSelector
                    onSelect={addItem}
                    onCancel={() => setAddingProduct(false)}
                />
            )}

            <header className="flex items-center justify-between px-4 py-3 border-b bg-card">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="-ml-2">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-lg font-semibold">{isNew ? "New Invoice" : "Edit Invoice"}</h1>
                </div>
                {!isNew && (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={handleSharePdf} disabled={isGenerating} className="text-primary hover:text-primary" title="Share PDF">
                            {isGenerating ? <span className="text-[10px]">...</span> : <Share2 className="w-5 h-5" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive hover:text-destructive">
                            <Trash className="w-5 h-5" />
                        </Button>
                    </div>
                )}
            </header>

            {/* Hidden Print Container */}
            <div style={{ position: 'absolute', top: -9999, left: -9999, width: '210mm' }}>
                <div id="invoice-print-hidden">
                    <PrintInvoice
                        data={{ ...formData, items }}
                        settingsData={companySettings}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Client Section */}
                <div className="space-y-2">
                    <Label>Client</Label>
                    {formData.clientId ? (
                        <div className="flex items-center justify-between p-3 border rounded-md bg-card">
                            <span className="font-medium">{formData.clientName}</span>
                            <Button variant="ghost" size="sm" onClick={() => setSelectingClient(true)}>Change</Button>
                        </div>
                    ) : (
                        <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setSelectingClient(true)}>
                            + Select Client
                        </Button>
                    )}
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Invoice #</Label>
                        <Input
                            value={formData.invoiceNumber}
                            onChange={e => setFormData({ ...formData, invoiceNumber: e.target.value })}
                        />
                    </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label>Items</Label>
                        <Button variant="ghost" size="sm" onClick={() => setAddingProduct(true)}>
                            <Plus className="w-4 h-4 mr-1" /> Add Item
                        </Button>
                    </div>

                    <div className="space-y-2">
                        {items.length === 0 ? (
                            <div className="text-center py-4 border border-dashed rounded-md text-muted-foreground text-sm">
                                No items added
                            </div>
                        ) : (
                            items.map(item => (
                                <Card key={item.id} className="bg-card">
                                    <CardContent className="p-3">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-medium text-sm">{item.productName}</span>
                                            <span className="font-semibold text-sm">₹{item.total.toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-muted-foreground">₹{item.price}/unit</span>
                                            <div className="flex items-center bg-muted rounded-md">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, -1)}>
                                                    <Minus className="w-3 h-3" />
                                                </Button>
                                                <span className="text-xs w-6 text-center font-medium">{item.quantity}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, 1)}>
                                                    <Plus className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 text-destructive" onClick={() => removeItem(item.id)}>
                                                <Trash className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                {/* Totals */}
                <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>₹{formData.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span>₹{formData.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2">
                        <span>Total</span>
                        <span className="text-primary">₹{formData.total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="p-4 border-t bg-card safe-area-bottom">
                <Button className="w-full" onClick={handleSave} disabled={loading}>
                    {loading ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Invoice</>}
                </Button>
            </div>
        </div>
    )
}
