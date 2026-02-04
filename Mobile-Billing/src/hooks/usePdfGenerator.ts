import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export function usePdfGenerator() {
    const [isGenerating, setIsGenerating] = useState(false);

    const generateAndShare = async (elementId: string, filename: string) => {
        try {
            setIsGenerating(true);
            const element = document.getElementById(elementId);
            if (!element) {
                console.error("Element not found:", elementId);
                return;
            }

            // High resolution capture
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');

            // A4 Dimensions: 210mm x 297mm
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

            if (Capacitor.getPlatform() === 'web') {
                // Web: Download directly
                pdf.save(`${filename}.pdf`);
            } else {
                // Mobile: Save to file and share
                const pdfBase64 = pdf.output('datauristring').split(',')[1];

                const path = `${filename}.pdf`;

                await Filesystem.writeFile({
                    path: path,
                    data: pdfBase64,
                    directory: Directory.Cache,
                    // encoding: Encoding.UTF8 // Correct for base64 is not UTF8
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
