import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

const API: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API types
interface RegisterData {
  email: string;
  password: string;
  name: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface DiningMonthData {
  month: number;
  year: number;
}

export const authAPI = {
  register: (data: RegisterData) => API.post('/auth/register', data),
  login: (data: LoginData) => API.post('/auth/login', data),
  getDashboard: () => API.get('/auth/dashboard'),
  startDiningMonth: (data: DiningMonthData) => API.post('/auth/dining-month/start', data)
};

// Border API types
interface AdjustStudentDaysData {
  studentId: string;
  daysToAdd: number;
}

interface ReturnTokenData {
  studentId: string;
  amount: number;
}

interface PayFeastDueData {
  studentId: string;
  amount: number;
}

interface PayDailyFeastQuotaData {
  studentId: string;
  amount: number;
}

export const borderAPI = {
  searchStudent: (studentId: string) => API.get('/border/search', { params: { studentId } }),
  getAllStudents: () => API.get('/border/all-students'),
  getCalendar: () => API.get('/border/calendar'),
  adjustStudentDays: (data: AdjustStudentDaysData) => API.post('/border/adjust', data),
  returnToken: (data: ReturnTokenData) => API.post('/border/return-token', data),
  payFeastDue: (data: PayFeastDueData) => API.post('/border/pay-feast', data),
  clearPaymentDue: (data: PayFeastDueData) => API.post('/border/clear-payment-due', data),
  payDailyFeastQuota: (data: PayDailyFeastQuotaData) => API.post('/border/pay-daily-feast-quota', data),
  getAllTransactions: () => API.get('/border/transactions')
};

// Dining Month API types
interface BreakDatesData {
  dates: string[];
  reason?: string;
}

export const diningMonthAPI = {
  getCalendar: () => API.get('/dining-month/calendar'),
  addBreakDates: (data: BreakDatesData) => API.post('/dining-month/break/add-dates', data),
  removeBreakDates: (data: BreakDatesData) => API.post('/dining-month/break/remove-dates', data)
};

export default API;
