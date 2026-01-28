import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ApiService {
    private apiUrl = 'http://localhost:3000';

    constructor(private http: HttpClient) { }

    // State for cross-component editing
    invoiceToEdit = signal<any>(null);
    invoiceToClone = signal<any>(null);
    estimateToEdit = signal<any>(null);
    estimateToClone = signal<any>(null);

    getClients(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/clients`);
    }

    createClient(client: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/clients`, client);
    }

    updateClient(id: number, client: any): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/clients/${id}`, client);
    }

    deleteClient(id: number): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/clients/${id}`);
    }

    getProducts(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/products`);
    }

    createProduct(product: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/products`, product);
    }

    updateProduct(id: number, product: any): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/products/${id}`, product);
    }

    deleteProduct(id: number): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/products/${id}`);
    }

    restockProduct(id: number, quantity: number): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/products/${id}/restock`, { quantity });
    }

    createInvoice(invoice: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/invoices`, invoice);
    }

    updateInvoice(id: number, invoice: any): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/invoices/${id}`, invoice);
    }

    getInvoices(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/invoices`);
    }

    deleteInvoice(id: number): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/invoices/${id}`);
    }

    getInvoice(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/invoices/${id}`);
    }

    // Estimate methods
    getEstimates(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/estimates`);
    }

    createEstimate(estimate: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/estimates`, estimate);
    }

    updateEstimate(id: number, estimate: any): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/estimates/${id}`, estimate);
    }

    deleteEstimate(id: number): Observable<any> {
        return this.http.delete<any>(`${this.apiUrl}/estimates/${id}`);
    }

    getEstimateById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/estimates/${id}`);
    }

    getSettings(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/settings`);
    }

    updateSettings(settings: any): Observable<any> {
        return this.http.patch<any>(`${this.apiUrl}/settings`, settings);
    }
}
