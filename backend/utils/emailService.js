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
const Employee = require('../models/schemas/employeeSchema');
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
      // Find HOD for the employee's department and campus with improved lookup
      const normalizedCampus = normalizeCampusType(employee.campus);
      const hod = await HOD.findOne({
        'department.code': employee.department,
        'department.campusType': normalizedCampus,
        status: 'active'
      });
      
      if (!hod) {
        console.warn('No HOD found for department/campus:', {
          department: employee.department,
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

module.exports = {
  sendEmail,
  sendLeaveApplicationEmails,
  sendPrincipalNotification,
  sendEmployeeRejectionNotification,
  sendEmployeePrincipalRejectionNotification,
  sendEmployeePrincipalApprovalNotification,
  sendEmployeeCredentials,
  sendLeaveRejectionEmail,
  testEmailConfiguration
}; 