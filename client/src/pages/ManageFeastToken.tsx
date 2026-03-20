import React, { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { borderAPI } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from '@/components/ui/drawer'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users } from 'lucide-react'

interface Transaction {
  date: string
  days: number
  amount: number
  paidAmount: number
  type: string
}

interface Student {
  _id: string
  id: string
  name: string
  phone: string
  roomNo: string
  selectedDaysCount: number
  returnedDaysCount?: number
  dueAmount: number
  totalAmount: number
  feastpaid: boolean
  dailyFeastQuotaPaid: boolean
  transactions?: Transaction[]
}

const ITEMS_PER_PAGE = 10

export default function ManageFeastToken() {
  const [students, setStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [feastLoading, setFeastLoading] = useState(false)
  const [dailyFeastQuotaLoading, setDailyFeastQuotaLoading] = useState(false)
  const [clearPaymentLoading, setClearPaymentLoading] = useState(false)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const res = await borderAPI.getAllStudents()
      setStudents(res.data.students)
    } catch (err) {
      toast.error('Failed to load students')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)

  const calculateDailyFeastQuota = (student: Student) => {
    const selectedDaysCount = student.selectedDaysCount || 0
    const returnedDaysCount = student.returnedDaysCount || 0
    const totalDaysUsed = selectedDaysCount + returnedDaysCount
    const remainingDays = 30 - totalDaysUsed
    return remainingDays > 0 ? remainingDays * 10 : 0
  }

  const handlePayFeast = async () => {
    if (!selectedStudent) return
    setFeastLoading(true)
    try {
      await borderAPI.payFeastDue({ studentId: selectedStudent.id })
      const res = await borderAPI.getAllStudents()
      setStudents(res.data.students)
      const updatedStudent = res.data.students.find(
        (s: Student) => s.id === selectedStudent.id
      )
      setSelectedStudent(updatedStudent)
    } catch (err) {
      toast.error('Failed to pay feast')
      console.error(err)
    } finally {
      setFeastLoading(false)
    }
  }

  const handleClearPaymentDue = async () => {
    if (!selectedStudent) return
    setClearPaymentLoading(true)
    try {
      await borderAPI.clearPaymentDue({ studentId: selectedStudent.id })
      const res = await borderAPI.getAllStudents()
      setStudents(res.data.students)
      const updatedStudent = res.data.students.find(
        (s: Student) => s.id === selectedStudent.id
      )
      setSelectedStudent(updatedStudent)
    } catch (err) {
      toast.error('Failed to clear payment due')
      console.error(err)
    } finally {
      setClearPaymentLoading(false)
    }
  }

  const handlePayDailyFeastQuota = async () => {
    if (!selectedStudent) return
    setDailyFeastQuotaLoading(true)
    try {
      await borderAPI.payDailyFeastQuota({ studentId: selectedStudent.id })
      const res = await borderAPI.getAllStudents()
      setStudents(res.data.students)
      const updatedStudent = res.data.students.find(
        (s: Student) => s.id === selectedStudent.id
      )
      setSelectedStudent(updatedStudent)
    } catch (err) {
      toast.error('Failed to process daily feast quota payment')
      console.error(err)
    } finally {
      setDailyFeastQuotaLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (!selectedStudent) return
    setFeastLoading(true)
    setDailyFeastQuotaLoading(true)
    setClearPaymentLoading(true)
    try {
      if (!selectedStudent.feastpaid) {
        await borderAPI.payFeastDue({ studentId: selectedStudent.id })
      }

      if (!selectedStudent.dailyFeastQuotaPaid) {
        await borderAPI.payDailyFeastQuota({ studentId: selectedStudent.id })
      }

      if (selectedStudent.dueAmount !== 0) {
        await borderAPI.clearPaymentDue({ studentId: selectedStudent.id })
      }

      const res = await borderAPI.getAllStudents()
      setStudents(res.data.students)
      const updatedStudent = res.data.students.find(
        (s: Student) => s.id === selectedStudent.id
      )
      setSelectedStudent(updatedStudent)
    } catch (err) {
      toast.error('Failed to process clear all payments')
      console.error(err)
    } finally {
      setFeastLoading(false)
      setDailyFeastQuotaLoading(false)
      setClearPaymentLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading students...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Manage Feast Tokens</h1>
      </div>

      <div className="flex gap-2 px-2 sm:px-0">
        <Input
          placeholder="Search by name or ID..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value)
            setCurrentPage(1)
          }}
          className="w-full max-w-sm text-sm"
        />
      </div>

      {filteredStudents.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle className="text-lg sm:text-xl">No students found</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <EmptyDescription className="text-sm">
              {searchTerm
                ? 'Try adjusting your search criteria'
                : 'No students available for this month'}
            </EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="px-2 sm:px-0">
            <p className="text-xs sm:text-sm text-muted-foreground mb-4">
              Viewing {startIndex}-{endIndex} of {filteredStudents.length} students
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {paginatedStudents.map((student) => (
                <Card
                  key={student._id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">{student.name}</CardTitle>
                    <p className="text-xs sm:text-sm text-muted-foreground">{student.id}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-xs sm:text-sm text-muted-foreground">Days</span>
                      <span className="font-semibold">{student.selectedDaysCount}</span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-xs sm:text-sm text-muted-foreground">Payment</span>
                      <Badge className="text-xs"
                        variant={
                          student.dueAmount === 0 && student.totalAmount > 0
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {student.dueAmount === 0 && student.totalAmount > 0
                          ? 'Paid'
                          : 'Due'}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-xs sm:text-sm text-muted-foreground">Feast</span>
                      <Badge className="text-xs"
                        variant={student.feastpaid ? 'default' : 'destructive'}
                      >
                        {student.feastpaid ? 'Paid' : 'Due 100'}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-xs sm:text-sm text-muted-foreground">Daily Quota</span>
                      <Badge className="text-xs"
                        variant={
                          student.dailyFeastQuotaPaid ? 'default' : 'destructive'
                        }
                      >
                        {student.dailyFeastQuotaPaid ? 'Paid' : 'Due'}
                      </Badge>
                    </div>

                    <Button
                      onClick={() => setSelectedStudent(student)}
                      className="w-full mt-4 text-sm"
                      variant="outline"
                    >
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center px-2 sm:px-0">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage(prev => Math.max(prev - 1, 1))
                      }
                      className={
                        currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    page => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={currentPage === page}
                          onClick={() => setCurrentPage(page)}
                          className="cursor-pointer text-xs sm:text-sm"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage(prev => Math.min(prev + 1, totalPages))
                      }
                      className={
                        currentPage === totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}

      <Drawer
        open={!!selectedStudent}
        onOpenChange={(open) => {
          if (!open) setSelectedStudent(null)
        }}
      >
        <DrawerContent className='flex items-center justify-center p-0 sm:p-4'>
          <div className='w-full sm:w-[90%] md:w-[80%] lg:w-[70%] max-h-[80vh] overflow-y-auto scrollbar-hide'>
            <DrawerHeader className="px-4 sm:px-6">
              <DrawerTitle className="text-lg sm:text-xl">{selectedStudent?.name}</DrawerTitle>
              <DrawerClose />
            </DrawerHeader>

            <div className="space-y-6 px-4 sm:px-6 pb-4">
            {/* Student Information */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm sm:text-base">Student Information</h3>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">ID</p>
                  <p className="font-medium">{selectedStudent?.id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="font-medium">{selectedStudent?.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Room</p>
                  <p className="font-medium">{selectedStudent?.roomNo}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Selected Days</p>
                  <p className="font-medium">{selectedStudent?.selectedDaysCount}</p>
                </div>
              </div>
            </div>

            {/* Feast Status */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-muted-foreground">Feast Status</span>
                <Badge className="text-xs"
                  variant={selectedStudent?.feastpaid ? 'default' : 'destructive'}
                >
                  {selectedStudent?.feastpaid ? 'Paid' : 'Due - 100 TK'}
                </Badge>
              </div>
            </div>

            {/* Transaction History */}
            {selectedStudent?.transactions &&
              selectedStudent.transactions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm sm:text-base">Transaction History</h3>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Date</TableHead>
                          <TableHead className="text-xs">Days</TableHead>
                          <TableHead className="text-xs">Amount</TableHead>
                          <TableHead className="text-xs">Paid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedStudent.transactions.map((transaction, idx) => (
                          <TableRow key={idx} className="text-xs">
                            <TableCell className="text-xs">
                              {new Date(transaction.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs">
                              {transaction.days}
                            </TableCell>
                            <TableCell className="text-xs">
                              {transaction.amount}
                            </TableCell>
                            <TableCell className="text-xs">
                              {transaction.paidAmount}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted font-semibold text-xs">
                          <TableCell className="text-xs">Total</TableCell>
                          <TableCell className="text-xs">
                            {selectedStudent.transactions.reduce(
                              (sum, t) => sum + t.days,
                              0
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {selectedStudent.transactions.reduce(
                              (sum, t) => sum + t.amount,
                              0
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {selectedStudent.transactions.reduce(
                              (sum, t) => sum + t.paidAmount,
                              0
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

            {/* All Clear Message or Payment Options */}
            {selectedStudent &&
            selectedStudent.feastpaid &&
            selectedStudent.dailyFeastQuotaPaid &&
            selectedStudent.dueAmount === 0 ? (
              <Alert>
                <AlertDescription className="text-center font-semibold text-green-400 text-xs sm:text-sm">
                  ✓ All dues clear. Enjoy the feast!
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-3 flex flex-col sm:flex-row sm:space-x-4 sm:space-y-0 justify-center">
                  {selectedStudent && selectedStudent.dueAmount !== 0 && (
                    <Card className="flex-1 text-sm">
                      <CardContent className="pt-4 sm:pt-6 space-y-3">
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {selectedStudent.dueAmount < 0
                              ? 'Refund Due'
                              : 'Payment Due'}
                          </p>
                          <p className="text-lg sm:text-xl font-bold">
                            {Math.abs(selectedStudent.dueAmount)} TK
                          </p>
                        </div>
                        <Button
                          onClick={handleClearPaymentDue}
                          disabled={clearPaymentLoading}
                          className="w-full text-xs sm:text-sm"
                          size="sm"
                        >
                          {clearPaymentLoading
                            ? 'Processing...'
                            : selectedStudent.dueAmount < 0
                              ? 'Clear Refund Due'
                              : 'Clear Payment Due'}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {selectedStudent && !selectedStudent.feastpaid && (
                    <Card className="flex-1 text-sm">
                      <CardContent className="pt-4 sm:pt-6 space-y-3">
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">Feast Due</p>
                          <p className="text-lg sm:text-xl font-bold">100 TK</p>
                        </div>
                        <Button
                          onClick={handlePayFeast}
                          disabled={feastLoading}
                          className="w-full text-xs sm:text-sm"
                          size="sm"
                        >
                          {feastLoading ? 'Processing...' : 'Pay Feast Due'}
                        </Button>
                      </CardContent>
                    </Card>
                  )}

                  {selectedStudent && !selectedStudent.dailyFeastQuotaPaid && (
                    <Card className="flex-1 text-sm">
                      <CardContent className="pt-4 sm:pt-6 space-y-3">
                        <div>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Daily Feast Quota Due
                          </p>
                          <p className="text-lg sm:text-xl font-bold">
                            {calculateDailyFeastQuota(selectedStudent)} TK
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Days used:{' '}
                            {(selectedStudent.selectedDaysCount || 0) +
                              (selectedStudent.returnedDaysCount || 0)}
                            /30 | Remaining:{' '}
                            {30 -
                              ((selectedStudent.selectedDaysCount || 0) +
                                (selectedStudent.returnedDaysCount || 0))}
                          </p>
                        </div>
                        <Button
                          onClick={handlePayDailyFeastQuota}
                          disabled={dailyFeastQuotaLoading}
                          className="w-full text-xs sm:text-sm"
                          size="sm"
                        >
                          {dailyFeastQuotaLoading
                            ? 'Processing...'
                            : 'Pay Daily Feast Quota'}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {selectedStudent &&
                  (!selectedStudent.feastpaid ||
                    !selectedStudent.dailyFeastQuotaPaid ||
                    selectedStudent.dueAmount !== 0) && (
                    <Button
                      onClick={handleClearAll}
                      disabled={feastLoading}
                      size="lg"
                      className="w-full text-sm"
                    >
                      {feastLoading ? 'Processing...' : 'Clear All'}
                    </Button>
                  )}
              </>
            )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
