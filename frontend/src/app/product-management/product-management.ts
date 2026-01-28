import { Component, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-product-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './product-management.html',
  styleUrl: './product-management.scss',
})
export class ProductManagement implements OnInit {
  @ViewChild('restockQtyInput') restockQtyInput!: ElementRef;
  products = signal<any[]>([]);
  searchTerm = signal<string>('');
  newProduct = { name: '', description: '', price: 0, stock: 0 };

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
    });
  }

  deleteProduct(product: any) {
    if (!confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
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

  openRestockModal(product: any) {
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
        alert(`Successfully added ${quantity} units to ${product.name}`);
      },
      error: (err) => alert('Error restocking product: ' + err.message)
    });
  }

  openEditModal(product: any) {
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

  exportToCSV() {
    const data = this.filteredProducts();
    if (!data || data.length === 0) {
      alert('No items to export');
      return;
    }

    const headers = ['ID', 'Product Name', 'Description', 'Price', 'Stock'];
    const rows = data.map(p => [
      p.id,
      `"${(p.name || '').replace(/"/g, '""')}"`,
      `"${(p.description || '').replace(/"/g, '""')}"`,
      p.price,
      p.stock
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToPDF() {
    const data = this.filteredProducts();
    if (!data || data.length === 0) {
      alert('No items to export');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 69); // Emerald Green
    doc.text('Inventory Status Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Total Items: ${data.length}`, 14, 28);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 33);

    let y = 45;
    // Simple table header
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y - 5, 182, 7, 'F');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('ID', 16, y);
    doc.text('Product Name', 30, y);
    doc.text('Price', 120, y);
    doc.text('Stock', 160, y);

    y += 10;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);

    data.forEach((p, i) => {
      if (y > 270) {
        doc.addPage();
        y = 30;
      }
      doc.text(String(p.id), 16, y);
      doc.text(String(p.name || '-'), 30, y);
      doc.text(`INR ${p.price.toFixed(2)}`, 120, y);
      doc.text(`${p.stock} Units`, 160, y);
      y += 8;
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y - 5, 196, y - 5);
    });

    doc.save(`inventory_report_${new Date().getTime()}.pdf`);
  }
}
