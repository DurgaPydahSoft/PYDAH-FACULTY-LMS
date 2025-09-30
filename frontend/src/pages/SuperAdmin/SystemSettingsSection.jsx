import React, { useState } from 'react';
import { FaCog, FaDatabase, FaShieldAlt, FaBell, FaInfoCircle } from 'react-icons/fa';

const SystemSettingsSection = () => {
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    emailNotifications: true,
    autoBackup: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5
  });

  const handleSettingChange = (setting, value) => {
    setSystemSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSaveSettings = () => {
    // Here you would typically send the settings to the backend
    console.log('Saving system settings:', systemSettings);
    // You could add a toast notification here
  };

  return (
    <div className="p-6 mt-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
          <FaCog className="text-primary" /> System Settings
        </h2>
        <button
          onClick={handleSaveSettings}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          Save Settings
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
            <FaShieldAlt className="text-primary" /> Security Settings
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Maintenance Mode</h4>
                <p className="text-sm text-gray-600">Enable maintenance mode to restrict system access</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.maintenanceMode}
                  onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Max Login Attempts</h4>
                <p className="text-sm text-gray-600">Maximum failed login attempts before account lockout</p>
              </div>
              <input
                type="number"
                min="3"
                max="10"
                value={systemSettings.maxLoginAttempts}
                onChange={(e) => handleSettingChange('maxLoginAttempts', parseInt(e.target.value))}
                className="w-20 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Session Timeout (minutes)</h4>
                <p className="text-sm text-gray-600">Auto logout after inactivity</p>
              </div>
              <input
                type="number"
                min="15"
                max="120"
                value={systemSettings.sessionTimeout}
                onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                className="w-20 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
            <FaBell className="text-primary" /> Notification Settings
          </h3>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Email Notifications</h4>
                <p className="text-sm text-gray-600">Send email notifications for system events</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.emailNotifications}
                  onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Auto Backup</h4>
                <p className="text-sm text-gray-600">Automatically backup system data daily</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.autoBackup}
                  onChange={(e) => handleSettingChange('autoBackup', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 lg:col-span-2">
          <h3 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
            <FaInfoCircle className="text-primary" /> System Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-1">System Version</h4>
              <p className="text-blue-700 text-sm">v1.0.0</p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-1">Database Status</h4>
              <p className="text-green-700 text-sm">Connected</p>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-900 mb-1">Last Backup</h4>
              <p className="text-yellow-700 text-sm">2 hours ago</p>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-medium text-purple-900 mb-1">Uptime</h4>
              <p className="text-purple-700 text-sm">99.9%</p>
            </div>
          </div>
        </div>

        {/* Database Management */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 lg:col-span-2">
          <h3 className="text-xl font-semibold text-primary mb-4 flex items-center gap-2">
            <FaDatabase className="text-primary" /> Database Management
          </h3>
          
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors">
              Create Backup
            </button>
            <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">
              Restore Backup
            </button>
            <button className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors">
              Optimize Database
            </button>
            <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors">
              Clear Cache
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettingsSection;
