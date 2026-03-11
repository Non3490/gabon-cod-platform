'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Loader2 } from 'lucide-react'
import { jsPDF } from 'jspdf'

interface Order {
    id: string
    trackingNumber: string
    customerName: string
    customerPhone: string
    customerAddress: string
    city: string
    productName: string
    quantity: number
    codAmount: number
    status: string
    createdAt: string
    seller?: {
        id: string
        name: string
        email: string
    }
}

interface PrintLabelsButtonProps {
    selectedOrders: Order[]
    onPrintComplete?: () => void
}

export function PrintLabelsButton({ selectedOrders, onPrintComplete }: PrintLabelsButtonProps) {
    const [printing, setPrinting] = useState(false)

    const generatePDF = () => {
        if (selectedOrders.length === 0) return

        setPrinting(true)

        try {
            // Create PDF with 4x6 inch thermal format (102mm x 152mm)
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [102, 152]
            })

            // Add print CSS for thermal printers
            const style = `
                @page {
                    size: 102mm 152mm;
                    margin: 0;
                }
            `

            selectedOrders.forEach((order, index) => {
                if (index > 0) {
                    doc.addPage([102, 152])
                }

                // Tracking Number - Large and Bold
                doc.setFontSize(16)
                doc.setFont('helvetica', 'bold')
                doc.text(order.trackingNumber, 51, 10, { align: 'center' })

                // Divider line
                doc.setLineWidth(0.3)
                doc.line(8, 14, 94, 14)

                // Customer Name
                doc.setFontSize(11)
                doc.setFont('helvetica', 'normal')
                doc.text('Customer:', 8, 20)
                doc.setFont('helvetica', 'bold')
                doc.text(order.customerName, 8, 25)

                // Phone
                doc.setFont('helvetica', 'normal')
                doc.text('Phone:', 8, 31)
                doc.setFont('helvetica', 'bold')
                doc.text(order.customerPhone, 8, 36)

                // Address
                doc.setFont('helvetica', 'normal')
                doc.text('Address:', 8, 42)
                doc.setFont('helvetica', 'normal')
                const addressLines = doc.splitTextToSize(order.customerAddress, 80)
                doc.text(addressLines, 8, 47)

                const addressHeight = addressLines.length * 4.5

                // City
                doc.setFont('helvetica', 'bold')
                doc.text(order.city, 8, 47 + addressHeight + 2)

                // Divider line
                doc.setLineWidth(0.3)
                const yPos = 47 + addressHeight + 8
                doc.line(8, yPos, 94, yPos)

                // Product Name + Quantity
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(10)
                doc.text('Product:', 8, yPos + 6)
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(11)
                const productText = `${order.productName} (x${order.quantity})`
                const productLines = doc.splitTextToSize(productText, 80)
                doc.text(productLines, 8, yPos + 11)

                const productHeight = productLines.length * 4.5

                // Seller Name
                doc.setFont('helvetica', 'normal')
                doc.setFontSize(10)
                doc.text('Seller:', 8, yPos + 11 + productHeight + 2)
                doc.setFont('helvetica', 'bold')
                doc.setFontSize(11)
                doc.text(order.seller?.name || 'N/A', 8, yPos + 16 + productHeight)

                // Divider line
                doc.setLineWidth(0.3)
                const codYPos = yPos + 16 + productHeight + 6
                doc.line(8, codYPos, 94, codYPos)

                // COD Amount - Large and Bold
                doc.setFontSize(14)
                doc.setFont('helvetica', 'bold')
                doc.text('COD:', 8, codYPos + 6)
                doc.setFontSize(16)
                doc.text(`${order.codAmount.toLocaleString('en-GA')} XAF`, 51, codYPos + 6, { align: 'center' })

                // Signature box
                doc.setFontSize(9)
                doc.setFont('helvetica', 'normal')
                doc.text('Signature:', 8, codYPos + 20)
                doc.rect(8, codYPos + 22, 86, 15)
            })

            // Apply print CSS
            doc.addFileToVFS('print-style.css', style)
            doc.addFileToVFS('style.css', style)

            // Open PDF in new tab
            window.open(doc.output('bloburl'), '_blank')

            if (onPrintComplete) {
                onPrintComplete()
            }
        } catch (error) {
            console.error('Failed to generate PDF', error)
        } finally {
            setPrinting(false)
        }
    }

    return (
        <Button
            variant="secondary"
            onClick={generatePDF}
            disabled={selectedOrders.length === 0 || printing}
        >
            {printing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Printer className="mr-2 h-4 w-4" />
            )}
            Print Labels ({selectedOrders.length})
        </Button>
    )
}
