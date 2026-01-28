export class CreateEstimateDto {
    date: Date;
    clientId: number;
    items: {
        productId: number;
        quantity: number;
        productName?: string;
        customValues?: string;
        price?: number;
    }[];
    total: number;
    subTotal: number;
    taxTotal: number;
    gstEnabled: boolean;
    gstRate?: string;
    columnLabels?: string;
    customColumns?: string;
    status?: string;
    discountAmount?: number;
    isSimpleEstimate?: boolean;
    notes?: string;
}
