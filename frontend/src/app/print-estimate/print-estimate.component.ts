import { Component, Input, OnInit, signal, NgZone, computed, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../services/api.service';
import { ElectronService } from '../services/electron.service';

@Component({
    selector: 'app-print-estimate',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="print-wrapper" id="print-section">
        <div class="print-container" *ngIf="estimate(); else loadingTpl">
            
            <!-- Header Bar -->
            <div class="header-bar">
                <div class="brand-section">
                    <h1 class="company-name">{{ settings()?.companyName || 'Generic Company' }}</h1>
                    <div class="company-tagline">Professional & Reliable Services</div>
                </div>
            </div>

            <!-- Info Bar (Date, Ref) -->
            <div class="info-bar">
                <div class="info-item">
                    <span class="label">Estimate Date:</span>
                    <span class="value">{{ formatDate(estimate()!.date) }}</span>
                </div>
                <div class="info-item">
                    <span class="label">Estimate #:</span>
                    <span class="value font-mono">EST-{{ getEstimateNumberDate(estimate()!.date) }}-{{ estimate()!.id }}</span>
                </div>
            </div>

            <!-- Address Section (From | To) -->
            <div class="address-section">
                <!-- From Column -->
                <div class="addr-box">
                    <div class="box-header">Estimate From</div>
                    <div class="addr-name" *ngIf="businessProfile().showName">{{ businessProfile().nameDisplayType === 'owner' ? (settings()?.companyOwner || 'Owner Name') : (settings()?.companyName || 'Company Name') }}</div>
                    
                    <!-- Dynamic Business Fields (Ordered) -->
                    <div *ngFor="let field of businessProfile().displayFields">
                        <ng-container *ngIf="field.show">
                            <!-- Address Field -->
                            <div class="addr-text" *ngIf="field.id === 'address'">{{ settings()?.companyAddress }}</div>
                            
                            <!-- Phone Field -->
                            <div class="addr-text" *ngIf="field.id === 'phone' && settings()?.companyPhone">Tel: {{ settings()?.companyPhone }}</div>
                            
                            <!-- GST Field -->
                            <div class="addr-text" *ngIf="field.id === 'gst' && settings()?.gstNumber">GST: {{ settings()?.gstNumber }}</div>
                            
                            <!-- Custom Fields -->
                            <div class="addr-text" *ngIf="!field.isBuiltIn && field.key && field.value">
                                <span style="font-weight: 700; color: var(--color-primary); text-transform: uppercase; font-size: 9px;">{{ field.key }}:</span> {{ field.value }}
                            </div>
                        </ng-container>
                    </div>
                </div>

                <!-- To Column -->
                <div class="addr-box text-right">
                    <div class="box-header">Estimate For</div>
                    <div class="addr-name">{{ estimate()!.client?.name || 'Customer' }}</div>
                    <div class="addr-text" *ngIf="estimate()!.client?.address">{{ estimate()!.client?.address }}</div>
                    <div class="addr-text" *ngIf="estimate()!.client?.phone">Tel: {{ estimate()!.client?.phone }}</div>
                    
                    <div class="addr-text" *ngFor="let cf of getParsedCustomFields(estimate()!.client?.customFields)">
                        <span style="font-weight: 700; color: var(--color-primary); text-transform: uppercase; font-size: 9px;">{{ cf.key }}:</span> {{ cf.value }}
                    </div>
                </div>
            </div>

            <!-- Items Table -->
            <div class="table-section">
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
                        <tr *ngFor="let item of estimate()!.items; let i = index" [class.odd]="i % 2 !== 0">
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
                                        <div class="item-title">{{ item.productName || item.product?.name }}</div>
                                    </div>
                                    <div *ngSwitchCase="'quantity'">{{ item.quantity }}</div>
                                    <div *ngSwitchCase="'price'">{{ item.price | number:'1.2-2' }}</div>
                                    <div *ngSwitchCase="'total'" class="font-bold">{{ (item.price * item.quantity) | number:'1.2-2' }}</div>
                                    
                                    <div *ngSwitchDefault>
                                       <span *ngIf="col.isCurrency">₹</span>{{ col.type === 'text' ? getCustomColumnValue(item, col) : (getCustomColumnValue(item, col) | number:(col.isCurrency ? '1.2-2' : '1.0-2')) }}
                                    </div>
                                </ng-container>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Totals / Footer -->
            <div class="totals-container">
                <div class="notes-section">
                     <ng-container *ngIf="settings()?.showTerms">
                        <div class="terms-title">Terms & Conditions</div>
                        <div class="terms-text">{{ settings()?.termsAndConditions }}</div>
                     </ng-container>
                </div>

                <div class="totals-table">
                    <div class="t-row">
                        <span class="label">Subtotal</span>
                        <span class="val">{{ estimate()!.subTotal | number:'1.2-2' }}</span>
                    </div>
                    <div class="t-row text-red" *ngIf="estimate()!.discountAmount > 0">
                        <span class="label">Discount</span>
                        <span class="val">-{{ estimate()!.discountAmount | number:'1.2-2' }}</span>
                    </div>
                    <div class="t-row" *ngIf="estimate()!.gstEnabled">
                        <span class="label">GST ({{ estimate()!.gstRate }})</span>
                        <span class="val">{{ estimate()!.taxTotal | number:'1.2-2' }}</span>
                    </div>
                    
                    <div class="t-row grand-total">
                        <span class="label">Estimated Total</span>
                        <span class="val">₹{{ estimate()!.total | number:'1.2-2' }}</span>
                    </div>

                    <div class="status-pill info">
                        PROVISIONAL QUOTATION
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <footer class="footer">
                <div class="footer-line"></div>
                <div class="footer-text">
                    {{ settings()?.companyName }} • {{ settings()?.companyAddress || 'City, Country' }}<br>
                    Generated on {{ formatDate('now') }}
                </div>
            </footer>
        </div>

        <ng-template #loadingTpl>
            <div class="loading-state">
                <div *ngIf="!loadingTimeout">Preparing Estimate Preview...</div>
                <div *ngIf="loadingTimeout" class="error-message">
                    <p class="font-bold">Loading Timed Out</p>
                    <p class="text-sm mt-1">Could not retrieve estimate data.</p>
                </div>
            </div>
        </ng-template>
    </div>
    `,
    styles: [`
        :host {
            --color-primary: #6366f1; /* Indigo 500 - Lighter than before */
            --color-accent: #a5b4fc;  /* Indigo 300 */
            --color-text: #020617;
            --color-text-light: #475569;
            --color-border: #e2e8f0;
            --color-bg-light: #f5f3ff; /* Violet 50 */
            --color-bg-header: #ede9fe; /* Violet 100 */
            --font-main: 'Inter', 'Helvetica Neue', Arial, sans-serif;
        }

        * { box-sizing: border-box; }

        .print-wrapper {
            background: #64748b;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            padding: 20px;
            font-family: var(--font-main);
        }

        .print-container {
            background: white;
            width: 210mm;
            min-height: 297mm;
            padding: 15mm;
            color: var(--color-text);
            position: relative;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
        }

        .header-bar {
            width: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 3mm;
            border-bottom: 2px solid var(--color-primary);
            padding-bottom: 3mm;
        }

        .company-name {
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            color: var(--color-primary);
            text-transform: uppercase;
            letter-spacing: -0.5px;
            line-height: 1.1;
        }

        .company-tagline {
            font-size: 11px;
            color: var(--color-text-light);
            margin-top: 2px;
            font-weight: 500;
        }

        .doc-type-badge {
            background: var(--color-primary);
            color: white;
            padding: 2mm 4mm;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .info-bar {
            width: 100%;
            background: var(--color-bg-header);
            padding: 3mm 4mm;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 4px;
            margin-bottom: 8mm;
            border: 1px solid var(--color-border);
        }

        .info-item {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }

        .info-item .label {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 800;
            color: var(--color-text-light);
            margin-bottom: 2px;
        }

        .info-item .value {
            font-size: 12px;
            font-weight: 700;
            color: var(--color-text);
        }

        .address-section {
            width: 100%;
            margin-bottom: 8mm;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 1px dashed var(--color-border);
            padding-bottom: 4mm;
        }

        .addr-box { width: 45%; }
        .box-header {
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 800;
            color: var(--color-text-light);
            margin-bottom: 2mm;
            display: block;
        }

        .addr-name {
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 2px;
            color: var(--color-text);
            text-transform: capitalize;
        }

        .addr-text {
            font-size: 11px; 
            color: var(--color-text-light);
            line-height: 1.5;
            font-weight: 500;
        }

        .text-right { text-align: right; }

        .table-section {
            width: 100%;
            margin-bottom: 8mm;
        }

        .data-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            font-size: 11px;
            table-layout: fixed;
        }

        .data-table th {
            padding: 3mm 2mm;
            background: var(--color-bg-header);
            color: var(--color-primary);
            font-weight: 800;
            text-transform: uppercase;
            font-size: 10px;
            border-bottom: 2px solid var(--color-primary);
            text-align: left; /* Default */
        }

        .text-left { text-align: left !important; }
        .text-center { text-align: center !important; }
        .text-right { text-align: right !important; }

        .data-table td {
            padding: 3mm 2mm;
            border-bottom: 1px solid var(--color-border);
            vertical-align: middle;
            color: var(--color-text);
        }

        .data-table tr.odd td { background: var(--color-bg-light); }
        
        .col-desc { width: auto !important; }
        .col-qty { width: 8% !important; }
        .col-price { width: 12% !important; }
        .col-total { width: 15% !important; }
        .col-custom { width: 12% !important; }
        
        .item-title { font-weight: 700; }
        .font-bold { font-weight: 700; }

        .totals-container {
            width: 100%;
            display: flex;
            gap: 10mm;
            margin-bottom: 15mm;
            align-items: flex-start;
        }

        .notes-section { flex: 1; padding-right: 10mm; }

        .terms-title {
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 2mm;
            color: var(--color-primary);
        }

        .terms-text {
            font-size: 10px;
            color: var(--color-text-light);
            line-height: 1.5;
            white-space: pre-wrap;
        }

        .totals-table {
            width: 85mm;
            background: var(--color-bg-light);
            padding: 4mm;
            border-radius: 6px;
            border: 1px solid var(--color-border);
        }

        .t-row {
            display: flex;
            justify-content: space-between;
            padding: 1.5mm 0;
            font-size: 11px;
        }
        
        .t-row:not(:last-child) { border-bottom: 1px dashed var(--color-border); }
        .t-row .label { color: var(--color-text-light); font-weight: 600; }
        .t-row .val { font-weight: 700; }

        .grand-total {
            background: var(--color-primary);
            color: white;
            padding: 2.5mm 3mm;
            margin: 2mm 0; 
            border-radius: 4px;
        }
        .grand-total .label { color: white; }

        .status-pill {
            margin-top: 2mm;
            text-align: center;
            font-size: 10px;
            font-weight: 800;
            padding: 1.5mm;
            border: 1px solid var(--color-border);
            border-radius: 4px;
        }
        .status-pill.info { color: var(--color-primary); background: white; border-color: var(--color-primary); }

        .footer {
            position: absolute;
            bottom: 12mm;
            left: 15mm;
            right: 15mm;
            text-align: center;
        }

        .footer-line {
            height: 2px;
            background: linear-gradient(to right, transparent, var(--color-primary), transparent);
            margin-bottom: 2mm;
            opacity: 0.3;
        }

        .footer-text { font-size: 9px; color: var(--color-text-light); }
        .font-mono { font-family: monospace; }
        
        .loading-state {
            height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; color: white; gap: 1rem;
        }

        @media print {
            .print-wrapper { background: white; padding: 0; display: block; }
            .print-container { 
                width: 100%; 
                margin: 0; 
                box-shadow: none; 
                min-height: auto; 
                padding: 0;
            }
            body { margin: 0; padding: 0; }
            @page { size: A4; margin: 15mm; } 
            .footer { position: static; margin-top: 15mm; }
        }
    `]
})
export class PrintEstimateComponent implements OnInit {
    @Input() id: number | string | null = null;
    @Input() estimateData: any = null;

    estimate = signal<any>(null);
    settings = signal<any>(null);
    loadingTimeout = false;

    columnLabels = computed(() => {
        const est = this.estimate();
        if (!est || !est.columnLabels) return { product: 'Item', quantity: 'Qty', price: 'Rate', total: 'Amount' };
        return typeof est.columnLabels === 'string' ? JSON.parse(est.columnLabels) : est.columnLabels;
    });

    customColumns = computed(() => {
        const est = this.estimate();
        if (!est) return [];

        const builtInDefaults = [
            { id: 'product', isBuiltIn: true },
            { id: 'quantity', isBuiltIn: true },
            { id: 'price', isBuiltIn: true },
            { id: 'total', isBuiltIn: true }
        ];

        if (!est.customColumns) return builtInDefaults;

        try {
            const parsed = typeof est.customColumns === 'string' ? JSON.parse(est.customColumns) : est.customColumns;

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

        this.api.getSettings().subscribe({
            next: (data) => {
                this.settings.set(data);
                this.checkReady();
            },
            error: (err) => {
                console.error('Settings load failed:', err);
                this.checkReady();
            }
        });

        if (this.electron.isElectron()) {
            this.electron.on('init-estimate-data', (event, data) => {
                this.zone.run(() => {
                    this.estimate.set(data);
                    this.cdr.detectChanges();
                    this.checkReady();
                });
            });
            this.electron.send('print-window-ready');
        }

        const b64Data = params.get('estimateData');
        const estimateId = params.get('printEstimateId');

        if (b64Data) {
            try {
                const data = JSON.parse(atob(b64Data));
                this.estimate.set(data);
                this.checkReady();
            } catch (e) {
                console.error('Failed to parse b64Data', e);
            }
        } else if (estimateId) {
            this.api.getEstimateById(Number(estimateId)).subscribe({
                next: (est) => {
                    this.estimate.set(est);
                    this.checkReady();
                },
                error: (err) => {
                    console.error('Estimate Load failed:', err);
                    this.loadingTimeout = true;
                    this.cdr.detectChanges();
                }
            });
        }
    }

    private readySignaled = false;
    checkReady() {
        if (this.estimate() && this.settings() && !this.readySignaled) {
            this.readySignaled = true;
            this.finishHandshake();
        }
    }

    finishHandshake() {
        setTimeout(() => {
            if (this.electron.isElectron()) {
                this.electron.sendReadyToPrint();
            }
        }, 800);
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

    getEstimateNumberDate(d: any): string {
        if (!d) return '';
        const date = new Date(d);
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        return `${year}${month}${day}`;
    }

    formatDate(d: any): string {
        if (!d) return '';
        const date = d === 'now' ? new Date() : new Date(d);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }
}
