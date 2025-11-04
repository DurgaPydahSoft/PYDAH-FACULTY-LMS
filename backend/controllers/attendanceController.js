const { Attendance, Employee, HR } = require('../models');
const XLSX = require('xlsx');
const asyncHandler = require('express-async-handler');

// Helper function to check if an employee has approved leave for a specific date
const checkEmployeeLeaveStatus = async (employee, dateStr) => {
  if (!employee.leaveRequests || employee.leaveRequests.length === 0) {
    return { hasLeave: false };
  }

  const checkDate = new Date(dateStr);
  
  for (const leave of employee.leaveRequests) {
    // Only consider approved leaves
    if (leave.status === 'Approved') {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      
      // Check if date falls within leave range
      if (checkDate >= startDate && checkDate <= endDate) {
        // Check if half-day
        if (leave.isHalfDay && leave.startDate === dateStr) {
          return {
            hasLeave: true,
            leaveType: leave.leaveType,
            isHalfDay: true,
            session: leave.session, // morning or afternoon
            leaveRequestId: leave.leaveRequestId
          };
        }
        
        return {
          hasLeave: true,
          leaveType: leave.leaveType,
          isHalfDay: false,
          leaveRequestId: leave.leaveRequestId
        };
      }
    }
  }
  
  return { hasLeave: false };
};

// Helper function to determine attendance status
const determineAttendanceStatus = (hasLeave, inTime, outTime, isHalfDay) => {
  if (hasLeave.hasLeave) {
    if (hasLeave.isHalfDay) {
      return 'Half-Day Present';
    }
    return 'Absent';
  }
  
  // No leave - check times
  if (!inTime || !outTime) {
    return 'Incomplete';
  }
  
  return 'Present';
};

// Helper function to normalize Excel headers - more robust
const normalizeHeader = (header) => {
  if (!header) return '';
  return header
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
    .trim();
};

// Helper function to validate Excel format
const validateExcelFormat = (workbook) => {
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Excel file has no sheets');
  }
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    throw new Error('Excel sheet is empty');
  }
  
  return { sheetName, worksheet };
};

// Helper function to map Excel headers - enhanced with more variations
const mapExcelHeaders = (row) => {
  const headerMappings = {
    employeeid: [
      'employeeid',
      'employee_id',
      'emp_id',
      'empid',
      'id',
      'employee',
      'emp',
      'ecode',
      'e.code',
      'e_code',
      'employeecode',
      'employee_code',
      'empcode',
      'emp_code',
      'staffid',
      'staff_id',
      'facultyid',
      'faculty_id',
      'userid',
      'user_id',
      'staffno',
      'staff_no',
      'empno',
      'emp_no',
      'employeenumber',
      'employee_number'
    ],
    date: [
      'date',
      'attendance_date',
      'att_date',
      'date_of_attendance',
      'attdate',
      'attdate',
      'attendance',
      'workdate',
      'work_date',
      'day',
      'attendance_day',
      'marking_date',
      'markingdate'
    ],
    intime: [
      'intime',
      'in_time',
      'in',
      'checkin',
      'check_in',
      'punch_in',
      'punchin',
      'entrytime',
      'entry_time',
      'entry',
      'arrival',
      'arrivaltime',
      'arrival_time',
      'starttime',
      'start_time',
      'timein',
      'time_in',
      'login',
      'logintime',
      'login_time'
    ],
    outtime: [
      'outtime',
      'out_time',
      'out',
      'checkout',
      'check_out',
      'punch_out',
      'punchout',
      'exittime',
      'exit_time',
      'exit',
      'departure',
      'departuretime',
      'departure_time',
      'endtime',
      'end_time',
      'timeout',
      'time_out',
      'logout',
      'logouttime',
      'logout_time'
    ]
  };

  const findBestMatch = (targetField, row) => {
    const targetVariations = headerMappings[targetField] || [];

    // Level 1: Exact match after normalization
    for (const variation of targetVariations) {
      for (const header in row) {
        if (normalizeHeader(header) === variation) {
          return row[header];
        }
      }
    }

    // Level 2: Contains match (either direction)
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

    // Level 3: Substring match (first 3+ characters)
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

    // Level 4: Fuzzy match for common patterns (fallback)
    for (const header in row) {
      const normalizedHeader = normalizeHeader(header);
      
      // For employee ID - look for 'id', 'emp', 'staff' patterns
      if (targetField === 'employeeid') {
        if ((normalizedHeader.includes('id') || normalizedHeader.includes('emp') || normalizedHeader.includes('staff')) 
            && !normalizedHeader.includes('time') && !normalizedHeader.includes('date')) {
          return row[header];
        }
      }
      
      // For date - look for 'date', 'day', 'att' patterns
      if (targetField === 'date') {
        if ((normalizedHeader.includes('date') || normalizedHeader.includes('day') || normalizedHeader.includes('att')) 
            && !normalizedHeader.includes('time')) {
          return row[header];
        }
      }
      
      // For in time - look for 'in', 'entry', 'arrival', 'start' patterns
      if (targetField === 'intime') {
        if ((normalizedHeader.includes('in') || normalizedHeader.includes('entry') || 
             normalizedHeader.includes('arrival') || normalizedHeader.includes('start')) 
            && !normalizedHeader.includes('out') && !normalizedHeader.includes('end') 
            && !normalizedHeader.includes('date')) {
          return row[header];
        }
      }
      
      // For out time - look for 'out', 'exit', 'departure', 'end' patterns
      if (targetField === 'outtime') {
        if ((normalizedHeader.includes('out') || normalizedHeader.includes('exit') || 
             normalizedHeader.includes('departure') || normalizedHeader.includes('end')) 
            && !normalizedHeader.includes('in') && !normalizedHeader.includes('date')) {
          return row[header];
        }
      }
    }

    return null;
  };

  return {
    employeeId: findBestMatch('employeeid', row),
    date: findBestMatch('date', row),
    inTime: findBestMatch('intime', row),
    outTime: findBestMatch('outtime', row)
  };
};

