const getEmployeeLeaveApprovedAtPrincipalTemplate = (params) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #1976d2;">PYDAH Faculty LMS</h2>
    </div>
    
    <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p style="margin: 0;">Dear <strong>${params.employeeName}</strong>,</p>
      <p style="margin: 10px 0;">Your leave request has been approved by the Principal.</p>
    </div>

    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <h3 style="color: #1976d2; margin-top: 0;">Leave Request Details</h3>
      <div style="margin-bottom: 10px;">
        <strong>Request ID:</strong> ${params.leaveRequestId}
      </div>
      <div style="margin-bottom: 10px;">
        <strong>Leave Type:</strong> ${params.leaveType}
      </div>
      <div style="margin-bottom: 10px;">
        <strong>Reason:</strong> ${params.reason}
      </div>
      ${params.isModifiedByPrincipal ? `
        <div style="background-color: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ffc107;">
          <h4 style="margin: 0 0 10px 0; color: #856404;">⚠️ Leave Dates Modified by Principal</h4>
          <div style="margin-bottom: 8px;">
            <strong>Original Request:</strong><br>
            Duration: ${params.originalStartDate} to ${params.originalEndDate} (${params.originalNumberOfDays} days)
          </div>
          <div style="margin-bottom: 8px;">
            <strong>Approved Dates:</strong><br>
            Duration: ${params.approvedStartDate} to ${params.approvedEndDate} (${params.approvedNumberOfDays} days)
          </div>
          ${params.modificationReason ? `
            <div style="margin-top: 8px;">
              <strong>Modification Reason:</strong> ${params.modificationReason}
            </div>
          ` : ''}
        </div>
      ` : `
        <div style="margin-bottom: 10px;">
          <strong>Duration:</strong> ${params.startDate} to ${params.endDate} (${params.numberOfDays} days)
        </div>
      `}
      <div style="margin-bottom: 10px;">
        <strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Approved</span>
      </div>
      ${params.principalRemarks ? `
        <div style="margin-bottom: 10px;">
          <strong>Principal Remarks:</strong> ${params.principalRemarks}
        </div>
      ` : ''}
    </div>

    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <h4 style="margin-top: 0; color: #6c757d;">Leave Balance Update</h4>
      <p style="margin: 0;">Your leave balance has been updated based on the approved leave duration.</p>
    </div>

    <div style="text-align: center; margin-bottom: 20px;">
      <a href="${params.frontendUrl}/employee-login" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Details</a>
    </div>

    <div style="text-align: center; color: #6c757d; font-size: 12px;">
      <p>This is an automated message from PYDAH Faculty LMS.</p>
      <p>&copy; ${params.year} PYDAH. All rights reserved.</p>
    </div>
  </div>
`;

module.exports = {
  getEmployeeLeaveApprovedAtPrincipalTemplate
}; 