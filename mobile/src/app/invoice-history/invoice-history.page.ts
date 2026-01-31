import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ViewDidEnter } from '@ionic/angular';
import { ApiService } from '../services/api.service';
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

    constructor(private api: ApiService, private router: Router) { }

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
}
