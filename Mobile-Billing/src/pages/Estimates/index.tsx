import { Routes, Route } from "react-router-dom"
import { EstimatesList } from "./EstimatesList"
import { EstimateEntry } from "./EstimateEntry"

export default function Estimates() {
    return (
        <Routes>
            <Route index element={<EstimatesList />} />
            <Route path="new" element={<EstimateEntry />} />
            <Route path=":id" element={<EstimateEntry />} />
        </Routes>
    )
}
