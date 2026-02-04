import { StyleSheet, Font } from '@react-pdf/renderer';

// Register Inter font to match Desktop
Font.register({
    family: 'Inter',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff' },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff', fontWeight: 600 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff', fontWeight: 700 },
        { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuDyYAZ9hjp-Ek-_EeA.woff', fontWeight: 800 },
    ]
});

export const styles = StyleSheet.create({
    page: {
        fontFamily: 'Inter',
        padding: 30,
        backgroundColor: '#FFFFFF',
        color: '#1e293b',
        fontSize: 9,
        lineHeight: 1.3
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: 5,
        borderBottomWidth: 1.5,
        borderBottomColor: '#059669',
        marginBottom: 5
    },
    companyName: {
        fontSize: 15,
        fontWeight: 800,
        color: '#047857',
        textTransform: 'uppercase',
        marginBottom: 2
    },
    tagline: {
        fontSize: 8,
        fontWeight: 500,
        color: '#64748b'
    },
    badge: {
        backgroundColor: '#d1fae5',
        color: '#047857',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: 0.5
    },
    metaBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 4,
        marginBottom: 15,
        borderWidth: 0.5,
        borderColor: '#e2e8f0'
    },
    metaItem: {
        flexDirection: 'column'
    },
    metaLabel: {
        fontSize: 7,
        textTransform: 'uppercase',
        color: '#64748b',
        fontWeight: 600,
        marginBottom: 1
    },
    metaValue: {
        fontSize: 9,
        fontWeight: 700,
        color: '#1e293b'
    },
    addressGrid: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 15
    },
    addrCard: {
        flex: 1,
        borderWidth: 0.5,
        borderColor: '#e2e8f0',
        borderRadius: 4
    },
    addrHeader: {
        backgroundColor: '#f8fafc',
        padding: 5,
        fontSize: 8,
        fontWeight: 700,
        textTransform: 'uppercase',
        color: '#64748b',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e2e8f0'
    },
    addrBody: {
        padding: 8
    },
    strongName: {
        fontSize: 10,
        fontWeight: 700,
        marginBottom: 3
    },
    addrRow: {
        fontSize: 8.5,
        flexDirection: 'row',
        marginBottom: 2,
        lineHeight: 1.3
    },
    addrLabel: {
        color: '#64748b',
        width: 45,
        fontWeight: 600
    },
    table: {
        width: '100%',
        marginBottom: 15
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#059669',
        paddingVertical: 6,
        paddingHorizontal: 5,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3
    },
    th: {
        color: 'white',
        fontSize: 8,
        fontWeight: 700,
        textTransform: 'uppercase'
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#e2e8f0',
        paddingVertical: 5,
        paddingHorizontal: 5,
        alignItems: 'center'
    },
    td: {
        fontSize: 8.5,
        color: '#1e293b'
    },
    tdBold: {
        fontSize: 8.5,
        color: '#1e293b',
        fontWeight: 700
    },
    itemMain: {
        fontWeight: 600,
        marginBottom: 1
    },
    footerGrid: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 5
    },
    notesPanel: {
        flex: 1
    },
    panelHeader: {
        fontSize: 7,
        fontWeight: 700,
        textTransform: 'uppercase',
        color: '#047857',
        marginBottom: 2
    },
    panelBody: {
        fontSize: 8,
        color: '#64748b',
        borderLeftWidth: 1.5,
        borderLeftColor: '#e2e8f0',
        paddingLeft: 5,
        lineHeight: 1.4
    },
    totalsPanel: {
        width: '35%',
        padding: 8,
        backgroundColor: '#f8fafc',
        borderRadius: 4,
        borderWidth: 0.5,
        borderColor: '#e2e8f0'
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 3,
        paddingVertical: 1,
        alignItems: 'center'
    },
    totalLabel: {
        fontSize: 8.5,
        color: '#64748b',
        fontWeight: 600
    },
    totalVal: {
        fontSize: 8.5,
        fontWeight: 700
    },
    grandTotal: {
        backgroundColor: '#059669',
        color: 'white',
        padding: 6,
        borderRadius: 3,
        marginTop: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    grandTotalLabel: {
        fontSize: 8,
        fontWeight: 600,
        color: 'white'
    },
    grandTotalVal: {
        fontSize: 11,
        fontWeight: 800,
        color: 'white'
    },
    pageFooter: {
        marginTop: 20,
        borderTopWidth: 0.5,
        borderTopColor: '#e2e8f0',
        paddingTop: 8,
        alignItems: 'center'
    },
    footerText: {
        fontSize: 7,
        color: '#64748b'
    }
});
