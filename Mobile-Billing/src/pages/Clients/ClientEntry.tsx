import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save, Trash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDatabase } from "@/DatabaseContext"

export function ClientEntry() {
    const { db } = useDatabase()
    const navigate = useNavigate()
    const { id } = useParams()
    const isNew = !id

    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
    })

    useEffect(() => {
        if (!isNew && db) {
            loadClient()
        }
    }, [id, db])

    const loadClient = async () => {
        if (!db || !id) return
        try {
            const result = await db.query("SELECT * FROM clients WHERE id = ?", [id])
            if (result.values && result.values.length > 0) {
                setFormData(result.values[0])
            }
        } catch (error) {
            console.error("Error loading client:", error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!db || !formData.name) return

        try {
            setLoading(true)
            if (isNew) {
                const newId = crypto.randomUUID()
                await db.run(
                    "INSERT INTO clients (id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)",
                    [newId, formData.name, formData.email, formData.phone, formData.address]
                )
            } else {
                await db.run(
                    "UPDATE clients SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?",
                    [formData.name, formData.email, formData.phone, formData.address, id]
                )
            }
            navigate("/clients")
        } catch (error) {
            console.error("Error saving client:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!db || !id || !confirm("Are you sure you want to delete this client?")) return
        try {
            setLoading(true)
            await db.run("DELETE FROM clients WHERE id = ?", [id])
            navigate("/clients")
        } catch (error) {
            console.error("Error deleting client:", error)
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
                    <h1 className="text-lg font-semibold">{isNew ? "New Client" : "Edit Client"}</h1>
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
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 234 567 890"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                        id="address"
                        placeholder="123 Main St"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                </div>
            </form>

            <div className="p-4 border-t bg-card mt-auto safe-area-bottom">
                <Button className="w-full" onClick={handleSubmit} disabled={loading}>
                    {loading ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Client</>}
                </Button>
            </div>
        </div>
    )
}
