const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const mongoose = require('mongoose');
const HOD = mongoose.models.HOD || mongoose.model('HOD');
const { getEmployeeCredentialsTemplate } = require('./templates/employeeCredentials');
const { getLeaveApplicationTemplate } = require('./templates/leaveApplication');
const { getHodReceivingLeaveRequestTemplate } = require('./templates/hodReceivingLeaveRequest');
const { getHodForwardOrPrincipalReceiveTemplate } = require('./templates/hodForwardOrPrincipalReceive');
const { getEmployeeLeaveRejectedAtHodTemplate } = require('./templates/employeeLeaveRejectedAtHod');
const { getEmployeeLeaveRejectedAtPrincipalTemplate } = require('./templates/employeeLeaveRejectedAtPrincipal');
const { getEmployeeLeaveApprovedAtPrincipalTemplate } = require('./templates/employeeLeaveApprovedAtPrincipal');
const { getTaskAssignmentTemplate } = require('./templates/taskAssignment');
const { Employee } = require('../models');
const Hod = require('../models/schemas/hodSchema');
const Principal = require('../models/schemas/principalSchema');

// Configure API key authorization
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Helper to format number of days
function formatNumberOfDays(numberOfDays) {
  return Number(numberOfDays) === 0.5 ? '1/2' : Number(numberOfDays).toString();
}

// Helper to get frontend URL with fallback
function getFrontendUrl() {
  return process.env.FRONTEND_URL || 'https://pydah-faculty-lms.vercel.app';
}

// Helper to normalize campus type for HOD lookup
function normalizeCampusType(campus) {
  if (!campus) return '';
  return campus.charAt(0).toUpperCase() + campus.slice(1).toLowerCase();
}

const sendEmail = async ({ to, subject, htmlContent, templateId, params }) => {
  try {
    // Validate sender email
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    if (!senderEmail) {
      throw new Error('BREVO_SENDER_EMAIL environment variable is not set');
    }

    console.log('Starting email send process:', {
      to,
      subject,
      senderEmail,
      templateId,
      hasParams: !!params,
      usingTemplate: !!templateId,
      usingHtmlContent: !!htmlContent
    });

    const emailData = {
      sender: {
        name: '📑📍PYDAH Faculty LMS ',
        email: senderEmail
      },
      to: Array.isArray(to) ? to : [{ email: to }],
      subject,
      ...(templateId && {
        templateId: parseInt(templateId),
        params
      }),
      ...(htmlContent && { htmlContent })
    };

    console.log('Sending email with data:', {
      sender: emailData.sender,
      to: emailData.to,
      subject: emailData.subject,
      templateId: emailData.templateId,
      params: emailData.params ? 'Present' : 'Not present',
      htmlContent: emailData.htmlContent ? 'Present' : 'Not present'
    });

    const response = await apiInstance.sendTransacEmail(emailData);
    
    // Log detailed response
    console.log('Email API Response:', {
      status: response.response?.status,
      messageId: response.body?.messageId,
      to: emailData.to,
      headers: response.response?.headers,
      body: response.body
    });

    // Check if email was accepted
    if (response.response?.status === 201 || response.response?.status === 200) {
      console.log('Email accepted for delivery:', {
        messageId: response.body?.messageId,
        to: emailData.to,
        status: response.response?.status
      });
    } else {
      console.warn('Email might not be delivered:', {
        status: response.response?.status,
        messageId: response.body?.messageId,
        to: emailData.to
      });
    }

    return response;
  } catch (error) {
    console.error('Error sending email:', {
      error: error.message,
      code: error.code,
      to,
      subject,
      response: error.response?.body || 'No response body',
      status: error.response?.status,
      headers: error.response?.headers
    });
    throw error;
  }
};

