import { Routes, Route } from "react-router-dom"
import { MobileShell } from "@/components/mobile-shell"
import { useDatabase } from "@/DatabaseContext"
import Clients from "@/pages/Clients/index.tsx"
import { Dashboard } from "@/pages/Dashboard.tsx"
import Products from "@/pages/Products/index.tsx"
import Invoices from "@/pages/Invoices/index.tsx"
import Estimates from "@/pages/Estimates/index.tsx"
import { PrintInvoice } from "@/pages/Print/PrintInvoice"
import { PrintEstimate } from "@/pages/Print/PrintEstimate"
import Settings from "@/pages/Settings"

function App() {
  const { isInitialized, error, loadingState } = useDatabase();

  if (error) {
    return <div className="p-4 text-destructive">Error loading database: {error.message}</div>
  }

  if (!isInitialized) {
    return <div className="flex items-center justify-center min-h-screen">Loading database: {loadingState}</div>
  }

  const isPrintRoute = window.location.pathname.startsWith('/print/');

  if (isPrintRoute) {
    return (
      <Routes>
        <Route path="/print/invoice/:id" element={<PrintInvoice />} />
        <Route path="/print/estimate/:id" element={<PrintEstimate />} />
      </Routes>
    )
  }

  return (
    <MobileShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients/*" element={<Clients />} />
        <Route path="/products/*" element={<Products />} />
        <Route path="/invoices/*" element={<Invoices />} />
        <Route path="/estimates/*" element={<Estimates />} />
        <Route path="/settings/*" element={<Settings />} />
      </Routes>
    </MobileShell>
  )
}

export default App
