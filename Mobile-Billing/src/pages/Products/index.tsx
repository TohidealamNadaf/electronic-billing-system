import { Routes, Route } from "react-router-dom"
import { ProductsList } from "./ProductsList.tsx"
import { ProductEntry } from "./ProductEntry.tsx"

export default function Products() {
    return (
        <Routes>
            <Route path="/" element={<ProductsList />} />
            <Route path="/new" element={<ProductEntry />} />
            <Route path="/:id" element={<ProductEntry />} />
        </Routes>
    )
}
