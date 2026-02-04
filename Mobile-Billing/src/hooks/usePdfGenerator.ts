import { useState } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { pdf } from '@react-pdf/renderer';
import { createElement } from 'react';
import { InvoicePdf } from '../pdf/InvoicePdf';
import { EstimatePdf } from '../pdf/EstimatePdf';

export function usePdfGenerator() {
    const [isGenerating, setIsGenerating] = useState(false);

    // Updated signature: we now pass DATA, not DOM ID
    // type: 'invoice' | 'estimate'
    const generateAndShare = async (type: 'invoice' | 'estimate', data: any, settings: any, filename: string) => {
        try {
            setIsGenerating(true);

            let doc;
            if (type === 'invoice') {
                doc = createElement(InvoicePdf, { invoice: data, items: data.items || [], settings });
            } else {
                doc = createElement(EstimatePdf, { estimate: data, items: data.items || [], settings });
            }

            // @ts-ignore
            const blob = await pdf(doc).toBlob();

            if (Capacitor.getPlatform() === 'web') {
                // Web: Download directly
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                // Mobile: Convert blob to base64
                const reader = new FileReader();
                reader.readAsDataURL(blob);
                reader.onloadend = async () => {
                    const base64data = (reader.result as string).split(',')[1];
                    const path = `${filename}.pdf`;

                    await Filesystem.writeFile({
                        path: path,
                        data: base64data,
                        directory: Directory.Cache,
                        // encoding: Encoding.UTF8 // Not needed for base64 data
                    });

                    const fileUri = await Filesystem.getUri({
                        path: path,
                        directory: Directory.Cache
                    });

                    await Share.share({
                        title: `Share ${filename}`,
                        text: `Here is your ${filename}`,
                        url: fileUri.uri,
                        dialogTitle: 'Share PDF'
                    });
                };
            }

        } catch (error) {
            console.error("PDF Gen Error:", error);
            alert("Failed to generate PDF");
        } finally {
            setIsGenerating(false);
        }
    };

    return { generateAndShare, isGenerating };
}
