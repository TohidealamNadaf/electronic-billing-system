import { Component, OnInit, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { ElectronService } from '../services/electron.service';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';

@Component({
    selector: 'app-invoice-history',
    imports: [CommonModule, FormsModule, BsDatepickerModule],
    templateUrl: './invoice-history.html',
})
export class InvoiceHistoryComponent implements OnInit {
    @Output() edit = new EventEmitter<any>();
    @Output() clone = new EventEmitter<any>();
    invoices = signal<any[]>([]);
    searchTerm = signal<string>('');
    startDate = signal<Date | null>(null);
    endDate = signal<Date | null>(null);

    selectedInvoice = signal<any | null>(null);
    pdfSrc = signal<string | null>(null);
    isLoadingPdf = signal<boolean>(false);
    viewMode = signal<'details' | 'pdf'>('details');

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

    parsedColumnLabels = computed(() => {
        const inv = this.selectedInvoice();
        if (!inv || !inv.columnLabels) return { product: 'Item', quantity: 'Qty', price: 'Price', total: 'Total' };
        try {
            return JSON.parse(inv.columnLabels);
        } catch (e) {
            return { product: 'Item', quantity: 'Qty', price: 'Price', total: 'Total' };
        }
    });

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

    filteredInvoices = computed(() => {
        const term = this.searchTerm().toLowerCase();
        const start = this.startDate();
        const end = this.endDate();

        return this.invoices().filter(inv => {
            // Search logic
            const fullInvNumber = `INV-${this.getInvoiceNumberDate(inv.date)}-${inv.id}`.toLowerCase();
            const matchesSearch = !term ||
                inv.client?.name?.toLowerCase().includes(term) ||
                inv.id.toString().includes(term) ||
                fullInvNumber.includes(term);

            // Date filtering logic
            let matchesDate = true;
            if (start || end) {
                const invDate = new Date(inv.date);
                invDate.setHours(0, 0, 0, 0);

                if (start) {
                    const startDateObj = new Date(start);
                    startDateObj.setHours(0, 0, 0, 0);
                    if (invDate < startDateObj) matchesDate = false;
                }
                if (end) {
                    const endDateObj = new Date(end);
                    endDateObj.setHours(0, 0, 0, 0);
                    if (invDate > endDateObj) matchesDate = false;
                }
            }

            return matchesSearch && matchesDate;
        });
    });

    constructor(private api: ApiService, private electron: ElectronService) { }

    ngOnInit() {
        this.loadInvoices();
    }

    loadInvoices() {
        this.api.getInvoices().subscribe({
            next: (data) => {
                // Sort by date desc
                const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                this.invoices.set(sorted);
            },
            error: (err) => console.error('Error fetching invoices', err)
        });
    }

    // Selection Logic
    selectedIds = signal<Set<number>>(new Set());

    toggleSelection(id: number, event?: Event) {
        if (event) event.stopPropagation();
        const current = new Set(this.selectedIds());
        if (current.has(id)) {
            current.delete(id);
        } else {
            current.add(id);
        }
        this.selectedIds.set(current);
    }

    toggleAll(event?: Event) {
        if (event) event.stopPropagation();
        const current = this.selectedIds();
        const allVisible = this.filteredInvoices().map(i => i.id);

        // If all visible are selected, clear selection. Otherwise select all visible.
        const allSelected = allVisible.every(id => current.has(id));

        if (allSelected) {
            // Deselect all visible
            const next = new Set(current);
            allVisible.forEach(id => next.delete(id));
            this.selectedIds.set(next);
        } else {
            // Select all visible
            const next = new Set(current);
            allVisible.forEach(id => next.add(id));
            this.selectedIds.set(next);
        }
    }

    isAllSelected() {
        const visible = this.filteredInvoices();
        if (visible.length === 0) return false;
        return visible.every(i => this.selectedIds().has(i.id));
    }

    async deleteSelected() {
        const ids = Array.from(this.selectedIds());
        if (ids.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${ids.length} invoices? This action cannot be undone.`)) {
            return;
        }

        // Execute deletions in parallel
        // We use a simple loop or Promise.all. ApiService observable needs to be converted or subscribed.
        // Better to use Promise.all with firstValueFrom if standard HttpClient, but here strict subscribe is common.
        // Let's use a counter for simplicity as standard Angular HttpClient returns cold observables.

        let completed = 0;
        let errors = 0;

        for (const id of ids) {
            this.api.deleteInvoice(id).subscribe({
                next: () => {
                    completed++;
                    this.checkBulkDeleteComplete(ids.length, completed, errors);
                },
                error: () => {
                    errors++;
                    this.checkBulkDeleteComplete(ids.length, completed, errors);
                }
            });
        }
    }

    checkBulkDeleteComplete(total: number, completed: number, errors: number) {
        if (completed + errors === total) {
            this.loadInvoices();
            this.selectedIds.set(new Set());
            if (errors > 0) {
                alert(`Deleted ${completed} invoices. ${errors} failed.`);
            } else {
                alert(`Successfully deleted ${completed} invoices.`);
            }
        }
    }

    deleteInvoice(invoice: any) {
        if (!confirm(`Are you sure you want to delete Invoice #${invoice.invoiceNumber || invoice.id}? This action cannot be undone.`)) {
            return;
        }

        this.api.deleteInvoice(invoice.id).subscribe({
            next: () => {
                this.loadInvoices();
                // Remove from selection if present
                const current = new Set(this.selectedIds());
                if (current.has(invoice.id)) {
                    current.delete(invoice.id);
                    this.selectedIds.set(current);
                }

                if (this.selectedInvoice()?.id === invoice.id) {
                    this.selectedInvoice.set(null);
                }
                alert('Invoice deleted successfully!');
            },
            error: (err) => alert('Error deleting invoice: ' + err.message)
        });
    }

    onSearch(term: string) {
        this.searchTerm.set(term);
    }

    // Row Click - View Details (HTML)
    viewInvoice(invoice: any) {
        console.log('InvoiceHistory: viewInvoice called');
        this.selectedInvoice.set(invoice);
        this.viewMode.set('details');
    }

    // Print Icon Click - View PDF (New Window)
    async openPdfPreview(invoice: any, event?: Event) {
        if (event) event.stopPropagation();

        this.isLoadingPdf.set(true);

        try {
            if (this.electron.isElectron()) {
                console.log('=== PDF PREVIEW (NEW WINDOW) STARTED ===');
                const base64 = await this.electron.previewInvoice(invoice);

                if (base64 && base64.length > 0) {
                    const byteCharacters = atob(base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);

                    // Open in new window (Native Behavior)
                    window.open(url, '_blank', 'height=800,width=1200,frame=true,titleBarStyle=default');

                    console.log('=== PDF WINDOW OPENED ===');
                } else {
                    throw new Error('PDF generation returned empty data');
                }
            } else {
                alert('PDF Preview is only available in Electron.');
            }
        } catch (e) {
            console.error('=== PDF PREVIEW FAILED ===');
            console.error('Error:', e);
            alert(`Could not load PDF preview: ${e instanceof Error ? e.message : 'Unknown error'}`);
        } finally {
            this.isLoadingPdf.set(false);
        }
    }

    closeView() {
        this.selectedInvoice.set(null);
        if (this.pdfSrc()) {
            URL.revokeObjectURL(this.pdfSrc()!);
            this.pdfSrc.set(null);
        }
    }

    // Print Mode
    async printInvoice(invoice: any, event?: Event) {
        if (event) event.stopPropagation();

        if (this.electron.isElectron()) {
            await this.electron.printInvoice(invoice);
        } else {
            alert('Printing is only supported in the Desktop application.');
        }
    }

    onEdit(invoice: any, event?: Event) {
        console.log('InvoiceHistory: onEdit called', { event });
        if (event) {
            console.log('InvoiceHistory: stopping propagation');
            event.stopPropagation();
        }
        this.edit.emit(invoice);
    }

    onClone(invoice: any, event?: Event) {
        if (event) event.stopPropagation();
        this.clone.emit(invoice);
    }

    async openWhatsApp(invoice: any, event?: Event) {
        if (event) event.stopPropagation();
        const clientName = invoice.client?.name || 'Customer';
        const invNo = `INV-${this.getInvoiceNumberDate(invoice.date)}-${invoice.id}`;
        const total = invoice.total.toFixed(2);

        const message = `Hello ${clientName}, Your invoice ${invNo} for ₹${total} is generated.`;

        try {
            await navigator.clipboard.writeText(message);

            if (this.electron.isElectron()) {
                await this.electron.saveInvoicePdf(invoice);
                alert(`PDF Saved to Downloads and opened.\nMessage copied to clipboard.\n\nNow select contact in WhatsApp, Paste message, and Drag file.`);
            } else {
                alert('Message copied! (PDF saving is Electron only)');
            }
            this.electron.openExternal('whatsapp://');

        } catch (err) {
            console.error('Error in WhatsApp share:', err);
            alert('Failed to perform WhatsApp share actions.');
        }
    }

    // Helpers for template
    getInvoiceNumberDate(dateStr: string): string {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = ('0' + (d.getMonth() + 1)).slice(-2);
        const day = ('0' + d.getDate()).slice(-2);
        return `${year}${month}${day}`;
    }
}
