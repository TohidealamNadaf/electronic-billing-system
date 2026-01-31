import { Component, OnInit, signal, computed, ChangeDetectionStrategy, effect, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { NgSelectModule } from '@ng-select/ng-select';
import { BsDatepickerModule } from 'ngx-bootstrap/datepicker';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

interface ItemRow {
    productId: number | string | null;
    productName?: string;
    quantity: number;
    price: number;
    total: number;
    customValues: { [key: string]: any };
}

@Component({
    selector: 'app-estimate-entry',
    templateUrl: './estimate-entry.page.html',
    styleUrls: ['./estimate-entry.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, NgSelectModule, BsDatepickerModule, IonicModule],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EstimateEntryPage implements OnInit {
    clients = signal<any[]>([]);
    products = signal<any[]>([]);

    selectedClientId = signal<number | null>(null);
    estimateDate = signal<Date>(new Date());

    items = signal<ItemRow[]>([]);
    settings = signal<any>(null);

    discountAmount = signal(0);

    editEstimateId = signal<number | null>(null);

    // Custom Name Modal State
    editNameState = signal({ isOpen: false, index: -1, name: '' });
    @ViewChild('nameInput') nameInputRef!: ElementRef<HTMLInputElement>;

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
            return [...builtInDefaults.slice(0, 3), ...parsed.map((c: any) => ({ ...c, isBuiltIn: false })), builtInDefaults[3]];
        } catch (e) {
            return builtInDefaults;
        }
    });

    evaluateFormula(formula: string, price: number, qty: number): number {
        try {
            const cleanFormula = formula
                .replace(/price/g, String(price))
                .replace(/qty/g, String(qty))
                .replace(/[^0-9+\-*/().]/g, '');
            return (new Function('return ' + cleanFormula))() || 0;
        } catch (e) { return 0; }
    }

    getCustomColumnValue(item: ItemRow, col: any): any {
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

    constructor(private api: ApiService, private router: Router) {
        effect(() => {
            const est = this.api.estimateToEdit();
            if (est) {
                this.loadEstimateForEdit(est);
                this.api.estimateToEdit.set(null);
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

    onProductChange(index: number, val: any) {
        // ... (Same logic as invoice)
        if (val === null || val === undefined) {
            this.items.update(items => {
                const newItems = [...items];
                newItems[index] = { productId: null, quantity: 1, price: 0, total: 0, customValues: {} };
                return newItems;
            });
            return;
        }

        if (typeof val === 'string') {
            this.items.update(items => {
                const newItems = [...items];
                newItems[index] = { ...newItems[index], productId: val, productName: val, price: 0, total: 0 };
                return newItems;
            });
            return;
        }

        if (typeof val === 'object') {
            if (val.id !== undefined) {
                const product = val;
                this.items.update(items => {
                    const newItems = [...items];
                    newItems[index] = {
                        ...newItems[index],
                        productId: product.id,
                        productName: product.name,
                        price: product.price,
                        total: product.price * newItems[index].quantity
                    };
                    return newItems;
                });
                this.openNameEdit(index, product.name);
                return;
            }
            if (val.name || val.label) {
                const text = val.name || val.label;
                this.items.update(items => {
                    const newItems = [...items];
                    newItems[index] = { ...newItems[index], productId: text, productName: text, price: 0, total: 0 };
                    return newItems;
                });
            }
        }
    }

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

    updatePrice(index: number, price: number) {
        this.items.update(items => {
            const newItems = [...items];
            const item = newItems[index];
            newItems[index] = { ...item, price: price, total: price * item.quantity };
            return newItems;
        });
    }

    updateQuantity(index: number, quantity: number) {
        this.items.update(items => {
            const newItems = [...items];
            const item = newItems[index];
            newItems[index] = { ...item, quantity: quantity, total: item.price * quantity };
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
            discountAmount: this.discountAmount(),
            showPaymentDetails: false
        };

        if (this.editEstimateId()) {
            this.api.updateEstimate(this.editEstimateId()!, estimateData).subscribe({
                next: () => {
                    alert('Estimate updated successfully!');
                    this.router.navigate(['/estimate-history']);
                },
                error: (err) => alert('Error updating estimate: ' + err.message)
            });
        } else {
            this.api.createEstimate(estimateData).subscribe({
                next: () => {
                    alert('Estimate created successfully!');
                    this.router.navigate(['/estimate-history']);
                },
                error: (err) => alert('Error creating estimate: ' + err.message)
            });
        }
    }

    loadEstimateForEdit(estimate: any) {
        this.editEstimateId.set(estimate.id);
        this.selectedClientId.set(estimate.client?.id || null);
        this.estimateDate.set(new Date(estimate.date));
        this.discountAmount.set(estimate.discountAmount || 0);

        const mappedItems = estimate.items.map((item: any) => ({
            productId: item.productId || item.product?.id || null,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
            productName: item.productName || item.product?.name || 'Unknown Product',
            customValues: item.customValues || {}
        }));
        this.items.set(mappedItems);
    }

    parseDate(value: any): Date {
        if (!value) return new Date();
        return new Date(value);
    }
}
