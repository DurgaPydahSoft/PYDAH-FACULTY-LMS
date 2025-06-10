const getEmployeeCredentialsTemplate = (employee, password, loginUrl) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #1976d2;">Welcome to PYDAH Faculty LMS</h2>
    </div>
    
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p style="margin: 0;">Dear <strong>${employee.name}</strong>,</p>
      <p style="margin: 10px 0;">Your account has been created successfully. Here are your login credentials:</p>
    </div>

    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <h3 style="color: #1976d2; margin-top: 0;">Your Credentials</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Employee ID:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${employee.employeeId}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Email:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${employee.email}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Password:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${password}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Department:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${employee.department}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Campus:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${employee.campus}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;"><strong>Role:</strong></td>
          <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${employee.roleDisplayName}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-bottom: 20px;">
      <a href="${loginUrl}" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Your Account</a>
    </div>

    <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
      <p style="margin: 0; color: #e65100;"><strong>Important:</strong> Please change your password after your first login for security reasons.</p>
    </div>

    <div style="text-align: center; color: #666; font-size: 12px; margin-top: 20px;">
      <p>This is an automated message, please do not reply to this email.</p>
      <p>© ${new Date().getFullYear()} PYDAH Faculty LMS. All rights reserved.</p>
    </div>
  </div>
`;

module.exports = {
  getEmployeeCredentialsTemplate
}; 
 