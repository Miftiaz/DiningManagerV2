import DiningCalendar from "@/components/calender"
import { useState, useEffect } from "react"
import { toast } from 'sonner'
import { authAPI, diningMonthAPI } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"
import { AlertCircle, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface MonthData {
  stats: {
    pastDaysCount: number
    remainingDaysCount: number
    totalDays: number
  }
  calendarDays: Array<{
    date: string
    day: number
    isPast: boolean
  }>
  breakDates?: Array<{
    date: string
    reason: string
  }>
}

export default function AdjustDiningMonth() {
  const [dashboardData, setDashboardData] = useState<MonthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDates, setSelectedDates] = useState(new Set<string>())
  const [breakMode, setBreakMode] = useState<boolean | null>(null)
  const [lastClickedDate, setLastClickedDate] = useState<string | null>(null)
  const [breakReason, setBreakReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async (): Promise<void> => {
    try {
      const res = await authAPI.getDashboard()
      setDashboardData(res.data)
      setLoading(false)
    } catch (err) {
      toast.error('Failed to load dashboard')
      setLoading(false)
      console.error(err)
    }
  }

  const handleDateClick = (dateStr: string, isShiftKey: boolean, isCurrentlyBreak: boolean) => {
    if (breakMode === true && isCurrentlyBreak) return
    if (breakMode === false && !isCurrentlyBreak) return

    setSelectedDates((prev) => {
      const newSet = new Set(prev)

      if (isShiftKey && lastClickedDate && dashboardData) {
        const allDates = dashboardData.calendarDays.map((d) => {
          const date = new Date(d.date)
          return date.toISOString().split('T')[0]
        })
        const lastIdx = allDates.indexOf(lastClickedDate)
        const currentIdx = allDates.indexOf(dateStr)

        if (lastIdx !== -1 && currentIdx !== -1) {
          const start = Math.min(lastIdx, currentIdx)
          const end = Math.max(lastIdx, currentIdx)

          for (let i = start; i <= end; i++) {
            const date = allDates[i]
            const isDiningDay = dashboardData.calendarDays.find((d) => {
              const dDate = new Date(d.date)
              return dDate.toISOString().split('T')[0] === date
            })
            const isBreak = dashboardData.breakDates?.some((b) => {
              const bDate = new Date(b.date)
              return bDate.toISOString().split('T')[0] === date
            })

            if (isDiningDay && !isDiningDay.isPast) {
              if (breakMode === true && !isBreak) {
                newSet.add(date)
              } else if (breakMode === false && isBreak) {
                newSet.add(date)
              }
            }
          }
        }
      } else {
        if (newSet.has(dateStr)) {
          newSet.delete(dateStr)
        } else {
          newSet.add(dateStr)
        }
      }

      return newSet
    })

    setLastClickedDate(dateStr)
  }

  const handleAddBreakMode = () => {
    if (breakMode === true) {
      console.log("addbreak clicked!");
      setBreakMode(null)
      setSelectedDates(new Set())
      setLastClickedDate(null)
      setBreakReason('')
    } else {
      setBreakMode(true)
      setSelectedDates(new Set())
      setLastClickedDate(null)
      setBreakReason('')
    }
  }

  const handleRemoveBreakMode = () => {
    if (breakMode === false) {
      setBreakMode(null)
      setSelectedDates(new Set())
      setLastClickedDate(null)
      setBreakReason('')
    } else {
      setBreakMode(false)
      setSelectedDates(new Set())
      setLastClickedDate(null)
      setBreakReason('')
    }
  }

  const handleConfirmAddBreak = async (dates?: string[]) => {
    // Use passed dates or fall back to state (for compatibility)
    const datesArray = dates || Array.from(selectedDates)
    
    if (datesArray.length === 0) {
      toast.error('Please select at least one date')
      return
    }

    setActionLoading(true)
    try {
      const sortedDates = datesArray.sort()
      const reason = breakReason.trim() || 'Break'
      await diningMonthAPI.addBreakDates({ dates: sortedDates, reason })

      toast.success('Breaks added successfully')
      fetchDashboard()
      setBreakMode(null)
      setSelectedDates(new Set())
      setLastClickedDate(null)
      setBreakReason('')
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to add breaks'
      toast.error(errorMsg)
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmRemoveBreak = async (dates?: string[]) => {
    // Use passed dates or fall back to state (for compatibility)
    const datesArray = dates || Array.from(selectedDates)
    
    if (datesArray.length === 0) {
      toast.error('Please select at least one date')
      return
    }

    setActionLoading(true)
    try {
      const sortedDates = datesArray.sort()
      await diningMonthAPI.removeBreakDates({ dates: sortedDates })

      toast.success('Breaks removed successfully')
      fetchDashboard()
      setBreakMode(null)
      setSelectedDates(new Set())
      setLastClickedDate(null)
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to remove breaks'
      toast.error(errorMsg)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Adjust Dining Month</h1>
      </div>

      

      {/* Calendar Section */}
      {dashboardData && (
        <Card  className="flex items-center">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DiningCalendar
              monthData={dashboardData}
              mode="admin"
              selectable={true}
              showBorder={false}
              selectedDates={selectedDates}
              setSelectedDates={setSelectedDates}
              breakMode={breakMode}
              breakReason={breakReason}
              setBreakReason={setBreakReason}
              actionLoading={actionLoading}
              onAddBreakMode={handleAddBreakMode}
              onRemoveBreakMode={handleRemoveBreakMode}
              onConfirmAddBreak={handleConfirmAddBreak}
              onConfirmRemoveBreak={handleConfirmRemoveBreak}
            />
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {breakMode === null && (
        <div className="flex item-center gap-2">
          <Button onClick={handleAddBreakMode} variant={breakMode ? 'default' : 'outline'}>
            Add Break
          </Button>
          <Button onClick={handleRemoveBreakMode} variant={breakMode ? 'default' : 'outline'}>
            Remove Break
          </Button>
        </div>
      )}

      {/* Breaks Section */}
      {dashboardData && (
        <Card  className="flex items-center">
          <CardHeader>
            <CardTitle>Current Breaks</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.breakDates && dashboardData.breakDates.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                {dashboardData.breakDates.map((bd, idx) => {
                  const date = new Date(bd.date)
                  const monthNames = [
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec',
                  ]
                  const formattedDate = `${monthNames[date.getMonth()]} ${date.getDate()}`

                  return (
                    <div
                      key={`break-${idx}`}
                      className="flex flex-col items-center justify-center p-3 border rounded-lg bg-muted/50"
                    >
                      <p className="font-semibold text-sm">{formattedDate}</p>
                      {bd.reason && (
                        <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">{bd.reason}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <AlertCircle className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>No breaks added</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                  <EmptyDescription>
                    No break dates have been added to this dining month
                  </EmptyDescription>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}