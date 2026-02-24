const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const MONTHS = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

function getMonthName(month) {
    const m = parseInt(month, 10);
    return MONTHS[m] || String(month);
}

async function generatePDF(certificateData, qrBuffer) {
    try {
        const {
            ownerName,
            courseName,
            department,
            issueMonth,
            issueYear,
            graduationMonth,
            graduationYear,
            issuerName,
            certificateHash
        } = certificateData;

        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([842, 595]); // Landscape A4

        const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
        const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

        const { width, height } = page.getSize();

        // ── Colors ──
        const navy = rgb(0.05, 0.1, 0.35);
        const gold = rgb(0.72, 0.53, 0.04);
        const darkGray = rgb(0.25, 0.25, 0.25);
        const lightGray = rgb(0.55, 0.55, 0.55);

        // ── Decorative outer border ──
        page.drawRectangle({
            x: 20, y: 20,
            width: width - 40, height: height - 40,
            borderColor: gold, borderWidth: 3
        });
        page.drawRectangle({
            x: 30, y: 30,
            width: width - 60, height: height - 60,
            borderColor: navy, borderWidth: 1
        });

        // ── Header: "CERTIFICATE" ──
        const certTitle = 'CERTIFICATE';
        const titleWidth = timesBold.widthOfTextAtSize(certTitle, 40);
        page.drawText(certTitle, {
            x: (width - titleWidth) / 2,
            y: height - 80,
            size: 40,
            font: timesBold,
            color: navy
        });

        // ── Gold line under title ──
        page.drawLine({
            start: { x: width / 2 - 140, y: height - 90 },
            end: { x: width / 2 + 140, y: height - 90 },
            thickness: 2,
            color: gold
        });

        // ── "This is to certify that" ──
        const subText = 'This is to certify that';
        const subWidth = timesItalic.widthOfTextAtSize(subText, 14);
        page.drawText(subText, {
            x: (width - subWidth) / 2,
            y: height - 130,
            size: 14,
            font: timesItalic,
            color: darkGray
        });

        // ── Student Name (prominent) ──
        const nameWidth = timesBold.widthOfTextAtSize(ownerName, 30);
        page.drawText(ownerName, {
            x: (width - nameWidth) / 2,
            y: height - 175,
            size: 30,
            font: timesBold,
            color: navy
        });

        // ── Underline the name ──
        page.drawLine({
            start: { x: (width - nameWidth) / 2 - 10, y: height - 180 },
            end: { x: (width + nameWidth) / 2 + 10, y: height - 180 },
            thickness: 1,
            color: gold
        });

        // ── "has successfully completed" ──
        const completedText = 'has successfully completed the course';
        const completedWidth = timesRoman.widthOfTextAtSize(completedText, 14);
        page.drawText(completedText, {
            x: (width - completedWidth) / 2,
            y: height - 215,
            size: 14,
            font: timesRoman,
            color: darkGray
        });

        // ── Course Name ──
        const courseWidth = timesBold.widthOfTextAtSize(courseName, 22);
        page.drawText(courseName, {
            x: (width - courseWidth) / 2,
            y: height - 250,
            size: 22,
            font: timesBold,
            color: navy
        });

        // ── Department ──
        if (department) {
            const deptText = `Department of ${department}`;
            const deptWidth = timesRoman.widthOfTextAtSize(deptText, 14);
            page.drawText(deptText, {
                x: (width - deptWidth) / 2,
                y: height - 278,
                size: 14,
                font: timesRoman,
                color: darkGray
            });
        }

        // ── Graduation info ──
        if (graduationMonth && graduationYear) {
            const gradText = `Graduation: ${getMonthName(graduationMonth)} ${graduationYear}`;
            const gradWidth = timesRoman.widthOfTextAtSize(gradText, 12);
            page.drawText(gradText, {
                x: (width - gradWidth) / 2,
                y: height - 305,
                size: 12,
                font: timesRoman,
                color: darkGray
            });
        }

        // ── Bottom section: two columns ──
        const bottomY = 130;

        // Left column: Issuer & Date
        page.drawText('Issued By', {
            x: 70, y: bottomY + 40,
            size: 10, font: helvetica, color: lightGray
        });
        page.drawText(issuerName || 'Authorized Issuer', {
            x: 70, y: bottomY + 22,
            size: 13, font: timesBold, color: darkGray
        });

        const issueDateStr = issueMonth && issueYear
            ? `${getMonthName(issueMonth)} ${issueYear}`
            : 'N/A';
        page.drawText('Date of Issue', {
            x: 70, y: bottomY - 5,
            size: 10, font: helvetica, color: lightGray
        });
        page.drawText(issueDateStr, {
            x: 70, y: bottomY - 22,
            size: 12, font: timesRoman, color: darkGray
        });

        // ── Signature line ──
        page.drawLine({
            start: { x: 70, y: bottomY + 18 },
            end: { x: 230, y: bottomY + 18 },
            thickness: 0.5, color: lightGray
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
