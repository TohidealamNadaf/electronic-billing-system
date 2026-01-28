import { Component, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InvoiceEntry } from './invoice-entry/invoice-entry';
import { ClientManagement } from './client-management/client-management';
import { ProductManagement } from './product-management/product-management';
import { EstimateEntry } from './estimate-entry/estimate-entry';
import { EstimateHistory } from './estimate-history/estimate-history';
import { InvoiceHistoryComponent } from './invoice-history/invoice-history';
import { PrintInvoiceComponent } from './print-invoice/print-invoice.component';
import { PrintEstimateComponent } from './print-estimate/print-estimate.component';
import { SettingsComponent } from './settings/settings';
import { ApiService } from './services/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, InvoiceEntry, EstimateEntry, ClientManagement, ProductManagement, InvoiceHistoryComponent, EstimateHistory, PrintInvoiceComponent, PrintEstimateComponent, SettingsComponent],
  templateUrl: './app.html',
  styles: [`
    .sidebar-transition {
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .sidebar-closed {
      width: 3.5rem !important; /* w-14 */
    }
    .sidebar-closed .nav-text,
    .sidebar-closed .nav-category,
    .sidebar-closed .footer-info {
        display: none;
    }
    .sidebar-closed .nav-btn {
        justify-content: center;
        padding-left: 0;
        padding-right: 0;
    }
    aside {
      overflow-x: hidden;
      white-space: nowrap;
    }
    /* Ensure content inside sidebar doesn't shrink awkwardly */
    aside > * {
      min-width: 3.5rem; 
    }
  `]
})
export class App implements OnInit {
  @ViewChild(InvoiceEntry) invoiceEntry!: InvoiceEntry;
  @ViewChild(EstimateEntry) estimateEntry!: EstimateEntry;
  today = new Date();
  formattedDate = this.today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  activeTab = signal<'invoice' | 'estimate' | 'history' | 'estimate-history' | 'clients' | 'products' | 'settings'>('invoice');
  isSidebarClosed = signal(false);

  // Invoice Print Mode
  printModeId = signal<number | null>(null);
  printModeData = signal<any>(null);

  // Estimate Print Mode
  printEstimateModeId = signal<number | null>(null);
  printEstimateModeData = signal<any>(null);

  constructor(private api: ApiService) { }

  ngOnInit() {
    const params = new URLSearchParams(window.location.search);

    // Detect Invoice Print
    const printId = params.get('printInvoiceId');
    const invoiceDataB64 = params.get('invoiceData');

    if (printId) {
      this.printModeId.set(+printId);
    }
    if (invoiceDataB64) {
      try {
        this.printModeData.set(JSON.parse(atob(invoiceDataB64)));
      } catch (e) { }
    }

    // Detect Estimate Print
    const estPrintId = params.get('printEstimateId');
    const estimateDataB64 = params.get('estimateData');

    if (estPrintId) {
      this.printEstimateModeId.set(+estPrintId);
    }
    if (estimateDataB64) {
      try {
        this.printEstimateModeData.set(JSON.parse(atob(estimateDataB64)));
      } catch (e) { }
    }
  }

  switchTab(tab: 'invoice' | 'estimate' | 'history' | 'estimate-history' | 'clients' | 'products' | 'settings') {
    this.activeTab.set(tab);
  }

  onEditInvoice(invoice: any) {
    console.log('App: onEditInvoice called', invoice.id);
    this.api.invoiceToEdit.set(invoice);
    this.switchTab('invoice');
  }

  onCloneInvoice(invoice: any) {
    console.log('App: onCloneInvoice called', invoice.id);
    this.api.invoiceToClone.set(invoice);
    this.switchTab('invoice');
  }

  onEditEstimate(estimate: any) {
    console.log('App: onEditEstimate called', estimate.id);
    this.api.estimateToEdit.set(estimate);
    this.switchTab('estimate');
  }

  onCloneEstimate(estimate: any) {
    console.log('App: onCloneEstimate called', estimate.id);
    this.api.estimateToClone.set(estimate);
    this.switchTab('estimate');
  }
}
