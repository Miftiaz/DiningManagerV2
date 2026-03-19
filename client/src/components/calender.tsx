import { Calendar, CalendarDayButton } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { AlertCircle } from "lucide-react";

type DateRange = {
  from?: Date;
  to?: Date;
};

type DiningCalendarProps = {
  monthData: any; 
  selectable?: boolean;
  selectedDates: Set<string>;
  setSelectedDates: React.Dispatch<React.SetStateAction<Set<string>>>;
  onAdjust?: (dates: string[]) => void; 
  onReturnToken?: (dates: string[]) => void;
  onAddBreakMode?: () => void;
  onRemoveBreakMode?: () => void;
  onConfirmAddBreak?: (dates?: string[]) => void;
  onConfirmRemoveBreak?: (dates?: string[]) => void;
  breakReason?: string;
  setBreakReason?: React.Dispatch<React.SetStateAction<string>>;
  actionLoading?: boolean;
} & (
  | {
      mode: "admin";
      showBorder?: boolean;
      breakMode?: boolean | null; //break = 1 for addBreak, 0 for removeBreak
    }
  | {
      mode: "student";
      token?: boolean | null; // token = 1 for purchase, 0 for return
      studentData: any;
      onReturnToken?: (dates: string[]) => void;
    }
);


function getMonthsInRange(start: Date, end: Date) {
  const months = []
  const current = new Date(start.getFullYear(), start.getMonth(), 1)

  while (current <= end) {
    months.push(new Date(current))
    current.setMonth(current.getMonth() + 1)
  }
  return months
}


