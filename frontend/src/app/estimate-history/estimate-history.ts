import { Component, OnInit, signal, computed, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { ElectronService } from '../services/electron.service';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';

@Component({
    selector: 'app-estimate-history',
    imports: [CommonModule, FormsModule, BsDatepickerModule],
    templateUrl: './estimate-history.html',
})
export class EstimateHistory implements OnInit {
    @Output() edit = new EventEmitter<any>();
    @Output() clone = new EventEmitter<any>();
    estimates = signal<any[]>([]);
    searchTerm = signal<string>('');
    startDate = signal<Date | null>(null);
    endDate = signal<Date | null>(null);

    selectedEstimate = signal<any | null>(null);
    pdfSrc = signal<string | null>(null);
    isLoadingPdf = signal<boolean>(false);
    viewMode = signal<'details' | 'pdf'>('details');

    parsedCustomColumns = computed(() => {
        const est = this.selectedEstimate();
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
            if (Array.isArray(parsed) && parsed.length > 0 && parsed.some((c: any) => c.isBuiltIn !== undefined)) {
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
        const est = this.selectedEstimate();
        if (!est || !est.columnLabels) return { product: 'Item', quantity: 'Qty', price: 'Price', total: 'Total' };
        try {
            return JSON.parse(est.columnLabels);
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

    filteredEstimates = computed(() => {
        const term = this.searchTerm().toLowerCase();
        const start = this.startDate();
        const end = this.endDate();

        return this.estimates().filter(est => {
            // Search logic
            const fullEstNumber = `EST-${this.getEstimateNumberDate(est.date)}-${est.id}`.toLowerCase();
            const matchesSearch = !term ||
                est.client?.name?.toLowerCase().includes(term) ||
                est.id.toString().includes(term) ||
                fullEstNumber.includes(term);

            // Date filtering logic
            let matchesDate = true;
            if (start || end) {
                const estDate = new Date(est.date);
                estDate.setHours(0, 0, 0, 0);

                if (start) {
                    const startDateObj = new Date(start);
                    startDateObj.setHours(0, 0, 0, 0);
                    if (estDate < startDateObj) matchesDate = false;
                }
                if (end) {
                    const endDateObj = new Date(end);
                    endDateObj.setHours(0, 0, 0, 0);
                    if (estDate > endDateObj) matchesDate = false;
                }
            }

            return matchesSearch && matchesDate;
        });
    });

    constructor(private api: ApiService, private electron: ElectronService) { }

    ngOnInit() {
        this.loadEstimates();
    }

    loadEstimates() {
        this.api.getEstimates().subscribe({
            next: (data) => {
                // Sort by date desc
                const sorted = data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                this.estimates.set(sorted);
            },
            error: (err) => console.error('Error fetching estimates', err)
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
        const allVisible = this.filteredEstimates().map(i => i.id);

        const allSelected = allVisible.every(id => current.has(id));

        if (allSelected) {
            const next = new Set(current);
            allVisible.forEach(id => next.delete(id));
            this.selectedIds.set(next);
        } else {
            const next = new Set(current);
            allVisible.forEach(id => next.add(id));
            this.selectedIds.set(next);
        }
    }

    isAllSelected() {
        const visible = this.filteredEstimates();
        if (visible.length === 0) return false;
        return visible.every(i => this.selectedIds().has(i.id));
    }

    async deleteSelected() {
        const ids = Array.from(this.selectedIds());
        if (ids.length === 0) return;

        if (!confirm(`Are you sure you want to delete ${ids.length} estimates? This action cannot be undone.`)) {
            return;
        }

        let completed = 0;
        let errors = 0;

        for (const id of ids) {
            this.api.deleteEstimate(id).subscribe({
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
            this.loadEstimates();
            this.selectedIds.set(new Set());
            if (errors > 0) {
                alert(`Deleted ${completed} estimates. ${errors} failed.`);
            } else {
                alert(`Successfully deleted ${completed} estimates.`);
            }
        }
    }

    deleteEstimate(estimate: any) {
        if (!confirm(`Are you sure you want to delete Estimate #${estimate.id}? This action cannot be undone.`)) {
            return;
        }

        this.api.deleteEstimate(estimate.id).subscribe({
            next: () => {
                this.loadEstimates();
                if (this.selectedEstimate()?.id === estimate.id) {
                    this.selectedEstimate.set(null);
                }
                alert('Estimate deleted successfully!');
            },
            error: (err) => alert('Error deleting estimate: ' + err.message)
        });
    }

    onSearch(term: string) {
        this.searchTerm.set(term);
    }

    // Row Click - View Details (HTML)
    viewEstimate(estimate: any) {
        console.log('EstimateHistory: viewEstimate called');
        this.selectedEstimate.set(estimate);
        this.viewMode.set('details');
    }

    // Print Icon Click - View PDF (New Window)
    async openPdfPreview(estimate: any, event?: Event) {
        if (event) event.stopPropagation();

        this.isLoadingPdf.set(true);

        try {
            if (this.electron.isElectron()) {
                const base64 = await this.electron.previewEstimate(estimate);

                if (base64 && base64.length > 0) {
                    const byteCharacters = atob(base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);

                    // Open in new window
                    window.open(url, '_blank', 'height=800,width=1200,frame=true,titleBarStyle=default');
                } else {
                    throw new Error('PDF generation returned empty data');
                }
            } else {
                alert('PDF Preview is only available in Electron.');
            }
        } catch (e) {
            console.error('Error:', e);
            alert(`Could not load PDF preview: ${e instanceof Error ? e.message : 'Unknown error'}`);
        } finally {
            this.isLoadingPdf.set(false);
        }
    }

    closeView() {
        this.selectedEstimate.set(null);
        if (this.pdfSrc()) {
            URL.revokeObjectURL(this.pdfSrc()!);
            this.pdfSrc.set(null);
        }
    }

    // Print Mode
    async printEstimate(estimate: any, event?: Event) {
        if (event) event.stopPropagation();

        if (this.electron.isElectron()) {
            await this.electron.printEstimate(estimate);
        } else {
            alert('Printing is only supported in the Desktop application.');
        }
    }

    async openWhatsApp(estimate: any, event?: Event) {
        if (event) event.stopPropagation();

        const clientName = estimate.client?.name || 'Customer';
        const estNo = `EST-${this.getEstimateNumberDate(estimate.date)}-${estimate.id}`;
        const total = estimate.total.toFixed(2);

        const message = `Hello ${clientName}, Your estimate ${estNo} for ₹${total} is generated.`;

        try {
            await navigator.clipboard.writeText(message);

            if (this.electron.isElectron()) {
                await this.electron.saveEstimatePdf(estimate);
                alert(`Estimate PDF Saved to Downloads and opened.\nMessage copied.\n\nSelect contact, Paste message, Attach file.`);
            } else {
                alert('Message copied! (PDF saving is Electron only)');
            }

            this.electron.openExternal('whatsapp://');
        } catch (err) {
            console.error('Error in WhatsApp share:', err);
            alert('Failed to perform WhatsApp share actions.');
        }
    }

    onEdit(estimate: any, event?: Event) {
        console.log('EstimateHistory: onEdit called', { event });
        if (event) {
            console.log('EstimateHistory: stopping propagation');
            event.stopPropagation();
        }
        this.edit.emit(estimate);
    }

    onClone(estimate: any, event?: Event) {
        if (event) event.stopPropagation();
        this.clone.emit(estimate);
    }

    // Helpers for template
    getEstimateNumberDate(dateStr: string): string {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = ('0' + (d.getMonth() + 1)).slice(-2);
        const day = ('0' + d.getDate()).slice(-2);
        return `${year}${month}${day}`;
    }
}
