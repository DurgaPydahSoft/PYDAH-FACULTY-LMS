# 📘 Pydah Faculty Leave Management System (FLMS)

A digital solution to streamline and automate the process of applying, approving, and managing faculty leave requests at **Pydah Institutions**.  
It eliminates manual paperwork, ensures transparency, and provides a faster leave approval workflow.

---

## 📖 Overview
The **Faculty Leave Management System (FLMS)** allows:
- Faculty to apply for leave online.  
- HODs to review and forward/reject requests.  
- Principals to take final approval decisions.  
- Admins & HR to manage faculty records, accounts, and generate reports.  

---

## 🎯 Objectives
- Simplify leave request submission.  
- Provide structured dashboards for HODs and Principals.  
- Ensure transparency in leave approvals.  
- Maintain accurate records for auditing & reporting.  
- Reduce delays in communication and approvals.  

---

## ✨ Key Features

### 👨‍🏫 Faculty
- Apply for leave online.  
- View leave history & status (Pending/Approved/Rejected/Forwarded).  
- Add reason/remarks when applying.  

### 🏫 HOD
- View & manage leave requests from department faculty.  
- Forward leave requests to the Principal.  
- Add remarks before forwarding/rejecting.  

### 🎓 Principal
- Review leave requests forwarded by HODs.  
- Approve/Reject requests with remarks.  
- View consolidated records across departments.  

### 👨‍💻 Admin
- Manage accounts (Faculty, HOD, Principal).  
- Generate leave reports (by department/faculty).  
- Maintain optional academic calendar integration.  

### 🧑‍💼 HR
- Register new faculty into the database.  
- Update/remove faculty records.  
- Assign faculty under respective HODs.  
- Maintain accurate faculty details for smooth leave management.  

---

## 🏗️ System Architecture

- **Frontend:** React.js (Dashboards & Forms)  
- **Backend:** Node.js / Express.js (Business logic & APIs)  
- **Database:** MongoDB / PostgreSQL (Leave requests, users, approvals)  
- **Authentication:** JWT-based secure login system  
- **Hosting:** AWS / Local Server  

**Flow:**  
Faculty → Submit Request → HOD → Forward/Reject → Principal → Approve/Reject → Database Updated  

---

## 🔄 Workflow
1. Faculty logs in and applies for leave.  
2. HOD receives the request.  
   - Can approve & forward to Principal.  
   - Or reject with remarks.  
3. Principal reviews forwarded requests.  
   - Approves/Rejects with remarks.  
4. Faculty is notified of final status.  
5. Admin can generate reports anytime.  

---

## 🧩 Modules
- **Login & Authentication** – Secure login for all roles.  
- **Leave Request Module** – Apply, view, and manage leave.  
- **Approval Workflow Module** – Forward, reject, or approve with remarks.  
- **Dashboard Module** – Separate dashboards for Admin, Faculty, HOD, Principal.  
- **Reports & Analytics** – Leave statistics, pending requests, and history.  

---

## ✅ Advantages
- Saves time & reduces paperwork.  
- Transparent & structured approval process.  
- Centralized leave record management.  
- Easy reporting for administration.  
- Improved communication among Faculty, HOD, Principal.  

---

## 🚀 Future Enhancements
- Mobile App for leave requests and approvals.  
- Email/SMS notifications for updates.  
- Biometric attendance integration.  
- Academic calendar synchronization.  
- AI-based insights (frequent leave trends, predictions, etc.).  

---

## 🛠️ Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-username/pydah-flms.git

###2️⃣ Navigate to Project Folder
cd pydah-flms
### 3️⃣ Install Dependencies
For ## backend:
cd backend
npm install
For ## frontend:
cd frontend
npm install
### 4️⃣ Configure Environment
Create a .env file in the backend folder with details like:
PORT=5000
DB_URI=your_database_connection_url
JWT_SECRET=your_jwt_secret
### 5️⃣ Run the Application
## Run backend:
cd backend
## npm start
Run frontend:
cd frontend
npm start
App will be available at:
👉 http://localhost:3000 (Frontend)
👉 http://localhost:5000 (Backend API)
________________________________________
### 📊 Contribution Guidelines
We welcome contributions! 🚀
1.	Fork the repository.
2.	Create a new branch.
3.	Commit changes and push.
4.	Open a Pull Request.
________________________________________
### 📜 License
This project is licensed under the MIT License – you are free to use, modify, and distribute.
________________________________________
## 🏢 About PydahSoft
**PydahSoft** is the in-house software development team of **Pydah Institutions**, dedicated to building innovative digital solutions that simplify academic and administrative workflows.  
From web-based management systems to mobile applications, PydahSoft focuses on creating reliable, user-friendly, and efficient projects like the **Faculty Leave Management System (FLMS)** to support students, faculty, and administrators with modern technology.  

