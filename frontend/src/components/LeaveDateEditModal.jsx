import React, { useState, useEffect } from 'react';

const LeaveDateEditModal = ({ 
  isOpen, 
  onClose, 
  leaveRequest, 
  onApprove, 
  onReject,
  action // 'approve' or 'reject' - determines which button to show
}) => {
  const [formData, setFormData] = useState({
    approvedStartDate: '',
    approvedEndDate: '',
    approvedNumberOfDays: 0,
    modificationReason: '',
    remarks: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (leaveRequest && isOpen) {
      // Initialize with original dates
      setFormData({
        approvedStartDate: leaveRequest.startDate,
        approvedEndDate: leaveRequest.endDate,
        approvedNumberOfDays: leaveRequest.numberOfDays,
        modificationReason: '',
        remarks: ''
      });
      setErrors({});
    }
  }, [leaveRequest, isOpen]);

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleDateChange = (field, value) => {
    const newFormData = { ...formData, [field]: value };
    
    if (field === 'approvedStartDate' || field === 'approvedEndDate') {
      const startDate = field === 'approvedStartDate' ? value : newFormData.approvedStartDate;
      const endDate = field === 'approvedEndDate' ? value : newFormData.approvedEndDate;
      
      if (startDate && endDate) {
        const calculatedDays = calculateDays(startDate, endDate);
        newFormData.approvedNumberOfDays = calculatedDays;
      }
    }
    
    setFormData(newFormData);
    
    // Clear errors for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.approvedStartDate) {
      newErrors.approvedStartDate = 'Start date is required';
    }

    if (!formData.approvedEndDate) {
      newErrors.approvedEndDate = 'End date is required';
    }

    if (formData.approvedStartDate && formData.approvedEndDate) {
      const startDate = new Date(formData.approvedStartDate);
      const endDate = new Date(formData.approvedEndDate);
      
      if (endDate < startDate) {
        newErrors.approvedEndDate = 'End date cannot be before start date';
      }
      
      if (formData.approvedNumberOfDays < 0.5) {
        newErrors.approvedNumberOfDays = 'Number of days must be at least 0.5';
      }
    }

    // Check if dates were modified
    const isModified = 
      formData.approvedStartDate !== leaveRequest.startDate ||
      formData.approvedEndDate !== leaveRequest.endDate ||
      formData.approvedNumberOfDays !== leaveRequest.numberOfDays;

    if (isModified && !formData.modificationReason.trim()) {
      newErrors.modificationReason = 'Please provide a reason for modifying the dates';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (action) => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const isModified = 
        formData.approvedStartDate !== leaveRequest.startDate ||
        formData.approvedEndDate !== leaveRequest.endDate ||
        formData.approvedNumberOfDays !== leaveRequest.numberOfDays;

      const requestData = {
        action,
        remarks: formData.remarks,
        ...(isModified && {
          approvedStartDate: formData.approvedStartDate,
          approvedEndDate: formData.approvedEndDate,
          approvedNumberOfDays: formData.approvedNumberOfDays,
          modificationReason: formData.modificationReason
        })
      };

      if (action === 'approve') {
        await onApprove(requestData);
      } else {
        await onReject(requestData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error submitting leave request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !leaveRequest) return null;

  const isModified = 
    formData.approvedStartDate !== leaveRequest.startDate ||
    formData.approvedEndDate !== leaveRequest.endDate ||
    formData.approvedNumberOfDays !== leaveRequest.numberOfDays;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-3 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-primary">
            {action === 'reject' ? 'Review & Reject Leave Request' : 'Review & Approve Leave Request'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
            disabled={isSubmitting}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Employee Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Employee Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{leaveRequest.employee?.name || leaveRequest.employeeName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Employee ID</p>
                <p className="font-medium">{leaveRequest.employee?.employeeId || leaveRequest.employeeEmployeeId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Department</p>
                <p className="font-medium">{leaveRequest.employee?.department?.name || leaveRequest.employeeDepartment}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Leave Type</p>
                <p className="font-medium">{leaveRequest.leaveType}</p>
              </div>
            </div>
          </div>

          {/* Original Request */}
          <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
            <h4 className="font-semibold text-gray-900 mb-2">Original Request</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-gray-600">Start Date</p>
                <p className="font-medium">{new Date(leaveRequest.startDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">End Date</p>
                <p className="font-medium">{new Date(leaveRequest.endDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Number of Days</p>
                <p className="font-medium">{leaveRequest.numberOfDays}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Reason</p>
                <p className="font-medium">{leaveRequest.reason}</p>
              </div>
            </div>
          </div>

          {/* Date Modification Section */}
          <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
            <h4 className="font-semibold text-gray-900 mb-2">Modify Leave Dates (Optional)</h4>
            <p className="text-sm text-gray-600 mb-3">
              You can modify the leave dates if needed. Leave balance will be deducted based on the approved dates.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approved Start Date
                </label>
                <input
                  type="date"
                  value={formData.approvedStartDate}
                  onChange={(e) => handleDateChange('approvedStartDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.approvedStartDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.approvedStartDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.approvedStartDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Approved End Date
                </label>
                <input
                  type="date"
                  value={formData.approvedEndDate}
                  onChange={(e) => handleDateChange('approvedEndDate', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.approvedEndDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.approvedEndDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.approvedEndDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Days
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={formData.approvedNumberOfDays}
                  onChange={(e) => setFormData(prev => ({ ...prev, approvedNumberOfDays: parseFloat(e.target.value) || 0 }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.approvedNumberOfDays ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.approvedNumberOfDays && (
                  <p className="text-red-500 text-xs mt-1">{errors.approvedNumberOfDays}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modification Reason (Required if dates are modified)
                </label>
                <textarea
                  value={formData.modificationReason}
                  onChange={(e) => setFormData(prev => ({ ...prev, modificationReason: e.target.value }))}
                  placeholder="Explain why you are modifying the leave dates..."
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.modificationReason ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows="2"
                  disabled={isSubmitting}
                />
                {errors.modificationReason && (
                  <p className="text-red-500 text-xs mt-1">{errors.modificationReason}</p>
                )}
              </div>
            </div>

            {isModified && (
              <div className="mt-3 p-3 bg-orange-100 border border-orange-300 rounded-md">
                <p className="text-sm text-orange-800">
                  <strong>Note:</strong> You have modified the leave dates. The employee will be notified of the changes.
                </p>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remarks (Optional)
            </label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
              placeholder="Add any additional remarks..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              disabled={isSubmitting}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            {/* Only show reject button if action is 'reject' or action is not specified (show both) */}
            {(action === 'reject' || !action) && (
              <button
                onClick={() => handleSubmit('reject')}
                className="px-4 py-2 text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Rejecting...' : 'Reject'}
              </button>
            )}
            {/* Only show approve button if action is 'approve' or action is not specified (show both) */}
            {(action === 'approve' || !action) && (
              <button
                onClick={() => handleSubmit('approve')}
                className="px-4 py-2 text-white bg-green-500 rounded-md hover:bg-green-600 transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Approving...' : 'Approve'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveDateEditModal; 