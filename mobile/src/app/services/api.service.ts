import { Injectable, signal } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { DatabaseService } from './database.service';

@Injectable({
    providedIn: 'root'
})
export class ApiService {

    constructor(private db: DatabaseService) { }

    // State for cross-component editing
    invoiceToEdit = signal<any>(null);
    invoiceToClone = signal<any>(null);
    estimateToEdit = signal<any>(null);
    estimateToClone = signal<any>(null);

    // --- Clients ---
    getClients(): Observable<any[]> {
        return from(this.db.query('SELECT * FROM clients')).pipe(
            map(res => res.values || [])
        );
    }

    createClient(client: any): Observable<any> {
        const sql = `INSERT INTO clients (name, email, phone, address, customFields) VALUES (?, ?, ?, ?, ?)`;
        const values = [client.name, client.email, client.phone, client.address, JSON.stringify(client.customFields)];
        return from(this.db.run(sql, values)).pipe(
            map(res => ({ id: res.changes?.lastId, ...client }))
        );
    }

    updateClient(id: number, client: any): Observable<any> {
        const sql = `UPDATE clients SET name=?, email=?, phone=?, address=?, customFields=? WHERE id=?`;
        const values = [client.name, client.email, client.phone, client.address, JSON.stringify(client.customFields), id];
        return from(this.db.run(sql, values));
    }

    deleteClient(id: number): Observable<any> {
        return from(this.db.run('DELETE FROM clients WHERE id=?', [id]));
    }

    // --- Products ---
    getProducts(): Observable<any[]> {
        return from(this.db.query('SELECT * FROM products')).pipe(
            map(res => res.values || [])
        );
    }

    createProduct(product: any): Observable<any> {
        const sql = `INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)`;
        const values = [product.name, product.description, product.price, product.stock];
        return from(this.db.run(sql, values)).pipe(
            map(res => ({ id: res.changes?.lastId, ...product }))
        );
    }

    updateProduct(id: number, product: any): Observable<any> {
        const sql = `UPDATE products SET name=?, description=?, price=?, stock=? WHERE id=?`;
        const values = [product.name, product.description, product.price, product.stock, id];
        return from(this.db.run(sql, values));
    }

    deleteProduct(id: number): Observable<any> {
        return from(this.db.run('DELETE FROM products WHERE id=?', [id]));
    }

    restockProduct(id: number, quantity: number): Observable<any> {
        const sql = `UPDATE products SET stock = stock + ? WHERE id=?`;
        return from(this.db.run(sql, [quantity, id]));
    }

    // --- Invoices ---
    getInvoices(): Observable<any[]> {
        // We'll just fetch basic invoice info for the list.
        // If client name is needed, we might need a JOIN or fetch it separately.
        // For simplicity, let's do a JOIN.
        const sql = `
            SELECT i.*, c.name as clientName
            FROM invoices i
            LEFT JOIN clients c ON i.clientId = c.id
            ORDER BY i.date DESC
        `;
        return from(this.db.query(sql)).pipe(
            map(res => (res.values || []).map(inv => ({
                ...inv,
                client: { name: inv.clientName }, // Mock client obj for frontend compatibility
                payments: inv.payments ? JSON.parse(inv.payments) : [],
                customColumns: inv.customColumns ? JSON.parse(inv.customColumns) : [],
                columnLabels: inv.columnLabels ? JSON.parse(inv.columnLabels) : {}
            })))
        );
    }

