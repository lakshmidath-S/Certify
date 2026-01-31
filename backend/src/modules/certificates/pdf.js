const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

async function generatePDF(certificateData, qrBuffer) {
    try {
        const {
            ownerName,
            courseName,
            issuerName,
            issuedAt,
            certificateHash
        } = certificateData;

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595, 842]);

        const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const { width, height } = page.getSize();

        page.drawText('CERTIFICATE', {
            x: width / 2 - 100,
            y: height - 100,
            size: 36,
            font: timesRomanBold,
            color: rgb(0, 0, 0.5)
        });

        page.drawText('This is to certify that', {
            x: width / 2 - 80,
            y: height - 180,
            size: 14,
            font: timesRomanFont,
            color: rgb(0, 0, 0)
        });

        page.drawText(ownerName, {
            x: width / 2 - (ownerName.length * 6),
            y: height - 220,
            size: 24,
            font: timesRomanBold,
            color: rgb(0, 0, 0)
        });

        page.drawText('has successfully completed', {
            x: width / 2 - 90,
            y: height - 270,
            size: 14,
            font: timesRomanFont,
            color: rgb(0, 0, 0)
        });

        page.drawText(courseName, {
            x: width / 2 - (courseName.length * 5),
            y: height - 310,
            size: 20,
            font: timesRomanBold,
            color: rgb(0, 0, 0)
        });

        page.drawText(`Issued by: ${issuerName}`, {
            x: 50,
            y: height - 380,
            size: 12,
            font: helvetica,
            color: rgb(0, 0, 0)
        });

        page.drawText(`Issue Date: ${new Date(issuedAt).toLocaleDateString()}`, {
            x: 50,
            y: height - 400,
            size: 12,
            font: helvetica,
            color: rgb(0, 0, 0)
        });

        page.drawText('Certificate Hash:', {
            x: 50,
            y: height - 450,
            size: 10,
            font: helvetica,
            color: rgb(0.3, 0.3, 0.3)
        });

        const hashLine1 = certificateHash.substring(0, 32);
        const hashLine2 = certificateHash.substring(32);

        page.drawText(hashLine1, {
            x: 50,
            y: height - 470,
            size: 8,
            font: helvetica,
            color: rgb(0.5, 0.5, 0.5)
        });

        page.drawText(hashLine2, {
            x: 50,
            y: height - 485,
            size: 8,
            font: helvetica,
            color: rgb(0.5, 0.5, 0.5)
        });

        const qrImage = await pdfDoc.embedPng(qrBuffer);
        const qrDims = qrImage.scale(0.5);

        page.drawImage(qrImage, {
            x: width - qrDims.width - 50,
            y: height - 500,
            width: qrDims.width,
            height: qrDims.height
        });

        page.drawText('Scan to verify', {
            x: width - qrDims.width - 30,
            y: height - 520,
            size: 8,
            font: helvetica,
            color: rgb(0.5, 0.5, 0.5)
        });

        page.drawRectangle({
            x: 40,
            y: 40,
            width: width - 80,
            height: height - 80,
            borderColor: rgb(0, 0, 0.5),
            borderWidth: 2
        });

        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes);
    } catch (error) {
        console.error('PDF generation error:', error);
        throw new Error('Failed to generate PDF');
    }
}

module.exports = {
    generatePDF
};