// Helper function to process attendance data (vertical format)
const processAttendanceData = async (parsedData, hrId, hrCampus, worksheet = null) => {
  const processedData = [];
  const errors = [];
  const warnings = [];

  // Get all unique employee IDs from the Excel
  const employeeIds = [...new Set(parsedData.map(row => mapExcelHeaders(row).employeeId).filter(Boolean))];
  
  console.log('Looking for employee IDs:', employeeIds);
  console.log('HR Campus:', hrCampus);
  
  // Fetch all employees in one query (campus is stored as lowercase string in Employee)
  const employees = await Employee.find({
    employeeId: { $in: employeeIds },
    campus: hrCampus.toLowerCase()
  }).select('employeeId name department leaveRequests employeeType campus');
  
  console.log('Found employees:', employees.length);
  console.log('Employee IDs found:', employees.map(e => e.employeeId));
  
  // Create a map for quick lookup
  const employeeMap = employees.reduce((acc, emp) => {
    acc[emp.employeeId] = emp;
    return acc;
  }, {});

  // Try to extract date from sheet header (for single-day reports)
  let defaultDate = null;
  if (worksheet) {
    // Get raw rows to check header
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (Array.isArray(rawRows) && rawRows.length > 0) {
      // Look for date in first few rows
      for (let i = 0; i < Math.min(5, rawRows.length); i++) {
        const rowText = rawRows[i].join(' ');
        // Look for patterns like "Attendance Date 03-Nov-2025" or "Nov 03 2025"
        const dateMatch = rowText.match(/(\d{1,2})[-\/](\w+)[-\/](\d{4})|(\w+)\s+(\d{1,2})\s+(\d{4})/);
        if (dateMatch) {
          try {
            if (dateMatch[3]) {
              // Format: "03-Nov-2025"
              const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
              const monthIndex = monthNames.findIndex(m => m === dateMatch[2].substring(0, 3).toLowerCase());
              if (monthIndex !== -1) {
                const parsedDate = new Date(parseInt(dateMatch[3]), monthIndex, parseInt(dateMatch[1]));
                if (!isNaN(parsedDate.getTime())) {
                  defaultDate = parsedDate.toISOString().split('T')[0];
                  break;
                }
              }
            } else if (dateMatch[6]) {
              // Format: "Nov 03 2025"
              const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
              const monthIndex = monthNames.findIndex(m => m === dateMatch[4].substring(0, 3).toLowerCase());
              if (monthIndex !== -1) {
                const parsedDate = new Date(parseInt(dateMatch[6]), monthIndex, parseInt(dateMatch[5]));
                if (!isNaN(parsedDate.getTime())) {
                  defaultDate = parsedDate.toISOString().split('T')[0];
                  break;
                }
              }
            }
          } catch (e) {
            // Continue if parsing fails
          }
        }
      }
    }
  }

  for (let i = 0; i < parsedData.length; i++) {
    const row = parsedData[i];
    const mappedData = mapExcelHeaders(row);
    
    const { employeeId, date, inTime, outTime } = mappedData;
    
    // Validate required fields
    if (!employeeId) {
      errors.push({ row: i + 1, error: 'Employee ID is required' });
      continue;
    }
    
    // Use date from row, or default date from header if not found
    let rowDate = date || defaultDate;
    
    if (!rowDate) {
      errors.push({ row: i + 1, employeeId, error: 'Date is required and not found in sheet header' });
      continue;
    }
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    let formattedDate = rowDate;
    
    // Try to parse various date formats
    if (!dateRegex.test(rowDate)) {
      try {
        // Check if date is an Excel serial date number (common when dates are copied from Excel)
        let parsedDate = null;
        
        // If rowDate is a number, it might be an Excel serial date
        if (typeof rowDate === 'number' || (!isNaN(parseFloat(rowDate)) && isFinite(rowDate))) {
          const excelSerialDate = parseFloat(rowDate);
          // Excel serial dates start from Jan 1, 1900 (serial 1)
          // Dates are typically between 1 and ~50000 (for dates up to year 2100)
          if (excelSerialDate > 0 && excelSerialDate < 100000) {
            try {
              // Use xlsx library's date conversion utility if available
              // Otherwise, manually convert Excel serial date
              // Excel serial date 1 = Jan 1, 1900
              // But Excel incorrectly treats 1900 as a leap year, so we account for that
              
              // Excel epoch: January 1, 1900 (serial 1)
              // JavaScript epoch: January 1, 1970 (Unix epoch)
              
              // Excel incorrectly considers 1900 as a leap year, so serial 60 = Feb 29, 1900
              // But Feb 29, 1900 doesn't exist, so dates before March 1, 1900 need adjustment
              
              // For dates on or after March 1, 1900: days = serial - 1
              // For dates before March 1, 1900: days = serial - 1 (same, but Excel's bug is already accounted)
              
              // Excel serial date conversion
              // Excel serial date 1 = Jan 1, 1900
              // Excel incorrectly treats 1900 as a leap year (Feb 29, 1900 doesn't exist)
              // Excel serial 60 = Feb 29, 1900 (doesn't exist, Excel bug)
              // Excel serial 61 = March 1, 1900 (correct)
              
              // For dates >= serial 61, we need to subtract 1 extra day to account for the non-existent Feb 29, 1900
              // Formula: days = serial - 1 - (serial >= 61 ? 1 : 0)
              // Simplified: days = serial - 2 for dates >= 61, serial - 1 for dates < 61
              
              let daysSince1900;
              if (excelSerialDate >= 61) {
                // Account for Excel's incorrect leap year in 1900
                daysSince1900 = excelSerialDate - 2;
              } else {
                daysSince1900 = excelSerialDate - 1;
              }
              
              // Excel epoch: January 1, 1900
              const excelEpoch = new Date(Date.UTC(1900, 0, 1));
              parsedDate = new Date(excelEpoch.getTime() + daysSince1900 * 24 * 60 * 60 * 1000);
              
              // Validate the date is reasonable (between 1900 and 2100)
              const year = parsedDate.getUTCFullYear();
              if (year >= 1900 && year <= 2100 && !isNaN(parsedDate.getTime())) {
                // Format as YYYY-MM-DD
                const month = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
                const day = String(parsedDate.getUTCDate()).padStart(2, '0');
                formattedDate = `${year}-${month}-${day}`;
              }
            } catch (e) {
              console.log('Excel date conversion error:', e);
              // If Excel date parsing fails, try other methods
            }
          }
        }
        
        // If not Excel serial date, try common date string formats
        if (!parsedDate || isNaN(parsedDate.getTime())) {
          // Format: "03-Nov-2025" or "03/Nov/2025"
          const datePattern1 = /(\d{1,2})[-\/](\w+)[-\/](\d{4})/;
          const match1 = rowDate.toString().match(datePattern1);
          if (match1) {
            const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const monthIndex = monthNames.findIndex(m => m === match1[2].substring(0, 3).toLowerCase());
            if (monthIndex !== -1) {
              parsedDate = new Date(parseInt(match1[3]), monthIndex, parseInt(match1[1]));
            }
          }
        }
        
        // Format: "Nov 03 2025"
        if (!parsedDate || isNaN(parsedDate.getTime())) {
          const datePattern2 = /(\w+)\s+(\d{1,2})\s+(\d{4})/;
          const match2 = rowDate.toString().match(datePattern2);
          if (match2) {
            const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const monthIndex = monthNames.findIndex(m => m === match2[1].substring(0, 3).toLowerCase());
            if (monthIndex !== -1) {
              parsedDate = new Date(parseInt(match2[3]), monthIndex, parseInt(match2[2]));
            }
          }
        }
        
        // Fallback to standard Date parsing
        if (!parsedDate || isNaN(parsedDate.getTime())) {
          parsedDate = new Date(rowDate);
        }
        
        if (!isNaN(parsedDate.getTime())) {
          formattedDate = parsedDate.toISOString().split('T')[0];
        } else {
          errors.push({ row: i + 1, employeeId, error: `Invalid date format: ${rowDate}` });
          continue;
        }
      } catch (e) {
        errors.push({ row: i + 1, employeeId, error: `Invalid date format: ${rowDate}` });
        continue;
      }
    }
    
    // Check if employee exists
    const employee = employeeMap[employeeId];
    if (!employee) {
      errors.push({ row: i + 1, employeeId, error: `Employee not found in database for campus ${hrCampus}` });
      continue;
    }
    
    // Verify employee belongs to HR's campus (already filtered in query, but double-check)
    if (employee.campus && employee.campus.toLowerCase() !== hrCampus.toLowerCase()) {
      errors.push({ row: i + 1, employeeId, error: `Employee belongs to ${employee.campus} campus, not ${hrCampus}` });
      continue;
    }
    
    // Check for existing attendance
    const existingAttendance = await Attendance.findOne({
      employeeId: employeeId,
      date: formattedDate
    });
    
    if (existingAttendance) {
      warnings.push({ row: i + 1, employeeId, warning: `Attendance already exists for ${formattedDate}. It will be updated.` });
    }
    
    // Check leave status
    const leaveStatus = await checkEmployeeLeaveStatus(employee, formattedDate);
    
    // Determine attendance status
    const status = determineAttendanceStatus(leaveStatus, inTime, outTime, leaveStatus.isHalfDay);
    
    // Validate time format if provided
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    let formattedInTime = inTime ? inTime.toString().trim() : null;
    let formattedOutTime = outTime ? outTime.toString().trim() : null;
    
    if (formattedInTime && !timeRegex.test(formattedInTime)) {
      // Try to parse Excel time format
      try {
        const excelTime = XLSX.SSF.parse_date_code(parseFloat(formattedInTime));
        if (excelTime) {
          formattedInTime = `${String(excelTime.h).padStart(2, '0')}:${String(excelTime.m).padStart(2, '0')}`;
        } else {
          warnings.push({ row: i + 1, employeeId, warning: `Invalid in-time format: ${inTime}` });
          formattedInTime = null;
        }
      } catch (e) {
        warnings.push({ row: i + 1, employeeId, warning: `Invalid in-time format: ${inTime}` });
        formattedInTime = null;
      }
    }
    
    if (formattedOutTime && !timeRegex.test(formattedOutTime)) {
      // Try to parse Excel time format
      try {
        const excelTime = XLSX.SSF.parse_date_code(parseFloat(formattedOutTime));
        if (excelTime) {
          formattedOutTime = `${String(excelTime.h).padStart(2, '0')}:${String(excelTime.m).padStart(2, '0')}`;
        } else {
          warnings.push({ row: i + 1, employeeId, warning: `Invalid out-time format: ${outTime}` });
          formattedOutTime = null;
        }
      } catch (e) {
        warnings.push({ row: i + 1, employeeId, warning: `Invalid out-time format: ${outTime}` });
        formattedOutTime = null;
      }
    }
    
    processedData.push({
      employeeId: employeeId,
      employeeName: employee.name,
      employeeDepartment: employee.department || (employee.employeeType === 'non-teaching' ? 'Non-Teaching' : 'N/A'),
      date: formattedDate,
      inTime: formattedInTime,
      outTime: formattedOutTime,
      status: status,
      leaveRequestId: leaveStatus.hasLeave ? leaveStatus.leaveRequestId : null,
      leaveInfo: leaveStatus.hasLeave ? {
        leaveType: leaveStatus.leaveType,
        isHalfDay: leaveStatus.isHalfDay,
        session: leaveStatus.session
      } : null,
      hasExistingAttendance: !!existingAttendance,
      rowIndex: i + 1
    });
  }
  
  return { processedData, errors, warnings };
};

