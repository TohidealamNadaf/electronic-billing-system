import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import jsPDF from 'jspdf';

@Component({
  selector: 'app-client-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './client-management.html',
  styleUrl: './client-management.scss',
})
export class ClientManagement implements OnInit {
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

    // Parse custom fields and config
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
  }

  cancelEdit() {
    this.editMode.set(false);
    this.editingClientId.set(null);
    this.newClient = { name: '', email: '', phone: '', address: '' };
    this.customFields = [];
    this.standardFields = { email: true, phone: true, address: true };
  }

  addClient() {
    if (!this.newClient.name) return;

    // Prepare data
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
        },
        error: (err) => alert('Error creating client: ' + err.message)
      });
    }
  }

  deleteClient(client: any) {
    if (!confirm(`Are you sure you want to delete "${client.name}"? This action cannot be undone.`)) {
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

  exportToCSV() {
    const data = this.filteredClients();
    if (!data || data.length === 0) {
      alert('No records to export');
      return;
    }

    const headers = ['ID', 'Name', 'Email', 'Phone', 'Address'];
    const rows = data.map(c => [
      c.id,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.address || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clients_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportToPDF() {
    const data = this.filteredClients();
    if (!data || data.length === 0) {
      alert('No records to export');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 69); // Emerald Green
    doc.text('Client Directory Report', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Total Records: ${data.length}`, 14, 28);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 33);

    let y = 45;
    // Simple table header
    doc.setFillColor(248, 250, 252);
    doc.rect(14, y - 5, 182, 7, 'F');
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text('ID', 16, y);
    doc.text('Client Name', 30, y);
    doc.text('Contact', 100, y);
    doc.text('Address', 150, y);

    y += 10;
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(9);

    data.forEach((c, i) => {
      if (y > 270) {
        doc.addPage();
        y = 30;
      }
      doc.text(String(c.id), 16, y);
      doc.text(String(c.name || '-'), 30, y);
      doc.text(String(c.phone || c.email || '-'), 100, y);
      doc.text(String(c.address || '-').substring(0, 30), 150, y);
      y += 8;
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y - 5, 196, y - 5);
    });

    doc.save(`clients_report_${new Date().getTime()}.pdf`);
  }
}
