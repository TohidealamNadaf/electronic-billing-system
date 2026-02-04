import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { useDatabase } from "@/DatabaseContext"
import "./PrintInvoice.css"

export function PrintInvoice({ data, settingsData }: { data?: any, settingsData?: any }) {
    const { id } = useParams()
    const { db } = useDatabase()
    const [invoice, setInvoice] = useState<any>(data || null)
    const [items, setItems] = useState<any[]>(data?.items || [])
    const [settings, setSettings] = useState<any>(settingsData || {})
    const [loading, setLoading] = useState(!data)

    useEffect(() => {
        if (!data && db && id) {
            loadData()
        } else if (data) {
            // If data prop updates
            setInvoice(data)
            setItems(data.items || [])
            setSettings(settingsData || {})
            setLoading(false)
        }
    }, [db, id, data, settingsData])

    const loadData = async () => {
        if (!db) return
        try {
            // Load Invoice
            const invRes = await db.query("SELECT * FROM invoices WHERE id = ?", [id])
            if (invRes.values && invRes.values.length > 0) {
                setInvoice(invRes.values[0])

                // Load Items
                const itemsRes = await db.query("SELECT * FROM invoice_items WHERE invoiceId = ?", [id])
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
            // Trigger print dialog after a short delay to ensure render
            setTimeout(() => {
                window.print()
            }, 800)
        }
    }

    if (loading) return <div className="loading-state">Generating Invoice...</div>
    if (!invoice) return <div className="loading-state error-msg">Invoice not found</div>

    const formatDate = (d: string) => {
        if (!d) return ''
        return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount).replace('$', '₹') // Using ₹ as per template
    }

    const getInvoiceNumberDate = (d: any): string => {
        if (!d) return '';
        const date = new Date(d);
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        return `${year}${month}${day}`;
    }

    return (
        <div className="print-wrapper" id="print-section">
            <div className="print-container">

                {/* Top Header */}
                <div className="top-header">
                    <div>
                        <h1 className="company-name">{settings.companyName || 'Generic Company'}</h1>
                        <div className="company-tagline">Professional & Reliable Services</div>
                    </div>
                    <div className="invoice-badge">INVOICE</div>
                </div>

                {/* Meta Bar */}
                <div className="meta-bar">
                    <div className="meta-item">
                        <span className="label">Reference:</span>
                        <span className="value font-mono">{getInvoiceNumberDate(invoice.date)}</span>
                    </div>
                    <div className="meta-item">
                        <span className="label">Invoice Date:</span>
                        <span className="value">{formatDate(invoice.date)}</span>
                    </div>
                    <div className="meta-item">
                        <span className="label">Due Date:</span>
                        <span className="value">On Receipt</span>
                    </div>
                </div>

                {/* Addresses Grid */}
                <div className="address-grid">
                    {/* From */}
                    <div className="addr-card">
                        <div className="addr-header">Invoiced By</div>
                        <div className="addr-body">
                            <div className="strong-name">{settings.companyOwner || settings.companyName || 'Company Name'}</div>
                            <div className="addr-row">
                                <span className="addr-label">Address:</span>
                                <span className="addr-val">{settings.companyAddress}</span>
                            </div>
                            {settings.companyPhone && (
                                <div className="addr-row">
                                    <span className="addr-label">Phone:</span>
                                    <span className="addr-val">{settings.companyPhone}</span>
                                </div>
                            )}
                            {settings.companyEmail && (
                                <div className="addr-row">
                                    <span className="addr-label">Email:</span>
                                    <span className="addr-val">{settings.companyEmail}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* To */}
                    <div className="addr-card">
                        <div className="addr-header">Billed To</div>
                        <div className="addr-body">
                            <div className="strong-name">{invoice.clientName || 'Walk-in Customer'}</div>
                            {/* Assuming we might fetch full client details later, but basic name is here */}
                            <div className="addr-row">
                                <span className="addr-val">Client ID: {invoice.clientId}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th className="col-desc text-left">Description</th>
                                <th className="col-qty text-center">Qty</th>
                                <th className="col-price text-right">Unit Price</th>
                                <th className="col-total text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, i) => (
                                <tr key={i} className={i % 2 !== 0 ? 'stripe' : ''}>
                                    <td className="col-desc text-left">
                                        <div className="item-main">{item.productName}</div>
                                    </td>
                                    <td className="col-qty text-center">{item.quantity}</td>
                                    <td className="col-price text-right">{formatCurrency(item.price)}</td>
                                    <td className="col-total text-right">{formatCurrency(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Grid */}
                <div className="footer-grid">
                    {/* Notes */}
                    <div className="notes-panel">
                        {settings.termAndConditions && (
                            <>
                                <div className="panel-header">Terms & Conditions</div>
                                <div className="panel-body">{settings.termAndConditions}</div>
                            </>
                        )}
                    </div>

                    {/* Totals */}
                    <div className="totals-panel">
                        <div className="total-row">
                            <span className="label">Subtotal</span>
                            <span className="val">{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        {invoice.tax > 0 && (
                            <div className="total-row tax">
                                <span className="label">Tax</span>
                                <span className="val">{formatCurrency(invoice.tax)}</span>
                            </div>
                        )}
                        <div className="grand-total-box">
                            <div className="label">Total Amount</div>
                            <div className="val">{formatCurrency(invoice.total)}</div>
                        </div>
                    </div>
                </div>

                {/* Bottom */}
                <div className="page-footer">
                    <div className="footer-info">
                        {settings.companyName} • {settings.companyAddress || 'Verified Business'} • Generated on {new Date().toLocaleString()}
                    </div>
                </div>

            </div>
        </div>
    )
}
