import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PasswordResetModal from "../../components/PasswordResetModal";
import {
  FaUserTie,
  FaUsers,
  FaRegCalendarCheck,
  FaCamera,
  FaTrash,
  FaUserCircle,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import config from "../../config";
import Loading from "../../components/Loading";
import HRSidebar from "./HRSidebar";
import HRDashboardSection from "./HRDashboardSection";
import EmployeeManagementSection from "./EmployeeManagementSection";
import EmployeeOperationsSection from "./EmployeeOperationsSection";
import ProfileSection from "./ProfileSection";
import HRLeaveRequestsSection from "./HRLeaveRequestsSection";
import HRTaskManagementSection from "./HRTaskManagementSection";
import HodManagement from "./HodManagement";

const API_BASE_URL = config.API_BASE_URL;

const HRDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    employeeId: "",
    phoneNumber: "",
    campus: "",
    department: "",
    role: "",
    customRole: "",
    leaveBalanceByExperience: "",
  });
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    role: "",
    customRole: "",
    department: "",
    status: "",
    branchCode: "",
    leaveBalance: 12,
    leaveBalanceByExperience: "",
  });
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [selectedEmployeeForReset, setSelectedEmployeeForReset] =
    useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkData, setBulkData] = useState([]);
  const [bulkResults, setBulkResults] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkEditableData, setBulkEditableData] = useState([]);
  const [bulkBranches, setBulkBranches] = useState([]);
  const [bulkRoles, setBulkRoles] = useState([]);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [headerMapping, setHeaderMapping] = useState({});

  // Profile picture states
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedEmployeeForPicture, setSelectedEmployeeForPicture] =
    useState(null);

  const fileInputRef = useRef(null);

  const campuses = [
    { value: "engineering", label: "Engineering" },
    { value: "degree", label: "Degree" },
    { value: "pharmacy", label: "Pharmacy" },
    { value: "diploma", label: "Diploma" },
  ];

  useEffect(() => {
    fetchEmployeeStats();
    fetchEmployees();
    fetchRoles();
    fetchHRBranches();
  }, [search, department, status]);

  const fetchHRBranches = async () => {
    if (!user?.campus?.name) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/employee/branches?campus=${user.campus.name}`
      );
      const data = await response.json();
      const activeBranches = (data.branches || []).filter((b) => b.isActive);
      setBranches(activeBranches);
    } catch (error) {
      console.error("Error fetching HR branches:", error);
      setBranches([]);
    }
  };

  useEffect(() => {
    const fetchBranches = async () => {
      if (!newEmployee.campus) {
        setBranches([]);
        return;
      }
      try {
        const response = await fetch(
          `${API_BASE_URL}/employee/branches?campus=${newEmployee.campus}`
        );
        const data = await response.json();
        const activeBranches = (data.branches || []).filter((b) => b.isActive);
        setBranches(activeBranches);
        if (
          newEmployee.department &&
          !activeBranches.some((b) => b.code === newEmployee.department)
        ) {
          setNewEmployee((prev) => ({ ...prev, department: "" }));
        }
      } catch (error) {
        setBranches([]);
      }
    };
    fetchBranches();
  }, [newEmployee.campus]);

  useEffect(() => {
    // Set campus to HR's campus on open
    if (user?.campus?.name && !newEmployee.campus) {
      setNewEmployee((prev) => ({ ...prev, campus: user.campus.name }));
    }
  }, [user, showRegisterModal]);

  const fetchEmployeeStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/hr/employees`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch employee stats");
      const data = await response.json();
      setStats({
        totalEmployees: data.length,
        activeEmployees: data.filter((emp) => emp.status === "active").length,
        inactiveEmployees: data.filter((emp) => emp.status === "inactive")
          .length,
      });
    } catch (error) {
      setError("Failed to fetch employee statistics");
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.append("search", search);
      if (department) queryParams.append("department", department);
      if (status) queryParams.append("status", status);
      // Add timestamp to prevent caching
      queryParams.append("_t", Date.now());

      const response = await fetch(
        `${API_BASE_URL}/hr/employees?${queryParams}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      setEmployees(data);
      setError(null);
    } catch (error) {
      setError("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/hr/roles`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setRoles(data);
        // Set default role if available
        if (data.length > 0 && !newEmployee.role) {
          setNewEmployee((prev) => ({ ...prev, role: data[0].value }));
        }
      }
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to fetch roles");
    }
  };

  const getCampusRoles = (campusType) => {
    const roles = {
      engineering: [
        { value: "associate_professor", label: "Associate Professor" },
        { value: "assistant_professor", label: "Assistant Professor" },
        { value: "lab_incharge", label: "Lab Incharge" },
        { value: "lab_assistant", label: "Lab Assistant" },
        { value: "technician", label: "Technician" },
        { value: "librarian", label: "Librarian" },
        { value: "pet", label: "PET" },
        { value: "other", label: "Other" },
      ],
      diploma: [
        { value: "senior_lecturer", label: "Senior Lecturer" },
        { value: "lecturer", label: "Lecturer" },
        { value: "lab_incharge", label: "Lab Incharge" },
        { value: "lab_assistant", label: "Lab Assistant" },
        { value: "technician", label: "Technician" },
        { value: "other", label: "Other" },
      ],
      pharmacy: [
        { value: "associate_professor", label: "Associate Professor" },
        { value: "assistant_professor", label: "Assistant Professor" },
        { value: "lab_incharge", label: "Lab Incharge" },
        { value: "lab_assistant", label: "Lab Assistant" },
        { value: "technician", label: "Technician" },
        { value: "other", label: "Other" },
      ],
      degree: [
        { value: "associate_professor", label: "Associate Professor" },
        { value: "assistant_professor", label: "Assistant Professor" },
        { value: "lab_incharge", label: "Lab Incharge" },
        { value: "lab_assistant", label: "Lab Assistant" },
        { value: "technician", label: "Technician" },
        { value: "other", label: "Other" },
      ],
    };
    return roles[campusType] || [];
  };

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setNewEmployee((prev) => ({
      ...prev,
      role: selectedRole,
      customRole: selectedRole === "other" ? prev.customRole : "",
    }));
  };

  const handleRegisterEmployee = async () => {
    if (newEmployee.password !== newEmployee.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(newEmployee.phoneNumber)) {
      toast.error("Please enter a valid 10-digit phone number");
      return;
    }
    if (!newEmployee.campus) {
      toast.error("Please select a campus");
      return;
    }
    if (!branches.some((b) => b.code === newEmployee.department)) {
      toast.error("Invalid department for selected campus");
      return;
    }
    if (newEmployee.role === "other" && !newEmployee.customRole) {
      toast.error("Please enter a custom role");
      return;
    }
    setLoading(true);
    try {
      const payload = {
        name: `${newEmployee.firstName} ${newEmployee.lastName}`,
        email: newEmployee.email ? newEmployee.email.toLowerCase() : null,
        password: newEmployee.password,
        employeeId: newEmployee.employeeId,
        phoneNumber: newEmployee.phoneNumber,
        role: newEmployee.role || "faculty",
        department: newEmployee.department,
        branchCode: newEmployee.department,
        leaveBalanceByExperience: newEmployee.leaveBalanceByExperience,
      };
      if (newEmployee.role === "other") {
        payload.customRole = newEmployee.customRole;
      }
      const response = await fetch(`${API_BASE_URL}/hr/employees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || "Failed to register employee");
      }
      setShowRegisterModal(false);
      setNewEmployee({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
        employeeId: "",
        phoneNumber: "",
        campus: "",
        department: "",
        role: "",
        customRole: "",
        leaveBalanceByExperience: "",
      });
      fetchEmployees();
      fetchEmployeeStats();
      toast.success("Employee registered successfully!");
    } catch (error) {
      toast.error(
        error.message || "Failed to register employee. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("campus");
    localStorage.removeItem("branchCode");
    navigate("/");
  };

  // Open edit modal and set form
  const handleEditClick = (employee) => {
    console.log("Edit button clicked for employee:", employee);
    setEditEmployee(employee);
    setEditForm({
      name: employee.name || "",
      email: employee.email || "",
      phoneNumber: employee.phoneNumber || "",
      role: employee.role || "",
      customRole:
        employee.role === "other" ? employee.roleDisplayName || "" : "",
      department: employee.department || "",
      status: employee.status || "active",
      branchCode: employee.branchCode || "",
      leaveBalance: employee.leaveBalance || 12,
      leaveBalanceByExperience:
        employee.leaveBalanceByExperience !== undefined
          ? employee.leaveBalanceByExperience
          : "",
    });
    setShowEditModal(true);
    console.log("Edit modal should be open now");
  };

  // Submit edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatePayload = {
        name: editForm.name,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber,
        role: editForm.role,
        customRole: editForm.role === "other" ? editForm.customRole : "",
        department: editForm.department,
        status: editForm.status,
        branchCode: editForm.branchCode,
        leaveBalance: parseInt(editForm.leaveBalance),
        leaveBalanceByExperience: parseInt(editForm.leaveBalanceByExperience),
      };
      const response = await fetch(
        `${API_BASE_URL}/hr/employees/${editEmployee._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(updatePayload),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || "Failed to update employee");
      }
      const data = await response.json();
      setEmployees((prevEmployees) =>
        prevEmployees.map((emp) =>
          emp._id === editEmployee._id ? { ...emp, ...data.employee } : emp
        )
      );
      setShowEditModal(false);
      setEditEmployee(null);
      fetchEmployees();
      toast.success("Employee updated successfully!");
    } catch (error) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update employee.");
    }
  };

  const fetchBranchesForCampus = async (campus) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/employee/branches?campus=${campus}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch branches");
      }
      const data = await response.json();
      return (data.branches || []).filter((branch) => branch.isActive);
    } catch (error) {
      console.error("Error fetching branches:", error);
      toast.error("Failed to fetch branches");
      return [];
    }
  };

  const fetchRolesForCampus = async (campus) => {
    try {
      const response = await fetch(`${API_BASE_URL}/hr/roles`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch roles");
      }
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Failed to fetch roles");
      return [];
    }
  };

  const validateBulkRow = (row) => {
    const errors = {};

    // Name validation
    if (!row.name || row.name.trim() === "") {
      errors.name = "Name is required";
    } else if (row.name.length < 2) {
      errors.name = "Name is too short";
    } else if (row.name.length > 100) {
      errors.name = "Name is too long";
    } else if (!/^[a-zA-Z\s.]*$/.test(row.name)) {
      errors.name = "Name can only contain letters, spaces and dots";
    }

    // Enhanced email validation (make it optional)
    if (row.email && row.email.trim() !== "") {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const [localPart] = row.email.split("@");
      if (localPart.length < 5) {
        errors.email = "Email must have at least 5 characters before @";
      } else if (!emailRegex.test(row.email)) {
        errors.email = "Invalid email format";
      } else if (row.email.length > 100) {
        errors.email = "Email is too long";
      } else if (row.email.includes("..") || row.email.includes("--")) {
        errors.email = "Invalid email format";
      }
    }

    // Employee ID validation
    if (!row.employeeId) {
      errors.employeeId = "Employee ID is required";
    } else if (!/^[A-Za-z0-9-]+$/.test(row.employeeId)) {
      errors.employeeId =
        "Employee ID can only contain letters, numbers and hyphens";
    } else if (row.employeeId.length < 3) {
      errors.employeeId = "Employee ID is too short";
    } else if (row.employeeId.length > 20) {
      errors.employeeId = "Employee ID is too long";
    }

    // Phone number validation
    if (!row.phoneNumber) {
      errors.phoneNumber = "Phone number is required";
    } else if (!/^[0-9]{10}$/.test(String(row.phoneNumber))) {
      errors.phoneNumber = "Phone number must be 10 digits";
    }

    // Leave Balance by Experience validation (make it optional with default)
    if (
      row.leaveBalanceByExperience !== undefined &&
      row.leaveBalanceByExperience !== ""
    ) {
      if (isNaN(Number(row.leaveBalanceByExperience))) {
        errors.leaveBalanceByExperience = "Leave balance must be a number";
      } else if (Number(row.leaveBalanceByExperience) < 0) {
        errors.leaveBalanceByExperience = "Leave balance cannot be negative";
      } else if (Number(row.leaveBalanceByExperience) > 30) {
        errors.leaveBalanceByExperience = "Leave balance cannot exceed 30";
      }
    }

    // Campus validation
    if (!row.campus) {
      errors.campus = "Campus is required";
    } else if (row.campus !== user?.campus?.name) {
      errors.campus = `Campus must be ${user?.campus?.name}`;
    }

    // Branch validation
    if (!row.branchCode) {
      errors.branchCode = "Branch is required";
    } else if (row.branches && row.branches.length > 0) {
      const validBranch = row.branches.find(
        (b) => b.code === row.branchCode || b.name === row.branchCode
      );
      if (!validBranch) {
        errors.branchCode = "Invalid branch for selected campus";
      }
    }

    // Role validation (make it optional)
    if (row.role && row.role.trim() !== "") {
      if (row.roles && row.roles.length > 0) {
        const inputRole = row.role
          .trim()
          .toLowerCase()
          .replace(/[_\s]+/g, "");
        const allowedRoleValues = row.roles.map((r) =>
          r.value.toLowerCase().replace(/[_\s]+/g, "")
        );
        const allowedRoleLabels = row.roles.map((r) =>
          r.label.toLowerCase().replace(/[_\s]+/g, "")
        );

        const validRole = row.roles.find((r) => {
          const valueNorm = r.value.toLowerCase().replace(/[_\s]+/g, "");
          const labelNorm = r.label.toLowerCase().replace(/[_\s]+/g, "");
          return inputRole === valueNorm || inputRole === labelNorm;
        });
        if (!validRole) {
          const allowedRoles = row.roles.map((r) => r.label).join(", ");
          errors.role = `Invalid role for selected campus: '${row.role}'. Allowed: ${allowedRoles}`;
        } else if (inputRole === "other" && !row.customRole) {
          errors.customRole = "Custom role is required";
        }
      }
    }

    // Designation validation (optional)
    if (row.designation && row.designation.length > 50) {
      errors.designation = "Designation is too long";
    }

    return errors;
  };

  const isRowValid = (errors) => Object.keys(errors).length === 0;

  // Enhanced header mapping function to handle different cases and similar meanings
  const mapExcelHeaders = (row) => {
    const normalizeHeader = (header) => {
      if (!header) return "";
      return header
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .trim();
    };

    const headerMappings = {
      name: [
        "name",
        "fullname",
        "full_name",
        "employeename",
        "employee_name",
        "staffname",
        "staff_name",
        "facultyname",
        "faculty_name",
      ],
      email: [
        "email",
        "emailaddress",
        "email_address",
        "mail",
        "mailid",
        "mail_id",
        "e_mail",
      ],
      employeeid: [
        "employeeid",
        "employee_id",
        "emp_id",
        "empid",
        "id",
        "staffid",
        "staff_id",
        "facultyid",
        "faculty_id",
        "userid",
        "user_id",
      ],
      phonenumber: [
        "phonenumber",
        "phone_number",
        "phone",
        "mobile",
        "mobilenumber",
        "mobile_number",
        "contact",
        "contactnumber",
        "contact_number",
        "tel",
        "telephone",
      ],
      branchcode: [
        "branchcode",
        "branch_code",
        "branch",
        "department",
        "dept",
        "section",
        "division",
        "stream",
        "course",
      ],
      role: [
        "role",
        "designation",
        "position",
        "title",
        "jobtitle",
        "job_title",
        "rank",
        "grade",
        "level",
      ],
      customrole: [
        "customrole",
        "custom_role",
        "otherrole",
        "other_role",
        "specifyrole",
        "specify_role",
      ],
      status: [
        "status",
        "activestatus",
        "active_status",
        "employeestatus",
        "employee_status",
        "workingstatus",
        "working_status",
      ],
      designation: [
        "designation",
        "jobdesignation",
        "job_designation",
        "positiontitle",
        "position_title",
        "jobtitle",
        "job_title",
      ],
      leavebalancebyexperience: [
        "leavebalancebyexperience",
        "leave_balance_by_experience",
        "leavebalance",
        "leave_balance",
        "leaves",
        "leavecount",
        "leave_count",
        "experienceleaves",
        "experience_leaves",
        "annualleaves",
        "annual_leaves",
      ],
    };

    const findBestMatch = (targetField, row) => {
      const targetVariations = headerMappings[targetField] || [];

      for (const variation of targetVariations) {
        for (const header in row) {
          if (normalizeHeader(header) === variation) {
            return row[header];
          }
        }
      }

      for (const variation of targetVariations) {
        for (const header in row) {
          const normalizedHeader = normalizeHeader(header);
          if (
            normalizedHeader.includes(variation) ||
            variation.includes(normalizedHeader)
          ) {
            return row[header];
          }
        }
      }

      for (const header in row) {
        const normalizedHeader = normalizeHeader(header);
        for (const variation of targetVariations) {
          if (normalizedHeader.length >= 3 && variation.length >= 3) {
            if (
              normalizedHeader.includes(variation.substring(0, 3)) ||
              variation.includes(normalizedHeader.substring(0, 3))
            ) {
              return row[header];
            }
          }
        }
      }

      return "";
    };

    return {
      name: findBestMatch("name", row),
      email: findBestMatch("email", row),
      employeeId: findBestMatch("employeeid", row),
      phoneNumber: findBestMatch("phonenumber", row),
      branchCode: findBestMatch("branchcode", row),
      role: findBestMatch("role", row),
      customRole: findBestMatch("customrole", row),
      status: (findBestMatch("status", row) || "active")
        .toString()
        .toLowerCase(),
      designation: findBestMatch("designation", row),
      leaveBalanceByExperience:
        findBestMatch("leavebalancebyexperience", row) || 12,
    };
  };

  const handleBulkFileChange = async (e) => {
    const file = e.target.files[0];
    setBulkFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { defval: "" });

        const hrCampus = user?.campus?.name;
        if (!hrCampus) {
          toast.error("HR campus not found");
          return;
        }

        const branches = await fetchBranchesForCampus(hrCampus);
        if (branches.length === 0) {
          toast.error("No active branches found for your campus");
          return;
        }
        const roles = await fetchRolesForCampus(hrCampus);
        if (!roles || roles.length === 0) {
          toast.error("No roles found for your campus");
          return;
        }

        let detectedHeaders = [];
        let headerMappingDisplay = {};

        if (data.length > 0) {
          detectedHeaders = Object.keys(data[0]);
          console.log("Detected Excel headers:", detectedHeaders);

          const sampleRow = data[0];
          const mappedData = mapExcelHeaders(sampleRow);

          headerMappingDisplay = {
            Name: mappedData.name ? "✓ Mapped" : "✗ Not found",
            Email: mappedData.email ? "✓ Mapped" : "✗ Not found (optional)",
            "Employee ID": mappedData.employeeId ? "✓ Mapped" : "✗ Not found",
            "Phone Number": mappedData.phoneNumber ? "✓ Mapped" : "✗ Not found",
            Branch: mappedData.branchCode ? "✓ Mapped" : "✗ Not found",
            Role: mappedData.role ? "✓ Mapped" : "✗ Not found (optional)",
            "Leave Balance": mappedData.leaveBalanceByExperience
              ? "✓ Mapped"
              : "✗ Not found (default: 12)",
          };

          setHeaderMapping(headerMappingDisplay);
        }

        const editable = data.map((row, index) => {
          const mappedData = mapExcelHeaders(row);

          const mappedRow = {
            id: index,
            campus: hrCampus,
            name: mappedData.name,
            email: mappedData.email,
            employeeId: mappedData.employeeId,
            phoneNumber: mappedData.phoneNumber,
            branchCode: mappedData.branchCode,
            role: mappedData.role,
            customRole: mappedData.customRole,
            status: mappedData.status,
            designation: mappedData.designation,
            leaveBalanceByExperience: mappedData.leaveBalanceByExperience,
            branches,
            roles,
          };

          Object.keys(mappedRow).forEach((key) => {
            if (typeof mappedRow[key] === "string") {
              mappedRow[key] = mappedRow[key].toString().trim();
            }
          });

          return mappedRow;
        });

        setBulkEditableData(editable);
        setBulkErrors(editable.map(validateBulkRow));

        if (data.length > 0) {
          toast.success(
            `File uploaded successfully! Detected ${detectedHeaders.length} columns.`
          );
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleBulkFieldChange = async (idx, field, value) => {
    const updated = [...bulkEditableData];
    updated[idx][field] = value;

    if (field === "campus") {
      updated[idx].branches = await fetchBranchesForCampus(value);
      updated[idx].roles = await fetchRolesForCampus(value);
      updated[idx].branchCode = "";
      updated[idx].role = "";
      updated[idx].customRole = "";
    } else if (field === "role" && value !== "other") {
      updated[idx].customRole = "";
    } else if (field === "name") {
      updated[idx][field] = value
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    } else if (field === "email") {
      updated[idx][field] = value.toLowerCase();
    } else if (field === "status") {
      updated[idx][field] = value.toLowerCase();
    } else {
      updated[idx][field] = value;
    }

    setBulkEditableData(updated);
    const errors = [...bulkErrors];
    errors[idx] = validateBulkRow(updated[idx]);
    setBulkErrors(errors);
  };

  const deleteBulkRow = (idx) => {
    const updated = bulkEditableData.filter((_, index) => index !== idx);
    const updatedErrors = bulkErrors.filter((_, index) => index !== idx);
    setBulkEditableData(updated);
    setBulkErrors(updatedErrors);
    setBulkResults([]);
  };

  const isBulkValid =
    bulkEditableData.length > 0 &&
    bulkErrors.every((err) => Object.keys(err).length === 0);

  const handleBulkRegister = async () => {
    setBulkLoading(true);
    setBulkResults([]);
    try {
      if (!isBulkValid) {
        toast.error("Please fix validation errors before submitting.");
        setBulkLoading(false);
        return;
      }
      const employees = bulkEditableData.map((row) => ({
        name: row.name,
        email: row.email,
        employeeId: row.employeeId,
        phoneNumber: row.phoneNumber,
        role: row.role,
        customRole: row.role === "other" ? row.customRole : "",
        department: row.branchCode,
        branchCode: row.branchCode,
        campus: row.campus,
        designation: row.designation || "",
        leaveBalanceByExperience: row.leaveBalanceByExperience || 12,
      }));
      const response = await fetch(`${API_BASE_URL}/hr/employees/bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ employees }),
      });
      const data = await response.json();
      if (response.ok) {
        setBulkResults(data.results);
        fetchEmployees();
        fetchEmployeeStats();
        toast.success("Bulk registration completed!");
      } else {
        toast.error(data.msg || "Bulk registration failed");
      }
    } catch (error) {
      toast.error(error.message || "Bulk registration failed");
    } finally {
      setBulkLoading(false);
    }
  };

  // Profile picture handling functions
  const handleProfilePictureUpload = async (event, employeeId) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      toast.error("Invalid file type. Only JPEG, PNG and JPG are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size should be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result);
    reader.readAsDataURL(file);

    setUploadingProfile(true);
    const formData = new FormData();
    formData.append("profilePicture", file);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/hr/employees/${employeeId}/upload-profile-picture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();
      if (response.ok) {
        setEmployees((prevEmployees) =>
          prevEmployees.map((emp) =>
            emp._id === employeeId
              ? { ...emp, profilePicture: data.profilePicture }
              : emp
          )
        );
        toast.success("Profile picture updated successfully");
        setPreviewImage(null);
      } else {
        throw new Error(data.message || "Failed to upload profile picture");
      }
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      toast.error(error.message || "Failed to upload profile picture");
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleDeleteProfilePicture = async (employeeId) => {
    setUploadingProfile(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_BASE_URL}/hr/employees/${employeeId}/delete-profile-picture`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setEmployees((prevEmployees) =>
          prevEmployees.map((emp) =>
            emp._id === employeeId ? { ...emp, profilePicture: null } : emp
          )
        );
        toast.success("Profile picture deleted successfully");
      } else {
        throw new Error(data.message || "Failed to delete profile picture");
      }
    } catch (error) {
      console.error("Error deleting profile picture:", error);
      toast.error(error.message || "Failed to delete profile picture");
    } finally {
      setUploadingProfile(false);
      setShowDeleteModal(false);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <HRDashboardSection
            hr={user}
            stats={stats}
            onNavigateToSection={setActiveSection}
          />
        );
      case "employees":
        return (
          <EmployeeManagementSection
            employees={employees}
            loading={loading}
            error={error}
            search={search}
            setSearch={setSearch}
            department={department}
            setDepartment={setDepartment}
            status={status}
            setStatus={setStatus}
            branches={branches}
            onEditEmployee={handleEditClick}
            onResetPassword={(employee) => {
              setSelectedEmployeeForReset(employee);
              setShowPasswordResetModal(true);
            }}
            onUploadProfilePicture={handleProfilePictureUpload}
            onDeleteProfilePicture={handleDeleteProfilePicture}
            uploadingProfile={uploadingProfile}
            previewImage={previewImage}
            setPreviewImage={setPreviewImage}
            selectedEmployeeForPicture={selectedEmployeeForPicture}
            setSelectedEmployeeForPicture={setSelectedEmployeeForPicture}
            showDeleteModal={showDeleteModal}
            setShowDeleteModal={setShowDeleteModal}
            fileInputRef={fileInputRef}
          />
        );
      case "operations":
        return (
          <EmployeeOperationsSection
            // ...existing props...
            showRegisterModal={showRegisterModal}
            setShowRegisterModal={setShowRegisterModal}
            newEmployee={newEmployee}
            setNewEmployee={setNewEmployee}
            handleRegisterEmployee={handleRegisterEmployee}
            loading={loading}
            branches={branches}
            getCampusRoles={getCampusRoles}
            user={user}
            showBulkModal={showBulkModal}
            setShowBulkModal={setShowBulkModal}
            bulkFile={bulkFile}
            setBulkFile={setBulkFile}
            bulkData={bulkData}
            setBulkData={setBulkData}
            bulkResults={bulkResults}
            setBulkResults={setBulkResults}
            bulkLoading={bulkLoading}
            setBulkLoading={setBulkLoading}
            bulkEditableData={bulkEditableData}
            setBulkEditableData={setBulkEditableData}
            bulkBranches={bulkBranches}
            setBulkBranches={setBulkBranches}
            bulkRoles={bulkRoles}
            setBulkRoles={setBulkRoles}
            bulkErrors={bulkErrors}
            setBulkErrors={setBulkErrors}
            headerMapping={headerMapping}
            setHeaderMapping={setHeaderMapping}
            handleBulkFileChange={handleBulkFileChange}
            handleBulkFieldChange={handleBulkFieldChange}
            deleteBulkRow={deleteBulkRow}
            isBulkValid={isBulkValid}
            handleBulkRegister={handleBulkRegister}
            fetchBranchesForCampus={fetchBranchesForCampus}
            fetchRolesForCampus={fetchRolesForCampus}
            validateBulkRow={validateBulkRow}
            mapExcelHeaders={mapExcelHeaders}
            isRowValid={isRowValid}
          />
        );
      case "hod-management":
        return <HodManagement />;
      case "leaves":
        return <HRLeaveRequestsSection branches={branches} />;
      case "profile":
        return (
          <ProfileSection
            hr={user}
            onProfileUpdate={(updatedHr) => {
              console.log("Profile updated:", updatedHr);
            }}
          />
        );
      case "tasks":
        return <HRTaskManagementSection />;
      default:
        return (
          <HRDashboardSection
            hr={user}
            stats={stats}
            onNavigateToSection={setActiveSection}
          />
        );
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className=" bg-background">
      <HRSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        hr={user}
      />
      <div className="lg:ml-64 min-h-screen">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg m-4">
            {error}
          </div>
        )}
        <div className="p-4 lg:p-6">{renderContent()}</div>
      </div>

      {/* Password Reset Modal */}
      <PasswordResetModal
        show={showPasswordResetModal}
        onClose={() => {
          setShowPasswordResetModal(false);
          setSelectedEmployeeForReset(null);
        }}
        employeeId={selectedEmployeeForReset?._id}
        token={localStorage.getItem("token")}
        loading={loading}
        setLoading={setLoading}
        resetApiPath={`/hr/employees/:id/reset-password`}
      />

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg relative max-h-[95vh] overflow-y-auto">
            <button
              className="absolute top-3 right-3 text-gray-400 bg-gray-100 rounded-full p-1.5 hover:bg-gray-200"
              onClick={() => setShowEditModal(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <h3 className="text-xl font-bold text-primary mb-4 text-center">
              Edit Employee
            </h3>

            {/* Profile Picture Section */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative rounded-full overflow-hidden border-4 border-white shadow-lg w-24 h-24 group">
                {previewImage || editEmployee?.profilePicture ? (
                  <img
                    src={previewImage || editEmployee?.profilePicture || ""}
                    alt={editEmployee?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <FaUserCircle className="text-gray-400 text-5xl" />
                  </div>
                )}
                {/* Overlay for actions */}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-10">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-white rounded-full shadow hover:bg-gray-100"
                    disabled={uploadingProfile}
                  >
                    <FaCamera className="text-gray-700 text-lg" />
                  </button>
                  {editEmployee?.profilePicture && !previewImage && (
                    <button
                      onClick={() => {
                        setSelectedEmployeeForPicture(editEmployee);
                        setShowDeleteModal(true);
                      }}
                      className="ml-2 p-2 bg-red-500 rounded-full shadow hover:bg-red-600"
                      disabled={uploadingProfile}
                    >
                      <FaTrash className="text-white text-lg" />
                    </button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) =>
                  handleProfilePictureUpload(e, editEmployee?._id)
                }
              />
              <p className="text-sm text-gray-500 mt-2 text-center">
                Click to upload or change profile picture
              </p>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                    value={editForm.phoneNumber}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phoneNumber: e.target.value })
                    }
                    required
                    pattern="[0-9]{10}"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                    value={editForm.department}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        department: e.target.value,
                        branchCode: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Select Department</option>
                    {branches.map((branch) => (
                      <option key={branch.code} value={branch.code}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                    value={editForm.role}
                    onChange={(e) => {
                      const selectedRole = e.target.value;
                      setEditForm({
                        ...editForm,
                        role: selectedRole,
                        customRole:
                          selectedRole === "other" ? editForm.customRole : "",
                      });
                    }}
                  >
                    <option value="">Select Role</option>
                    {getCampusRoles(user?.campus?.name).map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {editForm.role === "other" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Role
                  </label>
                  <input
                    type="text"
                    className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                    value={editForm.customRole}
                    onChange={(e) =>
                      setEditForm({ ...editForm, customRole: e.target.value })
                    }
                    placeholder="Enter custom role"
                    required
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Balance
                  </label>
                  <input
                    type="number"
                    className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                    value={editForm.leaveBalance}
                    onChange={(e) =>
                      setEditForm({ ...editForm, leaveBalance: e.target.value })
                    }
                    min="0"
                    max="30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Balance by Experience
                  </label>
                  <input
                    type="number"
                    className="w-full p-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-primary/50"
                    value={editForm.leaveBalanceByExperience}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        leaveBalanceByExperience: e.target.value,
                      })
                    }
                    min="0"
                    max="30"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition font-medium"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition font-medium"
                  disabled={loading}
                >
                  {loading ? "Updating..." : "Update Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRDashboard;
