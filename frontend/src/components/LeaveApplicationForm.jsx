import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import config from '../config';

const API_BASE_URL = config.API_BASE_URL;

const LEAVE_TYPES = [
  { code: 'CL', label: 'CL' },
  { code: 'CCL', label: 'CCL' },
  { code: 'OD', label: 'OD' },
  
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7];

const LeaveApplicationForm = ({ onSubmit, onClose, employee, loading }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    leaveType: '',
    isHalfDay: false,
    session: '',
    startDate: '',
    endDate: '',
    reason: '',
    alternateSchedule: [],
    employeeId: employee?._id || '',
    employeeModel: 'Employee',
    department: employee?.department || '',
    campus: employee?.campus || ''
  });
  const [facultyList, setFacultyList] = useState([]);
  const [error, setError] = useState('');
  const [leaveBalance, setLeaveBalance] = useState({ leaveBalance: 0, cclBalance: 0 });
  const [currentDay, setCurrentDay] = useState(0);
  const [selectedPeriods, setSelectedPeriods] = useState({});
  const [showPeriodForm, setShowPeriodForm] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState({
    periodNumber: '',
    substituteFaculty: '',
    assignedClass: ''
  });
  const [showFacultySearch, setShowFacultySearch] = useState(false);
  const [facultySearchQuery, setFacultySearchQuery] = useState('');

  // Fetch leave balance
  useEffect(() => {
    const fetchLeaveBalance = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/employee/leave-balance`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch leave balance');
        const data = await response.json();
        setLeaveBalance(data);
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to fetch leave balance');
      }
    };
    fetchLeaveBalance();
  }, []);

  // Fetch faculty list
  useEffect(() => {
    const fetchFaculty = async () => {
      if (!employee) {
        console.log('Employee data not available yet');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/employee/faculty-list/${employee.campus}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch faculty list');
        const data = await response.json();
        setFacultyList(data.filter(f => 
          f.campus === employee.campus && 
          f._id !== employee._id
        ));
      } catch (error) {
        console.error('Error:', error);
        toast.error('Failed to fetch faculty list');
      }
    };
    fetchFaculty();
  }, [employee]);

  const getMaxEndDate = (startDate) => {
    if (!startDate) return '';
    const start = new Date(startDate);
    const maxEnd = new Date(start);
    // Remove day limits - employees can request any number of days
    // The principal will decide the final approved dates
    maxEnd.setDate(start.getDate() + 365); // Allow up to 1 year for flexibility
    return maxEnd.toISOString().split('T')[0];
  };

  // Calculate min selectable date (15 days before today)
  const getMinStartDate = () => {
    const today = new Date();
    today.setDate(today.getDate() - 15);
    return today.toISOString().split('T')[0];
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'isHalfDay') {
      setFormData(prev => ({
        ...prev,
        isHalfDay: checked,
        session: '',
        startDate: '',
        endDate: '',
        numberOfDays: 0,
        alternateSchedule: []
      }));
      setCurrentDay(0);
      setSelectedPeriods({});
    } else if (name === 'session') {
      setFormData(prev => ({
        ...prev,
        session: value
      }));
    } else if (name === 'startDate') {
      // If endDate is out of new range, reset it
      const maxEnd = getMaxEndDate(value);
      let newEndDate = formData.endDate;
      if (newEndDate && (newEndDate < value || newEndDate > maxEnd)) {
        newEndDate = '';
      }
      setFormData(prev => ({
        ...prev,
        startDate: value,
        endDate: newEndDate
      }));
    } else if (name === 'endDate') {
      const startDate = formData.startDate;
      if (value < startDate) {
        toast.error('End date cannot be before start date');
        return;
      }
      setFormData(prev => ({ ...prev, endDate: value }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handlePeriodInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentPeriod(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getAvailablePeriods = () => {
    const usedPeriods = selectedPeriods[currentDay] || [];
    let availablePeriods = PERIODS.filter(p => !usedPeriods.includes(p));
    
    // Filter periods based on session for half-day leave
    if (formData.isHalfDay) {
      availablePeriods = availablePeriods.filter(p => 
        formData.session === 'morning' ? p <= 4 : p >= 5
      );
    }
    
    return availablePeriods;
  };

  const handleAddPeriod = () => {
    if (!currentPeriod.periodNumber || !currentPeriod.substituteFaculty || !currentPeriod.assignedClass) {
      toast.error('Please fill all period details');
      return;
    }

    // Check if period is already assigned
    if (selectedPeriods[currentDay]?.includes(parseInt(currentPeriod.periodNumber))) {
      toast.error('This period is already assigned');
      return;
    }

    const periodNumber = parseInt(currentPeriod.periodNumber);

    // Update form data with new period
    setFormData(prev => {
      const newSchedule = [...prev.alternateSchedule];
      const daySchedule = newSchedule[currentDay];
      
      // Check if period already exists
      const existingPeriodIndex = daySchedule.periods.findIndex(p => p.periodNumber === periodNumber);
      
      if (existingPeriodIndex === -1) {
        // Add new period
        daySchedule.periods.push({
          periodNumber,
          substituteFaculty: currentPeriod.substituteFaculty,
          assignedClass: currentPeriod.assignedClass
        });
      }
      
      return { ...prev, alternateSchedule: newSchedule };
    });

    // Update selected periods
    setSelectedPeriods(prev => {
      const currentDayPeriods = prev[currentDay] || [];
      if (!currentDayPeriods.includes(periodNumber)) {
        return {
          ...prev,
          [currentDay]: [...currentDayPeriods, periodNumber]
        };
      }
      return prev;
    });

    // Reset form and hide it
    setCurrentPeriod({
      periodNumber: '',
      substituteFaculty: '',
      assignedClass: ''
    });
    setShowPeriodForm(false);
  };

  const handleRemovePeriod = (periodNumber) => {
    setFormData(prev => {
      const newSchedule = [...prev.alternateSchedule];
      newSchedule[currentDay].periods = newSchedule[currentDay].periods
        .filter(p => p.periodNumber !== periodNumber);
      return { ...prev, alternateSchedule: newSchedule };
    });

    setSelectedPeriods(prev => ({
      ...prev,
      [currentDay]: prev[currentDay].filter(p => p !== periodNumber)
    }));
  };

  const handleNextDay = async () => {
    if (formData.alternateSchedule[currentDay].periods.length === 0) {
      toast.error('Please add at least one period');
      return;
    }

    try {
      // Validate faculty availability for the current day
      const token = localStorage.getItem('token');
      const currentDaySchedule = formData.alternateSchedule[currentDay];
      
      // Check availability for each assigned faculty
      for (const period of currentDaySchedule.periods) {
        const response = await fetch(`${API_BASE_URL}/employee/check-faculty-availability`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            facultyId: period.substituteFaculty,
            date: currentDaySchedule.date,
            periods: [period.periodNumber]
          })
        });

        if (!response.ok) {
          const data = await response.json();
          toast.error(data.message || 'Failed to validate faculty availability');
          return;
        }
      }

      setCurrentDay(prev => prev + 1);
      setShowPeriodForm(false);
    } catch (error) {
      console.error('Error validating schedule:', error);
      toast.error('Failed to validate schedule');
    }
  };

  const handlePreviousDay = () => {
    setCurrentDay(prev => prev - 1);
    setShowPeriodForm(false);
  };

  const validateBasicDetails = () => {
    if (!formData.leaveType) return 'Please select leave type';
    if (!formData.startDate) return 'Please select start date';
    if (!formData.isHalfDay && !formData.endDate) return 'Please select end date';
    if (formData.isHalfDay && !formData.session) return 'Please select session for half-day leave';
    if (!formData.reason) return 'Please provide a reason';
    return null;
  };

  const handleNextStep = () => {
    const error = validateBasicDetails();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      // Check CCL balance if leave type is CCL
      if (formData.leaveType === 'CCL') {
        const requestedDays = formData.isHalfDay ? 0.5 : 
          Math.ceil((new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24)) + 1;
        
        if (requestedDays > leaveBalance.cclBalance) {
          toast.error(`Insufficient CCL balance. Available: ${leaveBalance.cclBalance} days, Requested: ${requestedDays} days`);
          return;
        }
      }

      // For half-day leave
      if (formData.isHalfDay) {
        // Ensure end date is same as start date
        const updatedFormData = {
          ...formData,
          endDate: formData.startDate,
          numberOfDays: 0.5,
          alternateSchedule: [{
            date: formData.startDate,
            periods: []
          }]
        };
        
        console.log('Updating form data for half-day leave:', updatedFormData);
        setFormData(updatedFormData);
        setCurrentDay(0);
        setSelectedPeriods({});
        setStep(2);
        return;
      }

      // For full-day leave
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const dates = [];
      const currentDate = new Date(start);
      
      while (currentDate <= end) {
        dates.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const updatedFormData = {
        ...formData,
        numberOfDays: Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
        alternateSchedule: dates.map(date => ({
          date: date,
          periods: []
        }))
      };

      console.log('Updating form data for full-day leave:', updatedFormData);
      setFormData(updatedFormData);
      setCurrentDay(0);
      setSelectedPeriods({});
    setStep(2);
    } catch (error) {
      console.error('Error in handleNextStep:', error);
      toast.error('An error occurred while processing your request');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentDay < formData.alternateSchedule.length - 1) {
      toast.error('Please complete alternate schedule for all days');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // Calculate number of days
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      
      // Format dates and schedule data
      const formattedData = {
        ...formData,
        employeeId: employee._id,
        employeeModel: 'Employee',
        department: employee.department,
        campus: employee.campus,
        startDate: formData.startDate,
        endDate: formData.endDate,
        numberOfDays: formData.isHalfDay ? 0.5 : numberOfDays,
        alternateSchedule: formData.alternateSchedule.map(day => ({
          date: day.date,
          periods: day.periods.map(period => ({
            periodNumber: parseInt(period.periodNumber),
            substituteFaculty: period.substituteFaculty,
            assignedClass: period.assignedClass
          }))
        }))
      };

      // Debug log
      console.log('Submitting leave request with data:', formattedData);

      const response = await fetch(`${API_BASE_URL}/employee/leave-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formattedData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.msg || 'Failed to submit leave request');
      }

      const data = await response.json();
      toast.success('Leave request submitted successfully');
      onSubmit(data.leaveRequest);
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast.error(error.message || 'Failed to submit leave request');
    }
  };

  // Add this function after the existing useEffect hooks
  const filteredFacultyList = facultyList.filter(faculty => 
    faculty.name.toLowerCase().includes(facultySearchQuery.toLowerCase()) ||
    faculty.department.toLowerCase().includes(facultySearchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-3 sm:p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-primary">Apply for Leave</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1 flex items-center">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-accent rounded-full mr-1.5 sm:mr-2 animate-pulse"></span>
                {step === 1 ? 'Step 1: Basic Details' : 'Step 2: Alternate Schedule'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors p-1">
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {step === 1 ? (
            /* Step 1: Basic Details */
            <div className="space-y-4 sm:space-y-6">
              {/* Leave Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Leave Type
                  </label>
                  <select
                    name="leaveType"
                    value={formData.leaveType}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 text-sm sm:text-base"
                    required
                  >
                    <option value="">Select Leave Type</option>
                    {LEAVE_TYPES.map(type => (
                      <option key={type.code} value={type.code}>{type.label}</option>
                    ))}
                  </select>
                  {formData.leaveType && (
                    <div className="mt-2">
                      {formData.leaveType === 'CCL' ? (
                        <div className={`text-xs sm:text-sm ${leaveBalance.cclBalance <= 0 ? 'text-red-500' : leaveBalance.cclBalance < 1 ? 'text-yellow-500' : 'text-green-500'} flex items-center`}>
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Available CCL Balance: <strong>{leaveBalance.cclBalance}</strong> days
                          {formData.isHalfDay && (
                            <span className="block text-xs mt-1">
                              (Half-day leave will use 0.5 days)
                            </span>
                          )}
                        </div>
                      ) : formData.leaveType === 'CL' ? (
                        <div className={`text-xs sm:text-sm ${leaveBalance.leaveBalance <= 0 ? 'text-red-500' : leaveBalance.leaveBalance < 4 ? 'text-yellow-500' : 'text-green-500'} flex items-center`}>
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Available Casual Leave Balance: <strong>{leaveBalance.leaveBalance}</strong> days
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isHalfDay"
                    name="isHalfDay"
                    checked={formData.isHalfDay}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isHalfDay" className="ml-2 block text-sm text-gray-700 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Half Day Leave
                  </label>
                </div>
              </div>

              {/* Session Selection for Half Day */}
              {formData.isHalfDay && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Session
                  </label>
                  <select
                    name="session"
                    value={formData.session}
                    onChange={handleInputChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 text-sm sm:text-base"
                    required
                  >
                    <option value="">Select Session</option>
                    <option value="morning">Morning Session (Periods 1-4)</option>
                    <option value="afternoon">Afternoon Session (Periods 5-7)</option>
                  </select>
                </div>
              )}

              {/* Date Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formData.isHalfDay ? 'Date' : 'Start Date'}
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    min={getMinStartDate()}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 text-sm sm:text-base"
                    required
                  />
                </div>
                {!formData.isHalfDay && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      value={formData.endDate}
                      onChange={handleInputChange}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      max={getMaxEndDate(formData.startDate)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 text-sm sm:text-base"
                      required
                      disabled={!formData.startDate}
                    />
                    {formData.startDate && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        End date can be at most {employee?.specialPermission ? (employee?.specialLeaveMaxDays ?? 20) : '2'} days after start date.
                        {/* Debug: Show current specialLeaveMaxDays value */}
                        {employee?.specialPermission && (
                          <span className="ml-2 text-blue-500">[Special Max Days: {employee?.specialLeaveMaxDays}]</span>
                        )}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                  <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  Reason for Leave
                </label>
                <textarea
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows="3"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 text-sm sm:text-base"
                  placeholder="Please provide detailed reason for your leave request"
                  required
                />
              </div>

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4">
              <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
                >
                  Next: Alternate Schedule
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                
              </div>
            </div>
          ) : (
            /* Step 2: Alternate Schedule */
            <div className="space-y-4 sm:space-y-6">
              {/* Current Day Info */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h3 className="text-base sm:text-lg font-medium text-gray-900 flex items-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Day {currentDay + 1} of {formData.alternateSchedule.length}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1 flex items-center">
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {new Date(formData.alternateSchedule[currentDay].date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              {/* Added Periods List */}
              <div className="space-y-3 sm:space-y-4">
                {formData.alternateSchedule[currentDay].periods.map((period, idx) => (
                  <div key={idx} className="bg-white border rounded-lg p-3 sm:p-4 flex justify-between items-center hover:shadow-md transition-shadow">
                    <div>
                      <h4 className="font-medium flex items-center text-sm sm:text-base">
                        <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Period {period.periodNumber}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-500 flex items-center mt-1">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Faculty: {facultyList.find(f => f._id === period.substituteFaculty)?.name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500 flex items-center mt-1">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-2 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Class: {period.assignedClass}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePeriod(period.periodNumber)}
                      className="text-red-600 hover:text-red-800 transition-colors p-1"
                    >
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Period Form */}
              {!showPeriodForm ? (
                <button
                  type="button"
                  onClick={() => setShowPeriodForm(true)}
                  className="w-full py-2 px-4 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Period
                </button>
              ) : (
                <div className="border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Period
                    </label>
                    <select
                      name="periodNumber"
                      value={currentPeriod.periodNumber}
                      onChange={handlePeriodInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 text-sm sm:text-base"
                      required
                    >
                      <option value="">Select Period</option>
                      {getAvailablePeriods().map(period => (
                        <option key={period} value={period}>Period {period}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Substitute Faculty
                    </label>
                    <div className="relative">
                      <div 
                        onClick={() => setShowFacultySearch(!showFacultySearch)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 text-sm sm:text-base cursor-pointer bg-white p-2 flex items-center justify-between"
                      >
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          {currentPeriod.substituteFaculty ? 
                            facultyList.find(f => f._id === currentPeriod.substituteFaculty)?.name + ' - ' + 
                            facultyList.find(f => f._id === currentPeriod.substituteFaculty)?.department : 
                            'Select Faculty'}
                        </span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      
                      {showFacultySearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                          <div className="p-2 border-b border-gray-200">
                            <input
                              type="text"
                              value={facultySearchQuery}
                              onChange={(e) => setFacultySearchQuery(e.target.value)}
                              placeholder="Search faculty..."
                              className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {filteredFacultyList.length > 0 ? (
                              filteredFacultyList.map(faculty => (
                                <div
                                  key={faculty._id}
                                  onClick={() => {
                                    setCurrentPeriod(prev => ({ ...prev, substituteFaculty: faculty._id }));
                                    setShowFacultySearch(false);
                                    setFacultySearchQuery('');
                                  }}
                                  className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                                >
                                  <div className="font-medium">{faculty.name}</div>
                                  <div className="text-gray-500 text-xs">{faculty.department}</div>
                                </div>
                              ))
                            ) : (
                              <div className="p-2 text-gray-500 text-sm text-center">No faculty found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Assigned Class
                    </label>
                    <input
                      type="text"
                      name="assignedClass"
                      value={currentPeriod.assignedClass}
                      onChange={handlePeriodInputChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 pl-10 text-sm sm:text-base"
                      placeholder="Enter class (e.g. CSE-A)"
                      required
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <button
                      type="button"
                      onClick={handleAddPeriod}
                      className="w-full sm:w-auto flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add Period
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPeriodForm(false);
                        setCurrentPeriod({
                          periodNumber: '',
                          substituteFaculty: '',
                          assignedClass: ''
                        });
                      }}
                      className="w-full sm:w-auto flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex flex-col sm:flex-row justify-between pt-4 border-t space-y-2 sm:space-y-0">
                <div>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Details
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                  {currentDay > 0 && (
                    <button
                      type="button"
                      onClick={handlePreviousDay}
                      className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      Previous Day
                    </button>
                  )}
                  {currentDay < formData.alternateSchedule.length - 1 ? (
                    <button
                      type="button"
                      onClick={handleNextDay}
                      className="w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
                    >
                      Next Day
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full sm:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center ${
                        loading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Leave Request
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LeaveApplicationForm; 