import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import config from '../config';

const API_BASE_URL = config.API_BASE_URL;

const LEAVE_TYPES = [
  { code: 'CL', label: 'Casual Leave (CL)' },
  { code: 'CCL', label: 'Compensatory Casual Leave (CCL)' },
  { code: 'OD', label: 'On Duty (OD)' },
];

const PERIODS = [1, 2, 3, 4, 5, 6, 7];

const LeaveApplicationForm = ({ onSubmit, onClose, employee }) => {
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
    campus: employee?.campus || '',
    selectedCCLDays: [],  // Add this new field for storing selected CCL days
    odTimeType: 'full',
    odStartTime: '',
    odEndTime: ''
  });

  // Add state for storing available CCL work days
  const [availableCCLDays, setAvailableCCLDays] = useState([]);
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch CCL work days when CCL is selected
  useEffect(() => {
    const fetchCCLWorkDays = async () => {
      if (formData.leaveType === 'CCL') {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/employee/ccl-work-history`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) throw new Error('Failed to fetch CCL work history');
          const result = await response.json();
          const list = result && result.data ? result.data : [];
          // Filter only approved and unused CCL work days
          const approvedWorkDays = list.filter(work => work.status === 'Approved' && !work.isUsed);
          setAvailableCCLDays(approvedWorkDays);
        } catch (error) {
          console.error('Error fetching CCL work days:', error);
          setError('Failed to fetch CCL work days');
        }
      }
    };

    fetchCCLWorkDays();
  }, [formData.leaveType]);

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
    maxEnd.setDate(start.getDate() + 365);
    return maxEnd.toISOString().split('T')[0];
  };

  const getMinStartDate = () => {
    const today = new Date();
    today.setDate(today.getDate() - 35);
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

  // Toggle selection of CCL work day (by its id)
  const handleToggleCCLDay = (dayId) => {
    setFormData(prev => {
      const selected = new Set(prev.selectedCCLDays || []);
      if (selected.has(dayId)) selected.delete(dayId);
      else selected.add(dayId);
      return { ...prev, selectedCCLDays: Array.from(selected) };
    });
  };

  const getAvailablePeriods = () => {
    const usedPeriods = selectedPeriods[currentDay] || [];
    let availablePeriods = PERIODS.filter(p => !usedPeriods.includes(p));

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

    if (selectedPeriods[currentDay]?.includes(parseInt(currentPeriod.periodNumber))) {
      toast.error('This period is already assigned');
      return;
    }

    const periodNumber = parseInt(currentPeriod.periodNumber);

    setFormData(prev => {
      const newSchedule = [...prev.alternateSchedule];
      const daySchedule = newSchedule[currentDay];

      const existingPeriodIndex = daySchedule.periods.findIndex(p => p.periodNumber === periodNumber);

      if (existingPeriodIndex === -1) {
        daySchedule.periods.push({
          periodNumber,
          substituteFaculty: currentPeriod.substituteFaculty,
          assignedClass: currentPeriod.assignedClass
        });
      }

      return { ...prev, alternateSchedule: newSchedule };
    });

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
      const token = localStorage.getItem('token');
      const currentDaySchedule = formData.alternateSchedule[currentDay];

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
      if (formData.leaveType === 'CCL') {
        const requestedDays = formData.isHalfDay ? 0.5 :
          Math.ceil((new Date(formData.endDate) - new Date(formData.startDate)) / (1000 * 60 * 60 * 24)) + 1;

        if (requestedDays > leaveBalance.cclBalance) {
          toast.error(`Insufficient CCL balance. Available: ${leaveBalance.cclBalance} days, Requested: ${requestedDays} days`);
          return;
        }
      }

      if (formData.isHalfDay) {
        const updatedFormData = {
          ...formData,
          endDate: formData.startDate,
          numberOfDays: 0.5,
          alternateSchedule: [{
            date: formData.startDate,
            periods: []
          }]
        };

        setFormData(updatedFormData);
        setCurrentDay(0);
        setSelectedPeriods({});
        setStep(2);
        return;
      }

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
    if (e) e.preventDefault();
    console.log('Form submission attempted', {
      formData,
      step,
      currentDay,
      alternateScheduleLength: formData.alternateSchedule.length,
      isSubmitting
    });

    // Basic validation
    if (!formData.leaveType) {
      console.log('Leave type missing');
      toast.error('Please select a leave type');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      console.log('Date fields missing');
      toast.error('Please select start and end dates');
      return;
    }

    if (!formData.reason) {
      console.log('Reason missing');
      toast.error('Please provide a reason for leave');
      return;
    }

    if (currentDay < formData.alternateSchedule.length - 1) {
      console.log('Validation failed: Incomplete alternate schedule', {
        currentDay,
        totalDays: formData.alternateSchedule.length
      });
      toast.error('Please complete alternate schedule for all days');
      return;
    }

    if (isSubmitting) {
      console.log('Already submitting, preventing double submission');
      return;
    }

    try {
      setIsSubmitting(true);
      console.log('Starting submission process...');

      const token = localStorage.getItem('token');

      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const numberOfDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

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

      // include selected CCL days when leave type is CCL
      if (formData.leaveType === 'CCL') {
        formattedData.selectedCCLDays = formData.selectedCCLDays || [];
      }

      // include OD time fields when leave type is OD
      if (formData.leaveType === 'OD') {
        // remove isHalfDay from generic path; set only for OD half-day
        delete formattedData.isHalfDay;
        formattedData.odTimeType = formData.odTimeType;
        if (formData.odTimeType === 'custom') {
          if (!formData.odStartTime || !formData.odEndTime) {
            toast.error('Please select start and end time for custom OD');
            setIsSubmitting(false);
            return;
          }
          formattedData.odStartTime = formData.odStartTime;
          formattedData.odEndTime = formData.odEndTime;
        }
        if (formData.odTimeType === 'half') {
          formattedData.isHalfDay = true;
        }
      }

      console.log('Sending request with data:', formattedData);

      const response = await fetch(`${API_BASE_URL}/employee/leave-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formattedData)
      });

      console.log('Got response:', response.status);

      if (!response.ok) {
        const data = await response.json();
        console.log('Server response not OK:', data);
        throw new Error(data.msg || 'Failed to submit leave request');
      }

      const data = await response.json();
      console.log('Leave request submitted successfully:', data);
      toast.success('Leave request submitted successfully');
      onSubmit(data.leaveRequest);
    } catch (error) {
      console.error('Error submitting leave request:', error);
      toast.error(error.message || 'Failed to submit leave request');
    } finally {
      console.log('Submission completed');
      setIsSubmitting(false);
    }
  };

  const filteredFacultyList = facultyList.filter(faculty =>
    faculty.name.toLowerCase().includes(facultySearchQuery.toLowerCase()) ||
    faculty.department.toLowerCase().includes(facultySearchQuery.toLowerCase())
  );

  const LeaveBalanceCard = ({ type, balance }) => {
    const getStatusColor = () => {
      if (balance <= 0) return 'text-red-600 bg-red-50 border-red-200';
      if (balance < (type === 'CCL' ? 5 : 3)) return 'text-yellow-600 bg-yellow-200 border-yellow-600';
      return 'text-primary bg-green-200 border-green-600';
    };

    return (
      <div className={`p-3 rounded-lg border ${getStatusColor()}`}>

        <div className="text-sm font-medium md:hidden">
          {type === 'CCL' ? 'CCL' : 'CL'}
        </div>


        <div className="text-sm font-medium hidden md:block">
          {type === 'CCL' ? 'Compensatory Casual Leave' : 'Casual Leave'}
        </div>

        <div className="text-lg font-bold">{balance} days</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-b from-primary to bg-gray-700 px-6 py-4 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold">Apply for Leave</h2>
                <p className="text-white/80 text-sm flex items-center">
                  <span className="w-2 h-2 bg-primary/30 rounded-full mr-2 animate-pulse"></span>
                  {step === 1 ? 'Step 1: Basic Details' : 'Step 2: Alternate Schedule'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-white/80 transition-colors p-1 rounded-lg hover:bg-white hover:bg-opacity-10"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mt-4">
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 1 ? 'bg-white text-primary' : 'bg-white bg-opacity-20 text-white'} font-medium`}>
                1
              </div>
              <div className={`w-16 h-1 mx-2 ${step >= 2 ? 'bg-white' : 'bg-white bg-opacity-20'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${step >= 2 ? 'bg-white text-primary' : 'bg-white bg-opacity-20 text-white'} font-medium`}>
                2
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form id="leaveApplicationForm" onSubmit={(e) => {
            e.preventDefault();
            console.log('Form submitted', step);
            if (step === 2) {
              handleSubmit(e);
            } else {
              handleNextStep();
            }
          }}>
            <div className="space-y-6">
              {step === 1 ? (
                /* Step 1: Basic Details */
                <div className="space-y-6">
                  {/* Leave Balance Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                    <LeaveBalanceCard type="CL" balance={leaveBalance.leaveBalance} />
                    <LeaveBalanceCard type="CCL" balance={leaveBalance.cclBalance} />
                  </div>

                  {/* Leave Type & Duration Section */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    {/* <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Leave Details
                    </h3> */}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Leave Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Leave Type *
                        </label>
                        <select
                          name="leaveType"
                          value={formData.leaveType}
                          onChange={handleInputChange}
                          disabled={isSubmitting}
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-3 px-4 border text-base disabled:opacity-50"
                          required
                        >
                          <option value="">Select Leave Type</option>
                          {LEAVE_TYPES.map(type => (
                            <option key={type.code} value={type.code}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Half Day Toggle (hidden for OD) */}
                      {formData.leaveType !== 'OD' && (
                        <div className="flex items-center justify-start lg:justify-end">
                          <div className="bg-white rounded-lg border border-gray-300 p-4">
                            <label className="flex items-center space-x-3 cursor-pointer">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  id="isHalfDay"
                                  name="isHalfDay"
                                  checked={formData.isHalfDay}
                                  onChange={handleInputChange}
                                  disabled={isSubmitting}
                                  className="sr-only"
                                />
                                <div className={`block w-12 h-6 rounded-full transition-colors ${formData.isHalfDay ? 'bg-primary' : 'bg-gray-300'
                                  }`}></div>
                                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.isHalfDay ? 'transform translate-x-6' : ''
                                  }`}></div>
                              </div>
                              <span className="text-sm font-medium text-gray-700">Half Day Leave</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Session Selection (Conditional) */}
                    {formData.isHalfDay && (
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Session *
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.session === 'morning'
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-300 hover:border-gray-400'
                            }`}>
                            <input
                              type="radio"
                              name="session"
                              value="morning"
                              checked={formData.session === 'morning'}
                              onChange={handleInputChange}
                              className="text-primary focus:ring-primary"
                            />
                            <div className="ml-3">
                              <div className="font-medium text-gray-900">Morning Session</div>
                              <div className="text-sm text-gray-500">Periods 1-4</div>
                            </div>
                          </label>
                          <label className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.session === 'afternoon'
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-300 hover:border-gray-400'
                            }`}>
                            <input
                              type="radio"
                              name="session"
                              value="afternoon"
                              checked={formData.session === 'afternoon'}
                              onChange={handleInputChange}
                              className="text-primary focus:ring-primary"
                            />
                            <div className="ml-3">
                              <div className="font-medium text-gray-900">Afternoon Session</div>
                              <div className="text-sm text-gray-500">Periods 5-7</div>
                            </div>
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* OD Time Selection */}
                  {formData.leaveType === 'OD' && (
                    <div className="bg-gray-50 rounded-lg p-5 mt-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        OD Time Selection
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name="odTimeType"
                              value="full"
                              checked={formData.odTimeType === 'full'}
                              onChange={handleInputChange}
                            />
                            <span>Full Day</span>
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name="odTimeType"
                              value="half"
                              checked={formData.odTimeType === 'half'}
                              onChange={(e) => {
                                handleInputChange(e);
                                setFormData(prev => ({ ...prev, isHalfDay: true }));
                              }}
                            />
                            <span>Half Day</span>
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="radio"
                              name="odTimeType"
                              value="custom"
                              checked={formData.odTimeType === 'custom'}
                              onChange={handleInputChange}
                            />
                            <span>Custom Time</span>
                          </label>
                        </div>
                        {formData.odTimeType === 'custom' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time (24h)</label>
                              <input
                                type="time"
                                name="odStartTime"
                                value={formData.odStartTime}
                                onChange={handleInputChange}
                                step="60"
                                className="w-full p-2 border rounded-md"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">End Time (24h)</label>
                              <input
                                type="time"
                                name="odEndTime"
                                value={formData.odEndTime}
                                onChange={handleInputChange}
                                step="60"
                                className="w-full p-2 border rounded-md"
                                required
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Date Selection Section */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Date Range
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {formData.isHalfDay ? 'Leave Date *' : 'Start Date *'}
                        </label>
                        <input
                          type="date"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleInputChange}
                          min={getMinStartDate()}
                          disabled={isSubmitting}
                          className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-3 px-4 border text-base disabled:opacity-50"
                          required
                        />
                      </div>

                      {!formData.isHalfDay && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date *
                          </label>
                          <input
                            type="date"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleInputChange}
                            min={formData.startDate || new Date().toISOString().split('T')[0]}
                            max={getMaxEndDate(formData.startDate)}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-3 px-4 border text-base disabled:opacity-50"
                            required
                            disabled={!formData.startDate || isSubmitting}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CCL Work Days Selection (only for CCL leave type) */}
                  {formData.leaveType === 'CCL' && (
                    <div className="bg-gray-50 rounded-lg p-5">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Select CCL Work Days to Use
                      </h3>

                      <p className="text-sm text-gray-600 mb-3">Your unused CCL days: <strong>{leaveBalance.cclBalance || 0}</strong></p>

                      {availableCCLDays && availableCCLDays.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
                          {availableCCLDays.map(day => (
                            <label key={day._id} className="flex items-center p-2 border rounded-lg bg-white">
                              <input
                                type="checkbox"
                                checked={(formData.selectedCCLDays || []).includes(day._id)}
                                onChange={() => handleToggleCCLDay(day._id)}
                                className="mr-3"
                              />
                              <div>
                                <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                                <div className="text-sm text-gray-500">{day.cclRequestId || ''} {day.reason ? `- ${day.reason}` : ''}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No approved unused CCL work days available.</div>
                      )}
                    </div>
                  )}

                  {/* Reason Section */}
                  <div className="bg-gray-50 rounded-lg p-5">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      Reason for Leave
                    </h3>

                    <textarea
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      rows="4"
                      disabled={isSubmitting}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-3 px-4 border text-base disabled:opacity-50"
                      placeholder="Please provide a detailed reason for your leave request..."
                      required
                    />
                  </div>

                </div>
              ) : (
                /* Step 2: Alternate Schedule */
                <div className="space-y-6">
                  {/* Day Navigation Header */}
                  <div className="bg-gradient-to-r from-primary/10 to-primary/20 rounded-lg p-5 border border-primary/20">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Day {currentDay + 1} of {formData.alternateSchedule.length}
                        </h3>
                        <p className="text-gray-600 mt-1 flex items-center">
                          <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                      {/* Day Navigation */}
                      <div className="flex items-center space-x-3 mt-3 sm:mt-0">
                        <button
                          type="button"
                          onClick={handlePreviousDay}
                          disabled={currentDay === 0 || isSubmitting}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                          </svg>
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={handleNextDay}
                          disabled={currentDay === formData.alternateSchedule.length - 1 || isSubmitting}
                          className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                          Next
                          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Current Periods */}
                  <div className="space-y-4">
                    <h4 className="text-md font-semibold text-gray-800 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Assigned Periods ({formData.alternateSchedule[currentDay].periods.length})
                    </h4>

                    {formData.alternateSchedule[currentDay].periods.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <p className="text-gray-500">No periods assigned yet</p>
                        <p className="text-sm text-gray-400 mt-1">Add your first period to continue</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {formData.alternateSchedule[currentDay].periods.map((period, idx) => (
                          <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-primary">
                                    Period {period.periodNumber}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePeriod(period.periodNumber)}
                                    disabled={isSubmitting}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center text-sm text-gray-600">
                                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                    {facultyList.find(f => f._id === period.substituteFaculty)?.name || 'Loading...'}
                                  </div>
                                  <div className="flex items-center text-sm text-gray-600">
                                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                    {period.assignedClass}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Period Form */}
                  {!showPeriodForm ? (
                    <button
                      type="button"
                      onClick={() => setShowPeriodForm(true)}
                      disabled={isSubmitting}
                      className="w-full py-4 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex flex-col items-center justify-center disabled:opacity-50"
                    >
                      <svg className="w-8 h-8 mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span className="font-medium">Add Period</span>
                      <span className="text-sm text-gray-500 mt-1">Assign substitute faculty for this day</span>
                    </button>
                  ) : (
                    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
                      <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center">
                        <svg className="w-4 h-4 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add New Period
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Period Selection */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Period *
                          </label>
                          <select
                            name="periodNumber"
                            value={currentPeriod.periodNumber}
                            onChange={handlePeriodInputChange}
                            disabled={isSubmitting}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-2.5 px-3 border text-base disabled:opacity-50"
                            required
                          >
                            <option value="">Select Period</option>
                            {getAvailablePeriods().map(period => (
                              <option key={period} value={period}>Period {period}</option>
                            ))}
                          </select>
                        </div>

                        {/* Faculty Selection */}
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Substitute Faculty *
                          </label>
                          <div className="relative">
                            <div
                              onClick={() => setShowFacultySearch(!showFacultySearch)}
                              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-2.5 px-3 border text-base cursor-pointer bg-white flex items-center justify-between"
                            >
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
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
                              <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                                <div className="p-3 border-b border-gray-200">
                                  <input
                                    type="text"
                                    value={facultySearchQuery}
                                    onChange={(e) => setFacultySearchQuery(e.target.value)}
                                    placeholder="Search faculty by name or department..."
                                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary text-sm"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <div>
                                  {filteredFacultyList.length > 0 ? (
                                    filteredFacultyList.map(faculty => (
                                      <div
                                        key={faculty._id}
                                        onClick={() => {
                                          setCurrentPeriod(prev => ({ ...prev, substituteFaculty: faculty._id }));
                                          setShowFacultySearch(false);
                                          setFacultySearchQuery('');
                                        }}
                                        className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                                      >
                                        <div className="font-medium text-gray-900">{faculty.name}</div>
                                        <div className="text-sm text-gray-500">{faculty.department}</div>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="p-3 text-gray-500 text-sm text-center">No faculty found</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Class Input */}
                        <div className="md:col-span-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Assigned Class *
                          </label>
                          <input
                            type="text"
                            name="assignedClass"
                            value={currentPeriod.assignedClass}
                            onChange={handlePeriodInputChange}
                            disabled={isSubmitting}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary focus:ring-primary py-2.5 px-3 border text-base disabled:opacity-50"
                            placeholder="Enter class (e.g. CSE-A, ECE-B)"
                            required
                          />
                        </div>
                      </div>

                      {/* Form Actions */}
                      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                        <button
                          type="button"
                          onClick={handleAddPeriod}
                          disabled={isSubmitting}
                          className="flex-1 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex items-center justify-center disabled:opacity-50"
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
                          disabled={isSubmitting}
                          className="flex-1 py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary flex items-center justify-center disabled:opacity-50"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer with Navigation */}
        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between space-y-3 sm:space-y-0 sm:space-x-4">
            <div>
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-50"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Details
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-50"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>

              {step === 1 ? (
                <button
                  type="submit"
                  form="leaveApplicationForm"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark flex items-center justify-center disabled:opacity-50"
                >
                  Continue to Schedule
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              ) : (
                <button
                  type="submit"
                  form="leaveApplicationForm"
                  disabled={isSubmitting || currentDay < formData.alternateSchedule.length - 1}
                  className={`w-full sm:w-auto px-6 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white flex items-center justify-center ${isSubmitting || currentDay < formData.alternateSchedule.length - 1
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Submit Leave Request
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

};

export default LeaveApplicationForm;