export class CreateInvoiceItemDto {
    productId: number;
    quantity: number;
    productName?: string;
    customValues?: string;
    price?: number;
}

export class CreateInvoiceDto {
    clientId: number;
    date: Date;
    items: CreateInvoiceItemDto[];
    subTotal: number;
    taxTotal: number;
    total: number;
    gstEnabled: boolean;
    gstRate: string;
    columnLabels: string;
    customColumns: string;
    paymentStatus?: string;
    paidAmount?: number;
    balanceAmount?: number;
    discountAmount?: number;
    showPaymentDetails?: boolean;
    isSimpleInvoice?: boolean;
    payments?: { date: string; amount: number; note?: string }[];
}
