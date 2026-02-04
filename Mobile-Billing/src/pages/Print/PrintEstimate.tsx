import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { useDatabase } from "@/DatabaseContext"
import "./PrintEstimate.css"

export function PrintEstimate({ data, settingsData }: { data?: any, settingsData?: any }) {
    const { id } = useParams()
    const { db } = useDatabase()
    const [estimate, setEstimate] = useState<any>(data || null)
    const [items, setItems] = useState<any[]>(data?.items || [])
    const [settings, setSettings] = useState<any>(settingsData || {})
    const [loading, setLoading] = useState(!data)

    useEffect(() => {
        if (!data && db && id) {
            loadData()
        } else if (data) {
            setEstimate(data)
            setItems(data.items || [])
            setSettings(settingsData || {})
            setLoading(false)
        }
    }, [db, id, data, settingsData])

    const loadData = async () => {
        if (!db) return
        try {
            // Load Estimate
            const estRes = await db.query("SELECT * FROM estimates WHERE id = ?", [id])
            if (estRes.values && estRes.values.length > 0) {
                setEstimate(estRes.values[0])

                // Load Items
                const itemsRes = await db.query("SELECT * FROM estimate_items WHERE estimateId = ?", [id])
                if (itemsRes.values) setItems(itemsRes.values)
            }

            // Load Settings
            const setRes = await db.query("SELECT * FROM settings")
            if (setRes.values) {
                const settingsMap: any = {}
                setRes.values.forEach((s: any) => {
                    settingsMap[s.key] = s.value
                })
                setSettings(settingsMap)
            }
        } catch (e) {
            console.error("Error loading print data", e)
        } finally {
            setLoading(false)
            if (!data) {
                setTimeout(() => {
                    // window.print()
                }, 800)
            }
        }
    }

    if (loading) return <div className="loading-state">Preparing Estimate Preview...</div>
    if (!estimate) return <div className="loading-state error-message">Estimate not found</div>

    const formatDate = (d: string) => {
        if (!d) return ''
        return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount).replace('$', '₹')
    }

    const getEstimateNumberDate = (d: any): string => {
        if (!d) return '';
        const date = new Date(d);
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        return `${year}${month}${day}`;
    }

    return (
        <div className="est-print-wrapper" id="print-section">
            <div className="est-print-container">

                {/* Header Bar */}
                <div className="est-header-bar">
                    <div className="est-brand-section">
                        <h1 className="est-company-name">{settings.companyName || 'Generic Company'}</h1>
                        <div className="est-company-tagline">Professional & Reliable Services</div>
                    </div>
                </div>

                {/* Info Bar */}
                <div className="est-info-bar">
                    <div className="est-info-item">
                        <span className="est-label">Estimate Date:</span>
                        <span className="est-value">{formatDate(estimate.date)}</span>
                    </div>
                    <div className="est-info-item">
                        <span className="est-label">Estimate #:</span>
                        <span className="est-value font-mono">EST-{getEstimateNumberDate(estimate.date)}-{estimate.estimateNumber}</span>
                    </div>
                </div>

                {/* Address Section */}
                <div className="est-address-section">
                    {/* From Column */}
                    <div className="est-addr-box">
                        <div className="est-box-header">Estimate From</div>
                        <div className="est-addr-name">{settings.companyOwner || settings.companyName || 'Company Name'}</div>
                        <div className="est-addr-text">{settings.companyAddress}</div>
                        {settings.companyPhone && <div className="est-addr-text">Tel: {settings.companyPhone}</div>}
                        {settings.companyEmail && <div className="est-addr-text">Email: {settings.companyEmail}</div>}
                    </div>

                    {/* To Column */}
                    <div className="est-addr-box est-text-right">
                        <div className="est-box-header">Estimate For</div>
                        <div className="est-addr-name">{estimate.clientName || 'Customer'}</div>
                        {/* More client details would go here if we fetch them */}
                    </div>
                </div>

                {/* Items Table */}
                <div className="est-table-section">
                    <table className="est-data-table">
                        <thead>
                            <tr>
                                <th className="est-col-desc est-text-left">Item</th>
                                <th className="est-col-qty est-text-center">Qty</th>
                                <th className="est-col-price est-text-right">Rate</th>
                                <th className="est-col-total est-text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => (
                                <tr key={i} className={i % 2 !== 0 ? 'est-odd' : ''}>
                                    <td className="est-col-desc est-text-left">
                                        <div className="est-item-title">{item.productName}</div>
                                    </td>
                                    <td className="est-col-qty est-text-center">{item.quantity}</td>
                                    <td className="est-col-price est-text-right">{formatCurrency(item.price)}</td>
                                    <td className="est-col-total est-text-right est-font-bold">{formatCurrency(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals / Footer */}
                <div className="est-totals-container">
                    <div className="est-notes-section">
                        {settings.termAndConditions && (
                            <>
                                <div className="est-terms-title">Terms & Conditions</div>
                                <div className="est-terms-text">{settings.termAndConditions}</div>
                            </>
                        )}
                    </div>

                    <div className="est-totals-table">
                        <div className="est-t-row">
                            <span className="est-label">Subtotal</span>
                            <span className="est-val">{formatCurrency(estimate.subtotal)}</span>
                        </div>
                        {estimate.tax > 0 && (
                            <div className="est-t-row">
                                <span className="est-label">Tax</span>
                                <span className="est-val">{formatCurrency(estimate.tax)}</span>
                            </div>
                        )}
                        <div className="est-t-row est-grand-total">
                            <span className="est-label">Estimated Total</span>
                            <span className="est-val">{formatCurrency(estimate.total)}</span>
                        </div>

                        <div className="est-status-pill est-info">
                            PROVISIONAL QUOTATION
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="est-footer">
                    <div className="est-footer-line"></div>
                    <div className="est-footer-text">
                        {settings.companyName} • {settings.companyAddress || 'City, Country'}<br />
                        Generated on {new Date().toLocaleString()}
                    </div>
                </footer>

            </div>
        </div>
    )
}
