import { Component, OnInit, signal, computed, ChangeDetectionStrategy, effect, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { ElectronService } from '../services/electron.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';

interface InvoiceItemRow {
  productId: number | string | null;
  productName?: string;
  quantity: number;
  price: number;
  total: number;
  customValues: { [key: string]: any };
}

interface PaymentRecord {
  date: Date;
  amount: number;
  note?: string;
}

@Component({
  selector: 'app-invoice-entry',
  imports: [CommonModule, FormsModule, NgSelectModule, BsDatepickerModule],
  templateUrl: './invoice-entry.html',
  styleUrl: './invoice-entry.scss',
})
export class InvoiceEntry implements OnInit {
  clients = signal<any[]>([]);
  products = signal<any[]>([]);

  selectedClientId = signal<number | null>(null);
  invoiceDate = signal<Date>(new Date());

  items = signal<InvoiceItemRow[]>([]);
  settings = signal<any>(null);

  discountAmount = signal(0);
  payments = signal<PaymentRecord[]>([]);

  // Toggle for Installment vs Simple Advance
  isInstallmentMode = signal(false);
  advanceAmount = signal(0);
  simpleModeStatus = signal('Pending');

  // Computed total paid depending on mode
  paidAmount = computed(() => {
    if (this.isInstallmentMode()) {
      return this.payments().reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    } else {
      return this.advanceAmount();
    }
  });

  paymentStatus = computed(() => {
    // 1. If paying > 0 (either via Installments or Advance), Auto-Calculate
    if (this.paidAmount() > 0) {
      const balance = this.balanceAmount();
      // Small epsilon for float logic
      if (balance <= 0.01) return 'Paid';
      return 'Partially Paid';
    }

    // 2. If Paid is 0...
    if (this.isInstallmentMode()) {
      // Installment mode with 0 payments is Pending
      return 'Pending';
    } else {
      // Simple mode with 0 Advance is Manual Status
      return this.simpleModeStatus();
    }
  });

  triggerPaymentUpdate() {
    this.payments.update(p => [...p]);
  }

  showPaymentOnPdf = signal(true);
  editInvoiceId = signal<number | null>(null);

  // Preview Signals
  selectedInvoice = signal<any | null>(null);
  pdfSrc = signal<string | null>(null);
  isLoadingPdf = signal<boolean>(false);
  viewMode = signal<'details' | 'pdf'>('details');

  parsedCustomColumns = computed(() => {
    const inv = this.selectedInvoice();
    if (!inv) return this.customColumns();

    const builtInDefaults = [
      { id: 'product', isBuiltIn: true },
      { id: 'quantity', isBuiltIn: true },
      { id: 'price', isBuiltIn: true },
      { id: 'total', isBuiltIn: true }
    ];

    if (!inv.customColumns) return builtInDefaults;

    try {
      const parsed = typeof inv.customColumns === 'string' ? JSON.parse(inv.customColumns) : inv.customColumns;

      // If it's the new unified format
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
    const inv = this.selectedInvoice();
    const defaults = { product: 'Item', quantity: 'Qty', price: 'Price', total: 'Total' };
    if (!inv || !inv.columnLabels) return defaults;
    try {
      return typeof inv.columnLabels === 'string' ? JSON.parse(inv.columnLabels) : inv.columnLabels;
    } catch (e) {
      return defaults;
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

  // Custom Name Modal State
  editNameState = signal({ isOpen: false, index: -1, name: '' });
  @ViewChild('nameInput') nameInputRef!: ElementRef<HTMLInputElement>;

  openNameEdit(index: number, name: string) {
    this.editNameState.set({ isOpen: true, index, name });
    setTimeout(() => this.nameInputRef?.nativeElement?.focus(), 50);
  }

  closeNameEdit() {
    this.editNameState.set({ isOpen: false, index: -1, name: '' });
  }

  saveCustomName() {
    const { index, name } = this.editNameState();
    if (index !== -1) {
      this.items.update(items => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], productName: name };
        return newItems;
      });
    }
    this.closeNameEdit();
  }

  updateCustomName(name: string) {
    this.editNameState.update(s => ({ ...s, name }));
  }

  columnLabels = computed(() => {
    const s = this.settings();
    if (!s || !s.columnLabels) return { product: 'Description', quantity: 'Qty', price: 'Unit Price', total: 'Total' };
    return JSON.parse(s.columnLabels);
  });

  customColumns = computed(() => {
    const s = this.settings();
    if (!s) return [];

    const builtInDefaults = [
      { id: 'product', isBuiltIn: true },
      { id: 'quantity', isBuiltIn: true },
      { id: 'price', isBuiltIn: true },
      { id: 'total', isBuiltIn: true }
    ];

    if (!s.customColumns) return builtInDefaults;

    try {
      const parsed = typeof s.customColumns === 'string' ? JSON.parse(s.customColumns) : s.customColumns;

      // If it's the new unified format
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

  evaluateFormula(formula: string, price: number, qty: number): number {
    try {
      // Basic math evaluator (safe subset of JS)
      const cleanFormula = formula
        .replace(/price/g, String(price))
        .replace(/qty/g, String(qty))
        .replace(/[^0-9+\-*/().]/g, ''); // Sanitize

      return (new Function('return ' + cleanFormula))() || 0;
    } catch (e) {
      return 0;
    }
  }

  getCustomColumnValue(item: InvoiceItemRow, col: any): any {
    if (col.id === 'total') return item.total;
    if (col.id === 'product' || col.id === 'quantity' || col.id === 'price') return '';

    if (col.type === 'calculated') {
      return this.evaluateFormula(col.formula, item.price, item.quantity);
    }
    return item.customValues[col.name] || (col.type === 'number' ? 0 : '');
  }

  subTotal = computed(() => {
    const baseTotal = this.items().reduce((acc, item) => acc + item.total, 0);
    const customExtras = this.items().reduce((acc, item) => {
      const extraRows = this.customColumns()
        .filter((col: any) => !col.isBuiltIn && col.type === 'calculated')
        .reduce((cAcc: number, col: any) => cAcc + this.getCustomColumnValue(item, col), 0);
      return acc + extraRows;
    }, 0);
    return baseTotal + customExtras;
  });

  taxTotal = computed(() => {
    if (!this.settings()?.isGstEnabled) return 0;
    const rate = parseFloat(this.settings()?.gstRate) || 0;
    const taxableAmount = this.subTotal() - this.discountAmount();
    return (taxableAmount * rate) / 100;
  });

  grandTotal = computed(() => {
    return (this.subTotal() - this.discountAmount()) + this.taxTotal();
  });

  balanceAmount = computed(() => {
    return this.grandTotal() - this.paidAmount();
  });

  selectedClient = computed(() => {
    const id = this.selectedClientId();
    if (!id) return null;
    return this.clients().find(c => c.id == id);
  });

  getParsedCustomFields(jsonStr: string): any[] {
    if (!jsonStr) return [];
    try {
      const parsed = JSON.parse(jsonStr);
      return parsed.fields || [];
    } catch (e) {
      return [];
    }
  }

  constructor(private api: ApiService, private electron: ElectronService) {
    effect(() => {
      const inv = this.api.invoiceToEdit();
      if (inv) {
        this.loadInvoiceForEdit(inv);
        this.api.invoiceToEdit.set(null); // Clear it
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const inv = this.api.invoiceToClone();
      if (inv) {
        this.loadInvoiceForClone(inv);
        this.api.invoiceToClone.set(null); // Clear it
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.api.getClients().subscribe(data => this.clients.set(data));
    this.api.getProducts().subscribe(data => this.products.set(data));
    this.api.getSettings().subscribe(data => this.settings.set(data));
  }

  addItem() {
    this.items.update(items => [
      ...items,
      { productId: 0, quantity: 1, price: 0, total: 0, customValues: {} }
    ]);
  }

  removeItem(index: number) {
    this.items.update(items => items.filter((_, i) => i !== index));
  }

  resetItem(index: number) {
    this.items.update(items => {
      const newItems = [...items];
      newItems[index] = { productId: 0, quantity: 1, price: 0, total: 0, customValues: {} };
      return newItems;
    });
  }

  getProductSelection(val: number | string | null): any {
    // Helper to resolve selection for ng-select
    if (typeof val === 'number') {
      return this.products().find(p => p.id === val);
    }
    return val;
  }

  onProductChange(index: number, val: any) {
    console.log('onProductChange:', { index, val, type: typeof val });

    // 1. Handle Null/Undefined/Empty
    if (val === null || val === undefined) {
      // Reset Item
      this.items.update(items => {
        const newItems = [...items];
        newItems[index] = { productId: null, quantity: 1, price: 0, total: 0, customValues: {} };
        return newItems;
      });
      return;
    }

    // 2. Handle String (Custom Tag)
    if (typeof val === 'string') {
      this.items.update(items => {
        const newItems = [...items];
        newItems[index] = {
          ...newItems[index],
          productId: val,
          productName: val,
          price: 0,
          total: 0,
          customValues: newItems[index].customValues || {}
        };
        return newItems;
      });
      return;
    }

    // 3. Handle Object (Existing Product OR Custom Object)
    if (typeof val === 'object') {
      // Prefer ID if available (and not null/undefined). Acceptance of 0 depends on if products have ID 0.
      // Usually IDs are > 0. If val.id is present:
      if (val.id !== undefined && val.id !== null) {
        const product = val;
        this.items.update(items => {
          const newItems = [...items];
          newItems[index] = {
            ...newItems[index],
            productId: product.id,
            productName: product.name,
            price: product.price,
            total: product.price * newItems[index].quantity,
            customValues: newItems[index].customValues || {}
          };
          return newItems;
        });
        this.openNameEdit(index, product.name);
        return;
      }

      // If object has no ID but has name/label (Custom Item wrapped?)
      if (val.name || val.label) {
        const text = val.name || val.label;
        this.items.update(items => {
          const newItems = [...items];
          newItems[index] = {
            ...newItems[index],
            productId: text,
            productName: text,
            price: 0,
            total: 0,
            customValues: newItems[index].customValues || {}
          };
          return newItems;
        });
        return;
      }
    }
  }



  updatePrice(index: number, price: number) {
    this.items.update(items => {
      const newItems = [...items];
      const item = newItems[index];
      newItems[index] = {
        ...item,
        price: price,
        total: price * item.quantity
      };
      return newItems;
    });
  }

  newInvoice() {
    this.items.set([]);
    this.selectedClientId.set(null);
    this.invoiceDate.set(new Date());
    this.discountAmount.set(0);
    this.payments.set([]);
    this.showPaymentOnPdf.set(true);

    // Default to Advance Amount mode (Installment Mode OFF)
    this.isInstallmentMode.set(false);
    this.advanceAmount.set(0);
    this.simpleModeStatus.set('Pending');

    this.selectedInvoice.set(null);
    this.editInvoiceId.set(null);
  }

  addPayment() {
    this.payments.update(p => [...p, { date: new Date(), amount: 0, note: '' }]);
  }

  removePayment(index: number) {
    this.payments.update(p => p.filter((_, i) => i !== index));
  }

  updateQuantity(index: number, quantity: number) {
    this.items.update(items => {
      const newItems = [...items];
      const item = newItems[index];
      newItems[index] = {
        ...item,
        quantity: quantity,
        total: item.price * quantity
      };
      return newItems;
    });
  }

  saveInvoice() {
    if (!this.selectedClientId() || this.items().length === 0) {
      alert('Please select a client and add at least one item.');
      return;
    }

    const invoiceData = {
      clientId: this.selectedClientId(),
      date: this.invoiceDate(),
      items: this.items().map(item => ({
        productId: typeof item.productId === 'number' ? item.productId : null,
        quantity: item.quantity,
        productName: item.productName || (typeof item.productId === 'string' ? item.productId : undefined),
        price: item.price, // Include price for custom items
        customValues: JSON.stringify(item.customValues)
      })),
      subTotal: this.subTotal(),
      taxTotal: this.taxTotal(),
      total: this.grandTotal(),
      gstEnabled: !!this.settings()?.isGstEnabled,
      gstRate: this.settings()?.gstRate || '0%',
      columnLabels: JSON.stringify(this.columnLabels()),
      customColumns: JSON.stringify(this.customColumns()),
      paymentStatus: this.paymentStatus(),
      paidAmount: this.paidAmount(),
      balanceAmount: this.balanceAmount(),
      discountAmount: this.discountAmount(),
      showPaymentDetails: this.showPaymentOnPdf(),
      isSimpleInvoice: !this.isInstallmentMode(),
      payments: this.isInstallmentMode() ? this.payments() : []
    };

    // Validation: Ensure all items have a name or product selected
    console.log('Validating Items:', this.items());
    const invalidItems = this.items().filter(item =>
      (!item.productId && !item.productName) ||
      (typeof item.productId === 'string' && !item.productId.trim())
    );

    if (invalidItems.length > 0) {
      console.error('Invalid Items Found:', invalidItems);
      alert('One or more items are missing a product name. Please check your items.');
      return;
    }

    if (this.editInvoiceId()) {
      this.api.updateInvoice(this.editInvoiceId()!, invoiceData).subscribe({
        next: (res: any) => {
          alert('Invoice updated successfully!');
          this.viewInvoice(res);
        },
        error: (err) => alert('Error updating invoice: ' + err.message)
      });
    } else {
      this.api.createInvoice(invoiceData).subscribe({
        next: (res: any) => {
          alert('Invoice created successfully!');
          this.viewInvoice(res);
        },
        error: (err) => alert('Error creating invoice: ' + err.message)
      });
    }
  }

  async printInvoice() {
    if (!this.selectedClientId() || this.items().length === 0) {
      alert('Please select a client and add at least one item.');
      return;
    }

    const invoiceData = {
      clientId: this.selectedClientId(),
      date: this.invoiceDate(),
      items: this.items().map(item => ({
        productId: typeof item.productId === 'number' ? item.productId : null,
        quantity: item.quantity,
        productName: item.productName || (typeof item.productId === 'string' ? item.productId : undefined),
        price: item.price,
        customValues: JSON.stringify(item.customValues)
      })),
      subTotal: this.subTotal(),
      taxTotal: this.taxTotal(),
      total: this.grandTotal(),
      gstEnabled: !!this.settings()?.isGstEnabled,
      gstRate: this.settings()?.gstRate || '0%',
      columnLabels: JSON.stringify(this.columnLabels()),
      customColumns: JSON.stringify(this.customColumns()),
      paymentStatus: this.paymentStatus(),
      paidAmount: this.paidAmount(),
      balanceAmount: this.balanceAmount(),
      discountAmount: this.discountAmount(),
      showPaymentDetails: this.showPaymentOnPdf(),
      isSimpleInvoice: !this.isInstallmentMode(),
      payments: this.isInstallmentMode() ? this.payments() : []
    };

    if (!confirm('Invoice must be saved before printing. Save and Print?')) return;

    const handlePrint = async (res: any) => {
      if (res && res.id) {
        // Use response directly as it now contains full details from backend
        const printableInvoice = { ...res };

        // Fallback patch just in case
        if (!printableInvoice.client) {
          printableInvoice.client = this.clients().find(c => c.id == this.selectedClientId());
        }

        this.selectedInvoice.set(printableInvoice);
        await this.electron.printInvoice(printableInvoice);
      }
    };

    if (this.editInvoiceId()) {
      this.api.updateInvoice(this.editInvoiceId()!, invoiceData).subscribe({
        next: handlePrint,
        error: (err) => {
          console.error('Update Invoice Error:', err);
          alert('Error updating invoice: ' + (err.error?.message || err.message));
        }
      });
    } else {
      this.api.createInvoice(invoiceData).subscribe({
        next: handlePrint,
        error: (err) => {
          console.error('Create Invoice Error:', err);
          alert('Error creating invoice: ' + (err.error?.message || err.message));
        }
      });
    }
  }


  // Row Click - View Details (HTML) - Not really used in entry but good for consistency
  viewInvoice(invoice: any) {
    this.selectedInvoice.set(invoice);
    this.viewMode.set('details');
  }

  loadInvoiceForEdit(invoice: any) {
    this.newInvoice(); // Reset first

    this.editInvoiceId.set(invoice.id);
    this.selectedClientId.set(invoice.client?.id || null);
    this.invoiceDate.set(new Date(invoice.date));
    this.discountAmount.set(invoice.discountAmount || 0);

    // Simple vs Installment Mode Logic
    if (invoice.isSimpleInvoice) {
      this.isInstallmentMode.set(false);
      this.advanceAmount.set(invoice.paidAmount || 0);
      this.simpleModeStatus.set(invoice.paymentStatus || 'Pending');
      this.payments.set([]);
    } else {
      this.isInstallmentMode.set(true);
      this.advanceAmount.set(0);
      this.simpleModeStatus.set('Pending');

      if (invoice.payments && invoice.payments.length > 0) {
        this.payments.set(invoice.payments.map((p: any) => ({
          ...p,
          date: new Date(p.date)
        })));
      } else if (invoice.paidAmount > 0) {
        // Migration: Create one payment entry for the existing amount if mode is installment
        this.payments.set([{
          date: new Date(invoice.date),
          amount: invoice.paidAmount,
          note: 'Initial Payment'
        }]);
      } else {
        this.payments.set([]);
      }
    }

    const mappedItems = invoice.items.map((item: any) => ({
      productId: item.product?.id || item.productName || null,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
      productName: item.productName || item.product?.name || 'Unknown Product',
      customValues: item.customValues ? JSON.parse(typeof item.customValues === 'string' ? item.customValues : JSON.stringify(item.customValues)) : {}
    }));
    this.items.set(mappedItems);
  }

  loadInvoiceForClone(invoice: any) {
    this.newInvoice(); // Reset first

    // Don't set editInvoiceId - this is a new invoice
    this.selectedClientId.set(invoice.client?.id || null);
    this.invoiceDate.set(new Date()); // Set to today
    this.discountAmount.set(invoice.discountAmount || 0);

    // Simple vs Installment Mode Logic
    if (invoice.isSimpleInvoice) {
      this.isInstallmentMode.set(false);
      // Don't copy payment amounts for clone
      this.advanceAmount.set(0);
      this.simpleModeStatus.set('Pending');
      this.payments.set([]);
    } else {
      this.isInstallmentMode.set(true);
      this.advanceAmount.set(0);
      this.simpleModeStatus.set('Pending');
      this.payments.set([]);
    }

    const mappedItems = invoice.items.map((item: any) => ({
      productId: item.product?.id || item.productName || null,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
      productName: item.productName || item.product?.name || 'Unknown Product',
      customValues: item.customValues ? JSON.parse(typeof item.customValues === 'string' ? item.customValues : JSON.stringify(item.customValues)) : {}
    }));
    this.items.set(mappedItems);
  }


  // Print Icon Click    // View PDF (New Window)
  async openPdfPreview(invoice: any, event?: Event) {
    if (event) event.stopPropagation();

    this.isLoadingPdf.set(true);

    try {
      if (this.electron.isElectron()) {
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
    this.selectedInvoice.set(null);
    if (this.pdfSrc()) {
      URL.revokeObjectURL(this.pdfSrc()!);
      this.pdfSrc.set(null);
    }
  }

  getInvoiceNumberDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${year}${month}${day}`;
  }

  getClientName(id: number | null): string {
    if (!id) return '';
    return this.clients().find(c => c.id == id)?.name || '';
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === '*') {
      const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        event.preventDefault();
        // Use execCommand for reliable insertion in managed inputs (ng-select etc)
        document.execCommand('insertText', false, '×');
      }
    }
  }
}
