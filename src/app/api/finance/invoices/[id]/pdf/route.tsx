import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Register font for better rendering (optional, using built-in fonts)
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a'
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e5e5',
    paddingBottom: 20
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#1e40af'
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280'
  },
  section: {
    marginBottom: 20
  },
  heading: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937'
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
    fontSize: 10
  },
  label: {
    width: 120,
    color: '#6b7280'
  },
  value: {
    flex: 1,
    fontWeight: '500'
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginTop: 10
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5'
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5'
  },
  tableCell: {
    padding: 10,
    flex: 1,
    fontSize: 9
  },
  tableCellSmall: {
    width: 80,
    padding: 10,
    fontSize: 9
  },
  tableCellMedium: {
    width: 120,
    padding: 10,
    fontSize: 9
  },
  total: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 20
  },
  totalLabel: {
    fontSize: 12,
    color: '#6b7280'
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e40af'
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    fontSize: 8,
    color: '#9ca3af'
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold'
  },
  badgePaid: {
    backgroundColor: '#dcfce7',
    color: '#166534'
  },
  badgeUnpaid: {
    backgroundColor: '#fef3c7',
    color: '#92400e'
  }
})

interface InvoiceDocumentProps {
  invoice: any
  seller: any
  orders?: any[]
}

const InvoiceDocument = ({ invoice, seller, orders = [] }: InvoiceDocumentProps) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>INVOICE</Text>
          <Text style={styles.subtitle}>{invoice.ref}</Text>
          <Text style={styles.subtitle}>
            Date: {new Date(invoice.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
          <View style={{ marginTop: 10 }}>
            <Text style={styles.badgePaid}>
              {invoice.cycleType === 'DELIVERY' ? 'DELIVERY REMITTANCE' : 'SELLER PAYOUT'}
            </Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.section}>
          <Text style={styles.heading}>Bill To:</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{invoice.deliveryMan?.name || seller?.name || 'N/A'}</Text>
          </View>
          {invoice.cycleType === 'SELLER' && seller && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{seller.email}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Phone:</Text>
                <Text style={styles.value}>{seller.phone || 'N/A'}</Text>
              </View>
            </>
          )}
        </View>

        {/* Invoice Details */}
        <View style={styles.section}>
          <Text style={styles.heading}>Invoice Details:</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Period:</Text>
            <Text style={styles.value}>
              {new Date(invoice.dateFrom).toLocaleDateString()} - {new Date(invoice.dateTo).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[
              styles.badge,
              invoice.status === 'PAID' ? styles.badgePaid : styles.badgeUnpaid
            ]}>
              {invoice.status}
            </Text>
          </View>
        </View>

        {/* Order Summary Table */}
        {orders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.heading}>Order Summary:</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableCellSmall}>#</Text>
                <Text style={styles.tableCell}>Order Code</Text>
                <Text style={styles.tableCell}>Customer</Text>
                <Text style={styles.tableCellSmall}>Fee</Text>
                <Text style={styles.tableCellMedium}>Amount</Text>
              </View>
              {orders.slice(0, 20).map((order, i) => (
                <View key={i} style={styles.tableRow}>
                  <Text style={styles.tableCellSmall}>{i + 1}</Text>
                  <Text style={styles.tableCell}>{order.trackingNumber}</Text>
                  <Text style={styles.tableCell}>{order.recipientName}</Text>
                  <Text style={styles.tableCellSmall}>{invoice.cycleType === 'SELLER' ? `${(order.platformFee || 0).toFixed(0)}` : '-'}</Text>
                  <Text style={styles.tableCellMedium}>{order.codAmount.toFixed(2)} XAF</Text>
                </View>
              ))}
              {orders.length > 20 && (
                <View style={styles.tableRow}>
                  <Text style={[styles.tableCell, { fontStyle: 'italic', color: '#6b7280' }]}>
                    + {orders.length - 20} more orders...
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.heading}>Summary:</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Cash Collected:</Text>
            <Text style={styles.value}>{invoice.cashCollected.toFixed(2)} XAF</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Refunded:</Text>
            <Text style={styles.value}>{invoice.refundedAmount.toFixed(2)} XAF</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Subtotal:</Text>
            <Text style={styles.value}>{invoice.subtotal.toFixed(2)} XAF</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>VAT:</Text>
            <Text style={styles.value}>{invoice.vat.toFixed(2)} XAF</Text>
          </View>
        </View>

        {/* Total */}
        <View style={styles.total}>
          <Text style={styles.totalLabel}>Total Net:</Text>
          <Text style={styles.totalValue}>{invoice.totalNet.toFixed(2)} XAF</Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Generated on {new Date().toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
          <Text style={{ marginTop: 5 }}>
            Gabon COD Platform - {invoice.cycleType === 'DELIVERY' ? 'Delivery Remittance Invoice' : 'Seller Payout Invoice'}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

/**
 * GET /api/finance/invoices/[id]/pdf
 * Generate and download PDF invoice
 * ADMIN: any invoice | SELLER: own invoices only
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, email: true, phone: true } },
        deliveryMan: { select: { id: true, name: true } }
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }

    // Check permissions
    if (user.role !== 'ADMIN' && invoice.sellerId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch orders for this invoice (if available)
    let orders: any[] = []
    if (invoice.cycleType === 'DELIVERY' && invoice.deliveryManId) {
      orders = await db.order.findMany({
        where: {
          deliveryManId: invoice.deliveryManId,
          status: 'DELIVERED',
          updatedAt: {
            gte: new Date(invoice.dateFrom),
            lt: new Date(invoice.dateTo)
          }
        },
        select: {
          trackingNumber: true,
          recipientName: true,
          codAmount: true,
          platformFee: true
        },
        orderBy: { createdAt: 'desc' }
      })
    } else if (invoice.cycleType === 'SELLER') {
      orders = await db.order.findMany({
        where: {
          sellerId: invoice.sellerId,
          status: 'DELIVERED',
          deliveredAt: {
            gte: new Date(invoice.dateFrom),
            lte: new Date(invoice.dateTo)
          }
        },
        select: {
          trackingNumber: true,
          recipientName: true,
          codAmount: true,
          platformFee: true
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    // Calculate total platform fees for seller invoices
    let totalPlatformFees = 0
    if (invoice.cycleType === 'SELLER') {
      totalPlatformFees = orders.reduce((sum, o) => sum + (o.platformFee || 0), 0)
    }

    // Generate PDF
    const ReactPDF = (await import('@react-pdf/renderer')).renderToStream
    const pdfBuffer = await ReactPDF(
      <InvoiceDocument
        invoice={invoice}
        seller={invoice.seller}
        orders={orders}
      />
    )

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.ref}.pdf"`
      }
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
