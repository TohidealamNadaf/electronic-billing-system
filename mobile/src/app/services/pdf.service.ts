
import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

(<any>pdfMake).vfs = pdfFonts.pdfMake.vfs;

@Injectable({
    providedIn: 'root'
})
export class PdfService {

    constructor(private platform: Platform) { }

    async generateInvoicePdf(invoice: any, settings: any) {
        const docDefinition = this.getDocDefinition(invoice, settings, 'Invoice');
        await this.createAndSharePdf(docDefinition, `invoice_${invoice.id}.pdf`);
    }

    async generateEstimatePdf(estimate: any, settings: any) {
        const docDefinition = this.getDocDefinition(estimate, settings, 'Estimate');
        await this.createAndSharePdf(docDefinition, `estimate_${estimate.id}.pdf`);
    }

    private getDocDefinition(data: any, settings: any, type: string) {
        const items = data.items || [];
        const client = data.client || {};
        const business = settings.businessProfileConfig || {};

        // Helper to format currency
        const fmt = (val: number) => '₹' + (val || 0).toFixed(2);
        const formatDate = (d: any) => {
            if (!d) return '';
            return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
        };

        // Construct Business Address Block
        const businessDetails = [];
        if (business.showName) businessDetails.push({ text: (business.nameDisplayType === 'owner' ? settings.companyOwner : settings.companyName) || '', bold: true, fontSize: 10 });

        const displayFields = business.displayFields || [];
        // Migration fallback
        if (displayFields.length === 0) {
            if (business.showAddress) businessDetails.push({ text: settings.companyAddress || '', fontSize: 9, color: '#64748b' });
            if (business.showContact && settings.companyPhone) businessDetails.push({ text: 'Tel: ' + settings.companyPhone, fontSize: 9, color: '#64748b' });
            if (business.showGst && settings.gstNumber) businessDetails.push({ text: 'GST: ' + settings.gstNumber, fontSize: 9, color: '#64748b' });
        } else {
            displayFields.forEach((f: any) => {
                if (f.show) {
                    let val = '';
                    if (f.id === 'address') val = settings.companyAddress;
                    else if (f.id === 'phone') val = settings.companyPhone;
                    else if (f.id === 'gst') val = settings.gstNumber;
                    else val = f.value;

                    if (val) businessDetails.push({ text: (f.key ? f.key + ': ' : '') + val, fontSize: 9, color: '#64748b' });
                }
            });
        }

        // Construct Client Address Block
        const clientDetails = [
            { text: client.name || 'Walk-in Customer', bold: true, fontSize: 10 },
            { text: client.address || '', fontSize: 9, color: '#64748b' },
            client.phone ? { text: 'Tel: ' + client.phone, fontSize: 9, color: '#64748b' } : null
        ].filter(Boolean);


        // Table Header
        const customCols = data.customColumns && typeof data.customColumns === 'string' ? JSON.parse(data.customColumns) : (data.customColumns || []);

        // Fallback defaults if no custom columns found
        let tableCols = customCols.length > 0 ? customCols : [
            { id: 'product', name: 'Item', isBuiltIn: true },
            { id: 'quantity', name: 'Qty', isBuiltIn: true },
            { id: 'price', name: 'Price', isBuiltIn: true },
            { id: 'total', name: 'Total', isBuiltIn: true }
        ];

        // Normalize new vs old format
        tableCols = tableCols.map((c: any) => ({
            ...c,
            name: c.isBuiltIn ? (data.columnLabels?.[c.id] || c.id) : c.name
        }));

        const tableHeader = tableCols.map((c: any) => ({
            text: c.name.toUpperCase(),
            style: 'tableHeader',
            alignment: c.id === 'quantity' ? 'center' : (c.id === 'price' || c.id === 'total' ? 'right' : 'left')
        }));

        const tableBody = [];
        tableBody.push(tableHeader);

        items.forEach((item: any, index: number) => {
            const row = tableCols.map((c: any) => {
                let val: any = '';
                if (c.id === 'product') val = item.productName || item.product?.name;
                else if (c.id === 'quantity') val = item.quantity;
                else if (c.id === 'price') val = fmt(item.price);
                else if (c.id === 'total') val = fmt(item.price * item.quantity);
                else {
                    // Custom
                    const cv = typeof item.customValues === 'string' ? JSON.parse(item.customValues) : (item.customValues || {});
                    val = cv[c.name] || '';
                    if (c.type === 'number' || c.isCurrency) val = c.isCurrency ? fmt(Number(val) || 0) : val;
                }

                return {
                    text: val,
                    style: index % 2 === 1 ? 'tableRowEven' : 'tableRowOdd',
                    alignment: c.id === 'quantity' ? 'center' : (c.id === 'price' || c.id === 'total' ? 'right' : 'left')
                };
            });
            tableBody.push(row);
        });

        const doc: any = {
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 60],
            content: [
                // Top Header
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: settings.companyName || 'Company Name', style: 'companyName' },
                                { text: 'Professional & Reliable Services', style: 'tagline' }
                            ]
                        },
                        {
                            width: 'auto',
                            text: type.toUpperCase(),
                            style: 'badge'
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },

                // Meta Bar
                {
                    style: 'metaBar',
                    table: {
                        widths: ['*', '*', '*'],
                        body: [[
                            { stack: [{ text: 'REFERENCE', style: 'metaLabel' }, { text: this.getInvoiceNumberDate(data.date), style: 'metaValue' }] },
                            { stack: [{ text: 'DATE', style: 'metaLabel' }, { text: formatDate(data.date), style: 'metaValue' }] },
                            { stack: [{ text: 'DUE DATE', style: 'metaLabel' }, { text: 'On Receipt', style: 'metaValue' }] }
                        ]]
                    },
                    layout: 'noBorders'
                },

                // Addresses
                {
                    columns: [
                        {
                            width: '*',
                            style: 'addrCard',
                            stack: [
                                { text: 'INVOICED BY', style: 'addrHeader' },
                                { stack: businessDetails, margin: [8, 8, 8, 8] }
                            ]
                        },
                        { width: 20, text: '' }, // Spacer
                        {
                            width: '*',
                            style: 'addrCard',
                            stack: [
                                { text: 'BILLED TO', style: 'addrHeader' },
                                { stack: clientDetails, margin: [8, 8, 8, 8] }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 20]
                },

                // Items Table
                {
                    style: 'itemsTable',
                    table: {
                        headerRows: 1,
                        widths: tableCols.map((c: any) => c.id === 'product' ? '*' : (c.id === 'quantity' ? 'auto' : 'auto')), // Simplified widths
                        body: tableBody
                    },
                    layout: {
                        hLineWidth: (i: number, node: any) => (i === 1 ? 0 : 1), // Only bottom border for rows
                        vLineWidth: () => 0,
                        hLineColor: '#e2e8f0',
                        fillColor: (i: number) => (i === 0 ? '#059669' : (i % 2 === 0 ? '#ffffff' : '#f8fafc'))
                    }
                },

                // Footer Grid
                {
                    columns: [
                        // Notes
                        {
                            width: '*',
                            stack: settings.showTerms ? [
                                { text: 'TERMS & CONDITIONS', style: 'panelHeader' },
                                { text: settings.termsAndConditions, style: 'panelBody' }
                            ] : []
                        },
                        // Totals
                        {
                            width: 200,
                            style: 'totalsPanel',
                            stack: [
                                {
                                    columns: [{ text: 'Subtotal', style: 'totalLabel' }, { text: fmt(data.subTotal), style: 'totalValue', alignment: 'right' }],
                                    margin: [0, 2]
                                },
                                data.discountAmount > 0 ? {
                                    columns: [{ text: 'Discount', style: 'totalLabel', color: '#dc2626' }, { text: '-' + fmt(data.discountAmount), style: 'totalValue', alignment: 'right', color: '#dc2626' }],
                                    margin: [0, 2]
                                } : null,
                                data.gstEnabled ? {
                                    columns: [{ text: `GST (${settings.gstRate})`, style: 'totalLabel' }, { text: fmt(data.taxTotal), style: 'totalValue', alignment: 'right' }],
                                    margin: [0, 2]
                                } : null,
                                {
                                    style: 'grandTotalBox',
                                    columns: [{ text: 'Total Amount', color: 'white', bold: true }, { text: fmt(data.total), color: 'white', bold: true, alignment: 'right', fontSize: 12 }]
                                }
                            ].filter(Boolean)
                        }
                    ],
                    margin: [0, 20, 0, 0]
                },

                // Page Footer
                {
                    text: `${settings.companyName} • ${settings.companyAddress || 'Verified Business'}`,
                    style: 'pageFooter',
                    absolutePosition: { x: 40, y: 780 } // Approximate bottom
                }
            ],
            styles: {
                companyName: { fontSize: 18, bold: true, color: '#047857' },
                tagline: { fontSize: 9, color: '#64748b', margin: [0, 2, 0, 0] },
                badge: { fontSize: 14, bold: true, color: '#047857', background: '#d1fae5', padding: [10, 5] },

                metaBar: { background: '#f8fafc', margin: [0, 0, 0, 20] },
                metaLabel: { fontSize: 9, color: '#64748b', bold: true },
                metaValue: { fontSize: 10, bold: true },

                addrCard: {}, // handled by canvas if simulating border, else simple stack
                addrHeader: { fontSize: 9, bold: true, color: '#64748b', background: '#f8fafc', padding: [5, 5] },

                tableHeader: { fontSize: 10, bold: true, color: 'white', margin: [2, 4] },
                tableRowOdd: { fontSize: 10, margin: [2, 4], color: '#334155' },
                tableRowEven: { fontSize: 10, margin: [2, 4], color: '#334155' },

                panelHeader: { fontSize: 9, bold: true, color: '#047857', margin: [0, 0, 0, 4] },
                panelBody: { fontSize: 9, color: '#64748b' },

                totalsPanel: { background: '#f8fafc', padding: 10 },
                totalLabel: { fontSize: 10, color: '#64748b', bold: true },
                totalValue: { fontSize: 10, bold: true },
                grandTotalBox: { background: '#059669', padding: 8, margin: [0, 8, 0, 0] },

                pageFooter: { fontSize: 8, color: '#94a3b8', alignment: 'center' }
            },
            defaultStyle: {
                font: 'Roboto' // Native pdfmake font
            }
        };

        return doc;
    }

    private getInvoiceNumberDate(d: any): string {
        if (!d) return '';
        const date = new Date(d);
        const year = date.getFullYear();
        const month = ('0' + (date.getMonth() + 1)).slice(-2);
        const day = ('0' + date.getDate()).slice(-2);
        return `${year}${month}${day}`;
    }

    private async createAndSharePdf(docDefinition: any, fileName: string) {
        pdfMake.createPdf(docDefinition).getBase64(async (encoded: string) => {
            try {
                const result = await Filesystem.writeFile({
                    path: fileName,
                    data: encoded,
                    directory: Directory.Documents,
                });

                await Share.share({
                    url: result.uri,
                    title: 'Share PDF',
                    dialogTitle: 'Share PDF'
                });
            } catch (err) {
                console.error('Error creating PDF', err);
                alert('Error creating PDF. Please check permissions.');
            }
        });
    }
}
