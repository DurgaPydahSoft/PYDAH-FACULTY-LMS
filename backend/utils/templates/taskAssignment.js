const getTaskAssignmentTemplate = (params) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #1976d2; margin: 0;">PYDAH Faculty LMS</h2>
      <p style="color: #666; margin: 5px 0;">Task Assignment Notification</p>
    </div>

    <!-- Greeting -->
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p style="margin: 0;">Dear <strong>${params.employeeName}</strong>,</p>
      <p style="margin: 10px 0;">You have been assigned a new task. Please review the details below:</p>
    </div>

    <!-- Task Details -->
    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <h3 style="color: #1976d2; margin-top: 0;">Task Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Task Title:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #1976d2;">${params.taskTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Priority:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">
            <span style="padding: 4px 8px; border-radius: 4px; font-weight: bold; ${params.priorityStyle}">
              ${params.priority}
            </span>
          </td>
        </tr>
        ${params.dueDate ? `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Due Date:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${params.dueDate}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Status:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; color: #10b981; font-weight: bold;">${params.status}</td>
        </tr>
        ${params.assignedBy ? `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Assigned By:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${params.assignedBy}</td>
        </tr>
        ` : ''}
      </table>

      <div style="margin-top: 15px;">
        <p style="margin: 0 0 5px 0; color: #666;"><strong>Task Description:</strong></p>
        <div style="background-color: #fff; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0; white-space: pre-wrap;">
          ${params.taskDescription}
        </div>
      </div>

      ${params.attachments && params.attachments.length > 0 ? `
      <div style="margin-top: 15px;">
        <p style="margin: 0 0 5px 0; color: #666;"><strong>Reference Links/Attachments:</strong></p>
        <div style="background-color: #fff; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0;">
          <ul style="margin: 0; padding-left: 20px;">
            ${params.attachments.map(link => `
              <li style="margin: 5px 0;">
                <a href="${link}" target="_blank" style="color: #1976d2; text-decoration: none; word-break: break-all;">${link}</a>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
      ` : ''}

      ${params.requireAcknowledgement ? `
      <div style="margin-top: 15px; background-color: #fff3e0; padding: 10px; border-radius: 4px; border: 1px solid #ffb74d;">
        <p style="margin: 0; color: #e65100;">
          <strong>⚠️ Action Required:</strong> This task requires acknowledgement. Please acknowledge or mark it as completed in the system.
        </p>
      </div>
      ` : ''}
    </div>

    <!-- Action Button -->
    <div style="text-align: center; margin-bottom: 20px;">
      <a href="${params.viewTaskUrl}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Task Details</a>
    </div>

    <!-- Important Note -->
    <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p style="margin: 0; color: #e65100;">
        <strong>Note:</strong> Please review the task details and take necessary action. 
        ${params.requireAcknowledgement ? 'Don\'t forget to acknowledge or mark the task as completed once done.' : 'You can view all your assigned tasks in your dashboard.'}
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
  getTaskAssignmentTemplate
};