// Helper function to detect Excel format type (horizontal vs vertical)
const detectFormatType = (worksheet) => {
  // Get raw rows data
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  
  // Look for horizontal format indicators:
  // 1. "Days" in first row
  // 2. "Emp. Code:" or "Employee Code:" patterns
  // 3. "Status", "InTime", "OutTime" as row labels
  
  let hasDaysHeader = false;
  let hasEmpCodePattern = false;
  let hasStatusRow = false;
  
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    const rowText = row.join(' ').toLowerCase();
    
    // Check for "Days" header
    if (rowText.includes('days') && !rowText.includes('attendance')) {
      hasDaysHeader = true;
    }
    
    // Check for "Emp. Code:" or "Employee Code:" pattern
    if (rowText.includes('emp') && (rowText.includes('code') || rowText.includes('code:'))) {
      hasEmpCodePattern = true;
    }
    
    // Check for "Status" as a row label (not column header)
    if (normalizeHeader(row[0]) === 'status' || normalizeHeader(row[0]) === 'intime' || normalizeHeader(row[0]) === 'outtime') {
      hasStatusRow = true;
    }
  }
  
  // If we have "Days" header and employee code pattern, it's likely horizontal
  if (hasDaysHeader && hasEmpCodePattern && hasStatusRow) {
    return 'horizontal';
  }
  
  // Default to vertical format
  return 'vertical';
};

