import React from 'react';
import { MdOutlineWorkHistory } from 'react-icons/md';

const EmployeeCCLWorkHistorySection = ({ cclWorkHistory }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4 sm:mb-6">
        <MdOutlineWorkHistory className="text-primary text-xl" />
        <h2 className="text-lg sm:text-xl font-semibold text-primary">CCL Work History</h2>
      </div>
      <div className="overflow-x-auto hidden sm:block">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Assigned By</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">HOD Remarks</th>
              <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Principal Remarks</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {cclWorkHistory && cclWorkHistory.length > 0 ? (
              cclWorkHistory.map((work) => (
                <tr key={work._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{work.date ? new Date(work.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{work.assignedTo || '-'}</td>
                  <td className="px-6 py-4">{work.reason || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${work.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                        work.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>{work.status || 'Pending'}</span>
                  </td>
                  <td className="px-6 py-4">{work.hodRemarks || '-'}</td>
                  <td className="px-6 py-4">{work.principalRemarks || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No CCL work history found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="sm:hidden space-y-3">
        {cclWorkHistory && cclWorkHistory.length > 0 ? (
          cclWorkHistory.map((work) => (
            <div key={work._id} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{work.assignedTo || 'Unassigned'}</h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {work.date ? new Date(work.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'No date'}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ml-2 flex-shrink-0
                  ${work.status === 'Approved' ? 'bg-green-100 text-green-800' : 
                    work.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                    'bg-yellow-100 text-yellow-800'}`}>{work.status || 'Pending'}</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Reason</p>
                  <p className="text-sm text-gray-900 leading-5">{work.reason || 'No reason provided'}</p>
                </div>
                {work.hodRemarks && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">HOD Remarks</p>
                    <p className="text-sm text-gray-900 leading-5">{work.hodRemarks}</p>
                  </div>
                )}
                {work.principalRemarks && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Principal Remarks</p>
                    <p className="text-sm text-gray-900 leading-5">{work.principalRemarks}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <MdOutlineWorkHistory className="text-gray-300 text-4xl mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No CCL work history found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeCCLWorkHistorySection;


