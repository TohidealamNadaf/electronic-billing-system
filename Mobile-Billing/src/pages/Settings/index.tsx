import { Routes, Route } from "react-router-dom"
import { SettingsPage } from "./SettingsPage"

export default function Settings() {
    return (
        <Routes>
            <Route path="/" element={<SettingsPage />} />
        </Routes>
    )
}

