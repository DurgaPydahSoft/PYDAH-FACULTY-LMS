import React from 'react';
import { FaHistory, FaTrash } from 'react-icons/fa';

const EmployeeLeaveHistorySection = ({ leaveHistory, onSelect, onDelete }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <FaHistory className="text-primary text-xl" />
        <h2 className="text-lg sm:text-xl font-semibold text-primary">Leave History</h2>
      </div>
      <div className="overflow-x-auto hidden sm:block">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Leave Type</th>
              <th className="px-4 py-2 text-left">Start Date</th>
              <th className="px-4 py-2 text-left">End Date</th>
              <th className="px-4 py-2 text-left">Days</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Applied On</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaveHistory.map((leave) => (
              <tr
                key={leave._id}
                className="border-t cursor-pointer hover:bg-blue-50 transition"
                onClick={() => onSelect(leave)}
              >
                <td className="px-4 py-2">{leave.leaveType}</td>
                <td className="px-4 py-2">
                  {leave.isModifiedByPrincipal ? (
                    <div>
                      <div className="text-xs text-gray-500 line-through">{new Date(leave.startDate).toLocaleDateString()}</div>
                      <div className="font-medium">{new Date(leave.approvedStartDate).toLocaleDateString()}</div>
                    </div>
                  ) : (
                    new Date(leave.startDate).toLocaleDateString()
                  )}
                </td>
                <td className="px-4 py-2">
                  {leave.isModifiedByPrincipal ? (
                    <div>
                      <div className="text-xs text-gray-500 line-through">{new Date(leave.endDate).toLocaleDateString()}</div>
                      <div className="font-medium">{new Date(leave.approvedEndDate).toLocaleDateString()}</div>
                    </div>
                  ) : (
                    new Date(leave.endDate).toLocaleDateString()
                  )}
                </td>
                <td className="px-4 py-2">
                  {leave.isModifiedByPrincipal ? (
                    <div>
                      <div className="text-xs text-gray-500 line-through">{leave.numberOfDays}</div>
                      <div className="font-medium">{leave.approvedNumberOfDays}</div>
                    </div>
                  ) : (
                    leave.numberOfDays
                  )}
                </td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                    ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      leave.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'}`}>
                    {leave.status}
                    {leave.isModifiedByPrincipal && leave.status === 'Approved' && (
                      <span className="ml-1 text-yellow-600">✏️</span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-2">{new Date(leave.appliedOn).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  {leave.status === 'Pending' && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDelete(leave); }}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Delete Leave Request"
                    >
                      <FaTrash />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden space-y-3">
        {leaveHistory.length > 0 ? (
          leaveHistory.map((leave) => (
            <div key={leave._id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors" onClick={() => onSelect(leave)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{leave.leaveType}</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    Applied: {new Date(leave.appliedOn).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ml-2 flex-shrink-0
                  ${leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    leave.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                    leave.status === 'Forwarded by HOD' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'}`}>
                  {leave.status}
                  {leave.isModifiedByPrincipal && leave.status === 'Approved' && (
                    <span className="ml-1 text-yellow-600">✏️</span>
                  )}
                </span>
              </div>
              {leave.status === 'Pending' && (
                <div className="mb-3">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(leave); }}
                    className="inline-flex items-center gap-2 text-xs text-red-600 hover:text-red-700"
                  >
                    <FaTrash /> Delete request
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {leave.isModifiedByPrincipal ? (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Duration</p>
                    <div className="text-sm">
                      <div className="text-gray-500 line-through text-xs">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()} ({leave.numberOfDays} days)
                      </div>
                      <div className="font-medium text-gray-800">
                        {new Date(leave.approvedStartDate).toLocaleDateString()} - {new Date(leave.approvedEndDate).toLocaleDateString()} ({leave.approvedNumberOfDays} days)
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Duration</p>
                    <p className="text-sm text-gray-800">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()} ({leave.numberOfDays} days)
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Reason</p>
                  <p className="text-sm text-gray-900 leading-5 line-clamp-2">{leave.reason || 'No reason provided'}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <FaHistory className="text-gray-300 text-4xl mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No leave history available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeLeaveHistorySection;


