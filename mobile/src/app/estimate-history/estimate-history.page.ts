import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ViewDidEnter } from '@ionic/angular';
import { ApiService } from '../services/api.service';
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

    constructor(private api: ApiService, private router: Router) { }

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
}
