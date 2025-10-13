const LeaveList = ({ leaveRequests }) => {
  if (!leaveRequests.length) return <p>No leave requests yet.</p>;

  return (
    <div className="space-y-4">
      {leaveRequests.map((request) => {
        // Format the dates to show only the date part (e.g., YYYY-MM-DD)
        const startDate = new Date(request.startDate).toLocaleDateString();
        const endDate = new Date(request.endDate).toLocaleDateString();

        return (
          <div key={request._id} className="p-4 border-b border-gray-200">
            <p>
              <strong>Date:</strong> {startDate} to {endDate}
            </p>
            <p>
              <strong>Reason:</strong> {request.reason}
            </p>
            <p>
              <strong>Status:</strong> {request.status}
            </p>
            {request.leaveType === 'CL' && (
              <p>
                <strong>CL Days:</strong> {request.clDays ?? 0} &nbsp;
                <strong>LOP Days:</strong> {request.lopDays ?? 0}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LeaveList;