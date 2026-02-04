import React from 'react';
import { Page, Text, View, Document } from '@react-pdf/renderer';
import { styles } from './PdfStyles';

interface InvoicePdfProps {
    invoice: any;
    items: any[];
    settings: any;
}

export const InvoicePdf: React.FC<InvoicePdfProps> = ({ invoice, items, settings }) => {

    const formatDate = (d: string | Date | number) => {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    };



    const getCustomColumns = () => {
        const standardCols = [
            { id: 'product', name: 'Description', isBuiltIn: true, width: '40%' },
            { id: 'quantity', name: 'Qty', isBuiltIn: true, width: '15%', align: 'center' },
            { id: 'price', name: 'Unit Price', isBuiltIn: true, width: '20%', align: 'right' },
            { id: 'total', name: 'Total', isBuiltIn: true, width: '25%', align: 'right' }
        ];

        try {
            if (!settings.customColumns || settings.customColumns === '[]') return standardCols;

            const cols = JSON.parse(settings.customColumns);
            if (cols.length > 0) {
                // If Custom Columns exist, we must use dynamic width to ensure 100% total
                // 1. Identify if 'product' is in the custom list or needs to be added
                const hasProduct = cols.some((c: any) => c.id === 'product');

                // Fixed widths for standard fields (adjusted to be compact)
                const wQty = 10;
                const wPrice = 15;
                const wTotal = 15;
                const wProduct = 30; // Base width for product

                if (!hasProduct) {
                    // Standard Mode with Extra Columns:
                    // We have Product (30%) + Qty (10%) + Price (15%) + Total (15%) = 70%
                    // Remaining 30% is divided among custom columns
                    const availableForCustom = 100 - (wProduct + wQty + wPrice + wTotal);
                    const customColWidth = Math.max(10, availableForCustom / cols.length); // At least 10%

                    return [
                        { id: 'product', name: 'Description', isBuiltIn: true, width: `${wProduct}%` },
                        ...cols.map((c: any) => ({ ...c, width: `${customColWidth}%`, align: 'left' })),
                        { id: 'quantity', name: 'Qty', isBuiltIn: true, width: `${wQty}%`, align: 'center' },
                        { id: 'price', name: 'Unit Price', isBuiltIn: true, width: `${wPrice}%`, align: 'right' },
                        { id: 'total', name: 'Total', isBuiltIn: true, width: `${wTotal}%`, align: 'right' }
                    ];
                } else {
                    // Fully Custom Mode: Use widths from settings or distribute evenly
                    return cols.map((c: any) => ({ ...c, width: c.width || `${100 / cols.length}%`, align: c.align || 'left' }));
                }
            }
        } catch (e) {
            // Fallback
        }
        return standardCols;
    };

    const getColumnLabel = (col: any) => {
        // Always return a value for built-in columns
        if (col.id === 'product') return (settings?.columnLabels && JSON.parse(settings.columnLabels).product) || 'Description';
        if (col.id === 'quantity') return (settings?.columnLabels && JSON.parse(settings.columnLabels).quantity) || 'Qty';
        if (col.id === 'price') return (settings?.columnLabels && JSON.parse(settings.columnLabels).price) || 'Unit Price';
        if (col.id === 'total') return (settings?.columnLabels && JSON.parse(settings.columnLabels).total) || 'Total';
        return col.name || '';
    };

    const getColumnAlign = (col: any) => {
        if (col.id === 'quantity') return 'center';
        if (col.id === 'price' || col.id === 'total') return 'right';
        return col.align || 'left';
    };

    const columns = getCustomColumns();

    const evaluateFormula = (formula: string, item: any): number => {
        try {
            const cleanFormula = formula
                .replace(/price/g, String(item.price || 0))
                .replace(/qty/g, String(item.quantity || 0))
                .replace(/[^0-9+\-*/().]/g, '');
            // eslint-disable-next-line
            return (new Function('return ' + cleanFormula))() || 0;
        } catch (e) {
            return 0;
        }
    };

    const getColValue = (col: any, item: any) => {
        if (col.id === 'product') {
            return item.productName || item.product?.name || '';
        }
        if (col.id === 'quantity') return item.quantity;
        if (col.id === 'price') return Number(item.price).toFixed(2);
        if (col.id === 'total') return (item.price * item.quantity).toFixed(2);

        if (col.type === 'calculated') {
            return evaluateFormula(col.formula, item).toFixed(2);
        }

        // Custom Fields
        if (item.customValues) {
            const vals = typeof item.customValues === 'string' ? JSON.parse(item.customValues) : item.customValues;
            return vals[col.name] || '';
        }
        return '';
    };

    // Safe Total Calculations
    const subTotal = Number(invoice.subTotal || invoice.subtotal || 0);
    const taxTotal = Number(invoice.taxTotal || invoice.tax || 0);
    const discountAmount = Number(invoice.discountAmount || 0);
    const total = Number(invoice.total || 0);
    const gstRate = invoice.gstRate || 0;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.companyName}>{settings?.companyName || 'My Company'}</Text>
                        <Text style={styles.tagline}>Professional & Reliable Services</Text>
                    </View>
                    <Text style={styles.badge}>INVOICE</Text>
                </View>

                {/* Meta Bar */}
                <View style={styles.metaBar}>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Reference</Text>
                        <Text style={styles.metaValue}>{invoice.invoiceNumber || 'Draft'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Invoice Date</Text>
                        <Text style={styles.metaValue}>{formatDate(invoice.date)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Due Date</Text>
                        <Text style={styles.metaValue}>On Receipt</Text>
                    </View>
                </View>

                {/* Addresses */}
                <View style={styles.addressGrid}>
                    {/* From */}
                    <View style={styles.addrCard}>
                        <Text style={styles.addrHeader}>Invoiced By</Text>
                        <View style={styles.addrBody}>
                            {(function () {
                                const config = settings.businessProfileConfig ? JSON.parse(settings.businessProfileConfig) : {};
                                const showName = config.showName !== false;
                                const displayType = config.nameDisplayType || 'company';
                                const displayName = displayType === 'owner' ? settings.companyOwner : settings.companyName;

                                return (
                                    <>
                                        {showName && <Text style={styles.strongName}>{displayName}</Text>}
                                        {config.displayFields && config.displayFields.map((field: any, i: number) => {
                                            if (!field.show) return null;
                                            return (
                                                <View key={i} style={styles.addrRow}>
                                                    <Text style={styles.addrLabel}>{field.key}:</Text>
                                                    <Text style={[styles.td, { flex: 1 }]}>{field.value}</Text>
                                                </View>
                                            );
                                        })}
                                        {/* Fallback if config is missing but legacy fields exist */}
                                        {(!config.displayFields || config.displayFields.length === 0) && (
                                            <>
                                                <View style={styles.addrRow}>
                                                    <Text style={styles.addrLabel}>Address:</Text>
                                                    <Text style={[styles.td, { flex: 1 }]}>{settings?.companyAddress}</Text>
                                                </View>
                                                <View style={styles.addrRow}>
                                                    <Text style={styles.addrLabel}>Phone:</Text>
                                                    <Text style={styles.td}>{settings?.companyPhone}</Text>
                                                </View>
                                                <View style={styles.addrRow}>
                                                    <Text style={styles.addrLabel}>Email:</Text>
                                                    <Text style={styles.td}>{settings?.companyEmail}</Text>
                                                </View>
                                            </>
                                        )}
                                    </>
                                );
                            })()}
                        </View>
                    </View>

                    {/* To */}
                    <View style={styles.addrCard}>
                        <Text style={styles.addrHeader}>Billed To</Text>
                        <View style={styles.addrBody}>
                            <Text style={styles.strongName}>{invoice.clientName || invoice.client?.name || 'Walk-in Customer'}</Text>
                            <View style={styles.addrRow}>
                                <Text style={styles.addrLabel}>Client ID:</Text>
                                <Text style={styles.td}>{invoice.clientId || invoice.client?.id || '-'}</Text>
                            </View>
                            {(invoice.clientAddress || invoice.client?.address) && (
                                <View style={styles.addrRow}>
                                    <Text style={styles.addrLabel}>Address:</Text>
                                    <Text style={[styles.td, { flex: 1 }]}>{invoice.clientAddress || invoice.client?.address}</Text>
                                </View>
                            )}
                            {(invoice.clientPhone || invoice.client?.phone) && (
                                <View style={styles.addrRow}>
                                    <Text style={styles.addrLabel}>Phone:</Text>
                                    <Text style={styles.td}>{invoice.clientPhone || invoice.client?.phone}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        {columns.map((col: any, i: number) => (
                            <Text key={i} style={[styles.th, { width: col.width, textAlign: getColumnAlign(col) }]}>
                                {getColumnLabel(col)}
                            </Text>
                        ))}
                    </View>
                    {items.map((item, i) => (
                        <View key={i} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? 'white' : '#f8fafc' }]}>
                            {columns.map((col: any, j: number) => (
                                <Text key={j} style={[col.id === 'total' ? styles.tdBold : styles.td, { width: col.width, textAlign: getColumnAlign(col) }]}>
                                    {getColValue(col, item)}
                                </Text>
                            ))}
                        </View>
                    ))}
                </View>

                {/* Footer Grid */}
                <View style={styles.footerGrid}>
                    <View style={styles.notesPanel}>
                        {settings?.showTerms && (
                            <>
                                <Text style={styles.panelHeader}>Terms & Conditions</Text>
                                <Text style={styles.panelBody}>{settings.termsAndConditions || 'Payment due on receipt.'}</Text>
                            </>
                        )}
                    </View>

                    <View style={styles.totalsPanel}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal</Text>
                            <Text style={styles.totalVal}>{subTotal.toFixed(2)}</Text>
                        </View>
                        {discountAmount > 0 && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Discount</Text>
                                <Text style={[styles.totalVal, { color: '#dc2626' }]}>-{discountAmount.toFixed(2)}</Text>
                            </View>
                        )}
                        {(invoice.gstEnabled || taxTotal > 0) && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>GST {gstRate ? `(${gstRate})` : ''}</Text>
                                <Text style={styles.totalVal}>{taxTotal.toFixed(2)}</Text>
                            </View>
                        )}

                        <View style={styles.grandTotal}>
                            <Text style={styles.grandTotalLabel}>Total Amount</Text>
                            <Text style={styles.grandTotalVal}>₹ {total.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.pageFooter}>
                    <Text style={styles.footerText}>{settings?.footerText || 'Thank you for your business!'}</Text>
                    <Text style={[styles.footerText, { marginTop: 2 }]}>Generated by Electronic Billing System</Text>
                </View>
            </Page>
        </Document >
    );
};