// Helper function to parse date range from text like "Oct 01 2025 To Oct 06 2025"
const parseDateRange = (text) => {
  if (!text) return null;
  
  const patterns = [
    /(\w+)\s+(\d{1,2})\s+(\d{4})\s+[Tt][Oo]\s+(\w+)\s+(\d{1,2})\s+(\d{4})/, // "Oct 01 2025 To Oct 06 2025"
    /(\d{1,2})[-\/](\w+)[-\/](\d{4})\s+[Tt][Oo]\s+(\d{1,2})[-\/](\w+)[-\/](\d{4})/, // "01-Oct-2025 To 06-Oct-2025"
    /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})\s+[Tt][Oo]\s+(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/ // "2025-10-01 To 2025-10-06"
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        let startDate, endDate;
        
        if (pattern === patterns[0]) {
          // "Oct 01 2025 To Oct 06 2025"
          const startMonthIndex = monthNames.findIndex(m => m === match[1].substring(0, 3).toLowerCase());
          const endMonthIndex = monthNames.findIndex(m => m === match[4].substring(0, 3).toLowerCase());
          
          if (startMonthIndex !== -1 && endMonthIndex !== -1) {
            startDate = new Date(parseInt(match[3]), startMonthIndex, parseInt(match[2]));
            endDate = new Date(parseInt(match[6]), endMonthIndex, parseInt(match[5]));
          }
        } else if (pattern === patterns[1]) {
          // "01-Oct-2025 To 06-Oct-2025"
          const startMonthIndex = monthNames.findIndex(m => m === match[2].substring(0, 3).toLowerCase());
          const endMonthIndex = monthNames.findIndex(m => m === match[5].substring(0, 3).toLowerCase());
          
          if (startMonthIndex !== -1 && endMonthIndex !== -1) {
            startDate = new Date(parseInt(match[3]), startMonthIndex, parseInt(match[1]));
            endDate = new Date(parseInt(match[6]), endMonthIndex, parseInt(match[4]));
          }
        } else {
          // "2025-10-01 To 2025-10-06"
          startDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
          endDate = new Date(parseInt(match[4]), parseInt(match[5]) - 1, parseInt(match[6]));
        }
        
        if (startDate && endDate && !isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          return { startDate, endDate };
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  return null;
};

// Helper function to parse horizontal format (employee blocks with day columns)
const parseHorizontalFormat = async (worksheet, hrCampus) => {
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const attendanceRecords = [];
  const errors = [];
  const warnings = [];
  
  // Find date range in header rows
  let dateRange = null;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const rowText = rows[i].join(' ');
    dateRange = parseDateRange(rowText);
    if (dateRange) break;
  }
  
  if (!dateRange) {
    warnings.push({ warning: 'Date range not found in Excel. Unable to determine actual dates for days.' });
    return { attendanceRecords, errors, warnings };
  }
  
  // Find "Days" row and extract day columns
  let daysRowIndex = -1;
  const dayColumns = {}; // Map day number to column index
  
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j]).trim();
      if (normalizeHeader(cell) === 'days') {
        daysRowIndex = i;
        // Extract day columns after "Days"
        for (let k = j + 1; k < row.length; k++) {
          const dayCell = String(row[k]).trim();
          if (dayCell) {
            // Extract day number from patterns like "1W", "2 Th", "3 F", etc.
            const dayMatch = dayCell.match(/^(\d+)/);
            if (dayMatch) {
              const dayNum = parseInt(dayMatch[1]);
              dayColumns[dayNum] = k;
            }
          }
        }
        break;
      }
    }
    if (daysRowIndex !== -1) break;
  }
  
  // Generate date map for each day number
  const dateMap = {};
  if (dateRange && Object.keys(dayColumns).length > 0) {
    const startDate = new Date(dateRange.startDate);
    const dayNumbers = Object.keys(dayColumns).map(Number).sort((a, b) => a - b);
    
    dayNumbers.forEach((dayNum) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + dayNum - 1);
      dateMap[dayNum] = date.toISOString().split('T')[0];
    });
  }
  
  // Process employee blocks
  let currentEmployeeCode = null;
  let statusRow = null;
  let inTimeRow = null;
  let outTimeRow = null;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Check for "Emp. Code:" or "Employee Code:" pattern
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j]).toLowerCase().trim();
      
      if ((cell.includes('emp') && cell.includes('code')) || cell.includes('employee code')) {
        // Find the employee code value (usually in the next cell)
        const empCode = row[j + 1] ? String(row[j + 1]).trim() : null;
        
        if (empCode && empCode !== '') {
          // Process previous employee if exists
          if (currentEmployeeCode && statusRow && inTimeRow && outTimeRow) {
            for (const dayNum in dayColumns) {
              const colIndex = dayColumns[dayNum];
              const date = dateMap[dayNum];
              
              if (!date) continue;
              
              const status = statusRow[colIndex] ? String(statusRow[colIndex]).trim().toUpperCase() : '';
              const inTime = inTimeRow[colIndex] ? String(inTimeRow[colIndex]).trim() : '';
              const outTime = outTimeRow[colIndex] ? String(outTimeRow[colIndex]).trim() : '';
              
              // Skip if status is empty or weekly off
              if (!status || status === 'WO' || status === 'WOP') continue;
              
              attendanceRecords.push({
                employeeId: currentEmployeeCode,
                date: date,
                inTime: inTime || null,
                outTime: outTime || null,
                status: status === 'P' ? 'Present' : (status === 'A' ? 'Absent' : status),
                rawStatus: status
              });
            }
          }
          
          // Start new employee
          currentEmployeeCode = empCode;
          statusRow = null;
          inTimeRow = null;
          outTimeRow = null;
        }
      }
      
      // Look for "Status" row
      if (normalizeHeader(cell) === 'status' && currentEmployeeCode) {
        statusRow = row;
      }
      
      // Look for "InTime" or "In Time" row
      if ((normalizeHeader(cell) === 'intime' || normalizeHeader(cell) === 'in') && currentEmployeeCode) {
        inTimeRow = row;
      }
      
      // Look for "OutTime" or "Out Time" row
      if ((normalizeHeader(cell) === 'outtime' || normalizeHeader(cell) === 'out') && currentEmployeeCode) {
        outTimeRow = row;
      }
    }
  }
  
  // Process last employee
  if (currentEmployeeCode && statusRow && inTimeRow && outTimeRow) {
    for (const dayNum in dayColumns) {
      const colIndex = dayColumns[dayNum];
      const date = dateMap[dayNum];
      
      if (!date) continue;
      
      const status = statusRow[colIndex] ? String(statusRow[colIndex]).trim().toUpperCase() : '';
      const inTime = inTimeRow[colIndex] ? String(inTimeRow[colIndex]).trim() : '';
      const outTime = outTimeRow[colIndex] ? String(outTimeRow[colIndex]).trim() : '';
      
      if (!status || status === 'WO' || status === 'WOP') continue;
      
      attendanceRecords.push({
        employeeId: currentEmployeeCode,
        date: date,
        inTime: inTime || null,
        outTime: outTime || null,
        status: status === 'P' ? 'Present' : (status === 'A' ? 'Absent' : status),
        rawStatus: status
      });
    }
  }
  
  return { attendanceRecords, errors, warnings };
};

