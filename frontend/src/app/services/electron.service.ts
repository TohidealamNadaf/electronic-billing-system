import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ElectronService {
    private ipcRenderer: any;

    constructor() {
        if (this.isElectron()) {
            try {
                this.ipcRenderer = (window as any).require('electron').ipcRenderer;
            } catch (e) {
                console.warn('Electron IPC not available');
            }
        }
    }

    isElectron(): boolean {
        return !!(window && (window as any).process && (window as any).process.type) ||
            (!!(window && window.navigator && window.navigator.userAgent && window.navigator.userAgent.indexOf('Electron') >= 0));
    }

    async printInvoice(invoice: any): Promise<any> {
        if (this.ipcRenderer) {
            return await this.ipcRenderer.invoke('print-invoice', invoice);
        } else {
            console.warn('Electron IPC not available');
            alert('Printing is only supported in Electron mode');
        }
    }

    async previewInvoice(invoice: any): Promise<string> {
        if (this.ipcRenderer) {
            return await this.ipcRenderer.invoke('preview-invoice', invoice);
        }
        return '';
    }

    async printEstimate(estimate: any): Promise<any> {
        if (this.ipcRenderer) {
            return await this.ipcRenderer.invoke('print-estimate', estimate);
        }
    }

    async previewEstimate(estimate: any): Promise<string> {
        if (this.ipcRenderer) {
            return await this.ipcRenderer.invoke('preview-estimate', estimate);
        }
        return '';
    }

    async saveInvoicePdf(invoice: any): Promise<boolean> {
        if (this.ipcRenderer) {
            return await this.ipcRenderer.invoke('save-invoice-pdf', invoice);
        }
        return false;
    }

    async saveEstimatePdf(estimate: any): Promise<boolean> {
        if (this.ipcRenderer) {
            return await this.ipcRenderer.invoke('save-estimate-pdf', estimate);
        }
        return false;
    }

    openExternal(url: string): void {
        if (this.isElectron()) {
            const { shell } = (window as any).require('electron');
            shell.openExternal(url);
        } else {
            window.open(url, '_blank');
        }
    }

    sendReadyToPrint() {
        if (this.ipcRenderer) {
            this.ipcRenderer.send('ready-to-print');
        }
    }

    send(channel: string, ...args: any[]) {
        if (this.ipcRenderer) {
            this.ipcRenderer.send(channel, ...args);
        }
    }

    on(channel: string, listener: (event: any, ...args: any[]) => void) {
        if (this.ipcRenderer) {
            this.ipcRenderer.on(channel, listener);
        }
    }
}
