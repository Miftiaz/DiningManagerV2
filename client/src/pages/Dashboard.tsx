import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { toast } from "sonner"
import { AxiosError } from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { authAPI } from "@/lib/api"
import { Calendar } from "@/components/ui/calendar"
import DiningCalendar from "@/components/calender"

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [showMonthSetup, setShowMonthSetup] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [selectedDates, setSelectedDates] = useState(new Set<string>())
  const [isDarkMode, setIsDarkMode] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    fetchDashboard()
  }, [location])

  useEffect(() => {
    // Check initial dark mode state
    setIsDarkMode(document.documentElement.classList.contains('dark'))

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  const fetchDashboard = async (): Promise<void> => {
    try {
      const res = await authAPI.getDashboard();
      setDashboardData(res.data);
      setLoading(false);
    } catch (err) {
      const error = err as AxiosError;
      toast.error('Failed to load dashboard');
      setLoading(false);
      console.error(error);
    }
  };

  // Start new dining month
  const handleStartMonth = async (): Promise<void> => {
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }

    try {
      // Convert Date object to YYYY-MM-DD string format
      const year = startDate.getFullYear();
      const month = String(startDate.getMonth() + 1).padStart(2, '0');
      const day = String(startDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      await authAPI.startDiningMonth({ startDate: dateString } as any);
      console.log(startDate);
      setShowMonthSetup(false);
      setStartDate(undefined);
      toast.success('Dining month started successfully');
      fetchDashboard();
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      const errorMessage = error.response?.data?.message || 'Failed to start month';
      toast.error(errorMessage);
      console.error(error);
    }
  };

  const handleLogout = () => {
    localStorage.clear()
    toast.success('Logged out successfully');
    navigate("/login")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Manager Dashboard</h1>
      </div>

      {/* Dashboard Content */}
      {dashboardData?.activeDiningMonth ? (
        <>
          {/* Main Layout: Chart (60%) + Stats Cards (40%) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Chart Section - 60% */}
            <div className="col-span-1 lg:col-span-7">
              <Card className="h-full">
                <CardHeader className="flex flex-col items-center px-3 sm:px-6">
                  <CardTitle className="text-xl sm:text-2xl lg:text-3xl">Border Count by Day</CardTitle>
                  <CardDescription className="text-xs sm:text-sm text-center">Number of borders registered for each dining day</CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dashboardData.calendarDays || []}>
                        <XAxis 
                          dataKey="day" 
                          label={{ value: 'Day Number', position: 'insideBottomRight', offset: -5 }}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          label={{ value: 'Border Count', angle: -90, position: 'insideLeft' }}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          cursor={{ fill: isDarkMode ? "#404040" : "#e5e7eb" }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white dark:bg-slate-950 p-2 border rounded shadow text-gray-900 dark:text-white dark:border-slate-700">
                                  <p className="font-semibold text-sm">Day {data.day}</p>
                                  <p className="text-xs">
                                    Borders: {data.borderCount}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">
                                    {new Date(data.date).toLocaleDateString()}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="borderCount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats Cards Section - 40% */}
            <div className="col-span-1 lg:col-span-5">
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 gap-2 sm:gap-4 h-full">
                {/* Next Day Number */}
                <Card className="flex items-center justify-center col-span-2 sm:col-span-1">
                  <CardContent className="pt-4 sm:pt-6 w-full">
                    <div className="flex flex-col items-center justify-center space-y-1 sm:space-y-2">
                      <p className="text-xs sm:text-sm font-medium opacity-90 text-center">Next Day Number</p>
                      <p className="text-2xl sm:text-4xl lg:text-8xl font-bold">{dashboardData.nextDayInfo?.nextDayNo || '-'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Next Date */}
                <Card className="flex items-center justify-center col-span-2 sm:col-span-1">
                  <CardContent className="pt-4 sm:pt-6 w-full">
                    <div className="flex flex-col items-center justify-center space-y-1 sm:space-y-2">
                      <p className="text-xs sm:text-sm font-medium opacity-90 text-center">Next Date</p>
                      <p className="text-lg sm:text-3xl lg:text-6xl font-bold text-center">
                        {dashboardData.nextDayInfo?.date 
                          ? new Date(dashboardData.nextDayInfo.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : '-'
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Next Day Borders */}
                <Card className="flex items-center justify-center col-span-2 sm:col-span-1">
                  <CardContent className="pt-4 sm:pt-6 w-full">
                    <div className="flex flex-col items-center justify-center space-y-1 sm:space-y-2">
                      <p className="text-xs sm:text-sm font-medium opacity-90 text-center">Next Day Borders</p>
                      <p className="text-2xl sm:text-4xl lg:text-8xl font-bold">{dashboardData.nextDayInfo?.borderCount || '0'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Feast Subscribers */}
                <Card className="flex items-center justify-center col-span-2 sm:col-span-1">
                  <CardContent className="pt-4 sm:pt-6 w-full">
                    <div className="flex flex-col items-center justify-center space-y-1 sm:space-y-2">
                      <p className="text-xs sm:text-sm font-medium opacity-90 text-center">Feast Subscribers</p>
                      <p className="text-2xl sm:text-4xl lg:text-8xl font-bold">{dashboardData.activeDiningMonth?.feastSubscribers || '0'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Calendar Section */}
          <div className="flex justify-center w-full">
            <Card>
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="flex flex-col items-center text-xl sm:text-2xl lg:text-3xl text-center">Dining Month Calendar</CardTitle>
                <CardDescription className="flex flex-col items-center text-xs sm:text-sm text-center">View the current dining month schedule</CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6 overflow-x-auto flex justify-center">
                <div className="min-w-max">
                  <DiningCalendar 
                    monthData={dashboardData} 
                    mode="admin" 
                    selectable={false} 
                    showBorder={true}
                    selectedDates={selectedDates}
                    setSelectedDates={setSelectedDates}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="pt-8">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-semibold">No Active Dining Month</h2>
              <p className="text-gray-600">Start a new dining month to begin managing borders and transactions.</p>
              <Button onClick={() => setShowMonthSetup(true)} size="lg">
                Start Dining Month
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month Setup Dialog */}
      <Dialog open={showMonthSetup} onOpenChange={setShowMonthSetup}>
        <DialogContent className="flex flex-col justify-center items-center w-[95vw] sm:w-full max-w-md px-4 sm:px-0">
          <DialogHeader>
            <DialogTitle>Start New Dining Month</DialogTitle>
            <DialogDescription>
              Select a start date for the new dining month
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-center w-full overflow-x-auto" >
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              disabled={(date) => {
                const today = new Date()
                return date < today
              }}
              className="rounded-md border text-sm sm:text-base"
            />
            
            
          </div>
          <DialogFooter className="gap-2 w-full flex flex-col sm:flex-row">
            
            <Button onClick={handleStartMonth} className="w-full sm:w-auto">
              Start Month
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowMonthSetup(false)
                setStartDate(undefined)
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
