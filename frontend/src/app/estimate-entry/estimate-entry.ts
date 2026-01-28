import { Component, OnInit, signal, computed, ChangeDetectionStrategy, effect, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { ElectronService } from '../services/electron.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';

interface EstimateItemRow {
  productId: number | string | null;
  productName?: string;
  quantity: number;
  price: number;
  total: number;
  customValues: { [key: string]: any };
}

@Component({
  selector: 'app-estimate-entry',
  imports: [CommonModule, FormsModule, NgSelectModule, BsDatepickerModule],
  templateUrl: './estimate-entry.html',
  styleUrl: './estimate-entry.scss',
})
export class EstimateEntry implements OnInit {
  clients = signal<any[]>([]);
  products = signal<any[]>([]);

  selectedClientId = signal<number | null>(null);
  estimateDate = signal<Date>(new Date());

  items = signal<EstimateItemRow[]>([]);
  settings = signal<any>(null);

  discountAmount = signal(0);
  estimateStatus = signal('Draft'); // Draft, Sent, Accepted, Declined
  isSimpleEstimate = signal(false);
  editEstimateId = signal<number | null>(null);

  // Preview Signals
  selectedEstimate = signal<any | null>(null);
  pdfSrc = signal<string | null>(null);
  isLoadingPdf = signal<boolean>(false);
  viewMode = signal<'details' | 'pdf'>('details');

  parsedCustomColumns = computed(() => {
    const est = this.selectedEstimate();
    if (!est) return this.customColumns();

    const builtInDefaults = [
      { id: 'product', isBuiltIn: true },
      { id: 'quantity', isBuiltIn: true },
      { id: 'price', isBuiltIn: true },
      { id: 'total', isBuiltIn: true }
    ];

    if (!est.customColumns) return builtInDefaults;

    try {
      const parsed = typeof est.customColumns === 'string' ? JSON.parse(est.customColumns) : est.customColumns;

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
    const est = this.selectedEstimate();
    const defaults = { product: 'Item', quantity: 'Qty', price: 'Price', total: 'Total' };
    if (!est || !est.columnLabels) return defaults;
    try {
      return typeof est.columnLabels === 'string' ? JSON.parse(est.columnLabels) : est.columnLabels;
    } catch (e) {
      return defaults;
    }
  });

  getCustomValue(item: any, col: any): any {
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

  getCustomColumnValue(item: EstimateItemRow, col: any): any {
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
      const est = this.api.estimateToEdit();
      if (est) {
        this.loadEstimateForEdit(est);
        this.api.estimateToEdit.set(null); // Clear it
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const est = this.api.estimateToClone();
      if (est) {
        this.loadEstimateForClone(est);
        this.api.estimateToClone.set(null); // Clear it
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

  newEstimate() {
    this.items.set([]);
    this.selectedClientId.set(null);
    this.estimateDate.set(new Date());
    this.discountAmount.set(0);
    this.estimateStatus.set('Draft');
    this.isSimpleEstimate.set(false);
    this.selectedEstimate.set(null);
    this.editEstimateId.set(null);
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

  saveEstimate() {
    if (!this.selectedClientId() || this.items().length === 0) {
      alert('Please select a client and add at least one item.');
      return;
    }

    const estimateData = {
      clientId: this.selectedClientId(),
      date: this.estimateDate(),
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
      status: this.estimateStatus(),
      discountAmount: this.discountAmount(),
      isSimpleEstimate: this.isSimpleEstimate()
    };

    // Validation: Ensure all items have a name or product selected
    const invalidItems = this.items().some(item =>
      (!item.productId && !item.productName) ||
      (typeof item.productId === 'string' && !item.productId.trim())
    );

    if (invalidItems) {
      alert('One or more items are missing a product name. Please check your items.');
      return;
    }

    if (this.editEstimateId()) {
      this.api.updateEstimate(this.editEstimateId()!, estimateData).subscribe({
        next: (res: any) => {
          alert('Estimate updated successfully!');
          this.selectedEstimate.set(res);
        },
        error: (err) => alert('Error updating estimate: ' + err.message)
      });
    } else {
      this.api.createEstimate(estimateData).subscribe({
        next: (res: any) => {
          alert('Estimate created successfully!');
          this.selectedEstimate.set(res);
        },
        error: (err) => alert('Error creating estimate: ' + err.message)
      });
    }
  }

  async printEstimate() {
    if (!this.selectedClientId() || this.items().length === 0) {
      alert('Please select a client and add at least one item.');
      return;
    }

    const estimateData = {
      clientId: this.selectedClientId(),
      date: this.estimateDate(),
      items: this.items().map(item => ({
        productId: typeof item.productId === 'number' ? item.productId : null,
        quantity: item.quantity,
        productName: item.productName || (typeof item.productId === 'string' ? item.productId : undefined),
        price: item.price,
        customValues: typeof item.customValues === 'string' ? item.customValues : JSON.stringify(item.customValues)
      })),
      subTotal: this.subTotal(),
      taxTotal: this.taxTotal(),
      total: this.grandTotal(),
      gstEnabled: !!this.settings()?.isGstEnabled,
      gstRate: this.settings()?.gstRate || '0%',
      columnLabels: JSON.stringify(this.columnLabels()),
      customColumns: JSON.stringify(this.customColumns()),
      status: this.estimateStatus(),
      discountAmount: this.discountAmount(),
      isSimpleEstimate: this.isSimpleEstimate()
    };

    if (!confirm('Estimate must be saved before printing. Save and Print?')) return;

    if (this.editEstimateId()) {
      this.api.updateEstimate(this.editEstimateId()!, estimateData).subscribe({
        next: async (res: any) => {
          await this.doPrint(res);
        },
        error: (err) => {
          console.error('Update Estimate Error:', err);
          alert('Error updating estimate: ' + (err.error?.message || err.message));
        }
      });
    } else {
      this.api.createEstimate(estimateData).subscribe({
        next: async (res: any) => {
          await this.doPrint(res);
        },
        error: (err) => {
          console.error('Create Estimate Error:', err);
          alert('Error creating estimate: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  private async doPrint(res: any) {
    if (res && res.id) {
      // Use the response directly as it now contains full client and product details from the backend
      const printableEstimate = { ...res };

      // Fallback: If for some reason client is missing (shouldn't happen with new backend fix), try to patch it
      if (!printableEstimate.client) {
        printableEstimate.client = this.clients().find(c => c.id == this.selectedClientId());
      }

      this.selectedEstimate.set(printableEstimate);
      await this.electron.printEstimate(printableEstimate);
    }
  }

  // Row Click - View Details (HTML) - Not really used in entry but good for consistency
  viewEstimate(estimate: any) {
    this.selectedEstimate.set(estimate);
    this.viewMode.set('details');
  }

  loadEstimateForEdit(estimate: any) {
    this.newEstimate(); // Reset first

    this.editEstimateId.set(estimate.id);
    this.selectedClientId.set(estimate.client?.id || null);
    this.estimateDate.set(new Date(estimate.date));
    this.discountAmount.set(estimate.discountAmount || 0);
    this.estimateStatus.set(estimate.status || 'Draft');

    // Simple Mode Handling
    if (estimate.isSimpleEstimate) {
      this.isSimpleEstimate.set(true);
    } else {
      this.isSimpleEstimate.set(false);
    }

    const mappedItems = estimate.items.map((item: any) => ({
      productId: item.product?.id || item.productName || null,
      quantity: item.quantity,
      price: item.price,
      total: item.price * item.quantity,
      productName: item.productName || item.product?.name || 'Unknown Product',
      customValues: item.customValues ? JSON.parse(typeof item.customValues === 'string' ? item.customValues : JSON.stringify(item.customValues)) : {}
    }));
    this.items.set(mappedItems);
  }

  loadEstimateForClone(estimate: any) {
    this.newEstimate(); // Reset first

    // Don't set editEstimateId - this is a new estimate
    this.selectedClientId.set(estimate.client?.id || null);
    this.estimateDate.set(new Date()); // Set to today
    this.discountAmount.set(estimate.discountAmount || 0);
    this.estimateStatus.set('Draft'); // Reset to Draft

    // Simple Mode Handling
    if (estimate.isSimpleEstimate) {
      this.isSimpleEstimate.set(true);
    } else {
      this.isSimpleEstimate.set(false);
    }

    const mappedItems = estimate.items.map((item: any) => ({
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
    this.selectedEstimate.set(null);
    if (this.pdfSrc()) {
      URL.revokeObjectURL(this.pdfSrc()!);
      this.pdfSrc.set(null);
    }
  }

  getEstimateNumberDate(dateStr: string): string {
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
        document.execCommand('insertText', false, '×');
      }
    }
  }
}
