import { Component, Input, OnInit, signal, NgZone, computed, ChangeDetectorRef, Inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { ElectronService } from '../services/electron.service';

@Component({
    selector: 'app-print-invoice',
    standalone: true,
    imports: [CommonModule],
    template: `
    <!-- Professional Colorful A4 Invoice Template -->
    <div class="print-wrapper" id="print-section">
        <div class="print-container" *ngIf="invoice(); else loadingTpl">
            
            <!-- Top Header (Colorful Background) -->
            <div class="top-header">
                <div>
                    <h1 class="company-name">{{ settings()?.companyName || 'Generic Company' }}</h1>
                    <div class="company-tagline">Professional & Reliable Services</div>
                </div>
                <div class="invoice-badge">INVOICE</div>
            </div>

            <!-- Meta Bar -->
            <div class="meta-bar">
                <div class="meta-item">
                    <span class="label">Reference:</span>
                    <span class="value font-mono">{{ getInvoiceNumberDate(invoice()!.date) }}</span>
                </div>
                <div class="meta-item">
                    <span class="label">Invoice Date:</span>
                    <span class="value">{{ formatDate(invoice()!.date) }}</span>
                </div>
                <div class="meta-item">
                    <span class="label">Due Date:</span>
                    <span class="value">On Receipt</span>
                </div>
            </div>

            <!-- Addresses Grid -->
            <div class="address-grid">
                <!-- From -->
                <div class="addr-card">
                    <div class="addr-header">Invoiced By</div>
                    <div class="addr-body">
                        <div class="strong-name" *ngIf="businessProfile().showName">{{ businessProfile().nameDisplayType === 'owner' ? (settings()?.companyOwner || 'Owner Name') : (settings()?.companyName || 'Company Name') }}</div>
                        <ng-container *ngFor="let field of businessProfile().displayFields">
                            <div class="addr-row" *ngIf="field.show">
                                <span class="addr-label" *ngIf="!field.isBuiltIn && field.key">{{ field.key }}:</span>
                                <span class="addr-val">
                                    <ng-container *ngIf="field.id === 'address'">{{ settings()?.companyAddress }}</ng-container>
                                    <ng-container *ngIf="field.id === 'phone' && settings()?.companyPhone">Tel: {{ settings()?.companyPhone }}</ng-container>
                                    <ng-container *ngIf="field.id === 'gst' && settings()?.gstNumber">GST: {{ settings()?.gstNumber }}</ng-container>
                                    <ng-container *ngIf="!field.isBuiltIn">{{ field.value }}</ng-container>
                                </span>
                            </div>
                        </ng-container>
                    </div>
                </div>

                <!-- To -->
                <div class="addr-card">
                    <div class="addr-header">Billed To</div>
                    <div class="addr-body">
                        <div class="strong-name">{{ invoice()!.client?.name || 'Walk-in Customer' }}</div>
                        <div class="addr-row" *ngIf="invoice()!.client?.address">
                            <span class="addr-val">{{ invoice()!.client?.address }}</span>
                        </div>
                        <div class="addr-row" *ngIf="invoice()!.client?.phone">
                            <span class="addr-val">Tel: {{ invoice()!.client?.phone }}</span>
                        </div>
                        <div class="addr-row" *ngFor="let cf of getParsedCustomFields(invoice()!.client?.customFields)">
                            <span class="addr-label">{{ cf.key }}:</span> <span class="addr-val">{{ cf.value }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Items Table (Compact) -->
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th *ngFor="let col of customColumns()" 
                                [class.col-desc]="col.id === 'product'"
                                [class.col-qty]="col.id === 'quantity'"
                                [class.col-price]="col.id === 'price'"
                                [class.col-total]="col.id === 'total'"
                                [class.col-custom]="col.isBuiltIn === false"
                                [class.text-center]="col.id === 'quantity'"
                                [class.text-right]="col.id === 'price' || col.id === 'total' || (col.isBuiltIn === false && col.type !== 'text')"
                                [class.text-left]="col.id === 'product' || (col.isBuiltIn === false && col.type === 'text')">
                                {{ col.isBuiltIn ? (columnLabels()[col.id] || col.id) : col.name }}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let item of invoice()!.items; let i = index" [class.stripe]="i % 2 !== 0">
                            <td *ngFor="let col of customColumns()" 
                                [class.col-desc]="col.id === 'product'"
                                [class.col-qty]="col.id === 'quantity'"
                                [class.col-price]="col.id === 'price'"
                                [class.col-total]="col.id === 'total'"
                                [class.col-custom]="col.isBuiltIn === false"
                                [class.text-center]="col.id === 'quantity'"
                                [class.text-right]="col.id === 'price' || col.id === 'total' || (col.isBuiltIn === false && col.type !== 'text')"
                                [class.text-left]="col.id === 'product' || (col.isBuiltIn === false && col.type === 'text')">
                                
                                <ng-container [ngSwitch]="col.id">
                                    <div *ngSwitchCase="'product'">
                                        <div class="item-main">{{ item.productName || item.product?.name }}</div>
                                        <div class="item-sub" *ngIf="item.description">{{ item.description }}</div>
                                    </div>
                                    <div *ngSwitchCase="'quantity'">{{ item.quantity }}</div>
                                    <div *ngSwitchCase="'price'"><span class="currency-sym">₹</span>{{ item.price | number:'1.2-2' }}</div>
                                    <div *ngSwitchCase="'total'"><span class="currency-sym">₹</span>{{ (item.price * item.quantity) | number:'1.2-2' }}</div>
                                    
                                    <div *ngSwitchDefault>
                                       <span class="currency-sym" *ngIf="col.isCurrency">₹</span>{{ col.type === 'text' ? getCustomColumnValue(item, col) : (getCustomColumnValue(item, col) | number:(col.isCurrency ? '1.2-2' : '1.0-2')) }}
                                    </div>
                                </ng-container>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Footer Grid -->
            <div class="footer-grid">
                <!-- Notes & Terms -->
                <div class="notes-panel">
                    <ng-container *ngIf="settings()?.showTerms">
                        <div class="panel-header">Terms & Conditions</div>
                        <div class="panel-body">{{ settings()?.termsAndConditions }}</div>
                    </ng-container>
                    
                     <!-- Payment History (Small) -->
                     <ng-container *ngIf="invoice()!.showPaymentDetails && !invoice()!.isSimpleInvoice && invoice()!.payments?.length > 0">
                        <div class="history-block">
                            <div class="panel-header" style="margin-top: 2mm;">Advanced Paid</div>
                            <div class="hist-row" *ngFor="let p of invoice()!.payments">
                                <span>{{ formatDate(p.date) }}</span>
                                <span>₹{{ p.amount | number:'1.2-2' }}</span>
                            </div>
                        </div>
                     </ng-container>
                </div>

                <!-- Totals -->
                <div class="totals-panel">
                    <div class="total-row">
                        <span class="label">Subtotal</span>
                        <span class="val">{{ invoice()!.subTotal | number:'1.2-2' }}</span>
                    </div>
                    <div class="total-row discount" *ngIf="invoice()!.discountAmount > 0">
                        <span class="label">Discount</span>
                        <span class="val">-{{ invoice()!.discountAmount | number:'1.2-2' }}</span>
                    </div>
                    <div class="total-row tax" *ngIf="invoice()!.gstEnabled">
                        <span class="label">GST ({{ invoice()!.gstRate }})</span>
                        <span class="val">{{ invoice()!.taxTotal | number:'1.2-2' }}</span>
                    </div>
                    
                    <div class="grand-total-box">
                        <div class="label">Total Amount</div>
                        <div class="val">₹{{ invoice()!.total | number:'1.2-2' }}</div>
                    </div>

                    <!-- Payment Summary -->
                    <ng-container *ngIf="invoice()!.showPaymentDetails">
                        <div class="summary-divider"></div>
                        <ng-container *ngIf="invoice()!.paidAmount > 0">
                            <div class="total-row summary">
                                <span class="label">Amount Paid</span>
                                <span class="val">₹{{ invoice()!.paidAmount | number:'1.2-2' }}</span>
                            </div>
                            <div class="total-row summary" *ngIf="invoice()!.balanceAmount > 0">
                                <span class="label">Remaining Amount</span>
                                <span class="val warning">₹{{ invoice()!.balanceAmount | number:'1.2-2' }}</span>
                            </div>
                        </ng-container>
                        <div class="status-badge" [ngClass]="invoice()!.paymentStatus.toLowerCase()">
                            {{ invoice()!.paymentStatus }}
                        </div>
                    </ng-container>
                </div>
            </div>

            <!-- Bottom -->
            <div class="page-footer">
                <div class="footer-info">
                    {{ settings()?.companyName }} • {{ settings()?.companyAddress || 'Verified Business' }} • Generated on {{ generatedDate() | date:'medium' }}
                </div>
            </div>
        </div>

        <ng-template #loadingTpl>
             <div class="loading-state">
                <div *ngIf="!loadingTimeout">Generating Invoice...</div>
                <div *ngIf="loadingTimeout" class="error-msg">Loading Failed</div>
            </div>
        </ng-template>
    </div>
    `,
    styles: [`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        :root {
            --c-primary: #059669; /* Emerald 600 */
            --c-primary-dark: #047857; /* Emerald 700 */
            --c-primary-light: #d1fae5; /* Emerald 100 */
            --c-text: #1e293b; /* Slate 800 */
            --c-text-muted: #64748b; /* Slate 500 */
            --c-border: #e2e8f0; /* Slate 200 */
            --c-bg: #f8fafc; /* Slate 50 */
            --font-base: 'Inter', sans-serif;
            
            /* Force colors globally */
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        /* --- Global Print Resets --- */
        @media print {
            body, html { 
                margin: 0 !important; 
                padding: 0 !important; 
                width: 100% !important; 
                height: 100% !important; 
                background: white !important; 
            }
            app-root > * { display: none !important; }
            app-root > app-print-invoice { display: block !important; }
            
            .print-wrapper {  
                background: white !important; 
                padding: 0 !important; 
                display: block !important; 
                margin: 0 !important;
            }
            
            .print-container { 
                width: 100% !important; 
                margin: 0 !important; 
                box-shadow: none !important; 
                border: none !important; 
                min-height: 0 !important; 
                display: flex !important;
                flex-direction: column !important;
            }

            @page { size: A4; margin: 0; }
            .no-print { display: none !important; }

            /* CRITICAL: Force Background Graphics & Colors */
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        }

        /* Layout */
        .print-wrapper {
            background: #475569;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            padding: 2rem;
            font-family: var(--font-base);
            color: var(--c-text);
        }

        .print-container {
            background: white;
            width: 210mm;
            min-height: 297mm;
            padding: 12mm; /* Slightly reduced for capacity */
            position: relative;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            display: flex;
            flex-direction: column;
        }

        /* Header */
        .top-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 4mm;
            border-bottom: 2px solid var(--c-primary);
            margin-bottom: 4mm;
        }

        .company-name {
            font-size: 20px;
            font-weight: 800;
            color: var(--c-primary-dark);
            text-transform: uppercase;
            line-height: 1.1;
            margin: 0;
        }

        .company-tagline {
            font-size: 10px;
            font-weight: 500;
            color: var(--c-text-muted);
            margin-top: 2px;
        }

        .invoice-badge {
            background: var(--c-primary-light);
            color: var(--c-primary-dark);
            padding: 2mm 5mm;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 800;
            letter-spacing: 1px;
        }

        /* Meta Bar */
        .meta-bar {
            display: flex;
            justify-content: space-between;
            background: var(--c-bg);
            padding: 3mm 4mm;
            border-radius: 6px;
            margin-bottom: 6mm;
            border: 1px solid var(--c-border);
        }

        .meta-item { display: flex; flex-direction: column; }
        .meta-item .label { font-size: 10px; text-transform: uppercase; color: var(--c-text-muted); font-weight: 600; }
        .meta-item .value { font-size: 12px; font-weight: 700; color: var(--c-text); }
        .font-mono { font-family: monospace; letter-spacing: -0.5px; }

        /* Addresses */
        .address-grid {
            display: flex;
            gap: 6mm;
            margin-bottom: 6mm;
        }
        
        .addr-card {
            flex: 1;
            border: 1px solid var(--c-border);
            border-radius: 6px;
            overflow: hidden;
        }

        .addr-header {
            background: var(--c-bg);
            padding: 2mm 3mm;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--c-text-muted);
            border-bottom: 1px solid var(--c-border);
        }

        .addr-body {
            padding: 3mm;
        }

        .strong-name { font-size: 13px; font-weight: 700; margin-bottom: 1mm; }
        .addr-row { font-size: 11.5px; line-height: 1.4; display: flex; gap: 2mm; }
        .addr-label { color: var(--c-text-muted); font-weight: 600; white-space: nowrap; }
        .addr-val { color: var(--c-text); }

        /* Items Table */
        .table-container { flex-grow: 1; margin-bottom: 6mm; }
        .data-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        
        .data-table th {
            background: var(--c-primary);
            color: white;
            font-size: 10.5px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 2.5mm 2mm; /* Compact Header */
            text-align: left;
        }
        .data-table th:first-child { border-top-left-radius: 4px; border-bottom-left-radius: 4px; }
        .data-table th:last-child { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }

        .data-table td {
            font-size: 11.5px; /* Use 10px for readability in compact view */
            padding: 2mm 2mm; /* Compact Rows to fit 15+ */
            border-bottom: 1px solid var(--c-border);
            vertical-align: top;
            color: var(--c-text);
        }

        .stripe { background: #fcfcfc; }
        
        .col-desc { width: auto !important; }
        .col-qty { width: 8% !important; }
        .col-price { width: 12% !important; }
        .col-total { width: 15% !important; font-weight: 800 !important; }
        .col-custom { width: 12% !important; }
        
        
        .item-main { font-weight: 600; margin-bottom: 1px; }
        .item-sub { font-size: 10px; color: var(--c-text-muted); line-height: 1.2; }
        
        .text-left { text-align: left !important; }
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }

        /* Footer Grid */
        .footer-grid { display: flex; gap: 8mm; margin-bottom: 4mm; page-break-inside: avoid; }
        
        .notes-panel { flex: 1; }
        .panel-header { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--c-primary-dark); margin-bottom: 1mm; }
        .panel-body { font-size: 11px; color: var(--c-text-muted); white-space: pre-wrap; line-height: 1.4; border-left: 2px solid var(--c-border); padding-left: 2mm; }
        
        .history-block { border: 1px solid var(--c-border); padding: 2mm; border-radius: 4px; margin-top: 2mm; width: 60%; }
        .hist-row { display: flex; justify-content: space-between; font-size: 9px; color: var(--c-text-muted); margin-bottom: 1px; }

        .totals-panel { width: 70mm; background: var(--c-bg); padding: 3mm; border-radius: 6px; border: 1px solid var(--c-border); }
        
        .total-row { display: flex; justify-content: space-between; padding: 1mm 0; font-size: 11.5px; }
        .total-row .label { color: var(--c-text-muted); font-weight: 600; }
        .total-row .val { font-weight: 700; }
        .total-row.discount { color: #dc2626; }
        
        .grand-total-box { margin: 2mm 0; background: var(--c-primary); color: white; padding: 2mm; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
        .grand-total-box .label { font-size: 11px; font-weight: 600; }
        .grand-total-box .val { font-size: 14px; font-weight: 800; }

        .summary-divider { margin: 2mm 0; border-top: 1px dashed var(--c-border); }
        .total-row.summary .val.warning { color: #dc2626; }
        
        .status-badge { text-align: center; font-size: 10px; font-weight: 800; text-transform: uppercase; margin-top: 2mm; padding: 1mm; border: 1px solid var(--c-border); background: white; border-radius: 3px; }
        .status-badge.paid { color: #166534; background: #dcfce7; border-color: #86efac; }
        
        /* Page Footer */
        .page-footer { margin-top: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4mm; }
        .footer-sign { width: 40mm; border-top: 1px solid var(--c-text-muted); text-align: center; font-size: 9px; padding-top: 1mm; margin-left: auto; }
        .footer-info { font-size: 9px; color: var(--c-text-muted); border-top: 1px solid var(--c-border); width: 100%; text-align: center; padding-top: 2mm; }
        
        .loading-state { height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; }
        .error-msg { background: #ef4444; padding: 1rem; border-radius: 4px; }
    `],
    encapsulation: ViewEncapsulation.None
})
export class PrintInvoiceComponent implements OnInit {
    @Input() id: number | string | null = null;
    @Input() invoiceData: any = null;

    invoice = signal<any>(null);
    settings = signal<any>(null);
    generatedDate = signal(new Date());
    loading = false;
    loadingTimeout = false;

    columnLabels = computed(() => {
        const inv = this.invoice();
        if (!inv || !inv.columnLabels) return { product: 'Description', quantity: 'Qty', price: 'Unit Price', total: 'Total' };
        return typeof inv.columnLabels === 'string' ? JSON.parse(inv.columnLabels) : inv.columnLabels;
    });

    customColumns = computed(() => {
        const inv = this.invoice();
        if (!inv) return [];

        const builtInDefaults = [
            { id: 'product', isBuiltIn: true },
            { id: 'quantity', isBuiltIn: true },
            { id: 'price', isBuiltIn: true },
            { id: 'total', isBuiltIn: true }
        ];

        if (!inv.customColumns) return builtInDefaults;

        try {
            const parsed = typeof inv.customColumns === 'string' ? JSON.parse(inv.customColumns) : inv.customColumns;

            // If it's the new unified format (contains isBuiltIn)
            if (parsed.length > 0 && parsed.some((c: any) => c.isBuiltIn !== undefined)) {
                return parsed.map((c: any) => ({
                    ...c,
                    name: c.isBuiltIn ? '' : (c.name || ''),
                    type: c.isBuiltIn ? '' : (c.type || 'calculated'),
                    isCurrency: c.isCurrency !== undefined ? c.isCurrency : true
                }));
            }

            // Migration for old format (custom only)
            return [...builtInDefaults.slice(0, 3), ...parsed.map((c: any) => ({ ...c, isBuiltIn: false })), builtInDefaults[3]];
        } catch (e) {
            return builtInDefaults;
        }
    });

    businessProfile = computed(() => {
        const s = this.settings();
        const defaultProfile = {
            showName: true,
            nameDisplayType: 'company',
            displayFields: [
                { id: 'address', key: 'Business Address', show: true, isBuiltIn: true },
                { id: 'phone', key: 'Phone Number', show: true, isBuiltIn: true },
                { id: 'gst', key: 'GST Number', show: true, isBuiltIn: true }
            ]
        };
        if (!s || !s.businessProfileConfig) return defaultProfile;

        try {
            const config = typeof s.businessProfileConfig === 'string' ? JSON.parse(s.businessProfileConfig) : s.businessProfileConfig;

            // Backward compatibility / Migration
            if (!config.displayFields || config.displayFields.length === 0) {
                config.displayFields = [
                    { id: 'address', key: 'Business Address', show: config.showAddress ?? true, isBuiltIn: true },
                    { id: 'phone', key: 'Phone Number', show: config.showContact ?? true, isBuiltIn: true },
                    { id: 'gst', key: 'GST Number', show: config.showGst ?? true, isBuiltIn: true },
                    ...(config.customFields || []).map((f: any) => ({ ...f, isBuiltIn: false }))
                ];
            }

            return {
                ...defaultProfile,
                ...config
            };
        } catch (e) {
            return defaultProfile;
        }
    });

    constructor(
        private api: ApiService,
        private electron: ElectronService,
        private zone: NgZone,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        const params = new URLSearchParams(window.location.search);

        // 1. Fetch settings (Always needed)
        this.api.getSettings().subscribe({
            next: (data) => {
                this.settings.set(data);
                this.checkReady();
            },
            error: (err) => {
                console.error('Settings load failed:', err);
                this.checkReady(); // Proceed anyway with defaults
            }
        });

        // 2. Setup IPC Listener
        if (this.electron.isElectron()) {
            this.electron.on('init-invoice-data', (event, data) => {
                this.zone.run(() => {
                    this.invoice.set(data);
                    this.generatedDate.set(new Date());
                    this.cdr.detectChanges();
                    this.checkReady();
                });
            });
            // Signal main process we are ALIVE
            this.electron.send('print-window-ready');
        }

        // 3. Fallback: Check URL params immediately
        const b64Data = params.get('invoiceData');
        const invoiceId = params.get('printInvoiceId');

        if (b64Data) {
            try {
                const data = JSON.parse(atob(b64Data));
                this.invoice.set(data);
                this.checkReady();
            } catch (e) {
                console.error('Failed to parse b64Data', e);
            }
        } else if (invoiceId) {
            this.api.getInvoice(Number(invoiceId)).subscribe({
                next: (inv) => {
                    this.invoice.set(inv);
                    this.checkReady();
                },
                error: (err) => {
                    console.error('API Load failed:', err);
                    this.loadingTimeout = true;
                    this.cdr.detectChanges();
                }
            });
        }
    }

    private readySignaled = false;
    checkReady() {
        if (this.invoice() && this.settings() && !this.readySignaled) {
            this.readySignaled = true;
            this.finishHandshake();
        }
    }

    finishHandshake() {
        // Wait 800ms for DOM to settle
        setTimeout(() => {
            if (this.electron.isElectron()) {
                this.electron.sendReadyToPrint();
            }
        }, 800);
    }

    loadInvoice(id: number) {
        // ... (unused in sync mode but keep for legacy)
    }

    getParsedCustomFields(jsonStr: string): any[] {
        if (!jsonStr) return [];
        try {
            const parsed = JSON.parse(jsonStr);
            return parsed.fields || [];
        } catch (e) {
            return [];
        }
    }

    evaluateFormula(formula: string, price: number, qty: number): number {
        try {
            const cleanFormula = formula
                .replace(/price/g, String(price))
                .replace(/qty/g, String(qty))
                .replace(/[^0-9+\-*/().]/g, '');
            return (new Function('return ' + cleanFormula))() || 0;
        } catch (e) {
            return 0;
        }
    }

    getCustomColumnValue(item: any, col: any): any {
        if (col.id === 'total') return item.price * item.quantity;
        if (col.id === 'product' || col.id === 'quantity' || col.id === 'price') return '';

        if (col.type === 'calculated') {
            return this.evaluateFormula(col.formula, item.price, item.quantity);
        }
        if (item.customValues) {
            const vals = typeof item.customValues === 'string' ? JSON.parse(item.customValues) : item.customValues;
            return vals[col.name] || (col.type === 'number' ? 0 : '');
        }
        return (col.type === 'number' ? 0 : '');
    }

    getInvoiceNumberDate(d: any): string {
        if (!d) return '';
        const date = new Date(d);
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        return `${year}${month}${day}`;
    }

    formatDate(d: any): string {
        if (!d) return '';
        // If 'now', use current date
        if (d === 'now') d = new Date();
        const date = new Date(d);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }
}