// Helper function to process horizontal format attendance data
const processHorizontalAttendanceData = async (attendanceRecords, hrId, hrCampus) => {
  const processedData = [];
  const errors = [];
  const warnings = [];
  
  // Get all unique employee IDs
  const employeeIds = [...new Set(attendanceRecords.map(record => record.employeeId).filter(Boolean))];
  
  // Fetch all employees
  const employees = await Employee.find({
    employeeId: { $in: employeeIds },
    campus: hrCampus
  }).select('employeeId name department leaveRequests employeeType');
  
  const employeeMap = employees.reduce((acc, emp) => {
    acc[emp.employeeId] = emp;
    return acc;
  }, {});
  
  for (const record of attendanceRecords) {
    const { employeeId, date, inTime, outTime, status: rawStatus } = record;
    
    // Check if employee exists
    const employee = employeeMap[employeeId];
    if (!employee) {
      errors.push({ employeeId, date, error: 'Employee not found in database' });
      continue;
    }
    
    // Check for existing attendance
    const existingAttendance = await Attendance.findOne({
      employeeId: employeeId,
      date: date
    });
    
    if (existingAttendance) {
      warnings.push({ employeeId, date, warning: `Attendance already exists for ${date}. It will be updated.` });
    }
    
    // Check leave status
    const leaveStatus = await checkEmployeeLeaveStatus(employee, date);
    
    // Determine final status (use raw status if present, otherwise check leave)
    let finalStatus = rawStatus;
    if (rawStatus === 'Present' && leaveStatus.hasLeave) {
      finalStatus = leaveStatus.isHalfDay ? 'Half-Day Present' : 'Absent';
    } else if (rawStatus === 'Absent' && !leaveStatus.hasLeave && inTime && outTime) {
      finalStatus = 'Present'; // Override if times are present
    } else if (!rawStatus || rawStatus === 'Incomplete') {
      finalStatus = determineAttendanceStatus(leaveStatus, inTime, outTime, leaveStatus.isHalfDay);
    }
    
    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    let formattedInTime = inTime ? inTime.toString().trim() : null;
    let formattedOutTime = outTime ? outTime.toString().trim() : null;
    
    if (formattedInTime && !timeRegex.test(formattedInTime)) {
      // Try to parse Excel time format
      try {
        const excelTime = XLSX.SSF.parse_date_code(parseFloat(formattedInTime));
        if (excelTime) {
          formattedInTime = `${String(excelTime.h).padStart(2, '0')}:${String(excelTime.m).padStart(2, '0')}`;
        } else {
          formattedInTime = null;
        }
      } catch (e) {
        formattedInTime = null;
      }
    }
    
    if (formattedOutTime && !timeRegex.test(formattedOutTime)) {
      try {
        const excelTime = XLSX.SSF.parse_date_code(parseFloat(formattedOutTime));
        if (excelTime) {
          formattedOutTime = `${String(excelTime.h).padStart(2, '0')}:${String(excelTime.m).padStart(2, '0')}`;
        } else {
          formattedOutTime = null;
        }
      } catch (e) {
        formattedOutTime = null;
      }
    }
    
    processedData.push({
      employeeId: employeeId,
      employeeName: employee.name,
      employeeDepartment: employee.department || (employee.employeeType === 'non-teaching' ? 'Non-Teaching' : 'N/A'),
      date: date,
      inTime: formattedInTime,
      outTime: formattedOutTime,
      status: finalStatus,
      leaveRequestId: leaveStatus.hasLeave ? leaveStatus.leaveRequestId : null,
      leaveInfo: leaveStatus.hasLeave ? {
        leaveType: leaveStatus.leaveType,
        isHalfDay: leaveStatus.isHalfDay,
        session: leaveStatus.session
      } : null,
      hasExistingAttendance: !!existingAttendance,
      rawStatus: rawStatus
    });
  }
  
  return { processedData, errors, warnings };
};

