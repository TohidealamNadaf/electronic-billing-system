import { Component, OnInit, signal } from '@angular/core';
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

    constructor(private api: ApiService, private router: Router) { }

    ionViewDidEnter() {
        this.loadInvoices();
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
        this.api.invoiceToEdit.set(invoice);
        this.router.navigate(['/invoice-entry']);
    }

    deleteInvoice(id: number) {
        if (confirm('Are you sure you want to delete this invoice?')) {
            this.api.deleteInvoice(id).subscribe(() => this.loadInvoices());
        }
    }

    getStatusColor(status: string): string {
        switch ((status || '').toLowerCase()) {
            case 'paid': return 'success';
            case 'partially paid': return 'warning';
            default: return 'danger';
        }
    }
}
