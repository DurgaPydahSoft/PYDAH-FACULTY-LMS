const getLeaveApplicationTemplate = (params) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 20px;">
      
      <h2 style="color: #1976d2; margin: 0;">PYDAH Faculty LMS</h2>
      <p style="color: #666; margin: 5px 0;">Leave Application Notification</p>
    </div>

    <!-- Greeting -->
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p style="margin: 0;">Dear <strong>${params.employeeName}</strong>,</p>
      <p style="margin: 10px 0;">Your leave application has been submitted successfully. Here are the details:</p>
    </div>

    <!-- Leave Details -->
    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <h3 style="color: #1976d2; margin-top: 0;">Leave Application Details</h3>
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
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Start Date:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${params.startDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>End Date:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${params.endDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Duration:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${params.numberOfDays} day(s)</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Status:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; color: #f59e0b; font-weight: bold;">Pending Approval</td>
        </tr>
      </table>

      <div style="margin-top: 15px;">
        <p style="margin: 0 0 5px 0; color: #666;"><strong>Reason for Leave:</strong></p>
        <div style="background-color: #fff; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0;">
          ${params.reason}
        </div>
      </div>
    </div>

    <!-- Action Button -->
    <div style="text-align: center; margin-bottom: 20px;">
      <a href="${params.viewRequestUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Leave Request</a>
    </div>

    <!-- Important Note -->
    <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p style="margin: 0; color: #e65100;">
        <strong>Note:</strong> Your leave request is pending approval from the concerned authorities. 
        You will be notified once the status changes.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>© ${params.year} PYDAH Faculty LMS. All rights reserved.</p>
    </div>
  </div>
`;

module.exports = {
  getLeaveApplicationTemplate
}; 