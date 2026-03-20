import { useState } from 'react';
import { toast } from 'sonner';
import { authAPI } from "@/lib/api"
import { borderAPI } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DiningCalendar from "@/components/calender"

import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertCircle, CheckCircle, UtensilsCrossed } from 'lucide-react';

export default function ManageBorder() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [searchId, setSearchId] = useState('');
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [selectedDates, setSelectedDates] = useState(new Set<string>());
  const [monthData, setMonthData] = useState<any>(null);
  const [selectable, setSelectable] = useState<boolean>(false);
  const [paidAmount, setPaidAmount] = useState(0);
  const [refundedAmount, setRefundedAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [token, setToken] = useState<boolean | null>(null);
  const [studentSelectedDays, setStudentSelectedDays] = useState(new Set<string>());
  const [feastLoading, setFeastLoading] = useState(false);
  
  const fetchDashboard = async (): Promise<void> => {
    try {
      const res = await authAPI.getDashboard();
      setDashboardData(res.data);
      console.log(res.data);
      console.log("loading calender!")
      setLoading(false);
    } catch (err) {
      const error = err as AxiosError;
      toast.error('Failed to load dashboard');
      setLoading(false);
      console.error(error);
    }
  };

  const handleSearch = async () => {
    if (!searchId.trim()) {
      toast.error('Please enter student ID');
      return;
    }

    setLoading(true);
    try {
      const res = await borderAPI.searchStudent(searchId);
      const { diningMonth, calendarDays, breakDates, manager, nextDayInfo, stats, student, studentData: sd } = res.data;
      
      // Transform monthData to match dashboardData structure
      const transformedMonthData = {
        activeDiningMonth: diningMonth,
        calendarDays: calendarDays || [],
        breakDates: breakDates || [],
        manager: manager,
        nextDayInfo: nextDayInfo,
        stats: stats
      };
      
      setMonthData(transformedMonthData);
      
      if (student) {
        setStudentData(sd);
        const existingDates = new Set(
          sd?.selectedDays?.map((d: any) => {
            const dDate = new Date(d.day.date);
            return dDate.toISOString().split('T')[0];
          }) || []
        );
        setStudentSelectedDays(existingDates);
        setSelectedDates(new Set());
        toast.success('Student found');
      } else {
        setStudentData(null);
        setSelectedDates(new Set());
        setStudentSelectedDays(new Set());
        toast.info('Student not found. You can create a new one.');
        fetchDashboard();
      }
      setSearched(true);
    } catch (err) {
      toast.error('Failed to search student');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (boughtDates: string[]) => {
    if (boughtDates.length === 0) {
      toast.error('Please select at least one day');
      return;
    }

    const name = (document.getElementById('studentName') as HTMLInputElement)?.value || studentData?.name || '';
    const phone = (document.getElementById('studentPhone') as HTMLInputElement)?.value || studentData?.phone || '';
    const roomNo = (document.getElementById('studentRoom') as HTMLInputElement)?.value || studentData?.roomNo || '';

    if (!name) {
      toast.error('Student name is required');
      return;
    }
    if (!phone) {
      toast.error('Phone Number is required');
      return;
    }
    if (!roomNo) {
      toast.error('Room No. is required');
      return;
    }

    try {
      const calendarDaysMap = new Map(
        monthData.calendarDays.map((day: any) => [
          new Date(day.date).toISOString().split('T')[0],
          day
        ])
      );

      const selectedDaysArray = boughtDates.map(dateStr => {
        const day = calendarDaysMap.get(dateStr);
        return { dayId: day?._id, meals: 2 };
      }).filter(d => d.dayId);

      const adjustRes = await borderAPI.adjustStudentDays({
        studentId: searchId,
        name,
        phone,
        roomNo,
        selectedDays: selectedDaysArray,
        paidAmount: Number(paidAmount),
        feastDue: 0
      } as any);
      
      toast.success(adjustRes.data?.message || 'Student updated successfully');
      setSelectedDates(new Set());
      setToken(null);
      
      // Refresh
      const res = await borderAPI.searchStudent(searchId);
      const { diningMonth, calendarDays, breakDates, manager, nextDayInfo, stats, student, studentData: sd } = res.data;
      
      const transformedMonthData = {
        activeDiningMonth: diningMonth,
        calendarDays: calendarDays || [],
        breakDates: breakDates || [],
        manager: manager,
        nextDayInfo: nextDayInfo,
        stats: stats
      };
      
      setMonthData(transformedMonthData);
      if (student) {
        console.log("Refreshed!")
        setStudentData(sd);
        const existingDates = new Set(
          sd?.selectedDays?.map((d: any) => {
            const dDate = new Date(d.day.date);
            return dDate.toISOString().split('T')[0];
          }) || []
        );
        setStudentSelectedDays(existingDates);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update student');
      console.log(err);
    }
  };

  const handleReturnToken = async (returnedDates: string[]) => {
    if (returnedDates.length === 0) {
      toast.error('Please select at least one day to return');
      return;
    }

    try {
      const res = await borderAPI.returnToken({
        studentId: searchId,
        datesToRemove: returnedDates,
        refundedAmount: Number(refundedAmount)
      } as any);
      
      toast.success(res.data?.message || 'Token returned successfully');
      setSelectedDates(new Set());
      setRefundedAmount(0);
      setToken(null);

      const searchRes = await borderAPI.searchStudent(searchId);
      const { diningMonth, calendarDays, breakDates, manager, nextDayInfo, stats, student, studentData: sd } = searchRes.data;
      
      const transformedMonthData = {
        activeDiningMonth: diningMonth,
        calendarDays: calendarDays || [],
        breakDates: breakDates || [],
        manager: manager,
        nextDayInfo: nextDayInfo,
        stats: stats
      };
      
      setMonthData(transformedMonthData);
      if (student) {
        setStudentData(sd);
        const existingDates = new Set(
          sd?.selectedDays?.map((d: any) => {
            const dDate = new Date(d.day.date);
            return dDate.toISOString().split('T')[0];
          }) || []
        );
        setStudentSelectedDays(existingDates);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to return token');
      console.log(err)
    }
  };

  const handlePayFeast = async () => {
    setFeastLoading(true);
    try {
      const feastRes = await borderAPI.payFeastDue({ studentId: searchId } as any);
      toast.success(feastRes.data?.message || 'Feast paid successfully');
      
      const res = await borderAPI.searchStudent(searchId);
      const { diningMonth, calendarDays, breakDates, manager, nextDayInfo, stats, student, studentData: sd } = res.data;
      
      const transformedMonthData = {
        activeDiningMonth: diningMonth,
        calendarDays: calendarDays || [],
        breakDates: breakDates || [],
        manager: manager,
        nextDayInfo: nextDayInfo,
        stats: stats
      };
      
      setMonthData(transformedMonthData);
      if (student) {
        setStudentData(sd);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to pay feast');
    } finally {
      setFeastLoading(false);
    }
  };

  const payableAmount = selectedDates.size * 2 * 40;
  const returnCount = studentData?.returnCount || 0;
  const maxReturns = 10;
  const minReturnDays = 3;
  const remainingReturns = maxReturns - returnCount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="px-2 sm:px-0">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Manage Border</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">Search and manage student dining borders</p>
      </div>

      {/* Search Section */}
      {!searched ? (
        <div className='flex justify-center'>
          <Card className='w-full max-w-md'>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Search Student</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  placeholder="Enter Student ID"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-sm"
                />
                <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className='space-y-6 grid grid-cols-1 lg:grid-cols-5 gap-6'>
          <div className='space-y-6 col-span-1 lg:col-span-1'>
            <Card className='w-full'>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Search Student</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Enter Student ID"
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="text-sm"
                  />
                  <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto">
                    {loading ? 'Searching...' : 'Search'}
                  </Button>
                </div>
              </CardContent>
            </Card>
        


          {/* New Student Form */}
          {searched && !studentData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">Add New Student</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Enter student details to create a new record</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="studentName" className="text-xs sm:text-sm">Student Name</Label>
                  <Input id="studentName" placeholder="Full name" className="text-sm" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="studentPhone" className="text-xs sm:text-sm">Phone Number</Label>
                  <Input id="studentPhone" placeholder="+880..." type="tel" className="text-sm" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="studentRoom" className="text-xs sm:text-sm">Room Number</Label>
                  <Input id="studentRoom" placeholder="Room no" className="text-sm" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Student Info Section */}
          {studentData && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base sm:text-lg">Student Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-xs text-gray-600">ID</p>
                      <p className="font-semibold">{studentData.id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Name</p>
                      <p className="font-semibold">{studentData.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Phone</p>
                      <p className="font-semibold">{studentData.phone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Room</p>
                      <p className="font-semibold">{studentData.roomNo || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Selected Days</p>
                      <p className="font-semibold">{studentData.selectedDays.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Feast Payment Alert */}
              {!studentData.feastpaid ? (
                <Alert className="border-orange-600 bg-grey-700">
                  <UtensilsCrossed className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  <AlertTitle className="text-orange-600 text-sm sm:text-base">Feast Payment Due</AlertTitle>
                  <AlertDescription className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                    <div>
                      <p className="text-base sm:text-lg font-bold text-orange-600">100 TK</p>
                    </div>
                    <Button 
                      onClick={handlePayFeast}
                      disabled={feastLoading}
                      className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
                      size="sm"
                    >
                      {feastLoading ? 'Processing...' : 'Pay Now'}
                    </Button>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert >
                  <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  <AlertTitle className="text-sm sm:text-base">Feast Payment</AlertTitle>
                  <AlertDescription>
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-gray-600 dark:text-green-100 text-xs">Paid</Badge>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
        <div className='w-full col-span-1 lg:col-span-4 flex items-start'>
          {/* Mode Selection & Calendar */}
          {searched && monthData?.calendarDays && (
            <Card className="w-full">
              <CardHeader className='items-center'>
                <CardTitle className="text-base sm:text-lg">Manage Dining Days</CardTitle>
                <CardDescription className="text-xs sm:text-sm text-center">
                  {token 
                    ? 'Select dining days to purchase' 
                    : token === false 
                    ? 'Select days to return' 
                    : 'Choose an option to manage tokens'}
                </CardDescription>
                {/* Mode Buttons */}
                <div className="flex flex-col sm:flex-row h-22 gap-2 w-full">
                  <Button
                    variant={token ? 'default' : 'outline'}
                    onClick={() => {
                      setToken(token ? null : true);
                      setSelectable(true);
                      setSelectedDates(new Set());
                      setPaidAmount(0);
                    }}
                    className="flex-1 text-sm"
                  >
                    Adjust Days
                  </Button>
                  <Button
                    variant={token === false ? 'default' : 'outline'}
                    onClick={() => {
                      setToken(token === false ? null : false);
                      setSelectable(true);
                      setSelectedDates(new Set());
                      setRefundedAmount(0);
                    }}
                    className="flex-1 text-sm"
                  >
                    Return Token
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 px-2 sm:px-6 overflow-x-auto flex justify-center">
                <div className="min-w-max">
                  <DiningCalendar 
                    monthData={monthData} 
                    studentData={studentData} 
                    mode="student" 
                    selectable={selectable} 
                    token={token}
                    selectedDates={selectedDates}
                    setSelectedDates={setSelectedDates}
                    onAdjust={handleAdjust}
                    onReturnToken={handleReturnToken}
                  />
                </div>
              </CardContent>
            </Card>
          )}  
        </div>
      </div>
      )}

      <div className="px-2 sm:px-0">
        {/* Transaction History */}
        {studentData?.transactions && studentData.transactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Transaction History</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Days</TableHead>
                    <TableHead className="text-xs">Payable</TableHead>
                    <TableHead className="text-xs">Paid</TableHead>
                    <TableHead className="text-xs">Due</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentData.transactions.map((transaction, index) => (
                    <TableRow key={index} className="text-xs sm:text-sm">
                      <TableCell>{new Date(transaction.date).toLocaleDateString()}</TableCell>
                      <TableCell>{transaction.days}</TableCell>
                      <TableCell>{transaction.amount} TK</TableCell>
                      <TableCell>{transaction.paidAmount} TK</TableCell>
                      <TableCell>{transaction.amount - transaction.paidAmount} TK</TableCell>
                      <TableCell className="capitalize">{transaction.type}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold bg-gray-50 dark:bg-gray-900 text-xs sm:text-sm">
                    <TableCell colSpan={1}>Total</TableCell>
                    <TableCell>
                      {studentData.transactions.reduce((sum, t) => sum + t.days, 0)}
                    </TableCell>
                    <TableCell>
                      {studentData.transactions.reduce((sum, t) => sum + t.amount, 0)} TK
                    </TableCell>
                    <TableCell>
                      {studentData.transactions.reduce((sum, t) => sum + t.paidAmount, 0)} TK
                    </TableCell>
                    <TableCell>
                      {studentData.transactions.reduce((sum, t) => sum + (t.amount - t.paidAmount), 0)} TK
                    </TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
