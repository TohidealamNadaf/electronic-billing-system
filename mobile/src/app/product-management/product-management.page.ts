import { Component, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { IonicModule } from '@ionic/angular';

@Component({
    selector: 'app-product-management',
    templateUrl: './product-management.page.html',
    styleUrls: ['./product-management.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule],
})
export class ProductManagementPage implements OnInit {
    @ViewChild('restockQtyInput') restockQtyInput!: ElementRef;
    products = signal<any[]>([]);
    searchTerm = signal<string>('');
    newProduct = { name: '', description: '', price: 0, stock: 0 };

    // Mobile View Toggle
    mobileView = signal<'list' | 'form'>('list');

    // Restock modal state
    restockModal = signal({ isOpen: false, product: null as any, quantity: 0 });

    // Edit modal state
    editModal = signal({ isOpen: false, product: null as any });
    editForm = { name: '', description: '', price: 0 };

    filteredProducts = computed(() => {
        const term = this.searchTerm().trim().toLowerCase();
        const allProducts = this.products() || [];

        if (!term) return allProducts;

        return allProducts.filter(p =>
            (p.name?.toString().toLowerCase().includes(term)) ||
            (p.description?.toString().toLowerCase().includes(term)) ||
            (p.id?.toString().includes(term))
        );
    });

    onSearch(term: string) {
        this.searchTerm.set(term);
    }

    constructor(private api: ApiService) { }

    ngOnInit() {
        this.loadProducts();
    }

    loadProducts() {
        this.api.getProducts().subscribe(data => this.products.set(data));
    }

    addProduct() {
        if (!this.newProduct.name || this.newProduct.price <= 0) return;

        this.api.createProduct(this.newProduct).subscribe(() => {
            this.loadProducts();
            this.newProduct = { name: '', description: '', price: 0, stock: 0 };
            alert('Product added!');
            this.mobileView.set('list');
        });
    }

    deleteProduct(product: any, event?: Event) {
        if (event) event.stopPropagation();

        if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
            return;
        }

        this.api.deleteProduct(product.id).subscribe({
            next: () => {
                this.loadProducts();
                alert('Product deleted successfully!');
            },
            error: (err) => alert('Error deleting product: ' + err.message)
        });
    }

    openRestockModal(product: any, event?: Event) {
        if (event) event.stopPropagation();
        this.restockModal.set({ isOpen: true, product, quantity: 0 });
        setTimeout(() => {
            this.restockQtyInput?.nativeElement?.focus();
        }, 100);
    }

    closeRestockModal() {
        this.restockModal.set({ isOpen: false, product: null, quantity: 0 });
    }

    updateRestockQuantity(quantity: number) {
        this.restockModal.update(state => ({ ...state, quantity }));
    }

    confirmRestock() {
        const { product, quantity } = this.restockModal();
        if (!product || quantity <= 0) {
            alert('Please enter a valid quantity');
            return;
        }

        this.api.restockProduct(product.id, quantity).subscribe({
            next: () => {
                this.loadProducts();
                this.closeRestockModal();
                alert(`Restocked ${quantity} units.`);
            },
            error: (err) => alert('Error restocking product: ' + err.message)
        });
    }

    openEditModal(product: any, event?: Event) {
        if (event) event.stopPropagation();
        this.editForm = {
            name: product.name,
            description: product.description,
            price: product.price
        };
        this.editModal.set({
            isOpen: true,
            product
        });
    }

    closeEditModal() {
        this.editModal.update(state => ({ ...state, isOpen: false }));
    }

    confirmEdit() {
        const { product } = this.editModal();
        const { name, description, price } = this.editForm;
        if (!name || price <= 0) {
            alert('Please enter a valid name and price');
            return;
        }

        const payload = { name, description, price };
        this.api.updateProduct(product.id, payload).subscribe({
            next: () => {
                this.loadProducts();
                this.closeEditModal();
                alert('Product updated successfully!');
            },
            error: (err) => alert('Error updating product: ' + err.message)
        });
    }

    switchToForm() {
        this.newProduct = { name: '', description: '', price: 0, stock: 0 };
        this.mobileView.set('form');
    }

    exportToCSV() {
        alert('Export not available on mobile yet.');
    }

    exportToPDF() {
        alert('Export not available on mobile yet.');
    }
}