const sendLeaveApplicationEmails = async (leaveRequest, employee) => {
  try {
    console.log('Starting leave application email process:', {
      employeeId: employee._id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      leaveRequestId: leaveRequest.leaveRequestId
    });

    if (!employee.email) {
      throw new Error('Employee email is missing');
    }

    // Validate environment variables
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const frontendUrl = getFrontendUrl();
    
    if (!senderEmail) {
      throw new Error('BREVO_SENDER_EMAIL environment variable is not set');
    }

    // Prepare template parameters
    const templateParams = {
      employeeName: employee.name,
      leaveType: leaveRequest.leaveType,
      startDate: new Date(leaveRequest.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      endDate: new Date(leaveRequest.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      numberOfDays: formatNumberOfDays(leaveRequest.numberOfDays),
      reason: leaveRequest.reason,
      status: 'Pending',
      applicationDate: new Date().toLocaleDateString(),
      leaveRequestId: leaveRequest.leaveRequestId,
      department: employee.department,
      campus: employee.campus,
      viewRequestUrl: `${frontendUrl}/employee-login`,
      frontendUrl: frontendUrl,
      year: new Date().getFullYear()
    };

    // Send email to employee using template
    const employeeHtmlContent = getLeaveApplicationTemplate(templateParams);
    await sendEmail({
      to: employee.email,
      subject: 'Leave Application Submitted',
      htmlContent: employeeHtmlContent
    });

    console.log('Email sent successfully to employee');

      // --- HOD Notification ---
    try {
      // Find HOD based on employee type
      const normalizedCampus = normalizeCampusType(employee.campus);
      let hod;
      
      if (employee.employeeType === 'non-teaching') {
        // Non-teaching: find HOD by assignedHodId
        if (employee.assignedHodId) {
          hod = await HOD.findById(employee.assignedHodId);
          if (hod && hod.status !== 'active') {
            hod = null;
          }
        }
      } else {
        // Teaching: find HOD by department
        hod = await HOD.findOne({
          'department.code': employee.department,
          'department.campusType': normalizedCampus,
          hodType: 'teaching',
          status: 'active'
        });
      }
      
      if (!hod) {
        console.warn('No HOD found for employee:', {
          employeeType: employee.employeeType,
          department: employee.department,
          assignedHodId: employee.assignedHodId,
          campus: employee.campus,
          normalizedCampus: normalizedCampus
        });
        return; // Don't throw, just log
      }
      if (!hod.email) {
        console.warn('HOD found but has no email:', hod._id);
        return;
      }

      // Send HOD specific template
      const hodHtmlContent = getHodReceivingLeaveRequestTemplate(templateParams);
      await sendEmail({
        to: hod.email,
        subject: 'New Leave Application Submitted',
        htmlContent: hodHtmlContent
      });
      console.log('HOD notification email sent to:', hod.email);
    } catch (hodError) {
      console.error('Error sending HOD notification email:', hodError);
    }
  } catch (error) {
    console.error('Error in sendLeaveApplicationEmails:', {
      error: error.message,
      code: error.code,
      employeeId: employee?._id,
      employeeEmail: employee?.email,
      leaveRequestId: leaveRequest?.leaveRequestId,
      response: error.response?.body || 'No response body'
    });
    throw error;
  }
};

// Send email to HR when non-teaching leave is forwarded
const sendHRNotification = async (leaveRequest, employee, hod) => {
  try {
    // Get HR for the employee's campus
    const HR = mongoose.models.HR || mongoose.model('HR');
    const normalizedCampus = normalizeCampusType(employee.campus);
    
    const hr = await HR.findOne({
      'campus.type': normalizedCampus,
      status: 'active'
    });

    if (!hr) {
      console.warn(`No active HR found for campus: ${normalizedCampus}`);
      return;
    }

    const templateParams = {
      employeeName: employee.name,
      department: employee.assignedHodId ? 'Non-Teaching' : employee.department || 'N/A',
      leaveRequestId: leaveRequest.leaveRequestId,
      leaveType: leaveRequest.leaveType,
      startDate: new Date(leaveRequest.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      endDate: new Date(leaveRequest.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      numberOfDays: formatNumberOfDays(leaveRequest.numberOfDays),
      reason: leaveRequest.reason,
      hodName: hod.name,
      hodRemarks: leaveRequest.hodRemarks || 'No remarks provided',
      frontendUrl: getFrontendUrl(),
      year: new Date().getFullYear()
    };

    const htmlContent = getHodForwardOrPrincipalReceiveTemplate(templateParams);
    await sendEmail({
      to: hr.email,
      subject: 'Non-Teaching Leave Request Forwarded for Approval',
      htmlContent
    });

    console.log('HR notification email sent successfully to:', hr.email);
  } catch (error) {
    console.error('Error sending HR notification:', error);
    throw error;
  }
};

// Send email to principal when leave is forwarded
const sendPrincipalNotification = async (leaveRequest, employee, hod) => {
  try {
    // Fetch principal email from database based on campus
    const Principal = mongoose.models.Principal || mongoose.model('Principal');
    const normalizedCampus = normalizeCampusType(employee.campus);
    
    const principal = await Principal.findOne({
      'campus.type': normalizedCampus,
      status: 'active'
    });

    if (!principal) {
      console.warn(`No active principal found for campus: ${normalizedCampus}`);
      return;
    }

    const templateParams = {
      employeeName: employee.name,
      department: employee.department,
      leaveRequestId: leaveRequest.leaveRequestId,
      leaveType: leaveRequest.leaveType,
      startDate: new Date(leaveRequest.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      endDate: new Date(leaveRequest.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      numberOfDays: formatNumberOfDays(leaveRequest.numberOfDays),
      reason: leaveRequest.reason,
      hodName: hod.name,
      hodRemarks: leaveRequest.hodRemarks || 'No remarks provided',
      frontendUrl: getFrontendUrl(),
      year: new Date().getFullYear()
    };

    const htmlContent = getHodForwardOrPrincipalReceiveTemplate(templateParams);
    await sendEmail({
      to: principal.email,
      subject: 'Leave Request Forwarded for Approval',
      htmlContent
    });

    console.log('Principal notification email sent successfully to:', principal.email);
  } catch (error) {
    console.error('Error sending principal notification:', error);
    throw error;
  }
};

// Send email to employee when leave is rejected by HOD
const sendEmployeeRejectionNotification = async (leaveRequest, employee) => {
  try {
    const templateId = process.env.BREVO_EMPLOYEE_LEAVE_REJECTED_AT_HOD_TEMPLATE_ID;
    if (!templateId) {
      console.warn('No BREVO_EMPLOYEE_LEAVE_REJECTED_AT_HOD_TEMPLATE_ID set');
      return;
    }

    // Find HOD details with improved lookup
    const HOD = mongoose.models.HOD || mongoose.model('HOD');
    const normalizedCampus = normalizeCampusType(employee.campus);
    const hod = await HOD.findOne({
      'department.code': employee.department,
      'department.campusType': normalizedCampus,
      status: 'active'
    });

    const frontendUrl = getFrontendUrl();
    const templateParams = {
      employeeName: employee.name,
      leaveType: leaveRequest.leaveType,
      startDate: new Date(leaveRequest.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      endDate: new Date(leaveRequest.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      numberOfDays: formatNumberOfDays(leaveRequest.numberOfDays),
      reason: leaveRequest.reason,
      status: 'Rejected',
      applicationDate: new Date().toLocaleDateString(),
      leaveRequestId: leaveRequest.leaveRequestId,
      department: employee.department,
      campus: employee.campus,
      viewRequestUrl: `${frontendUrl}/employee-login`,
      year: new Date().getFullYear(),
      // Add HOD details
      hodName: hod ? hod.name : 'HOD',
      hodDepartment: hod ? (hod.department.code || employee.department) : employee.department,
      hodRemarks: leaveRequest.hodRemarks || 'Rejected by HOD',
      hodApprovalDate: leaveRequest.hodApprovalDate ? new Date(leaveRequest.hodApprovalDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };

    await sendEmail({
      to: employee.email,
      subject: 'Leave Request Rejected by HOD',
      templateId,
      params: templateParams
    });
    console.log('Employee rejection notification email sent to:', employee.email);
  } catch (error) {
    console.error('Error sending employee rejection notification email:', error);
  }
};

// Send email to employee when leave is rejected by Principal
const sendEmployeePrincipalRejectionNotification = async (leaveRequest, employee) => {
  try {
    const htmlContent = getEmployeeLeaveRejectedAtPrincipalTemplate({
      employeeName: employee.name,
      principalRemarks: leaveRequest.principalRemarks,
      leaveRequestId: leaveRequest.leaveRequestId,
      leaveType: leaveRequest.leaveType,
      startDate: new Date(leaveRequest.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      endDate: new Date(leaveRequest.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      numberOfDays: formatNumberOfDays(leaveRequest.numberOfDays),
      frontendUrl: getFrontendUrl(),
      year: new Date().getFullYear()
    });

    const emailData = {
      to: [{ email: employee.email }],
      subject: 'Leave Request Rejected by Principal',
      htmlContent
    };

    const result = await sendEmail(emailData);
    console.log('Leave rejection email sent successfully to employee');
    return result;
  } catch (error) {
    console.error('Error sending leave rejection email:', error);
    throw error;
  }
};

// Send email to employee when leave is approved by Principal
const sendEmployeePrincipalApprovalNotification = async (leaveRequest, employee) => {
  try {
    const htmlContent = getEmployeeLeaveApprovedAtPrincipalTemplate({
      employeeName: employee.name,
      leaveRequestId: leaveRequest.leaveRequestId,
      leaveType: leaveRequest.leaveType,
      reason: leaveRequest.reason,
      principalRemarks: leaveRequest.principalRemarks,
      // Handle both original and approved dates
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      numberOfDays: leaveRequest.numberOfDays,
      // Modified dates if applicable
      isModifiedByPrincipal: leaveRequest.isModifiedByPrincipal || false,
      originalStartDate: leaveRequest.startDate,
      originalEndDate: leaveRequest.endDate,
      originalNumberOfDays: leaveRequest.numberOfDays,
      approvedStartDate: leaveRequest.approvedStartDate || leaveRequest.startDate,
      approvedEndDate: leaveRequest.approvedEndDate || leaveRequest.endDate,
      approvedNumberOfDays: leaveRequest.approvedNumberOfDays || leaveRequest.numberOfDays,
      modificationReason: leaveRequest.principalModificationReason,
      frontendUrl: getFrontendUrl(),
      year: new Date().getFullYear()
    });

    await sendEmail({
      to: employee.email,
      subject: 'Leave Request Approved by Principal',
      htmlContent
    });
    
    console.log('Principal approval notification sent to:', employee.email);
  } catch (error) {
    console.error('Error sending principal approval notification:', error);
  }
};

// Send email to employee with their credentials
const sendEmployeeCredentials = async (employee, password) => {
  try {
    const frontendUrl = getFrontendUrl();
    const loginUrl = `${frontendUrl}/employee-login`;
    
    const htmlContent = getEmployeeCredentialsTemplate(employee, password, loginUrl);

    await sendEmail({
      to: employee.email,
      subject: 'Your PYDAH Faculty LMS Credentials',
      htmlContent
    });
    
    console.log('Employee credentials email sent to:', employee.email);
  } catch (error) {
    console.error('Error sending employee credentials email:', error);
  }
};

const sendLeaveRejectionEmail = async (leaveRequest, employee, hod) => {
  try {
    const htmlContent = getEmployeeLeaveRejectedAtHodTemplate({
      employeeName: employee.name,
      hodName: hod.name,
      hodRemarks: leaveRequest.hodRemarks,
      leaveRequestId: leaveRequest.leaveRequestId,
      leaveType: leaveRequest.leaveType,
      startDate: new Date(leaveRequest.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      endDate: new Date(leaveRequest.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      numberOfDays: formatNumberOfDays(leaveRequest.numberOfDays),
      frontendUrl: getFrontendUrl(),
      year: new Date().getFullYear()
    });

    const emailData = {
      to: [{ email: employee.email }],
      subject: 'Leave Request Rejected',
      htmlContent
    };

    const result = await sendEmail(emailData);
    console.log('Leave rejection email sent successfully to employee');
    return result;
  } catch (error) {
    console.error('Error sending leave rejection email:', error);
    throw error;
  }
};

// Test function to validate email configuration
const testEmailConfiguration = async () => {
  try {
    const requiredEnvVars = [
      'BREVO_API_KEY',
      'BREVO_SENDER_EMAIL'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing required environment variables:', missingVars);
      return false;
    }
    
    console.log('✅ All required environment variables are set');
    console.log('✅ Email service configuration is valid');
    return true;
  } catch (error) {
    console.error('❌ Email configuration test failed:', error);
    return false;
  }
};

// Send email to employees when task is assigned
const sendTaskAssignmentEmails = async (task, employeeIds = [], isUpdate = false) => {
  try {
    // Don't send emails if task is in draft status or archived
    if (task.status === 'draft' || task.status === 'archived') {
      console.log('Skipping email for task in draft/archived status');
      return;
    }

    const frontendUrl = getFrontendUrl();
    const viewTaskUrl = `${frontendUrl}/employee-login`;

    // Get priority styling
    const getPriorityStyle = (priority) => {
      switch (priority?.toLowerCase()) {
        case 'critical':
          return 'background-color: #ef4444; color: white;';
        case 'high':
          return 'background-color: #f97316; color: white;';
        case 'medium':
          return 'background-color: #3b82f6; color: white;';
        case 'low':
          return 'background-color: #10b981; color: white;';
        default:
          return 'background-color: #6b7280; color: white;';
      }
    };

    // Format due date
    const formatDueDate = (dueDate) => {
      if (!dueDate) return null;
      return new Date(dueDate).toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    };

    // Get assigned by name
    const assignedBy = task.givenBy?.name 
      ? `${task.givenBy.name} (${task.givenBy.role?.toUpperCase() || ''})`
      : 'System';

    // Fetch employees if IDs are provided
    let employees = [];
    if (employeeIds && employeeIds.length > 0) {
      employees = await Employee.find({
        _id: { $in: employeeIds },
        status: 'active'
      }).select('name email employeeId');
    } else if (task.assignedTo) {
      // If no specific IDs, get all assigned employees
      if (task.assignedTo.employees && task.assignedTo.employees.length > 0) {
        // Handle both populated objects and IDs
        const employeeIdsToFetch = task.assignedTo.employees.map(emp => {
          return emp._id ? emp._id : emp;
        });
        
        employees = await Employee.find({
          _id: { $in: employeeIdsToFetch },
          status: 'active'
        }).select('name email employeeId');
      } else if (task.assignedTo.includeAllEmployees) {
        // If includeAllEmployees is true, get employees from departments/campuses
        const query = { status: 'active' };
        
        if (task.assignedTo.departments && task.assignedTo.departments.length > 0) {
          query.$or = [
            { department: { $in: task.assignedTo.departments } },
            { branchCode: { $in: task.assignedTo.departments } }
          ];
        }
        
        if (task.assignedTo.campuses && task.assignedTo.campuses.length > 0) {
          query.campus = { $in: task.assignedTo.campuses };
        }
        
        employees = await Employee.find(query).select('name email employeeId');
      }
    }

    if (employees.length === 0) {
      console.log('No employees found to send task assignment emails');
      return;
    }

    console.log(`Sending task assignment emails to ${employees.length} employee(s)`);

    // Send email to each employee
    const emailPromises = employees.map(async (employee) => {
      try {
        if (!employee.email) {
          console.warn(`Employee ${employee.name} (${employee._id}) has no email address`);
          return;
        }

        const templateParams = {
          employeeName: employee.name,
          taskTitle: task.title,
          taskDescription: task.description || 'No description provided',
          priority: task.priority || 'medium',
          priorityStyle: getPriorityStyle(task.priority),
          dueDate: formatDueDate(task.dueDate),
          status: task.status ? task.status.charAt(0).toUpperCase() + task.status.slice(1) : 'Active',
          assignedBy: assignedBy,
          requireAcknowledgement: task.requireAcknowledgement || false,
          attachments: task.attachments || [],
          viewTaskUrl: viewTaskUrl,
          year: new Date().getFullYear()
        };

        const htmlContent = getTaskAssignmentTemplate(templateParams);
        
        await sendEmail({
          to: employee.email,
          subject: isUpdate 
            ? `Task Updated: ${task.title}` 
            : `New Task Assigned: ${task.title}`,
          htmlContent
        });

        console.log(`Task assignment email sent to: ${employee.email}`);
      } catch (error) {
        console.error(`Error sending email to employee ${employee.name} (${employee.email}):`, error);
        // Don't throw, continue with other employees
      }
    });

    await Promise.allSettled(emailPromises);
    console.log('Task assignment email process completed');
  } catch (error) {
    console.error('Error in sendTaskAssignmentEmails:', {
      error: error.message,
      taskId: task?._id,
      taskTitle: task?.title
    });
    // Don't throw error - email failure shouldn't break task creation
  }
};

module.exports = {
  sendEmail,
  sendLeaveApplicationEmails,
  sendPrincipalNotification,
  sendEmployeeRejectionNotification,
  sendEmployeePrincipalRejectionNotification,
  sendEmployeePrincipalApprovalNotification,
  sendEmployeeCredentials,
  sendLeaveRejectionEmail,
  sendTaskAssignmentEmails,
  testEmailConfiguration
}; 