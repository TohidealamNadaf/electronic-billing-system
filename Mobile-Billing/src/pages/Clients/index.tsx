import { Routes, Route } from "react-router-dom"
import { ClientsList } from "./ClientsList.tsx"
import { ClientEntry } from "./ClientEntry.tsx"

export default function Clients() {
    return (
        <Routes>
            <Route path="/" element={<ClientsList />} />
            <Route path="/new" element={<ClientEntry />} />
            <Route path="/:id" element={<ClientEntry />} />
        </Routes>
    )
}
