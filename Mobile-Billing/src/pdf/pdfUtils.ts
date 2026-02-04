import { pdf } from '@react-pdf/renderer';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';
import { Share } from '@capacitor/share';

// Helper to save and handle PDF (Share or Open)
export const handlePdfAction = async (
    docComponent: any,
    fileName: string,
    action: 'share' | 'open'
) => {
    try {
        // 1. Generate Blob
        const blob = await pdf(docComponent).toBlob();

        // 2. Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);

        return new Promise<void>((resolve, reject) => {
            reader.onloadend = async () => {
                try {
                    const base64Data = (reader.result as string).split(',')[1];
                    const fullFileName = `${fileName}.pdf`;

                    // 3. Write to Filesystem (Cache Directory is safest for sharing/opening)
                    const fileResult = await Filesystem.writeFile({
                        path: fullFileName,
                        data: base64Data,
                        directory: Directory.Cache,
                        recursive: true
                    });

                    const uri = fileResult.uri;

                    // 4. Perform Action
                    if (action === 'share') {
                        await Share.share({
                            title: fileName,
                            text: `Here is your document: ${fileName}`,
                            url: uri,
                            dialogTitle: 'Share PDF',
                        });
                    } else {
                        // Open directly
                        await FileOpener.open({
                            filePath: uri,
                            contentType: 'application/pdf',
                        });
                    }
                    resolve();
                } catch (e) {
                    console.error("Error handling PDF:", e);
                    reject(e);
                }
            };
            reader.onerror = reject;
        });

    } catch (error) {
        console.error("PDF Generation failed:", error);
        throw error;
    }
};
