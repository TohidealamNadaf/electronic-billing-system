import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ViewDidEnter } from '@ionic/angular';
import { ApiService } from '../services/api.service';
import { PdfService } from '../services/pdf.service';
import { Router, RouterModule } from '@angular/router';

@Component({
    selector: 'app-invoice-history',
    templateUrl: './invoice-history.page.html',
    styleUrls: ['./invoice-history.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class InvoiceHistoryPage implements ViewDidEnter {
    invoices = signal<any[]>([]);
    isLoading = signal(false);

    // Filters
    searchTerm = signal('');
    startDate = signal<string | null>(null);
    endDate = signal<string | null>(null);
    showFilters = signal(false);

    // Bulk Actions
    selectionMode = signal(false);
    selectedIds = signal<Set<number>>(new Set());

    // View Modal
    selectedInvoice = signal<any | null>(null);

    parsedCustomColumns = computed(() => {
        const inv = this.selectedInvoice();
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
            if (Array.isArray(parsed) && parsed.length > 0 && parsed.some((c: any) => c.isBuiltIn !== undefined)) {
                return parsed.map((c: any) => ({
                    ...c,
                    name: c.isBuiltIn ? '' : (c.name || ''),
                    type: c.isBuiltIn ? '' : (c.type || 'calculated'),
                    isCurrency: c.isCurrency !== undefined ? c.isCurrency : true
                }));
            }
            return [...builtInDefaults.slice(0, 3), ...parsed.map((c: any) => ({ ...c, isBuiltIn: false })), builtInDefaults[3]];
        } catch (e) {
            return builtInDefaults;
        }
    });

    parsedColumnLabels = computed(() => {
        const inv = this.selectedInvoice();
        if (!inv || !inv.columnLabels) return { product: 'Item', quantity: 'Qty', price: 'Price', total: 'Total' };
        try {
            return JSON.parse(inv.columnLabels);
        } catch (e) {
            return { product: 'Item', quantity: 'Qty', price: 'Price', total: 'Total' };
        }
    });

    filteredInvoices = computed(() => {
        let items = this.invoices();
        const term = this.searchTerm().toLowerCase();
        const start = this.startDate() ? new Date(this.startDate()!) : null;
        const end = this.endDate() ? new Date(this.endDate()!) : null;

        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        return items.filter(inv => {
            const matchesTerm = !term ||
                (inv.client?.name || '').toLowerCase().includes(term) ||
                String(inv.id).includes(term);

            const invDate = new Date(inv.date);
            const matchesDate = (!start || invDate >= start) && (!end || invDate <= end);

            return matchesTerm && matchesDate;
        });
    });

    totalRevenue = computed(() => {
        return this.filteredInvoices().reduce((acc, inv) => acc + (inv.total || 0), 0);
    });

    hasDateFilter = computed(() => !!this.startDate() || !!this.endDate());

    constructor(private api: ApiService, private router: Router, private pdfService: PdfService) { }

    ionViewDidEnter() {
        this.loadInvoices();
        this.selectionMode.set(false);
        this.selectedIds.set(new Set());
    }

    loadInvoices() {
        this.isLoading.set(true);
        this.api.getInvoices().subscribe({
            next: (data) => {
                this.invoices.set(data);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    editInvoice(invoice: any) {
        if (this.selectionMode()) return;
        this.api.invoiceToEdit.set(invoice);
        this.router.navigate(['/invoice-entry']);
    }

    deleteInvoice(id: number) {
        if (confirm('Are you sure you want to delete this invoice?')) {
            this.api.deleteInvoice(id).subscribe(() => this.loadInvoices());
        }
    }

    // Bulk Actions Logic
    toggleSelectionMode() {
        this.selectionMode.update(v => !v);
        if (!this.selectionMode()) {
            this.selectedIds.set(new Set());
        }
    }

    toggleSelection(id: number) {
        this.selectedIds.update(ids => {
            const newIds = new Set(ids);
            if (newIds.has(id)) newIds.delete(id);
            else newIds.add(id);
            return newIds;
        });
    }

    selectAll() {
        const allIds = this.filteredInvoices().map(inv => inv.id);
        this.selectedIds.set(new Set(allIds));
    }

    deleteSelected() {
        const ids = Array.from(this.selectedIds());
        if (ids.length === 0) return;

        if (confirm(`Delete ${ids.length} selected invoices?`)) {
            let deleted = 0;
            // Simple parallel delete for now (SQLite handles concurrency well enough for small batches)
            // Ideally backend should have bulk delete endpoint
            ids.forEach(id => {
                this.api.deleteInvoice(id).subscribe(() => {
                    deleted++;
                    if (deleted === ids.length) {
                        this.loadInvoices();
                        this.selectionMode.set(false);
                        this.selectedIds.set(new Set());
                    }
                });
            });
        }
    }

    getStatusColor(status: string): string {
        switch ((status || '').toLowerCase()) {
            case 'paid': return 'success';
            case 'partially paid': return 'warning';
            default: return 'medium'; // Changed from danger to medium for pending default visual
        }
    }

    viewInvoice(invoice: any) {
        if (this.selectionMode()) {
            this.toggleSelection(invoice.id);
        } else {
            this.selectedInvoice.set(invoice);
        }
    }

    closeView() {
        this.selectedInvoice.set(null);
    }

    getCustomValue(item: any, col: any): any {
        if (col.id === 'total') return item.price * item.quantity;
        if (col.id === 'product' || col.id === 'quantity' || col.id === 'price') return '';

        let values = item.customValues;
        if (typeof values === 'string') {
            try { values = JSON.parse(values); } catch (e) { values = {}; }
        } else if (!values) {
            values = {};
        }

        if (col.type === 'calculated') {
            return this.evaluateFormula(col.formula, item.price, item.quantity);
        }
        return values[col.name] || (col.type === 'number' ? 0 : '');
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

    async openPdfPreview(invoice: any) {
        // Construct pdfData with client name if missing
        const pdfData = {
            ...invoice,
            client: invoice.client || { name: 'Client' }
        };
        // Retrieve settings (assuming settings signals or service access if needed, 
        // but here we might need to fetch settings or assume defaults. 
        // For history, likely need to inject PdfService and ApiService properly if not present)
        // Wait, ApiService is injected. Does it have settings? 
        // InvoiceHistoryPage usually fetches data. 
        // Let's assume we can fetch settings or use a simple object if not loaded.
        // Actually, PdfService needs settings. 
        // Let's modify to fetch settings if strictly needed, but PdfService might handle defaults.
        // Checking InvoiceHistoryPage imports... it has ApiService.
        // I'll assume settings are not stored in a signal here. 
        // I will add settings fetching or pass empty object if PdfService can handle it.
        // PdfService uses settings for company info. This is important.
        // I'll grab settings from ApiService.
        this.api.getSettings().subscribe(settings => {
            this.pdfService.generateInvoicePdf(pdfData, settings);
        });
    }

    getInvoiceNumberDate(dateStr: string): string {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = ('0' + (d.getMonth() + 1)).slice(-2);
        const day = ('0' + d.getDate()).slice(-2);
        return `${year}${month}${day}`;
    }
}