// Upload attendance Excel and return preview
exports.uploadAttendancePreview = asyncHandler(async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'Please upload an Excel file' });
    }

    const hr = await HR.findById(req.user.id);
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }

    if (!hr || !hr.campus) {
      return res.status(400).json({ msg: 'HR campus information not found' });
    }

    const hrCampus = hr.campus.name ? hr.campus.name.toLowerCase() : (hr.campus.type ? hr.campus.type.toLowerCase() : null);
    if (!hrCampus) {
      return res.status(400).json({ msg: 'HR campus information not found' });
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ msg: 'Excel file has no sheets' });
    }
    
    // Process only the first sheet (traditional/vertical format only)
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      return res.status(400).json({ msg: 'First sheet is empty' });
    }
    
    // Parse traditional/vertical format (each row is an attendance record)
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log('Excel data rows:', data.length);
    if (data.length > 0) {
      console.log('First row sample:', JSON.stringify(data[0], null, 2));
    }
    
    if (data.length === 0) {
      return res.status(400).json({ msg: 'Sheet has no data rows' });
    }
    
    // Detect header mapping from first row for display purposes
    let headerMapping = {};
    if (data.length > 0) {
      const firstRow = data[0];
      const sampleMapping = mapExcelHeaders(firstRow);
      const detectedHeaders = Object.keys(firstRow);
      
      console.log('Detected headers:', detectedHeaders);
      console.log('Mapped headers:', sampleMapping);
      
      const findMappedHeader = (mappedValue) => {
        if (!mappedValue) return 'Not Found';
        for (const header in firstRow) {
          if (firstRow[header] === mappedValue) {
            return header;
          }
        }
        return 'Not Found';
      };
      
      headerMapping = {
        employeeId: findMappedHeader(sampleMapping.employeeId),
        date: findMappedHeader(sampleMapping.date),
        inTime: findMappedHeader(sampleMapping.inTime),
        outTime: findMappedHeader(sampleMapping.outTime),
        detectedHeaders: detectedHeaders
      };
      
      console.log('Header mapping:', headerMapping);
    }
    
    // Process vertical/traditional format data
    const { processedData, errors, warnings } = 
      await processAttendanceData(data, req.user.id, hrCampus, worksheet);
    
    console.log('Processed data count:', processedData.length);
    console.log('Errors count:', errors.length);
    console.log('Warnings count:', warnings.length);
    if (errors.length > 0) {
      console.log('Sample errors:', errors.slice(0, 5));
    }
    
    if (processedData.length === 0) {
      return res.status(400).json({ 
        msg: 'No valid attendance data found in the sheet. Please check the Excel format.',
        errors: errors,
        warnings: warnings,
        debug: {
          totalRows: data.length,
          headerMapping: headerMapping,
          sampleRow: data[0] || null
        }
      });
    }

    res.json({
      success: true,
      preview: processedData,
      errors,
      warnings,
      headerMapping,
      format: 'vertical',
      sheetsProcessed: 1,
      summary: {
        total: processedData.length,
        errors: errors.length,
        warnings: warnings.length,
        withExistingAttendance: processedData.filter(item => item.hasExistingAttendance).length
      }
    });
  } catch (error) {
    console.error('Upload Attendance Preview Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
});

