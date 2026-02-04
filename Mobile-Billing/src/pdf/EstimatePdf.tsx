import React from 'react';
import { Page, Text, View, Document } from '@react-pdf/renderer';
import { styles } from './PdfStyles';

interface EstimatePdfProps {
    estimate: any;
    items: any[];
    settings: any;
}

export const EstimatePdf: React.FC<EstimatePdfProps> = ({ estimate, items, settings }) => {

    const formatDate = (d: string | Date | number) => {
        if (!d) return '';
        return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getCustomColumns = () => {
        const standardCols = [
            { id: 'product', name: 'Item', isBuiltIn: true, width: '40%' },
            { id: 'quantity', name: 'Qty', isBuiltIn: true, width: '15%', align: 'center' },
            { id: 'price', name: 'Rate', isBuiltIn: true, width: '20%', align: 'right' },
            { id: 'total', name: 'Amount', isBuiltIn: true, width: '25%', align: 'right' }
        ];

        try {
            if (!settings.customColumns || settings.customColumns === '[]') return standardCols;

            const cols = JSON.parse(settings.customColumns);
            if (cols.length > 0) {
                const hasProduct = cols.some((c: any) => c.id === 'product');

                const wQty = 10;
                const wPrice = 15;
                const wTotal = 15;
                const wProduct = 30;

                if (!hasProduct) {
                    const availableForCustom = 100 - (wProduct + wQty + wPrice + wTotal);
                    const customColWidth = Math.max(10, availableForCustom / cols.length);

                    return [
                        { id: 'product', name: 'Item', isBuiltIn: true, width: `${wProduct}%` },
                        ...cols.map((c: any) => ({ ...c, width: `${customColWidth}%`, align: 'left' })),
                        { id: 'quantity', name: 'Qty', isBuiltIn: true, width: `${wQty}%`, align: 'center' },
                        { id: 'price', name: 'Rate', isBuiltIn: true, width: `${wPrice}%`, align: 'right' },
                        { id: 'total', name: 'Amount', isBuiltIn: true, width: `${wTotal}%`, align: 'right' }
                    ];
                } else {
                    return cols.map((c: any) => ({ ...c, width: c.width || `${100 / cols.length}%`, align: c.align || 'left' }));
                }
            }
        } catch { }
        return standardCols;
    };

    const getColumnLabel = (col: any) => {
        if (col.id === 'product') return (settings?.columnLabels && JSON.parse(settings.columnLabels).product) || 'Item';
        if (col.id === 'quantity') return (settings?.columnLabels && JSON.parse(settings.columnLabels).quantity) || 'Qty';
        if (col.id === 'price') return (settings?.columnLabels && JSON.parse(settings.columnLabels).price) || 'Rate';
        if (col.id === 'total') return (settings?.columnLabels && JSON.parse(settings.columnLabels).total) || 'Amount';
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

        if (item.customValues) {
            const vals = typeof item.customValues === 'string' ? JSON.parse(item.customValues) : item.customValues;
            return vals[col.name] || '';
        }
        return '';
    };

    // Safe Total Calculations
    const subTotal = Number(estimate.subTotal || estimate.subtotal || 0);
    const taxTotal = Number(estimate.taxTotal || estimate.tax || 0);
    const total = Number(estimate.total || 0);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: '#6366f1' }]}>
                    <View>
                        <Text style={[styles.companyName, { color: '#6366f1' }]}>{settings?.companyName || 'My Company'}</Text>
                        <Text style={styles.tagline}>Professional & Reliable Services</Text>
                    </View>
                    <Text style={[styles.badge, { backgroundColor: '#e0e7ff', color: '#4338ca' }]}>ESTIMATE</Text>
                </View>

                {/* Estimate Info */}
                <View style={styles.metaBar}>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Estimate #</Text>
                        <Text style={styles.metaValue}>{estimate.id}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Date</Text>
                        <Text style={styles.metaValue}>{formatDate(estimate.date)}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Valid Until</Text>
                        <Text style={styles.metaValue}>{formatDate(new Date(new Date(estimate.date).setDate(new Date(estimate.date).getDate() + 15)))}</Text>
                    </View>
                </View>

                {/* Addresses */}
                <View style={styles.addressGrid}>
                    <View style={styles.addrCard}>
                        <Text style={styles.addrHeader}>From</Text>
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
                                        {/* Fallback */}
                                        {(!config.displayFields || config.displayFields.length === 0) && (
                                            <>
                                                <View style={styles.addrRow}>
                                                    <Text style={styles.addrLabel}>Phone:</Text>
                                                    <Text style={styles.td}>{settings?.companyPhone}</Text>
                                                </View>
                                            </>
                                        )}
                                    </>
                                );
                            })()}
                        </View>
                    </View>
                    <View style={styles.addrCard}>
                        <Text style={styles.addrHeader}>To</Text>
                        <View style={styles.addrBody}>
                            <Text style={styles.strongName}>{estimate.client?.name}</Text>
                            <View style={styles.addrRow}>
                                <Text style={styles.addrLabel}>Phone:</Text>
                                <Text style={styles.td}>{estimate.client?.phone}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={[styles.tableHeader, { backgroundColor: '#e0e7ff' }]}>
                        {columns.map((col: any, i: number) => (
                            <Text key={i} style={[styles.th, { color: '#4338ca', width: col.width, textAlign: getColumnAlign(col) }]}>
                                {getColumnLabel(col)}
                            </Text>
                        ))}
                    </View>
                    {items.map((item, i) => (
                        <View key={i} style={[styles.tableRow, { backgroundColor: i % 2 === 0 ? 'white' : '#f5f3ff' }]}>
                            {columns.map((col: any, j: number) => (
                                <Text key={j} style={[col.id === 'total' ? styles.tdBold : styles.td, { width: col.width, textAlign: getColumnAlign(col) }]}>
                                    {getColValue(col, item)}
                                </Text>
                            ))}
                        </View>
                    ))}
                </View>

                {/* Footer */}
                <View style={styles.footerGrid}>
                    <View style={styles.notesPanel}>
                        <Text style={[styles.panelHeader, { color: '#4338ca' }]}>Note</Text>
                        <Text style={styles.panelBody}>This is an estimate, not a final invoice.</Text>
                    </View>
                    <View style={styles.totalsPanel}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal</Text>
                            <Text style={styles.totalVal}>{subTotal.toFixed(2)}</Text>
                        </View>
                        {taxTotal > 0 && (
                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>Tax</Text>
                                <Text style={styles.totalVal}>{taxTotal.toFixed(2)}</Text>
                            </View>
                        )}
                        <View style={[styles.grandTotal, { backgroundColor: '#6366f1' }]}>
                            <Text style={styles.grandTotalLabel}>Estimated Total</Text>
                            <Text style={styles.grandTotalVal}>₹ {total.toFixed(2)}</Text>
                        </View>
                        <Text style={{ fontSize: 9, textAlign: 'center', marginTop: 10, color: '#6366f1', borderWidth: 1, borderColor: '#6366f1', padding: 4, borderRadius: 4 }}>
                            PROVISIONAL QUOTATION
                        </Text>
                    </View>
                </View>

                <View style={styles.pageFooter}>
                    <Text style={styles.footerText}>
                        {settings?.companyName} • {settings?.companyAddress || 'City, Country'} • Generated on {new Date().toLocaleString()}
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
