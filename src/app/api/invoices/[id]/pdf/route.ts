import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const { id } = await params

    // Fetch invoice with seller/delivery man details
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        deliveryMan: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        }
      }
    })

    if (!invoice) return new NextResponse('Invoice not found', { status: 404 })

    // Check access: seller can only view their own invoices, admin can view all
    if (user.role !== 'ADMIN' && user.id !== invoice.sellerId) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Fetch orders for this invoice separately
    const orders = await db.order.findMany({
      where: {
        sellerId: invoice.sellerId,
        status: 'DELIVERED',
        deliveredAt: {
          gte: new Date(invoice.dateFrom),
          lte: new Date(invoice.dateTo)
        }
      },
      select: {
        id: true,
        trackingNumber: true,
        recipientName: true,
        city: true,
        codAmount: true,
        platformFee: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            product: {
              select: {
                name: true,
                sku: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate total platform fees
    const totalPlatformFees = orders.reduce((sum, o) => sum + (o.platformFee || 0), 0)
    const subtotalAfterFees = invoice.subtotal - totalPlatformFees

    // Generate PDF
    const pdf = new jsPDF()

    // Helper functions for PDF content
    const addHeader = () => {
      // Company header
      pdf.setFillColor(37, 99, 235) // Blue primary color
      pdf.rect(0, 0, 210, 40, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFontSize(24)
      pdf.setFont('helvetica', 'bold')
      pdf.text('E-Gabon Prime', 105, 20, { align: 'center' })
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.text('Gabon COD Platform', 105, 28, { align: 'center' })
    }

    const addInvoiceInfo = () => {
      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(14)
      pdf.setFont('helvetica', 'bold')
      pdf.text('INVOICE', 15, 55)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')

      // Invoice reference and dates
      pdf.text(`Invoice Reference: ${invoice.ref}`, 15, 65)
      pdf.text(`Issue Date: ${new Date(invoice.createdAt).toLocaleDateString('fr-FR')}`, 15, 72)
      pdf.text(
        `Period: ${new Date(invoice.dateFrom).toLocaleDateString('fr-FR')} - ${new Date(invoice.dateTo).toLocaleDateString('fr-FR')}`,
        15,
        79
      )

      // Seller/Delivery Man info
      const partyName = invoice.cycleType === 'SELLER' ? invoice.seller?.name : invoice.deliveryMan?.name
      const partyEmail = invoice.cycleType === 'SELLER' ? invoice.seller?.email : invoice.deliveryMan?.phone
      const partyPhone = invoice.cycleType === 'SELLER' ? invoice.seller?.phone : invoice.deliveryMan?.phone
      const partyType = invoice.cycleType === 'SELLER' ? 'SELLER' : 'DELIVERY MAN'

      pdf.setFont('helvetica', 'bold')
      pdf.text(`${partyType}:`, 120, 65)
      pdf.setFont('helvetica', 'normal')
      pdf.text(partyName || 'N/A', 120, 72)
      pdf.text(partyEmail || 'N/A', 120, 79)

      if (partyPhone) {
        pdf.text(partyPhone, 120, 86)
      }
    }

    const addOrdersTable = () => {
      const tableData = orders.map(order => {
        const productName = order.items[0]?.product?.name || 'Unknown Product'
        const quantity = order.items[0]?.quantity || 1
        const unitPrice = order.items[0]?.unitPrice || 0

        return [
          order.trackingNumber,
          order.recipientName,
          order.city,
          productName,
          quantity.toString(),
          `${unitPrice.toLocaleString('fr-FR')} XAF`,
          `${(order.platformFee || 0).toLocaleString('fr-FR')} XAF`
        ]
      })

      autoTable(pdf, {
        startY: 100,
        head: [['Tracking #', 'Customer', 'City', 'Product', 'Qty', 'COD Amount', 'Platform Fee']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 28 }, // Tracking #
          1: { cellWidth: 30 }, // Customer
          2: { cellWidth: 22 }, // City
          3: { cellWidth: 40 }, // Product
          4: { cellWidth: 12 }, // Qty
          5: { cellWidth: 25 }, // COD Amount
          6: { cellWidth: 25 }, // Platform Fee
        }
      })
    }

    const addSummary = () => {
      const finalY = (pdf as any).lastAutoTable.finalY + 20

      // Summary box
      pdf.setDrawColor(200, 200, 200)
      pdf.setFillColor(250, 250, 250)
      pdf.roundedRect(120, finalY, 75, 90, 5, 3, 'FD')

      pdf.setTextColor(0, 0, 0)
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'bold')
      pdf.text('Invoice Summary', 125, finalY + 10)

      pdf.setFont('helvetica', 'normal')
      pdf.text(`Orders Count: ${orders.length}`, 125, finalY + 20)
      pdf.text(`Cash Collected: ${invoice.cashCollected.toLocaleString('fr-FR')} XAF`, 125, finalY + 28)

      if (invoice.refundedAmount > 0) {
        pdf.text(`Refunded: ${invoice.refundedAmount.toLocaleString('fr-FR')} XAF`, 125, finalY + 36)
      }

      // Platform Fee
      if (totalPlatformFees > 0) {
        pdf.text(`Platform Fees: -${totalPlatformFees.toLocaleString('fr-FR')} XAF`, 125, finalY + 44)
        pdf.text(`(5,000 XAF per order)`, 125, finalY + 50)
      }

      // VAT (if applicable)
      let vatY = finalY + 58
      if (totalPlatformFees > 0) {
        vatY = finalY + 58
      }
      if (invoice.vat > 0) {
        pdf.text(`VAT (${(invoice.vat / invoice.subtotal * 100).toFixed(1)}%): ${invoice.vat.toLocaleString('fr-FR')} XAF`, 125, vatY)
        vatY += 8
      }

      // Total Net
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(11)
      pdf.setTextColor(37, 99, 235)
      pdf.text(`Net Amount: ${invoice.totalNet.toLocaleString('fr-FR')} XAF`, 125, vatY + 6)

      // Status badge
      pdf.setFontSize(9)
      pdf.setTextColor(invoice.status === 'PAID' ? [34, 197, 94] : [239, 68, 68])
      pdf.text(`Status: ${invoice.status === 'PAID' ? 'PAID' : 'UNPAID'}`, 125, vatY + 16)
    }

    const addFooter = () => {
      const pageCount = pdf.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(150, 150, 150)
        pdf.setFont('helvetica', 'normal')

        // Page number
        pdf.text(
          `Page ${i} of ${pageCount}`,
          105,
          290,
          { align: 'center' }
        )

        // Footer text
        pdf.text(
          'This is a computer-generated invoice. For questions, contact support@egabonprime.com',
          105,
          280,
          { align: 'center' }
        )
      }
    }

    // Generate PDF content
    addHeader()
    addInvoiceInfo()
    addOrdersTable()
    addSummary()
    addFooter()

    // Return PDF as binary
    const pdfBytes = pdf.output('arraybuffer')

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.ref}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Invoice PDF generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
