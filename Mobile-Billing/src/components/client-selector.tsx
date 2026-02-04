import { useEffect, useState } from "react"
import { Search, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { useDatabase } from "@/DatabaseContext"

interface Client {
    id: string
    name: string
    email: string
}

interface ClientSelectorProps {
    onSelect: (client: Client) => void
    onCancel: () => void
}

export function ClientSelector({ onSelect, onCancel }: ClientSelectorProps) {
    const { db } = useDatabase()
    const [clients, setClients] = useState<Client[]>([])
    const [search, setSearch] = useState("")

    useEffect(() => {
        const fetchClients = async () => {
            if (!db) return
            const result = await db.query("SELECT * FROM clients ORDER BY name ASC")
            setClients(result.values as Client[] || [])
        }
        fetchClients()
    }, [db])

    const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

    return (
        <div className="fixed inset-0 z-50 bg-background flex flex-col safe-area-top safe-area-bottom">
            <div className="flex items-center gap-2 p-4 border-b">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search client..."
                        className="pl-8"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filtered.map(client => (
                    <Card key={client.id} onClick={() => onSelect(client)} className="cursor-pointer hover:bg-accent">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">{client.name}</p>
                                <p className="text-xs text-muted-foreground">{client.email}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {filtered.length === 0 && (
                    <p className="text-center text-muted-foreground mt-4">No clients found.</p>
                )}
            </div>
        </div>
    )
}
