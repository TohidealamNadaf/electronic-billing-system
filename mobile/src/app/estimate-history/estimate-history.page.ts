import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ViewDidEnter } from '@ionic/angular';
import { ApiService } from '../services/api.service';
import { PdfService } from '../services/pdf.service';
import { Router, RouterModule } from '@angular/router';

@Component({
    selector: 'app-estimate-history',
    templateUrl: './estimate-history.page.html',
    styleUrls: ['./estimate-history.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule, RouterModule]
})
export class EstimateHistoryPage implements ViewDidEnter {
    estimates = signal<any[]>([]);
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
    selectedEstimate = signal<any | null>(null);

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

    filteredEstimates = computed(() => {
        let items = this.estimates();
        const term = this.searchTerm().toLowerCase();
        const start = this.startDate() ? new Date(this.startDate()!) : null;
        const end = this.endDate() ? new Date(this.endDate()!) : null;

        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        return items.filter(est => {
            const matchesTerm = !term ||
                (est.client?.name || '').toLowerCase().includes(term) ||
                String(est.id).includes(term);

            const itemDate = new Date(est.date);
            const matchesDate = (!start || itemDate >= start) && (!end || itemDate <= end);

            return matchesTerm && matchesDate;
        });
    });

    totalRevenue = computed(() => {
        return this.filteredEstimates().reduce((acc, est) => acc + (est.total || 0), 0);
    });

    hasDateFilter = computed(() => !!this.startDate() || !!this.endDate());

    constructor(private api: ApiService, private router: Router, private pdfService: PdfService) { }

    ionViewDidEnter() {
        this.loadEstimates();
        this.selectionMode.set(false);
        this.selectedIds.set(new Set());
    }

    loadEstimates() {
        this.isLoading.set(true);
        this.api.getEstimates().subscribe({
            next: (data) => {
                this.estimates.set(data);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    editEstimate(estimate: any) {
        if (this.selectionMode()) return;
        this.api.estimateToEdit.set(estimate);
        this.router.navigate(['/estimate-entry']);
    }

    deleteEstimate(id: number) {
        if (confirm('Are you sure you want to delete this estimate?')) {
            this.api.deleteEstimate(id).subscribe(() => this.loadEstimates());
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
        const allIds = this.filteredEstimates().map(est => est.id);
        this.selectedIds.set(new Set(allIds));
    }

    deleteSelected() {
        const ids = Array.from(this.selectedIds());
        if (ids.length === 0) return;

        if (confirm(`Delete ${ids.length} selected estimates?`)) {
            let deleted = 0;
            ids.forEach(id => {
                this.api.deleteEstimate(id).subscribe(() => {
                    deleted++;
                    if (deleted === ids.length) {
                        this.loadEstimates();
                        this.selectionMode.set(false);
                        this.selectedIds.set(new Set());
                    }
                });
            });
        }
    }
    // View Modal Logic
    viewEstimate(estimate: any) {
        if (this.selectionMode()) {
            this.toggleSelection(estimate.id);
        } else {
            this.selectedEstimate.set(estimate);
        }
    }

    closeView() {
        this.selectedEstimate.set(null);
    }

    getCustomValue(item: any, col: any): any {
        if (col.id === 'total') return item.total;
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

    async openPdfPreview(estimate: any) {
        const pdfData = {
            ...estimate,
            client: estimate.client || { name: 'Client' }
        };
        this.api.getSettings().subscribe(settings => {
            this.pdfService.generateEstimatePdf(pdfData, settings);
        });
    }
}
