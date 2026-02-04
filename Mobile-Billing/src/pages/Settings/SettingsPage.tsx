import { useEffect, useState } from "react"
import { Trash2, ArrowUp, ArrowDown, Info, Calculator } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSettings } from "@/hooks/useSettings"

// --- Interfaces for Configuration ---

interface BusinessDisplayField {
    id: string
    key: string
    value: string
    show: boolean
    isBuiltIn: boolean
    type?: 'text' | 'textarea'
}

interface BusinessProfileConfig {
    showName: boolean
    nameDisplayType: 'company' | 'owner'
    showAddress: boolean
    showContact: boolean
    showGst: boolean
    displayFields: BusinessDisplayField[]
}

interface CustomColumn {
    id: string
    name: string
    type: 'calculated' | 'text' | 'number' | ''
    formula: string
    isCurrency: boolean
    isBuiltIn: boolean
}

// --- Main Component ---

export function SettingsPage() {
    const { settings, loading, updateSettings } = useSettings()
    const [activeTab, setActiveTab] = useState('profile')
    const [saving, setSaving] = useState(false)
    const [successMsg, setSuccessMsg] = useState(false)

    // Form States (Identity Tab)
    const [companyName, setCompanyName] = useState("")
    const [companyOwner, setCompanyOwner] = useState("")

    // Config States (JSON based)
    const [businessConfig, setBusinessConfig] = useState<BusinessProfileConfig>({
        showName: true,
        nameDisplayType: 'company',
        showAddress: true,
        showContact: true,
        showGst: true,
        displayFields: []
    })

    // Preferences
    const [isGstEnabled, setIsGstEnabled] = useState(false)
    const [gstRate, setGstRate] = useState("18%")
    const [isDiscountEnabled, setIsDiscountEnabled] = useState(false)
    const [showTerms, setShowTerms] = useState(true)
    const [terms, setTerms] = useState("")

    // Table Config
    const [customColumns, setCustomColumns] = useState<CustomColumn[]>([])
    const [columnLabels, setColumnLabels] = useState<Record<string, string>>({
        product: 'Description', quantity: 'Qty', price: 'Unit Price', total: 'Total'
    })

    // --- Initialization ---
    useEffect(() => {
        if (!settings) return

        setCompanyName(settings.companyName || "")
        setCompanyOwner(settings.companyOwner || "")
        setGstRate(settings.gstRate || "18%")
        setTerms(settings.termAndConditions || "")

        setIsGstEnabled(String(settings.isGstEnabled) === 'true')
        setIsDiscountEnabled(String(settings.isDiscountEnabled) === 'true')
        setShowTerms(settings.showTerms !== undefined ? String(settings.showTerms) === 'true' : true)

        // Parse Business Config
        try {
            let config = settings.businessProfileConfig ? JSON.parse(settings.businessProfileConfig) : {}
            // Defaults
            const defaults: BusinessProfileConfig = {
                showName: true,
                nameDisplayType: 'company',
                showAddress: true,
                showContact: true,
                showGst: true,
                displayFields: []
            }
            config = { ...defaults, ...config }

            if (!config.displayFields || config.displayFields.length === 0) {
                config.displayFields = [
                    { id: 'address', key: 'Business Address', value: settings.companyAddress || "", show: config.showAddress, isBuiltIn: true, type: 'textarea' },
                    { id: 'phone', key: 'Phone Number', value: settings.companyPhone || "", show: config.showContact, isBuiltIn: true, type: 'text' },
                    { id: 'gst', key: 'GST Number', value: settings.gstNumber || "", show: config.showGst, isBuiltIn: true, type: 'text' }
                ]
            }
            setBusinessConfig(config)
        } catch (e) { console.error("Error parsing business config", e) }

        // Parse Columns
        try {
            let cols = settings.customColumns ? JSON.parse(settings.customColumns) : []
            if (cols.length === 0) {
                cols = [
                    { id: 'product', isBuiltIn: true, name: '', type: '', formula: '', isCurrency: true },
                    { id: 'quantity', isBuiltIn: true, name: '', type: '', formula: '', isCurrency: false },
                    { id: 'price', isBuiltIn: true, name: '', type: '', formula: '', isCurrency: true },
                    { id: 'total', isBuiltIn: true, name: '', type: '', formula: '', isCurrency: true }
                ]
            }
            // Ensure types
            cols = cols.map((c: any) => ({
                ...c,
                name: c.isBuiltIn ? '' : (c.name || ''),
                type: c.isBuiltIn ? '' : (c.type || 'calculated'),
                formula: c.isBuiltIn ? '' : (c.formula || ''),
                isCurrency: c.isCurrency !== undefined ? c.isCurrency : true
            }))
            setCustomColumns(cols)
        } catch (e) {
            setCustomColumns([
                { id: 'product', isBuiltIn: true, name: '', type: '', formula: '', isCurrency: true },
                { id: 'quantity', isBuiltIn: true, name: '', type: '', formula: '', isCurrency: false },
                { id: 'price', isBuiltIn: true, name: '', type: '', formula: '', isCurrency: true },
                { id: 'total', isBuiltIn: true, name: '', type: '', formula: '', isCurrency: true }
            ])
        }

        try {
            const labels = settings.columnLabels ? JSON.parse(settings.columnLabels) : {}
            setColumnLabels(prev => ({ ...prev, ...labels }))
        } catch (e) { }

    }, [settings])

    // --- Helpers ---

    const handleSave = async () => {
        setSaving(true)

        // Update values in displayFields for built-ins if needed
        // (Actually they are bound directly in state, so businessConfig matches UI)

        // Sync root vars from fields
        const addrField = businessConfig.displayFields.find(f => f.id === 'address')
        const phoneField = businessConfig.displayFields.find(f => f.id === 'phone')
        const gstField = businessConfig.displayFields.find(f => f.id === 'gst')

        const finalConfig = {
            ...businessConfig,
            showAddress: addrField?.show ?? true,
            showContact: phoneField?.show ?? true,
            showGst: gstField?.show ?? true
        }

        const payload = {
            companyName,
            companyOwner,
            companyAddress: addrField?.value || "",
            companyPhone: phoneField?.value || "",
            gstNumber: gstField?.value || "",
            gstRate,
            isGstEnabled: String(isGstEnabled),
            isDiscountEnabled: String(isDiscountEnabled),
            showTerms: String(showTerms),
            termAndConditions: terms,
            businessProfileConfig: JSON.stringify(finalConfig),
            customColumns: JSON.stringify(customColumns),
            columnLabels: JSON.stringify(columnLabels)
        }

        await updateSettings(payload)
        setSaving(false)
        setSuccessMsg(true)
        setTimeout(() => setSuccessMsg(false), 2000)
    }

    // --- Renderers ---

    const renderTabs = () => (
        <div className="flex bg-slate-100 p-1 rounded-lg mb-4 overflow-x-auto">
            {['profile', 'display', 'layout', 'table'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wide rounded-md transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    {tab === 'profile' ? 'Identity' : tab === 'display' ? 'Arrange' : tab === 'layout' ? 'Prefs' : 'Table'}
                </button>
            ))}
        </div>
    )

    // PAGE: IDENTITY
    const renderProfile = () => (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wide">Company Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-500">Company Registered Name</Label>
                        <Input value={companyName} onChange={e => setCompanyName(e.target.value)} className="bg-slate-50 border-slate-200" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-500">Proprietor / Signatory</Label>
                        <Input value={companyOwner} onChange={e => setCompanyOwner(e.target.value)} className="bg-slate-50 border-slate-200" />
                    </div>
                </CardContent>
            </Card>

            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Branding Preference</h3>
                <div className="space-y-2">
                    {['company', 'owner'].map((type) => (
                        <div key={type}
                            onClick={() => setBusinessConfig(p => ({ ...p, nameDisplayType: type as any }))}
                            className={`flex items-center justify-between px-3 py-3 bg-white border rounded-lg cursor-pointer transition-all ${businessConfig.nameDisplayType === type ? 'border-emerald-400 ring-1 ring-emerald-400' : 'border-transparent'
                                }`}>
                            <span className={`text-xs font-bold uppercase tracking-wide ${businessConfig.nameDisplayType === type ? 'text-emerald-700' : 'text-slate-500'
                                }`}>
                                {type === 'company' ? 'Show Company Name' : 'Show Owner Name'}
                            </span>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${businessConfig.nameDisplayType === type ? 'border-emerald-500' : 'border-slate-300'
                                }`}>
                                {businessConfig.nameDisplayType === type && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )

    // PAGE: ARRANGE
    const moveField = (index: number, direction: -1 | 1) => {
        const fields = [...businessConfig.displayFields]
        if (index + direction < 0 || index + direction >= fields.length) return
        const temp = fields[index]
        fields[index] = fields[index + direction]
        fields[index + direction] = temp
        setBusinessConfig({ ...businessConfig, displayFields: fields })
    }

    const addField = () => {
        const newField: BusinessDisplayField = {
            id: 'custom_' + Date.now(),
            key: '',
            value: '',
            show: true,
            isBuiltIn: false,
            type: 'text'
        }
        setBusinessConfig({ ...businessConfig, displayFields: [...businessConfig.displayFields, newField] })
    }

    const removeField = (index: number) => {
        const fields = [...businessConfig.displayFields]
        fields.splice(index, 1)
        setBusinessConfig({ ...businessConfig, displayFields: fields })
    }

    const renderDisplay = () => (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide">Field Arrangement</h3>
                <Button variant="outline" size="sm" onClick={addField} className="h-7 text-[10px] uppercase font-bold text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-100">
                    + Add Detail
                </Button>
            </div>

            <div className="space-y-2">
                {businessConfig.displayFields.map((field, i) => (
                    <div key={field.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="flex items-center p-2 bg-slate-50/50 border-b border-slate-100 gap-2">
                            <div className="flex flex-col gap-0.5">
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveField(i, -1)} disabled={i === 0}>
                                    <ArrowUp className="w-3 h-3 text-slate-400" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveField(i, 1)} disabled={i === businessConfig.displayFields.length - 1}>
                                    <ArrowDown className="w-3 h-3 text-slate-400" />
                                </Button>
                            </div>

                            <div className="flex-1">
                                {field.isBuiltIn ? (
                                    <span className="text-[10px] font-bold text-slate-800 uppercase tracking-wide block">{field.key}</span>
                                ) : (
                                    <input
                                        value={field.key}
                                        onChange={e => {
                                            const f = [...businessConfig.displayFields]; f[i].key = e.target.value; setBusinessConfig({ ...businessConfig, displayFields: f })
                                        }}
                                        className="bg-transparent border-none text-[10px] font-bold text-slate-800 p-0 focus:ring-0 uppercase tracking-wide w-full placeholder:text-slate-300"
                                        placeholder="LABEL..."
                                    />
                                )}
                                <span className="text-[8px] font-black text-slate-400 uppercase px-1 rounded bg-slate-100 border border-slate-200 inline-block mt-1">
                                    {field.isBuiltIn ? 'System' : 'Custom'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
                                <label className="relative inline-flex items-center cursor-pointer scale-75">
                                    <input type="checkbox" checked={field.show} onChange={e => {
                                        const f = [...businessConfig.displayFields]; f[i].show = e.target.checked; setBusinessConfig({ ...businessConfig, displayFields: f })
                                    }} className="sr-only peer" />
                                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                                </label>
                                {!field.isBuiltIn && (
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500" onClick={() => removeField(i)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="p-3">
                            {field.type === 'textarea' || (!field.type && field.id === 'address') ? (
                                <textarea
                                    rows={2}
                                    value={field.value}
                                    onChange={e => {
                                        const f = [...businessConfig.displayFields]; f[i].value = e.target.value; setBusinessConfig({ ...businessConfig, displayFields: f })
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-700 resize-none placeholder:text-slate-300"
                                    placeholder="Enter address..."
                                />
                            ) : (
                                <input
                                    type={field.id === 'phone' ? 'tel' : 'text'}
                                    value={field.value}
                                    onChange={e => {
                                        const f = [...businessConfig.displayFields]; f[i].value = e.target.value; setBusinessConfig({ ...businessConfig, displayFields: f })
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-700 placeholder:text-slate-300"
                                    placeholder="Enter value..."
                                />
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    // PAGE: PREFS
    const renderPrefs = () => (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">System Preferences</h3>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200/50">
                    <div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase">Taxation (GST)</h3>
                        <p className="text-[10px] text-slate-400">Enable global tax calculation</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={isGstEnabled} onChange={e => setIsGstEnabled(e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200/50">
                    <div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase">Discount System</h3>
                        <p className="text-[10px] text-slate-400">Enable line-item discounts</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={isDiscountEnabled} onChange={e => setIsDiscountEnabled(e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                    </label>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Terms & Conditions</h3>
                    <label className="relative inline-flex items-center cursor-pointer scale-90">
                        <input type="checkbox" checked={showTerms} onChange={e => setShowTerms(e.target.checked)} className="sr-only peer" />
                        <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                    </label>
                </div>
                <textarea
                    rows={6}
                    disabled={!showTerms}
                    value={terms}
                    onChange={e => setTerms(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500 text-slate-600 disabled:opacity-50 resize-none"
                    placeholder="Enter permanent terms, bank details, or policy notes..."
                />
                <p className="text-[10px] text-slate-400 italic mt-2">Appears at the bottom of all Invoices/Estimates.</p>
            </div>
        </div>
    )

    // PAGE: TABLE
    const moveColumn = (index: number, direction: -1 | 1) => {
        const cols = [...customColumns]
        if (index + direction < 0 || index + direction >= cols.length) return
        const temp = cols[index]
        cols[index] = cols[index + direction]
        cols[index + direction] = temp
        setCustomColumns(cols)
    }

    const addColumn = () => {
        setCustomColumns([...customColumns, {
            id: 'custom_' + Math.random().toString(36).substr(2, 9),
            name: '',
            type: 'calculated',
            formula: '',
            isCurrency: true,
            isBuiltIn: false
        }])
    }

    const removeColumn = (index: number) => {
        if (customColumns[index].isBuiltIn) return
        const cols = [...customColumns]
        cols.splice(index, 1)
        setCustomColumns(cols)
    }

    const renderTable = () => (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start gap-3">
                <Info className="text-emerald-500 mt-0.5 w-5 h-5 flex-shrink-0" />
                <div>
                    <h4 className="text-xs font-bold text-emerald-800 uppercase">Unified Column Control</h4>
                    <p className="text-[10px] text-emerald-600 leading-tight mt-0.5">Drag (use arrows) to reorder any column. Use "Calculated" type to add formula-based columns.</p>
                </div>
            </div>

            <div className="flex justify-end mb-2">
                <Button variant="outline" size="sm" onClick={addColumn} className="h-7 text-[10px] uppercase font-bold text-slate-700 bg-white border-slate-200 shadow-sm hover:bg-slate-50">
                    + Add Column
                </Button>
            </div>

            <div className="space-y-3">
                {customColumns.map((col, i) => (
                    <div key={col.id} className={`bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative ${col.isBuiltIn ? 'border-l-4 border-l-emerald-500 pl-1' : ''}`}>
                        <div className="flex items-center justify-between p-2 bg-slate-50/80 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="flex flex-col gap-0.5">
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveColumn(i, -1)} disabled={i === 0}>
                                        <ArrowUp className="w-3 h-3 text-slate-400" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveColumn(i, 1)} disabled={i === customColumns.length - 1}>
                                        <ArrowDown className="w-3 h-3 text-slate-400" />
                                    </Button>
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border shadow-sm ${col.isBuiltIn ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-white text-slate-400 border-slate-200'
                                    }`}>
                                    {col.isBuiltIn ? (col.id === 'total' ? 'System' : 'Core') : 'Custom'}
                                </span>
                            </div>
                            {!col.isBuiltIn && (
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500" onClick={() => removeColumn(i)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </div>

                        <div className="p-3 grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <Label className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wide block">
                                    {col.isBuiltIn ? 'Display Label' : 'Column Name'}
                                </Label>
                                {col.isBuiltIn ? (
                                    <input
                                        type="text"
                                        value={columnLabels[col.id]}
                                        onChange={e => setColumnLabels({ ...columnLabels, [col.id]: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-800 uppercase focus:outline-none focus:border-emerald-500"
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={col.name}
                                        onChange={e => { const c = [...customColumns]; c[i].name = e.target.value; setCustomColumns(c) }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-800 uppercase focus:outline-none focus:bg-white focus:border-emerald-500 placeholder:text-slate-300"
                                        placeholder="COLUMN NAME"
                                    />
                                )}
                            </div>

                            {!col.isBuiltIn && (
                                <>
                                    <div>
                                        <Label className="text-[9px] font-bold text-slate-400 uppercase mb-1 tracking-wide block">Type</Label>
                                        <select
                                            value={col.type}
                                            onChange={e => { const c = [...customColumns]; c[i].type = e.target.value as any; setCustomColumns(c) }}
                                            className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 text-xs font-bold text-slate-700 outline-none"
                                        >
                                            <option value="calculated">Calculated</option>
                                            <option value="text">Manual Text</option>
                                            <option value="number">Manual Number</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center pt-5">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={col.isCurrency} onChange={e => { const c = [...customColumns]; c[i].isCurrency = e.target.checked; setCustomColumns(c) }}
                                                className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                                            <span className="text-[10px] font-bold text-slate-600 uppercase">Currency (₹)</span>
                                        </label>
                                    </div>

                                    {col.type === 'calculated' && (
                                        <div className="col-span-2 bg-emerald-50/30 p-3 rounded border border-emerald-200/50">
                                            <Label className="text-[9px] font-bold text-emerald-800 uppercase mb-1 tracking-wide flex justify-between">
                                                <span>Formula Console</span>
                                                <span className="text-emerald-600 italic">params: price, qty</span>
                                            </Label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={col.formula}
                                                    onChange={e => { const c = [...customColumns]; c[i].formula = e.target.value; setCustomColumns(c) }}
                                                    className="w-full bg-white border border-emerald-200 rounded pl-3 pr-8 py-1.5 text-xs font-mono font-bold text-emerald-900 shadow-inner focus:border-emerald-500 outline-none"
                                                    placeholder="e.g. price * qty"
                                                />
                                                <Calculator className="absolute right-2 top-1.5 text-emerald-300 w-3 h-3" />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    return (
        <div className="p-4 pb-20 space-y-4 max-w-md mx-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-display font-medium">System Settings</h1>
                <Button onClick={handleSave} disabled={saving || loading} size="sm" className="h-8 px-4 text-xs font-bold uppercase tracking-wide bg-emerald-600 hover:bg-emerald-700 rounded-full">
                    {saving ? 'Saving...' : successMsg ? 'Saved!' : 'Save'}
                </Button>
            </div>

            {renderTabs()}

            {activeTab === 'profile' && renderProfile()}
            {activeTab === 'display' && renderDisplay()}
            {activeTab === 'layout' && renderPrefs()}
            {activeTab === 'table' && renderTable()}
        </div>
    )
}
