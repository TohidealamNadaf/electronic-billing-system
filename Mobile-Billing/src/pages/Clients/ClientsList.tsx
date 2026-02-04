import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Plus, Search, User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useDatabase } from "@/DatabaseContext"

interface Client {
    id: string
    name: string
    email: string
    phone: string
}

export function ClientsList() {
    const { db } = useDatabase()
    const [clients, setClients] = useState<Client[]>([])
    const [search, setSearch] = useState("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchClients()
    }, [db])

    const fetchClients = async () => {
        if (!db) return
        try {
            setLoading(true)
            const result = await db.query("SELECT * FROM clients ORDER BY name ASC")
            setClients(result.values as Client[])
        } catch (error) {
            console.error("Error fetching clients:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredClients = clients.filter((client) =>
        client.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold">Clients</h1>
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
                    placeholder="Search clients..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <div className="grid gap-2">
                {loading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredClients.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {search ? "No clients found" : "No clients yet"}
                    </div>
                ) : (
                    filteredClients.map((client) => (
                        <Link key={client.id} to={client.id}>
                            <Card className="hover:bg-accent/50 transition-colors">
                                <CardContent className="p-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <User className="w-5 h-5 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold truncate">{client.name}</p>
                                        <div className="flex flex-col text-xs text-muted-foreground">
                                            {client.email && <span>{client.email}</span>}
                                            {client.phone && <span>{client.phone}</span>}
                                        </div>
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
