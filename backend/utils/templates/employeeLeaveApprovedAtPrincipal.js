const getEmployeeLeaveApprovedAtPrincipalTemplate = (params) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #1976d2;">PYDAH Faculty LMS</h2>
    </div>
    
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p style="margin: 0;">Dear <strong>${params.employeeName}</strong>,</p>
      <p style="margin: 10px 0;">Your leave request has been approved by the Principal.</p>
    </div>

    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #10b981;">
      <p style="margin: 0; color: #065f46;">
        <strong>Principal's Decision:</strong><br/>
        ${params.principalRemarks}
      </p>
    </div>

    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <h3 style="color: #1976d2; margin-top: 0;">Leave Request Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Request ID:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${params.leaveRequestId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Leave Type:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${params.leaveType}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Dates:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${params.startDate} - ${params.endDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Duration:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${params.numberOfDays} day(s)</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Status:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; color: #10b981; font-weight: bold;">Approved</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-bottom: 20px;">
      <a href="https://pydah-faculty-lms.vercel.app/employee-login" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Details</a>
    </div>

    <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p style="margin: 0; color: #2e7d32;">
        <strong>Note:</strong> Please ensure all your responsibilities are properly handed over before proceeding on leave.
      </p>
    </div>

    <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>© ${params.year} PYDAH Faculty LMS. All rights reserved.</p>
    </div>
  </div>
`;

module.exports = {
  getEmployeeLeaveApprovedAtPrincipalTemplate
}; 