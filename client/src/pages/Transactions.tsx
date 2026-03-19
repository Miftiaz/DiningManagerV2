import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { borderAPI, authAPI } from '@/lib/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty'
import { Download, FileText } from 'lucide-react'

interface Transaction {
  _id: string
  studentId: string
  date: string
  days: number
  amount: number
  paidAmount: number
  type: string
}

interface DashboardData {
  manager: {
    name: string
  }
  activeDiningMonth: {
    startDate: string
    endDate: string
    feastSubscribers: number
  }
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [downloadLoading, setDownloadLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [transRes, dashRes] = await Promise.all([
        borderAPI.getAllTransactions(),
        authAPI.getDashboard(),
      ])
      setTransactions(transRes.data)
      setDashboardData(dashRes.data)
      setLoading(false)
    } catch (err) {
      toast.error('Failed to load transactions')
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const calculateDue = (amount: number, paidAmount: number) => {
    return Math.max(0, amount - paidAmount)
  }

  const calculateTotals = () => {
    return transactions.reduce(
      (acc, transaction) => ({
        days: acc.days + transaction.days,
        amount: acc.amount + transaction.amount,
        paidAmount: acc.paidAmount + transaction.paidAmount,
        due: acc.due + calculateDue(transaction.amount, transaction.paidAmount),
      }),
      { days: 0, amount: 0, paidAmount: 0, due: 0 }
    )
  }

  const downloadPDF = async () => {
    setDownloadLoading(true)
    try {
      const pdf = new jsPDF()
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 15
      let yPosition = margin

      // Header
      pdf.setFontSize(18)
      pdf.text('Transaction History Report', margin, yPosition)
      yPosition += 10

      // Manager Info
      pdf.setFontSize(11)
      pdf.text(`Manager: ${dashboardData?.manager?.name || 'N/A'}`, margin, yPosition)
      yPosition += 7

      const startDate = new Date(
        dashboardData?.activeDiningMonth?.startDate || ''
      ).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const endDate = new Date(
        dashboardData?.activeDiningMonth?.endDate || ''
      ).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

      pdf.text(`Dining Month: ${startDate} - ${endDate}`, margin, yPosition)
      yPosition += 7

      pdf.text(
        `Feast Subscribers: ${dashboardData?.activeDiningMonth?.feastSubscribers || 0}`,
        margin,
        yPosition
      )
      yPosition += 12

      // Table
      const totals = calculateTotals()
      const tableData = transactions.map((t) => [
        t.studentId,
        formatDate(t.date),
        t.days.toString(),
        t.amount.toString(),
        t.paidAmount.toString(),
        calculateDue(t.amount, t.paidAmount).toString(),
        t.type,
      ])

      // Add totals row
      tableData.push([
        { content: 'Total', styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: '', styles: { fillColor: [240, 240, 240] } },
        { content: totals.days.toString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: totals.amount.toString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: totals.paidAmount.toString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: totals.due.toString(), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
        { content: '-', styles: { fillColor: [240, 240, 240] } },
      ])

      autoTable(pdf, {
        head: [
          [
            'Student ID',
            'Date',
            'Days',
            'Payable/Returnable',
            'Paid/Refunded',
            'Payment Due / Refund Due',
            'Type',
          ],
        ],
        body: tableData as any,
        startY: yPosition,
        margin: margin,
        styles: {
          fontSize: 9,
          cellPadding: 4,
        },
        headStyles: {
          fillColor: [102, 126, 234],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
      })

      pdf.save(
        `Transaction_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`
      )
      toast.success('PDF downloaded successfully')
    } catch (err) {
      toast.error('Failed to download PDF')
      console.error(err)
    } finally {
      setDownloadLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading transactions...</p>
      </div>
    )
  }

  const totals = calculateTotals()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transaction History</h1>
        </div>
        <Button
          onClick={downloadPDF}
          disabled={downloadLoading || transactions.length === 0}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          {downloadLoading ? 'Generating PDF...' : 'Download PDF'}
        </Button>
      </div>

      {transactions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No transactions found</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <EmptyDescription>
              There are no transactions for the current dining month
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Payable/Returnable</TableHead>
                    <TableHead className="text-right">Paid/Refunded</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction, index) => (
                    <TableRow key={transaction._id || index}>
                      <TableCell className="font-medium">{transaction.studentId}</TableCell>
                      <TableCell>{formatDate(transaction.date)}</TableCell>
                      <TableCell className="text-right">{transaction.days}</TableCell>
                      <TableCell className="text-right">{transaction.amount}</TableCell>
                      <TableCell className="text-right">{transaction.paidAmount}</TableCell>
                      <TableCell className="text-right">
                        {calculateDue(transaction.amount, transaction.paidAmount)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {transaction.type}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted font-semibold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{totals.days}</TableCell>
                    <TableCell className="text-right">{totals.amount} TK</TableCell>
                    <TableCell className="text-right">{totals.paidAmount} TK</TableCell>
                    <TableCell className="text-right">{totals.due} TK</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
