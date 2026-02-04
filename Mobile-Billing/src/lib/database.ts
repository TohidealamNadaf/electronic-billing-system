import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { generateUUID } from './utils';

export class DatabaseService {
  private static instance: DatabaseService;
  private sqlite: SQLiteConnection;
  private db: SQLiteDBConnection | null = null;
  private dbName = 'billing_db';

  private constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  private isPluginInitialized = false;

  public async initializePlugin(): Promise<void> {
    if (this.isPluginInitialized) return;

    const platform = Capacitor.getPlatform();
    if (platform === 'web') {
      await customElements.whenDefined('jeep-sqlite');
      const jeepEl = document.querySelector('jeep-sqlite');
      if (jeepEl) {
        try {
          await this.sqlite.initWebStore();
        } catch (e) {
          console.warn('initWebStore warning:', e);
        }
      } else {
        console.error("jeep-sqlite element not found in DOM");
      }
    }
    this.isPluginInitialized = true;
  }

  public async openConnection(): Promise<void> {
    try {
      console.log('DatabaseService: Consistency Check...');
      const ret = await this.sqlite.checkConnectionsConsistency();
      console.log('DatabaseService: Consistency Check Result:', ret);

      console.log('DatabaseService: Checking Connection...');
      const isConnected = (await this.sqlite.isConnection(this.dbName, false)).result;
      console.log('DatabaseService: IsConnected:', isConnected);

      if (ret.result && isConnected) {
        console.log('DatabaseService: Retrieving Connection...');
        this.db = await this.sqlite.retrieveConnection(this.dbName, false);
      } else {
        console.log('DatabaseService: Creating Connection...');
        this.db = await this.sqlite.createConnection(
          this.dbName,
          false,
          'no-encryption',
          1,
          false
        );
      }

      console.log('DatabaseService: Opening DB...');
      await this.db.open();

      console.log('DatabaseService: Initializing Schema...');
      await this.initializeSchema();

      if (Capacitor.getPlatform() === 'web') {
        console.log('DatabaseService: Saving to store...');
        await this.sqlite.saveToStore(this.dbName);
      }
      console.log('DatabaseService: Connection Complete');
    } catch (err) {
      console.error('Error opening connection', err);
      throw err;
    }
  }

  private async initializeSchema(): Promise<void> {
    if (!this.db) return;

    // Clients Table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        createdAt TEXT DEFAULT (datetime('now'))
      );
    `);

    // Products Table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        unit TEXT,
        createdAt TEXT DEFAULT (datetime('now'))
      );
    `);

    // Invoices Table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        invoiceNumber TEXT NOT NULL,
        clientId TEXT,
        clientName TEXT,
        date TEXT,
        dueDate TEXT,
        subtotal REAL,
        tax REAL,
        total REAL,
        status TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(clientId) REFERENCES clients(id)
      );
    `);

    // Invoice Items
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id TEXT PRIMARY KEY,
        invoiceId TEXT NOT NULL,
        productId TEXT,
        productName TEXT,
        quantity REAL,
        price REAL,
        total REAL,
        FOREIGN KEY(invoiceId) REFERENCES invoices(id)
      );
    `);

    // Estimates Table
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS estimates (
        id TEXT PRIMARY KEY,
        estimateNumber TEXT NOT NULL,
        clientId TEXT,
        clientName TEXT,
        date TEXT,
        validUntil TEXT,
        subtotal REAL,
        tax REAL,
        total REAL,
        status TEXT,
        createdAt TEXT DEFAULT (datetime('now')),
        FOREIGN KEY(clientId) REFERENCES clients(id)
      );
    `);

    // Estimate Items
    await this.db.execute(`
        CREATE TABLE IF NOT EXISTS estimate_items (
            id TEXT PRIMARY KEY,
            estimateId TEXT NOT NULL,
            productId TEXT,
            productName TEXT,
            quantity REAL,
            price REAL,
            total REAL,
            FOREIGN KEY(estimateId) REFERENCES estimates(id)
        );
    `);

    // Settings Table (Key-Value Store)
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT
      );
    `);

    // --- Schema Migrations ---
    // Add customValues to older schemas
    try {
      await this.db.execute("ALTER TABLE invoice_items ADD COLUMN customValues TEXT;");
    } catch (e) { /* Column likely exists */ }

    try {
      await this.db.execute("ALTER TABLE estimate_items ADD COLUMN customValues TEXT;");
    } catch (e) { /* Column likely exists */ }

    // Seed Default Settings if empty
    const settingsCount = await this.db.query("SELECT COUNT(*) as count FROM settings");
    if (settingsCount.values && settingsCount.values[0].count === 0) {
      const defaultSettings = [
        { key: 'companyName', value: 'My Company' },
        { key: 'companyAddress', value: '123 Business St, City, Country' },
        { key: 'companyPhone', value: '+1 234 567 8900' },
        { key: 'companyEmail', value: 'contact@mycompany.com' },
        { key: 'termAndConditions', value: 'Payment due on receipt.' }
      ];

      for (const s of defaultSettings) {
        await this.db.run("INSERT INTO settings (id, key, value) VALUES (?, ?, ?)", [generateUUID(), s.key, s.value]);
      }
    }
  }

  public getDB(): SQLiteDBConnection | null {
    return this.db;
  }

  public async save(): Promise<void> {
    if (Capacitor.getPlatform() === 'web') {
      await this.sqlite.saveToStore(this.dbName);
    }
  }
}