// Submit attendance records
exports.submitAttendance = asyncHandler(async (req, res) => {
  try {
    const { attendanceRecords } = req.body;

    if (!attendanceRecords || !Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return res.status(400).json({ msg: 'Please provide attendance records' });
    }

    const hr = await HR.findById(req.user.id);
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }

    const results = {
      success: [],
      failed: [],
      updated: []
    };

    for (const record of attendanceRecords) {
      try {
        // Validate required fields
        if (!record.employeeId || !record.date || !record.status) {
          results.failed.push({
            employeeId: record.employeeId || 'N/A',
            date: record.date || 'N/A',
            error: 'Missing required fields'
          });
          continue;
        }

        // Check if employee exists
        const employee = await Employee.findOne({ employeeId: record.employeeId });
        if (!employee) {
          results.failed.push({
            employeeId: record.employeeId,
            date: record.date,
            error: 'Employee not found'
          });
          continue;
        }

        // Check for existing attendance
        const existingAttendance = await Attendance.findOne({
          employeeId: record.employeeId,
          date: record.date
        });

        const attendanceData = {
          employeeId: record.employeeId,
          date: record.date,
          inTime: record.inTime || null,
          outTime: record.outTime || null,
          status: record.status,
          leaveRequestId: record.leaveRequestId || null,
          remarks: record.remarks || '',
          uploadedBy: req.user.id,
          uploadedAt: new Date(),
          isManual: false,
          employeeName: record.employeeName || employee.name,
          employeeDepartment: record.employeeDepartment || employee.department || 'N/A'
        };

        if (existingAttendance) {
          // Update existing attendance
          Object.assign(existingAttendance, attendanceData);
          await existingAttendance.save();
          results.updated.push({
            employeeId: record.employeeId,
            date: record.date,
            status: record.status
          });
        } else {
          // Create new attendance
          const attendance = new Attendance(attendanceData);
          await attendance.save();
          results.success.push({
            employeeId: record.employeeId,
            date: record.date,
            status: record.status
          });
        }
      } catch (error) {
        console.error('Error processing attendance record:', error);
        results.failed.push({
          employeeId: record.employeeId || 'N/A',
          date: record.date || 'N/A',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      summary: {
        total: attendanceRecords.length,
        successful: results.success.length,
        updated: results.updated.length,
        failed: results.failed.length
      },
      results
    });
  } catch (error) {
    console.error('Submit Attendance Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
});

// Get attendance by date
exports.getAttendanceByDate = asyncHandler(async (req, res) => {
  try {
    const { date } = req.params;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ msg: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const hr = await HR.findById(req.user.id);
    if (!hr) {
      return res.status(404).json({ msg: 'HR not found' });
    }

    if (!hr || !hr.campus) {
      return res.status(400).json({ msg: 'HR campus information not found' });
    }

    const hrCampus = hr.campus.name ? hr.campus.name.toLowerCase() : (hr.campus.type ? hr.campus.type.toLowerCase() : null);

    // Get all employees in HR's campus
    const employees = await Employee.find({ campus: hrCampus }).select('employeeId name department employeeType');

    // Get attendance for the date
    const attendanceRecords = await Attendance.find({
      date: date,
      employeeId: { $in: employees.map(emp => emp.employeeId) }
    });

    // Create a map of attendance by employeeId
    const attendanceMap = attendanceRecords.reduce((acc, att) => {
      acc[att.employeeId] = att;
      return acc;
    }, {});

    // Combine employee data with attendance
    const result = employees.map(employee => {
      const attendance = attendanceMap[employee.employeeId];
      return {
        employeeId: employee.employeeId,
        employeeName: employee.name,
        employeeDepartment: employee.department || (employee.employeeType === 'non-teaching' ? 'Non-Teaching' : 'N/A'),
        date: date,
        inTime: attendance?.inTime || null,
        outTime: attendance?.outTime || null,
        status: attendance?.status || 'Not Marked',
        leaveRequestId: attendance?.leaveRequestId || null,
        remarks: attendance?.remarks || '',
        uploadedAt: attendance?.uploadedAt || null
      };
    });

    res.json({
      success: true,
      date: date,
      attendance: result,
      summary: {
        total: result.length,
        present: result.filter(r => r.status === 'Present').length,
        absent: result.filter(r => r.status === 'Absent').length,
        halfDay: result.filter(r => r.status === 'Half-Day Present').length,
        incomplete: result.filter(r => r.status === 'Incomplete').length,
        notMarked: result.filter(r => r.status === 'Not Marked').length
      }
    });
  } catch (error) {
    console.error('Get Attendance By Date Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
});

// Get employee attendance history
exports.getEmployeeAttendance = asyncHandler(async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    if (!employeeId) {
      return res.status(400).json({ msg: 'Employee ID is required' });
    }

    // Check if employee exists
    const employee = await Employee.findOne({ employeeId: employeeId });
    if (!employee) {
      return res.status(404).json({ msg: 'Employee not found' });
    }

    // Build query
    const query = { employeeId: employeeId };
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendanceRecords = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(100); // Limit to last 100 records

    res.json({
      success: true,
      employeeId: employeeId,
      employeeName: employee.name,
      attendance: attendanceRecords,
      summary: {
        total: attendanceRecords.length,
        present: attendanceRecords.filter(r => r.status === 'Present').length,
        absent: attendanceRecords.filter(r => r.status === 'Absent').length,
        halfDay: attendanceRecords.filter(r => r.status === 'Half-Day Present').length,
        incomplete: attendanceRecords.filter(r => r.status === 'Incomplete').length
      }
    });
  } catch (error) {
    console.error('Get Employee Attendance Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
});

// Update attendance record
exports.updateAttendance = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { inTime, outTime, status, remarks } = req.body;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ msg: 'Attendance record not found' });
    }

    // Update fields
    if (inTime !== undefined) attendance.inTime = inTime;
    if (outTime !== undefined) attendance.outTime = outTime;
    if (status !== undefined) attendance.status = status;
    if (remarks !== undefined) attendance.remarks = remarks;
    
    attendance.isManual = true;

    await attendance.save();

    res.json({
      success: true,
      msg: 'Attendance updated successfully',
      attendance
    });
  } catch (error) {
    console.error('Update Attendance Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
});

// Delete attendance record
exports.deleteAttendance = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ msg: 'Attendance record not found' });
    }

    await Attendance.findByIdAndDelete(id);

    res.json({
      success: true,
      msg: 'Attendance record deleted successfully'
    });
  } catch (error) {
    console.error('Delete Attendance Error:', error);
    res.status(500).json({ msg: error.message || 'Server error' });
  }
});

