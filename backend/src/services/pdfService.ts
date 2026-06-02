import PDFDocument from 'pdfkit';

interface CompanyDetails {
  company_name: string;
  address: string;
  phone: string;
  registration_code?: string;
  director_name?: string;
  logo_url?: string;
}

interface CustomerDetails {
  company_name: string;
  contact_name: string;
  email: string;
  phone?: string;
  address: string;
  registration_code?: string;
  director_name?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceDetails {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  currency: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  status: string;
  notes?: string;
}

export function generateInvoicePDF(
  invoice: InvoiceDetails,
  customer: CustomerDetails,
  company: CompanyDetails,
  items: InvoiceItem[]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', (err) => reject(err));

    // Design Tokens
    const primaryColor = '#4f46e5'; // Indigo
    const darkGray = '#1f2937'; // Slate 800
    const lightGray = '#f3f4f6'; // Slate 100
    const borderGray = '#e5e7eb'; // Slate 200
    const accentColor = invoice.status === 'paid' ? '#10b981' : '#f59e0b'; // Green vs Amber

    // Header Left - Company Info
    doc
      .fillColor(primaryColor)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(company.company_name, 50, 50);

    doc
      .fillColor(darkGray)
      .fontSize(10)
      .font('Helvetica')
      .text(company.address, 50, 80, { width: 220 })
      .text(`Phone: ${company.phone}`, 50, 110);

    if (company.registration_code) {
      doc.text(`Reg Code: ${company.registration_code}`, 50, 122);
    }
    if (company.director_name) {
      doc.text(`Director: ${company.director_name}`, 50, 134);
    }

    // Header Right - Invoice details
    doc
      .fillColor(primaryColor)
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('INVOICE', 350, 50, { align: 'right' });

    doc.fillColor(darkGray).fontSize(10);

    // Invoice No
    doc.font('Helvetica-Bold').text('Invoice No:', 350, 90, { width: 90, align: 'left' });
    doc.font('Helvetica').text(invoice.invoice_number, 440, 90, { width: 105, align: 'right' });

    // Issue Date
    doc.font('Helvetica-Bold').text('Issue Date:', 350, 105, { width: 90, align: 'left' });
    doc.font('Helvetica').text(invoice.issue_date, 440, 105, { width: 105, align: 'right' });

    // Due Date
    doc.font('Helvetica-Bold').text('Due Date:', 350, 120, { width: 90, align: 'left' });
    doc.font('Helvetica').text(invoice.due_date, 440, 120, { width: 105, align: 'right' });

    // Status Badge
    doc
      .rect(470, 135, 75, 20)
      .fill(accentColor);
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(invoice.status.toUpperCase(), 470, 141, { width: 75, align: 'center' });

    // Divider Line
    doc
      .moveTo(50, 175)
      .lineTo(545, 175)
      .strokeColor(borderGray)
      .lineWidth(1)
      .stroke();

    // Bill To Section
    doc
      .fillColor(primaryColor)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('BILL TO:', 50, 195);

    doc
      .fillColor(darkGray)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(customer.company_name, 50, 215)
      .font('Helvetica')
      .fontSize(10)
      .text(`Attn: ${customer.contact_name}`, 50, 230)
      .text(customer.address, 50, 245, { width: 250 })
      .text(`Email: ${customer.email}`, 50, 280)
      .text(`Phone: ${customer.phone || 'N/A'}`, 50, 292);
      
    if (customer.registration_code) {
      doc.text(`Reg Code: ${customer.registration_code}`, 50, 304);
    }
    if (customer.director_name) {
      doc.text(`Director: ${customer.director_name}`, 50, 316);
    }

    // Table Header
    const tableTop = 335;
    doc
      .rect(50, tableTop, 495, 20)
      .fill(primaryColor);

    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('DESCRIPTION', 60, tableTop + 6)
      .text('QTY', 340, tableTop + 6, { width: 40, align: 'center' })
      .text('UNIT PRICE', 390, tableTop + 6, { width: 70, align: 'right' })
      .text('TOTAL', 470, tableTop + 6, { width: 65, align: 'right' });

    let currentY = tableTop + 20;

    // Draw Items
    items.forEach((item, index) => {
      // Check page break if Y is close to margin
      if (currentY > 700) {
        doc.addPage();
        currentY = 50;
      }

      const isEven = index % 2 === 0;
      if (isEven) {
        doc
          .rect(50, currentY, 495, 20)
          .fill(lightGray);
      }

      doc
        .fillColor(darkGray)
        .font('Helvetica')
        .fontSize(9)
        .text(item.description, 60, currentY + 6, { width: 270 })
        .text(item.quantity.toString(), 340, currentY + 6, { width: 40, align: 'center' })
        .text(`${invoice.currency} ${item.unit_price.toFixed(2)}`, 390, currentY + 6, { width: 70, align: 'right' })
        .text(`${invoice.currency} ${item.total.toFixed(2)}`, 470, currentY + 6, { width: 65, align: 'right' });

      // Draw bottom border line
      doc
        .moveTo(50, currentY + 20)
        .lineTo(545, currentY + 20)
        .strokeColor(borderGray)
        .lineWidth(0.5)
        .stroke();

      currentY += 20;
    });

    // Totals Block
    if (currentY > 650) {
      doc.addPage();
      currentY = 50;
    }

    const rightAlignX = 350;
    doc
      .fillColor(darkGray)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('Subtotal:', rightAlignX, currentY + 15, { width: 110, align: 'right' })
      .font('Helvetica')
      .text(`${invoice.currency} ${invoice.subtotal.toFixed(2)}`, 470, currentY + 15, { width: 75, align: 'right' });

    doc
      .font('Helvetica-Bold')
      .text(`Tax (${invoice.tax_rate}%):`, rightAlignX, currentY + 30, { width: 110, align: 'right' })
      .font('Helvetica')
      .text(`${invoice.currency} ${invoice.tax_amount.toFixed(2)}`, 470, currentY + 30, { width: 75, align: 'right' });

    // Grand Total Block
    doc
      .rect(rightAlignX + 10, currentY + 45, 175, 25)
      .fill(primaryColor);

    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Grand Total:', rightAlignX + 15, currentY + 53)
      .text(`${invoice.currency} ${invoice.grand_total.toFixed(2)}`, 450, currentY + 53, { width: 85, align: 'right' });

    // Notes
    if (invoice.notes) {
      doc
        .fillColor(darkGray)
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('NOTES / PAYMENT TERMS:', 50, currentY + 90);

      doc
        .font('Helvetica')
        .fontSize(9)
        .text(invoice.notes, 50, currentY + 105, { width: 280 });
    }

    // Footer
    const footerY = 750;
    doc
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .strokeColor(borderGray)
      .lineWidth(0.5)
      .stroke();

    doc
      .fillColor('#9ca3af')
      .fontSize(8)
      .text('Thank you for your business!', 50, footerY + 10, { align: 'center' });

    doc.end();
  });
}
