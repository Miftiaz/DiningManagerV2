## Screenshots
<img width="1912" height="971" alt="image" src="https://github.com/user-attachments/assets/fc8493a4-5ad5-4a99-9621-793dadd9de46" />
<img width="1887" height="713" alt="image" src="https://github.com/user-attachments/assets/81ed11aa-c61b-4869-ab1f-44d7086e356d" />
<img width="1886" height="862" alt="image" src="https://github.com/user-attachments/assets/e12a3833-cb18-4068-b971-bcbb78736860" />
<img width="1888" height="860" alt="image" src="https://github.com/user-attachments/assets/0d447081-c05a-4fc9-887b-c4e5f8cd49b0" />
<img width="1912" height="442" alt="image" src="https://github.com/user-attachments/assets/18eab877-2f5f-4e44-be39-cfb796b7a097" />
# 🍽️ Dining Manager V2

A full-stack web application for managing student dining plans. Managers can control dining months, handle feast tokens, track transactions, manage break days, and adjust individual student dining schedules — all through a clean, responsive interface.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Data Models](#data-models)
- [Business Logic](#business-logic)

---

## ✨ Features

- **Manager Authentication** — Secure JWT-based login and registration
- **Dining Month Management** — Start 30-day dining cycles with auto-generated day records
- **Student Management** — Search students, adjust dining days, and track payment history
- **Feast Token System** — Manage feast subscriptions and daily quota payments
- **Break Day Scheduling** — Add or remove break days; dining calendar auto-adjusts to maintain 30 active days
- **Transaction Tracking** — View full transaction history with PDF export
- **Calendar Visualization** — Visual dining calendar with break date highlighting

---

## 🛠️ Tech Stack

**Frontend**
- React 18+ with TypeScript
- React Router — client-side routing
- Axios — API communication
- ShadCN UI — component library
- Recharts — data visualization
- jsPDF + autoTable — PDF export
- Sonner — toast notifications
- Lucide React — icons
- Vite — build tool

**Backend**
- Node.js + Express.js
- MongoDB with Mongoose ODM
- JWT — authentication (7-day expiry)
- bcrypt — password hashing
- dotenv — environment configuration
- CORS — cross-origin support

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/Miftiaz/dining-manager-v2.git
cd dining-manager-v2
```

**2. Install backend dependencies**
```bash
cd backend
npm install
```

**3. Install frontend dependencies**
```bash
cd ../frontend
npm install
```

**4. Configure environment variables** (see [below](#environment-variables))

**5. Start the backend**
```bash
cd backend
npm run dev
```

**6. Start the frontend**
```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:5173` and the API at `http://localhost:5000`.

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/dining-manager
JWT_SECRET=your_jwt_secret_here
```

---

## 📡 API Reference

All protected routes require a `Bearer <token>` header.

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new manager |
| POST | `/api/auth/login` | Login and receive JWT token |
| GET | `/api/auth/dashboard` | Get dashboard data for active month |
| POST | `/api/auth/dining-month/start` | Start a new 30-day dining month |

### Border (Student) Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/border/search` | Search student by ID |
| GET | `/api/border/all-students` | Get all students in active month |
| GET | `/api/border/calendar` | Get calendar for day adjustment |
| GET | `/api/border/transactions` | Get all transactions for active month |
| POST | `/api/border/adjust` | Add/update student dining days |
| POST | `/api/border/return-token` | Return (remove) student dining days |
| POST | `/api/border/pay-feast` | Mark feast payment as paid |
| POST | `/api/border/clear-payment-due` | Clear outstanding payment or refund due |
| POST | `/api/border/pay-daily-feast-quota` | Pay daily feast quota for remaining days |

### Dining Month

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dining-month/calendar` | Get full dining month calendar |
| POST | `/api/dining-month/break/add-dates` | Mark dates as break days |
| POST | `/api/dining-month/break/remove-dates` | Remove break days |

---

## 🗃️ Data Models
<img width="696" height="612" alt="image" src="https://github.com/user-attachments/assets/04e76b8e-0f6d-4867-a2a3-3a9ca49a2095" />
### Manager
```
{ name, email (unique), password (hashed), phone, createdAt }
```

### DiningMonth
```
{ manager, startDate, endDate, dayCount: 30, diningDays[], breakDays[], feastSubscribers, isActive }
```

### DiningDay
```
{ diningMonth, dayNumber (1–30), date, isPast, students[] }
```

### Student
```
{ manager, diningMonth, id (studentId), name, phone, roomNo,
  selectedDays[], returnedDays[], transactions[],
  feastpaid, dailyFeastQuotaPaid, returnCount }
```

### Transaction
```
{ date, days, amount, type: 'Payment' | 'Refund' | 'Feast' | 'Daily Feast Quota', paidAmount }
```

---

## 💡 Business Logic

### Transaction Pricing
| Type | Rate |
|------|------|
| Dining day purchase | 80 BDT / day |
| Day return (refund) | 35 BDT / day |
| Feast subscription | 100 BDT flat |
| Daily feast quota | 10 BDT × remaining days |

### Return Rules
- Minimum **3 days** must be returned per request
- Maximum **10 total returns** allowed per month per student
- Returned days are locked — they **cannot be re-purchased**

### Daily Feast Quota
A student is marked as `dailyFeastQuotaPaid` when:
- They explicitly pay the quota, **or**
- Their total days used (selected + returned) reaches **30**

### Break Day Logic
When a break day is added, the dining month's end date extends forward so that 30 active (non-break) dining days are always maintained. When a break is removed, dates are recalculated and trimmed back to 30 days.

---
