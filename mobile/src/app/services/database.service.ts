import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

const DB_NAME = 'billing_system_db';

@Injectable({
    providedIn: 'root'
})
export class DatabaseService {
    private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
    private db!: SQLiteDBConnection;
    private isServiceHeader = false;
    private platform: string = '';

    constructor() {
        this.platform = Capacitor.getPlatform();
    }

    async initializePlugin(): Promise<void> {
        try {
            if (this.platform === 'web') {
                const jeepSqlite = document.createElement('jeep-sqlite');
                document.body.appendChild(jeepSqlite);
                await customElements.whenDefined('jeep-sqlite');
                await this.sqlite.initWebStore();
            }

            this.db = await this.sqlite.createConnection(DB_NAME, false, 'no-encryption', 1, false);
            await this.db.open();

            await this.initSchema();

            if (this.platform === 'web') {
                await this.sqlite.saveToStore(DB_NAME);
            }
        } catch (err: any) {
            console.error('Error initializing SQLite:', err);
            throw err;
        }
    }

    private async initSchema() {
        const schema = `
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        companyName TEXT DEFAULT 'Your Company Name',
        companyOwner TEXT,
        companyAddress TEXT DEFAULT '123 Business Road, City, Country',
        companyPhone TEXT DEFAULT '+1 (234) 567-890',
        isGstEnabled INTEGER DEFAULT 1,
        gstRate TEXT DEFAULT '18%',
        gstNumber TEXT,
        isDiscountEnabled INTEGER DEFAULT 0,
        termsAndConditions TEXT DEFAULT '1. Payment is due upon receipt.\\n2. Please quote invoice number in all correspondence.\\n3. Thank you for your business.',
        showTerms INTEGER DEFAULT 1,
        columnLabels TEXT,
        customColumns TEXT,
        businessProfileConfig TEXT
      );

      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        customFields TEXT
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL DEFAULT 0,
        stock INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clientId INTEGER,
        date TEXT NOT NULL,
        total REAL DEFAULT 0,
        subTotal REAL DEFAULT 0,
        taxTotal REAL DEFAULT 0,
        gstEnabled INTEGER DEFAULT 0,
        gstRate TEXT,
        columnLabels TEXT,
        customColumns TEXT,
        paymentStatus TEXT DEFAULT 'Pending',
        paidAmount REAL DEFAULT 0,
        balanceAmount REAL DEFAULT 0,
        discountAmount REAL DEFAULT 0,
        showPaymentDetails INTEGER DEFAULT 1,
        isSimpleInvoice INTEGER DEFAULT 0,
        payments TEXT,
        FOREIGN KEY(clientId) REFERENCES clients(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoiceId INTEGER NOT NULL,
        productId INTEGER,
        productName TEXT,
        quantity INTEGER DEFAULT 1,
        price REAL DEFAULT 0,
        customValues TEXT,
        FOREIGN KEY(invoiceId) REFERENCES invoices(id) ON DELETE CASCADE,
        FOREIGN KEY(productId) REFERENCES products(id) ON DELETE SET NULL
      );
      
      -- Insert default settings if not exists
      INSERT OR IGNORE INTO settings (id) VALUES (1);
    `;

        await this.db.execute(schema);
    }

    // Generic Query Methods
    async execute(statement: string) {
        return await this.db.execute(statement);
    }

    async run(statement: string, values?: any[]) {
        return await this.db.run(statement, values);
    }

    async query(statement: string, values?: any[]) {
        return await this.db.query(statement, values);
    }

    async delete() {
        await this.sqlite.closeConnection(DB_NAME, false);
    }
}