export default function DiningCalendar({monthData, ...dayProps}: DiningCalendarProps){
    
    const [clickedDates, setClickedDates] = useState<DateRange>();
    const [paidAmount, setPaidAmount] = useState<number>(0);
    const [refundedAmount, setRefundedAmount] = useState<number>(0);

    // Reset calendar selection when mode changes
    useEffect(() => {
        setClickedDates(undefined);
        setPaidAmount(0);
        setRefundedAmount(0);
    }, [dayProps.mode === "student" ? (dayProps as any).token : dayProps.selectable]);

    const selectedDatesInRange = getDatesInRange(clickedDates || {});
    const payableAmount = selectedDatesInRange.length * 2 * 40;
    const minReturnDays = 3;
    const remainingReturns = dayProps.mode === "student" ? (dayProps.studentData?.selectedDays?.length || 0) : 0;

    function getDatesInRange(range: DateRange) {
            const dates: string[] = []

            if (!range.from || !range.to) return dates

            const current = new Date(range.from)

            while (current <= range.to) {
                // Use local date values instead of UTC
                const year = current.getFullYear()
                const month = String(current.getMonth() + 1).padStart(2, '0')
                const day = String(current.getDate()).padStart(2, '0')
                dates.push(`${year}-${month}-${day}`)
                current.setDate(current.getDate() + 1)
            }

            return dates
        }

        const handleBuy = () => {
            if (!clickedDates?.from || !clickedDates?.to) return

            const dates = getDatesInRange(clickedDates)

            dayProps.setSelectedDates(prev => {
                const newSet = new Set(prev)
                dates.forEach(d => newSet.add(d))
                console.log(newSet)
                return newSet
            })

            if (dayProps.onAdjust) {
                    dayProps.onAdjust(dates);
            }

            setClickedDates(undefined)
        }

        const handleSelect = (range: DateRange | undefined) => {
            setClickedDates(range)
        }

        const handleCancel = () => {
            setClickedDates(undefined)
        }

        const handleAddBreakMode = () => {
            if (dayProps.onAddBreakMode) {
                dayProps.onAddBreakMode()
            }
        }

        const handleRemoveBreakMode = () => {
            if (dayProps.onRemoveBreakMode) {
                dayProps.onRemoveBreakMode()
            }
        }

        const handleConfirmAddBreak = async () => {
            if (!clickedDates?.from || !clickedDates?.to) return

            const dates = getDatesInRange(clickedDates)

            dayProps.setSelectedDates(prev => {
                const newSet = new Set(prev)
                dates.forEach(d => newSet.add(d))
                return newSet
            })

            setClickedDates(undefined)

            // Pass dates directly to parent instead of relying on state sync
            if (dayProps.onConfirmAddBreak) {
                dayProps.onConfirmAddBreak(dates)
            }
        }

        const handleConfirmRemoveBreak = async () => {
            if (!clickedDates?.from || !clickedDates?.to) return

            const dates = getDatesInRange(clickedDates)

            dayProps.setSelectedDates(prev => {
                const newSet = new Set(prev)
                dates.forEach(d => newSet.add(d))
                return newSet
            })

            setClickedDates(undefined)

            // Pass dates directly to parent instead of relying on state sync
            if (dayProps.onConfirmRemoveBreak) {
                dayProps.onConfirmRemoveBreak(dates)
            }
        }

        const handleReturnToken = () => {
            if (!clickedDates?.from || !clickedDates?.to || selectedDatesInRange.length < minReturnDays) return
            
            const dates = getDatesInRange(clickedDates)
            
            dayProps.setSelectedDates(prev => {
                const newSet = new Set(prev)
                dates.forEach(d => newSet.delete(d))
                return newSet
            })
            
            if (dayProps.onReturnToken) {
                dayProps.onReturnToken(dates);
            }
            
            setClickedDates(undefined)
            setRefundedAmount(0)
        }

    if (!monthData) {
        console.log("Loading baby")
        return <div className="text-center p-4">Loading calendar...</div>;
    }
    console.log(monthData)

    const start = new Date(monthData.activeDiningMonth.startDate)
    const end = new Date(monthData.activeDiningMonth?.endDate)

    const months = getMonthsInRange(start, end)

        // Create a map of dates to calendar day data
    const calendarDayMap = Object.fromEntries(
        monthData.calendarDays.map((d) => [new Date(d.date).toDateString(), d])
    )

    // Create a map of break dates
    const breakDateSet = new Set(
        monthData.breakDates?.map((b) => new Date(b.date).toDateString()) || []
    )

    // Always disable past dates
    const baseMatchers = [
        { before: new Date() > start ? new Date() : start },
        { after: end }
    ];

    let disabledMatchers: any[] = [...baseMatchers];

    if (dayProps.mode === "student" && dayProps.selectable) {

        if (dayProps.token === true) {
            // token = 1 → purchase: disable selectedDays & returned days
            const purchaseDates =
                dayProps.studentData?.selectedDays?.map((d: any) => new Date(d.day.date)) || [];
            const returnDates =
                dayProps.studentData?.returnedDays?.map((dayId: any) => {
                  const diningDay = monthData.calendarDays.find((cd: any) => cd._id === dayId);
                  return diningDay ? new Date(diningDay.date) : null;
                }).filter(Boolean) || [];
            disabledMatchers = [...baseMatchers, ...purchaseDates, ...returnDates];

        } else if (dayProps.token === false) {
            // token = 0 → return: disable non-purchased
            const calenderDates = Object.values(calendarDayMap).map(d => new Date(d.date));
            const purchaseDates =
                dayProps.studentData?.selectedDays?.map((d: any) => new Date(d.day.date)) || [];
            const purchaseSet = new Set(purchaseDates.map(d => d.getTime()));
            const datesToDisable = calenderDates.filter(
                calDate => !purchaseSet.has(calDate.getTime())
            );
            disabledMatchers = [...baseMatchers, ...datesToDisable];
        }
        else{
            // Not selectable → disable all dates
            const disabledDates = Object.values(calendarDayMap).map(d => new Date(d.date));
            disabledMatchers = [...baseMatchers, ...disabledDates];
        }

    } else {
        // Admin mode
        if(dayProps.breakMode === null) {
            // Not in break mode → disable all dates
            const disabledDates = Object.values(calendarDayMap).map(d => new Date(d.date));
            const breakDates = (monthData.breakDates || []).map((b: any) => new Date(b.date));
            disabledMatchers = [...baseMatchers, ...disabledDates, ...breakDates];
        } else if (dayProps.breakMode === true) {
            // Add break mode → disable already existing breaks
            const breakDates = (monthData.breakDates || []).map((b: any) => new Date(b.date));
            disabledMatchers = [...baseMatchers, ...breakDates];
        } else if (dayProps.breakMode === false) {
            // Remove break mode → disable non-break dates, only allow selecting breaks
            const allDiningDates = Object.values(calendarDayMap).map(d => new Date(d.date));
            const breakDates = (monthData.breakDates || []).map((b: any) => new Date(b.date));
            const breakSet = new Set(breakDates.map(d => d.getTime()));
            const nonBreakDates = allDiningDates.filter(
                dDate => !breakSet.has(dDate.getTime())
            );
            disabledMatchers = [...baseMatchers, ...nonBreakDates];
        }
    }

    return (
        <Card className="w-fit p-0 shadow-lg">
            <CardContent className="p-2">
                <Calendar
                month={months[0]}
                mode="range"
                min={2}
                numberOfMonths={months.length}
                showOutsideDays={false}
                hideNavigation
                selected={clickedDates}
                onSelect={handleSelect}
                disabled={disabledMatchers}
                modifiers={{
                    dining: monthData.calendarDays.map((d) => new Date(d.date)),
                    break: monthData.breakDates?.map((b) => new Date(b.date)) || [],
                    returned: dayProps.studentData?.returnedDays?.map((dayId: any) => {
                      const diningDay = monthData.calendarDays.find((cd: any) => cd._id === dayId);
                      return diningDay ? new Date(diningDay.date) : null;
                    }).filter(Boolean) || [],
                }}
                modifiersClassNames={{
                    dining: "bg-green-500 text-white !font-bold hover:bg-green-600",
                    break: "bg-red-500 text-white font-black hover:bg-red-600",
                    today: "border-3 border-green-800",
                    returned: "!bg-orange-500 text-white"
                }}
                className={`[--cell-size:2rem] sm:[--cell-size:1rem] ${
                    months.length > 2 ? "md:[--cell-size:2rem]" : "md:[--cell-size:3rem]"
                }`}
                classNames={{ disabled: "opacity-100" }}
                components={{
                    Day: ({ children, day, modifiers, ...props }) => {
                    const dateStr = day.date.toDateString();
                    const calendarDay = calendarDayMap[dateStr];
                    const isBreakDay = breakDateSet.has(dateStr);

                    return (
                        <td {...props}>
                        
                            {children}
                            {calendarDay && dayProps.mode === "admin" && dayProps.showBorder && (
                                <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-bold rounded-full w-6 h-6 flex items-center justify-center shadow">
                                    {calendarDay.borderCount}
                                </span>
                            )}
                            {calendarDay && (
                                <span className="text-[10px] leading-none bg-green-800 text-white px-1 rounded">
                                    Day {calendarDay.day || calendarDay.dayNumber}
                                </span>
                            )}
                            {isBreakDay && (
                                <span className="bg-red-800 text-white text-[8px] font-bold rounded px-1">
                                    Break
                                </span>
                            )}
                        
                        </td>
                    );
                    },
                }}
                footer={
                    dayProps.mode === "student" && dayProps.token != null ? (
                    <>

                    {/* Selected Days & Paid Amount Section */}
                    {dayProps.token === true && clickedDates?.from && clickedDates?.to && (
                    <>
                        <Separator className="my-4" />
                        <div className="flex space-x-8 items-center justify-center">
                            <Card>
                            <CardContent>
                                <p>Selected Days: {selectedDatesInRange.length}</p>
                                <p>Payable: {payableAmount} TK (2 meals × 40 TK per day)</p>
                            </CardContent>
                            </Card>

                            <Card>
                            <CardContent className="space-y-2">
                                <Input
                                    id="paidAmount"
                                    type="number"
                                    value={paidAmount}
                                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                                    placeholder="0"
                                    className="max-w-35"
                                />
                                <p className="text-sm text-gray-600">
                                    Due Amount: {payableAmount - Number(paidAmount)} TK
                                </p>
                            </CardContent>
                            </Card>
                        </div>
                    </>
                    )}

                    {/* Return Days & Returnable Amount Section */}
                    {/* Return Mode Section */}
                    {dayProps.token === false && (
                    <>
                        <Separator className="my-4" />
                        <div className="space-y-4 flex space-x-8 items-center justify-center">
                            {/* Insufficient quota */}
                            {remainingReturns < minReturnDays ? (
                            <Alert variant="destructive" className="w-full max-w-md flex flex-coljustify-center items-center">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Insufficient quota</AlertTitle>
                                <AlertDescription>
                                    Need minimum {minReturnDays} day{minReturnDays !== 1 ? 's' : ''} to return. Only {remainingReturns} day{remainingReturns !== 1 ? 's' : ''} remaining.
                                </AlertDescription>
                            </Alert>
                            ) : (
                            <>
                                {/* Quota info */}
                                <Alert className="w-full max-w-md flex justify-center items-center">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Return Limit</AlertTitle>
                                    <AlertDescription>
                                        <p>{remainingReturns} day{remainingReturns !== 1 ? 's' : ''} available</p>
                                        <p className="mt-1">Minimum {minReturnDays} day{minReturnDays !== 1 ? 's' : ''} required to process return</p>
                                    </AlertDescription>
                                </Alert>

                                {/* Selected Days & Refund Section */}
                                {selectedDatesInRange.length > 0 && (
                                <div className="space-y-4 flex flex-col items-center justify-center w-full max-w-md">
                                    <Card className="w-full">
                                    <CardContent className="p-4">
                                        <p>Days Selected: {selectedDatesInRange.length}</p>
                                        <p>Refundable Amount: {selectedDatesInRange.length * 35} TK</p>
                                        {selectedDatesInRange.length < minReturnDays && (
                                        <p className="text-sm text-amber-700 mt-2">
                                            ⚠️ Select {minReturnDays - selectedDatesInRange.length} more day{minReturnDays - selectedDatesInRange.length !== 1 ? 's' : ''}
                                        </p>
                                        )}
                                    </CardContent>
                                    </Card>

                                    <Card className="w-full max-w-40">
                                    <CardContent className="p-4 space-y-2">
                                        <Input
                                            id="refundAmount"
                                            type="number"
                                            value={refundedAmount}
                                            onChange={(e) => setRefundedAmount(Number(e.target.value))}
                                            placeholder="0"
                                        />
                                        <p className="text-sm text-gray-600">
                                            Due Refund: {selectedDatesInRange.length * 35 - Number(refundedAmount)} TK
                                        </p>
                                    </CardContent>
                                    </Card>
                                </div>
                                )}
                            </>
                            )}
                        </div>
                    </>
                    )}

                    <Separator className="my-4" />
                    <div className="flex justify-center gap-2">
                        {selectedDatesInRange.length > 0 && <Button
                        onClick={handleCancel}
                        variant="outline"
                        >
                        Cancel
                        </Button>}
                        <Button
                        onClick={dayProps.token? handleBuy : handleReturnToken}
                        disabled={!clickedDates?.from || !clickedDates?.to}
                        >
                        {dayProps.token ? "Buy" : "Return"}
                        </Button>
                    </div>
                    </>
                    ) : dayProps.mode === "admin" && (dayProps as any).breakMode != null ? (
                    <>
                    <Separator className="my-4" />
                    {/* Break Selection Panel */}
                    <div className="space-y-4 flex flex-col items-center justify-center w-full max-w-2xl mx-auto">
                        {(dayProps as any).breakMode === true && (
                            <>
                                <Card className="w-full">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Break Reason</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Input
                                            id="break-reason"
                                            placeholder="Enter reason for break (optional)"
                                            value={dayProps.breakReason || ""}
                                            onChange={(e) => dayProps.setBreakReason?.(e.target.value)}
                                        />
                                    </CardContent>
                                </Card>
                                <Separator className="my-2" />
                            </>
                        )}

                        <Card className="w-full flex justify-center">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    {(dayProps as any).breakMode === true ? 'Select Break Dates' : 'Select Dates to Remove'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-sm font-medium mb-3">
                                        Selected: {selectedDatesInRange.length} date(s)
                                    </p>
                                    {selectedDatesInRange.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {selectedDatesInRange
                                                .sort()
                                                .map((dateStr) => {
                                                    const date = new Date(dateStr)
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
                                                        <Badge key={dateStr} variant="secondary" className="px-3 py-1">
                                                            {formattedDate}
                                                        </Badge>
                                                    )
                                                })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic">No dates selected</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Separator className="my-2" />
                                <div className="flex gap-2 justify-center">
                                    <Button
                                        variant="outline"
                                        onClick= {() =>{
                                            handleCancel();
                                            if ((dayProps as any).breakMode === true) {
                                                handleAddBreakMode();
                                            }else{
                                                handleRemoveBreakMode();
                                            }
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    {selectedDatesInRange.length > 0 && (
                                        <Button
                                            onClick={
                                                (dayProps as any).breakMode === true
                                                    ? handleConfirmAddBreak
                                                    : handleConfirmRemoveBreak
                                            }
                                            disabled={dayProps.actionLoading}
                                        >
                                            {dayProps.actionLoading
                                                ? 'Processing...'
                                                : (dayProps as any).breakMode === true
                                                    ? 'Add Breaks'
                                                    : 'Remove Breaks'}
                                        </Button>
                                    )}
                                </div>
                    </div>
                    </>
                    ) : null
                }
                />
            </CardContent>
            </Card>
    )
}

