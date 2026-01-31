import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { IonicModule } from '@ionic/angular';

@Component({
    selector: 'app-client-management',
    templateUrl: './client-management.page.html',
    styleUrls: ['./client-management.page.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule],
})
export class ClientManagementPage implements OnInit {
    clients = signal<any[]>([]);
    searchTerm = signal<string>('');
    newClient = { name: '', email: '', phone: '', address: '' };
    editMode = signal(false);
    editingClientId = signal<number | null>(null);
    customFields: { key: string, value: string }[] = [];
    standardFields = {
        email: true,
        phone: true,
        address: true
    };

    // Mobile View Toggle
    mobileView = signal<'list' | 'form'>('list');

    filteredClients = computed(() => {
        const term = this.searchTerm().trim().toLowerCase();
        const allClients = this.clients() || [];

        if (!term) return allClients;

        return allClients.filter(c =>
            (c.name?.toString().toLowerCase().includes(term)) ||
            (c.email?.toString().toLowerCase().includes(term)) ||
            (c.phone?.toString().toLowerCase().includes(term)) ||
            (c.id?.toString().includes(term))
        );
    });

    onSearch(term: string) {
        this.searchTerm.set(term);
    }

    constructor(private api: ApiService) { }

    ngOnInit() {
        this.loadClients();
    }

    loadClients() {
        this.api.getClients().subscribe(data => this.clients.set(data));
    }

    getParsedCustomFields(jsonStr: string): any[] {
        if (!jsonStr) return [];
        try {
            const parsed = JSON.parse(jsonStr);
            return parsed.fields || [];
        } catch (e) {
            return [];
        }
    }

    addCustomField() {
        this.customFields.push({ key: '', value: '' });
    }

    removeCustomField(index: number) {
        this.customFields.splice(index, 1);
    }

    startEdit(client: any) {
        this.editMode.set(true);
        this.editingClientId.set(client.id);
        this.newClient = {
            name: client.name || '',
            email: client.email || '',
            phone: client.phone || '',
            address: client.address || ''
        };

        if (client.customFields) {
            try {
                const parsed = JSON.parse(client.customFields);
                this.customFields = parsed.fields || [];
                this.standardFields = parsed.config || { email: true, phone: true, address: true };
            } catch (e) {
                this.customFields = [];
                this.standardFields = { email: true, phone: true, address: true };
            }
        } else {
            this.customFields = [];
            this.standardFields = { email: true, phone: true, address: true };
        }

        // Switch to form view on mobile
        this.mobileView.set('form');
    }

    cancelEdit() {
        this.editMode.set(false);
        this.editingClientId.set(null);
        this.newClient = { name: '', email: '', phone: '', address: '' };
        this.customFields = [];
        this.standardFields = { email: true, phone: true, address: true };
        this.mobileView.set('list');
    }

    addClient() {
        if (!this.newClient.name) return;

        const payload = {
            ...this.newClient,
            email: this.standardFields.email ? this.newClient.email : null,
            phone: this.standardFields.phone ? this.newClient.phone : null,
            address: this.standardFields.address ? this.newClient.address : null,
            customFields: JSON.stringify({
                fields: this.customFields,
                config: this.standardFields
            })
        };

        if (this.editMode() && this.editingClientId()) {
            this.api.updateClient(this.editingClientId()!, payload).subscribe({
                next: () => {
                    this.loadClients();
                    this.cancelEdit();
                    alert('Client updated!');
                },
                error: (err) => alert('Error updating client: ' + err.message)
            });
        } else {
            this.api.createClient(payload).subscribe({
                next: () => {
                    this.loadClients();
                    this.newClient = { name: '', email: '', phone: '', address: '' };
                    this.customFields = [];
                    this.standardFields = { email: true, phone: true, address: true };
                    alert('Client added!');
                    this.mobileView.set('list');
                },
                error: (err) => alert('Error creating client: ' + err.message)
            });
        }
    }

    deleteClient(client: any, event?: Event) {
        if (event) event.stopPropagation();

        if (!confirm(`Are you sure you want to delete "${client.name}"?`)) {
            return;
        }

        this.api.deleteClient(client.id).subscribe({
            next: () => {
                this.loadClients();
                if (this.editingClientId() === client.id) {
                    this.cancelEdit();
                }
                alert('Client deleted successfully!');
            },
            error: (err) => alert('Error deleting client: ' + err.message)
        });
    }

    switchToForm() {
        this.newClient = { name: '', email: '', phone: '', address: '' };
        this.editMode.set(false);
        this.mobileView.set('form');
    }

    exportToCSV() {
        alert('Export to CSV is not yet available on mobile.');
    }

    exportToPDF() {
        alert('Export to PDF is not yet available on mobile.');
    }
}
