const getHodForwardOrPrincipalReceiveTemplate = (params) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #1976d2;">PYDAH Faculty LMS</h2>
    </div>
    
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p style="margin: 0;">Dear <strong>Principal</strong>,</p>
      <p style="margin: 10px 0;">A leave request has been forwarded by HOD ${params.hodName} for your approval.</p>
    </div>

    <div style="background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #10b981;">
      <p style="margin: 0; color: #065f46;">
        <strong>HOD Recommendation:</strong><br/>
        ${params.hodRemarks}
      </p>
    </div>

    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <h3 style="color: #1976d2; margin-top: 0;">Leave Request Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Employee Name:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${params.employeeName}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Department:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${params.department}</td>
        </tr>
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
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; color: #f59e0b; font-weight: bold;">Pending Final Approval</td>
        </tr>
      </table>

      <div style="margin-top: 15px;">
        <p style="margin: 0 0 5px 0; color: #666;"><strong>Reason for Leave:</strong></p>
        <div style="background-color: #fff; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0;">
          ${params.reason}
        </div>
      </div>
    </div>

    <div style="text-align: center; margin-bottom: 20px;">
      <a href="${params.frontendUrl}/principal-dashboard/approve/${params.leaveRequestId}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-right: 10px;">Approve</a>
      <a href="${params.frontendUrl}/principal-dashboard/reject/${params.leaveRequestId}" style="background-color: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reject</a>
    </div>

    <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p style="margin: 0; color: #e65100;">
        <strong>Note:</strong> This leave request has been recommended by the HOD. 
        Please review and take appropriate action.
      </p>
    </div>

    <div style="text-align: center; margin-bottom: 20px;">
      <a href="${params.frontendUrl}/principal-dashboard" style="color: #1976d2; text-decoration: none;">View All Pending Requests</a>
    </div>

    <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>© ${params.year} PYDAH Faculty LMS. All rights reserved.</p>
    </div>
  </div>
`;

module.exports = {
  getHodForwardOrPrincipalReceiveTemplate
}; 