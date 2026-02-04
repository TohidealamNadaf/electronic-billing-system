import { Routes, Route } from "react-router-dom"
import { InvoicesList } from "./InvoicesList.tsx"
import { InvoiceEntry } from "./InvoiceEntry.tsx"

export default function Invoices() {
    return (
        <Routes>
            <Route path="/" element={<InvoicesList />} />
            <Route path="/new" element={<InvoiceEntry />} />
            <Route path="/:id" element={<InvoiceEntry />} />
        </Routes>
    )
}