    async createInvoiceAsync(invoice: any) {
        // 1. Insert Invoice
        const invSql = `
            INSERT INTO invoices (
                clientId, date, total, subTotal, taxTotal, gstEnabled, gstRate,
                discountAmount, paidAmount, balanceAmount, paymentStatus,
                showPaymentDetails, isSimpleInvoice, payments, columnLabels, customColumns
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const invValues = [
            invoice.clientId, invoice.date, invoice.total, invoice.subTotal, invoice.taxTotal,
            invoice.gstEnabled ? 1 : 0, invoice.gstRate, invoice.discountAmount, invoice.paidAmount,
            invoice.balanceAmount, invoice.paymentStatus,
            invoice.showPaymentDetails ? 1 : 0, invoice.isSimpleInvoice ? 1 : 0,
            JSON.stringify(invoice.payments), JSON.stringify(invoice.columnLabels), JSON.stringify(invoice.customColumns)
        ];

        const invRes = await this.db.run(invSql, invValues);
        const invoiceId = invRes.changes?.lastId;

        // 2. Insert Items
        if (invoice.items && invoiceId) {
            for (const item of invoice.items) {
                const itemSql = `
                    INSERT INTO invoice_items (
                        invoiceId, productId, productName, quantity, price, customValues
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `;
                const itemValues = [
                    invoiceId, item.productId, item.productName, item.quantity, item.price,
                    JSON.stringify(item.customValues)
                ];
                await this.db.run(itemSql, itemValues);

                // Update stock if it's a tracked product (productId exists)
                if (item.productId && typeof item.productId === 'number') {
                    // Start stock reduction logic if needed. For now, we skip or simple decrement
                    await this.db.run(`UPDATE products SET stock = stock - ? WHERE id = ?`, [item.quantity, item.productId]);
                }
            }
        }
        return { id: invoiceId, ...invoice };
    }

    createInvoice(invoice: any): Observable<any> {
        return from(this.createInvoiceAsync(invoice));
    }

    async updateInvoiceAsync(id: number, invoice: any) {
        // 1. Update Invoice Fields
        const invSql = `
            UPDATE invoices SET
                clientId=?, date=?, total=?, subTotal=?, taxTotal=?, gstEnabled=?, gstRate=?,
                discountAmount=?, paidAmount=?, balanceAmount=?, paymentStatus=?,
                showPaymentDetails=?, isSimpleInvoice=?, payments=?, columnLabels=?, customColumns=?
            WHERE id=?
        `;
        const invValues = [
            invoice.clientId, invoice.date, invoice.total, invoice.subTotal, invoice.taxTotal,
            invoice.gstEnabled ? 1 : 0, invoice.gstRate, invoice.discountAmount, invoice.paidAmount,
            invoice.balanceAmount, invoice.paymentStatus,
            invoice.showPaymentDetails ? 1 : 0, invoice.isSimpleInvoice ? 1 : 0,
            JSON.stringify(invoice.payments), JSON.stringify(invoice.columnLabels), JSON.stringify(invoice.customColumns),
            id
        ];
        await this.db.run(invSql, invValues);

        // 2. Re-create Items (Simple strategy: Delete all, then Insert)
        // WARNING: This doesn't handle stock reversion perfectly if quantity changed.
        // Ideally, we'd diff, but for MVP offline, we might accept some stock drift or implement reversion later.
        await this.db.run('DELETE FROM invoice_items WHERE invoiceId=?', [id]);

        if (invoice.items) {
            for (const item of invoice.items) {
                const itemSql = `
                    INSERT INTO invoice_items (
                        invoiceId, productId, productName, quantity, price, customValues
                    ) VALUES (?, ?, ?, ?, ?, ?)
                `;
                const itemValues = [
                    id, item.productId, item.productName, item.quantity, item.price,
                    JSON.stringify(item.customValues)
                ];
                await this.db.run(itemSql, itemValues);
            }
        }
        return { id, ...invoice };
    }

    updateInvoice(id: number, invoice: any): Observable<any> {
        return from(this.updateInvoiceAsync(id, invoice));
    }

    deleteInvoice(id: number): Observable<any> {
        return from(this.db.run('DELETE FROM invoices WHERE id=?', [id]));
    }

    async getInvoiceAsync(id: number) {
        const invRes = await this.db.query('SELECT * FROM invoices WHERE id=?', [id]);
        if (!invRes.values || invRes.values.length === 0) return null;
        const inv = invRes.values[0];

        // Fetch Items
        const itemsRes = await this.db.query('SELECT * FROM invoice_items WHERE invoiceId=?', [id]);
        const items = itemsRes.values || [];

        // Fetch Client
        let client = null;
        if (inv.clientId) {
            const clientRes = await this.db.query('SELECT * FROM clients WHERE id=?', [inv.clientId]);
            if (clientRes.values && clientRes.values.length > 0) client = clientRes.values[0];
        }

        return {
            ...inv,
            client,
            items: items.map(item => ({
                ...item,
                customValues: item.customValues ? JSON.parse(item.customValues) : {}
            })),
            payments: inv.payments ? JSON.parse(inv.payments) : [],
            customColumns: inv.customColumns ? JSON.parse(inv.customColumns) : [],
            columnLabels: inv.columnLabels ? JSON.parse(inv.columnLabels) : {},
            gstEnabled: !!inv.gstEnabled,
            showPaymentDetails: !!inv.showPaymentDetails,
            isSimpleInvoice: !!inv.isSimpleInvoice
        };
    }

    getInvoice(id: number): Observable<any> {
        return from(this.getInvoiceAsync(id));
    }

    // --- Settings ---
    getSettings(): Observable<any> {
        return from(this.db.query('SELECT * FROM settings WHERE id=1')).pipe(
            map(res => {
                if (!res.values || res.values.length === 0) return null;
                const s = res.values[0];
                return {
                    ...s,
                    isGstEnabled: !!s.isGstEnabled,
                    isDiscountEnabled: !!s.isDiscountEnabled,
                    showTerms: !!s.showTerms
                };
            })
        );
    }

    updateSettings(settings: any): Observable<any> {
        const sql = `
            UPDATE settings SET
                companyName=?, companyOwner=?, companyAddress=?, companyPhone=?,
                isGstEnabled=?, gstRate=?, gstNumber=?, isDiscountEnabled=?,
                termsAndConditions=?, showTerms=?, columnLabels=?, customColumns=?, businessProfileConfig=?
            WHERE id=1
        `;
        const values = [
            settings.companyName, settings.companyOwner, settings.companyAddress, settings.companyPhone,
            settings.isGstEnabled ? 1 : 0, settings.gstRate, settings.gstNumber, settings.isDiscountEnabled ? 1 : 0,
            settings.termsAndConditions, settings.showTerms ? 1 : 0,
            settings.columnLabels, settings.customColumns, settings.businessProfileConfig
        ];
        return from(this.db.run(sql, values));
    }

    // Estimates (Stub or implement similarly if needed)
    getEstimates(): Observable<any[]> { return from(Promise.resolve([])); }
    createEstimate(estimate: any): Observable<any> { return from(Promise.resolve({})); }
    updateEstimate(id: number, estimate: any): Observable<any> { return from(Promise.resolve({})); }
    deleteEstimate(id: number): Observable<any> { return from(Promise.resolve({})); }
    getEstimateById(id: number): Observable<any> { return from(Promise.resolve(null)); }
}
