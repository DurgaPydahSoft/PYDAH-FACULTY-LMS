const SibApiV3Sdk = require('sib-api-v3-sdk');
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const mongoose = require('mongoose');
const HOD = mongoose.models.HOD || mongoose.model('HOD');

// Configure API key authorization
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Helper to format number of days
function formatNumberOfDays(numberOfDays) {
  return Number(numberOfDays) === 0.5 ? '1/2' : Number(numberOfDays).toString();
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
    const frontendUrl = process.env.FRONTEND_URL;
    
    if (!senderEmail) {
      throw new Error('BREVO_SENDER_EMAIL environment variable is not set');
    }
    
    if (!frontendUrl) {
      console.warn('FRONTEND_URL environment variable is not set, using default URL');
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
      viewRequestUrl: frontendUrl ? `${frontendUrl}/employee-login` : 'https://pydah-faculty-lms.vercel.app/employee-login',
      year: new Date().getFullYear()
    };

    // Send email to employee using template
    const templateId = process.env.BREVO_LEAVE_APPLICATION_TEMPLATE_ID;
    if (templateId) {
      try {
        console.log('Attempting to send email using template:', {
          templateId,
          params: templateParams
        });

        await sendEmail({
          to: employee.email,
          subject: 'Leave Application Submitted',
          templateId: templateId,
          params: templateParams
        });

        console.log('Email sent successfully using template');
      } catch (templateError) {
        console.error('Failed to send email using template:', {
          error: templateError.message,
          templateId
        });
        throw templateError;
      }
    } else {
      throw new Error('No template ID configured for Brevo email sending.');
    }

    // --- HOD Notification ---
    try {
      // Find HOD for the employee's department and campus
      const hod = await HOD.findOne({
        'department.code': employee.department,
        'department.campusType': employee.campus.charAt(0).toUpperCase() + employee.campus.slice(1),
        status: 'active'
      });
      if (!hod) {
        console.warn('No HOD found for department/campus:', {
          department: employee.department,
          campus: employee.campus
        });
        return; // Don't throw, just log
      }
      if (!hod.email) {
        console.warn('HOD found but has no email:', hod._id);
        return;
      }
      const hodTemplateId = process.env.BREVO_HOD_NOTIFICATION_TEMPLATE_ID;
      if (!hodTemplateId) {
        console.warn('No BREVO_HOD_NOTIFICATION_TEMPLATE_ID set in .env');
        return;
      }
      // You can customize params for HOD if needed, or reuse templateParams
      await sendEmail({
        to: hod.email,
        subject: 'New Leave Application Submitted',
        templateId: hodTemplateId,
        params: templateParams
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
const sendPrincipalNotification = async (leaveRequest, employee) => {
  try {
    const Campus = mongoose.models.Campus || mongoose.model('Campus');
    const Principal = mongoose.models.Principal || mongoose.model('Principal');
    const HOD = mongoose.models.HOD || mongoose.model('HOD');
    
    // Find campus and principal
    const campus = await Campus.findOne({ name: employee.campus });
    if (!campus || !campus.principalId) {
      console.warn('No campus or principal found for:', employee.campus);
      return;
    }
    const principal = await Principal.findById(campus.principalId);
    if (!principal || !principal.email) {
      console.warn('No principal email found for campus:', employee.campus);
      return;
    }

    // Find HOD details
    const hod = await HOD.findOne({
      'department.code': employee.department,
      'department.campusType': employee.campus.charAt(0).toUpperCase() + employee.campus.slice(1),
      status: 'active'
    });

    if (!hod) {
      console.warn('No HOD found for department/campus:', {
        department: employee.department,
        campus: employee.campus
      });
      return;
    }

    const templateId = process.env.BREVO_PRINCIPAL_NOTIFICATION_TEMPLATE_ID;
    if (!templateId) {
      console.warn('No BREVO_PRINCIPAL_NOTIFICATION_TEMPLATE_ID set');
      return;
    }

    const frontendUrl = process.env.FRONTEND_URL;
    const templateParams = {
      employeeName: employee.name,
      leaveType: leaveRequest.leaveType,
      startDate: new Date(leaveRequest.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      endDate: new Date(leaveRequest.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      numberOfDays: formatNumberOfDays(leaveRequest.numberOfDays),
      reason: leaveRequest.reason,
      status: 'Forwarded by HOD',
      applicationDate: new Date().toLocaleDateString(),
      leaveRequestId: leaveRequest.leaveRequestId,
      department: employee.department,
      campus: employee.campus,
      viewRequestUrl: frontendUrl ? `${frontendUrl}/principal-login` : 'https://pydah-faculty-lms.vercel.app/',
      year: new Date().getFullYear(),
      // Add HOD details
      hodName: hod.name,
      hodDepartment: hod.department.code || employee.department,
      hodRemarks: leaveRequest.hodRemarks || 'Forwarded to Principal',
      hodApprovalDate: leaveRequest.hodApprovalDate ? new Date(leaveRequest.hodApprovalDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };

    await sendEmail({
      to: principal.email,
      subject: 'Leave Request Forwarded to Principal',
      templateId,
      params: templateParams
    });
    console.log('Principal notification email sent to:', principal.email);
  } catch (error) {
    console.error('Error sending principal notification email:', error);
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

    // Find HOD details
    const HOD = mongoose.models.HOD || mongoose.model('HOD');
    const hod = await HOD.findOne({
      'department.code': employee.department,
      'department.campusType': employee.campus.charAt(0).toUpperCase() + employee.campus.slice(1),
      status: 'active'
    });

    const frontendUrl = process.env.FRONTEND_URL;
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
      viewRequestUrl: frontendUrl ? `${frontendUrl}/employee-login` : 'https://pydah-faculty-lms.vercel.app/employee-login',
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
    const templateId = process.env.BREVO_EMPLOYEE_LEAVE_REJECTED_AT_PRINCIPAL_TEMPLATE_ID;
    if (!templateId) {
      console.warn('No BREVO_EMPLOYEE_LEAVE_REJECTED_AT_PRINCIPAL_TEMPLATE_ID set');
      return;
    }

    // Find Principal details
    const Campus = mongoose.models.Campus || mongoose.model('Campus');
    const Principal = mongoose.models.Principal || mongoose.model('Principal');
    const campus = await Campus.findOne({ name: employee.campus });
    const principal = campus && campus.principalId ? await Principal.findById(campus.principalId) : null;

    const frontendUrl = process.env.FRONTEND_URL;
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
      viewRequestUrl: frontendUrl ? `${frontendUrl}/employee-login` : 'https://pydah-faculty-lms.vercel.app/employee-login',
      year: new Date().getFullYear(),
      // Add Principal details
      principalName: principal ? principal.name : 'Principal',
      principalRemarks: leaveRequest.principalRemarks || 'Rejected by Principal',
      principalApprovalDate: leaveRequest.principalApprovalDate ? new Date(leaveRequest.principalApprovalDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };

    await sendEmail({
      to: employee.email,
      subject: 'Leave Request Rejected by Principal',
      templateId,
      params: templateParams
    });
    console.log('Employee principal rejection notification email sent to:', employee.email);
  } catch (error) {
    console.error('Error sending employee principal rejection notification email:', error);
  }
};

// Send email to employee when leave is approved by Principal
const sendEmployeePrincipalApprovalNotification = async (leaveRequest, employee) => {
  try {
    const templateId = process.env.BREVO_EMPLOYEE_LEAVE_APPROVAL_AT_PRINCIPAL_TEMPLATE_ID;
    if (!templateId) {
      console.warn('No BREVO_EMPLOYEE_LEAVE_APPROVAL_AT_PRINCIPAL_TEMPLATE_ID set');
      return;
    }

    // Find Principal details
    const Campus = mongoose.models.Campus || mongoose.model('Campus');
    const Principal = mongoose.models.Principal || mongoose.model('Principal');
    const campus = await Campus.findOne({ name: employee.campus });
    const principal = campus && campus.principalId ? await Principal.findById(campus.principalId) : null;

    const frontendUrl = process.env.FRONTEND_URL;
    const templateParams = {
      employeeName: employee.name,
      leaveType: leaveRequest.leaveType,
      startDate: new Date(leaveRequest.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      endDate: new Date(leaveRequest.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      numberOfDays: formatNumberOfDays(leaveRequest.numberOfDays),
      reason: leaveRequest.reason,
      status: 'Approved',
      applicationDate: new Date().toLocaleDateString(),
      leaveRequestId: leaveRequest.leaveRequestId,
      department: employee.department,
      campus: employee.campus,
      viewRequestUrl: frontendUrl ? `${frontendUrl}/employee-login` : 'https://pydah-faculty-lms.vercel.app/employee-login',
      year: new Date().getFullYear(),
      // Add Principal details
      principalName: principal ? principal.name : 'Principal',
      principalRemarks: leaveRequest.principalRemarks || 'Approved by Principal',
      principalApprovalDate: leaveRequest.principalApprovalDate ? new Date(leaveRequest.principalApprovalDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };

    await sendEmail({
      to: employee.email,
      subject: 'Leave Request Approved by Principal',
      templateId,
      params: templateParams
    });
    console.log('Employee principal approval notification email sent to:', employee.email);
  } catch (error) {
    console.error('Error sending employee principal approval notification email:', error);
  }
};

module.exports = {
  sendEmail,
  sendLeaveApplicationEmails,
  sendPrincipalNotification,
  sendEmployeeRejectionNotification,
  sendEmployeePrincipalRejectionNotification,
  sendEmployeePrincipalApprovalNotification
}; 