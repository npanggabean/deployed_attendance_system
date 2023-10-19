import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import './TableUI.css';

// Constant handling data to be shown for classes
// When class name is clicked, go to sessions page of that class
const ClassRecord = ({ record }) => (
  <tr>
    <td className="large-cell">
      <Link className="btn btn-link" to={`/classes/${record._id}/sessions`}>
        {record.class_name}
      </Link>
    </td>
  </tr>
);

// Constant handling data to be shown for sessions
// When Student is clicked, go to students check-in page for that class
// When Admin is clicked, go to admins check-in page for that class
const SessionRecord = ({ record, classId }) => (
  <tr>
    <td className="large-cell">
      {record.session_name}
      <div style={{ float: 'right' }}>
        <Link className="btn btn-link" to={`/student-session/${record._id}`}>Student</Link>
        <Link className="btn btn-link" to={`/classes/${classId}/sessions/${record._id}/attendees`}>Admin</Link>
      </div>
    </td>
  </tr>
);

const Notification = ({ type, message, show }) => {
  if (!show) return null;
  return <div className={`alert alert-${type}`} role="alert">{message}</div>;
};

const TableRow = ({ record, onRowClick, selectedId }) => {
  return(
    <tr
      key={record._id}
      className={`${record._id === selectedId ? "selected-row" : ""}`}
      onClick={onRowClick}
    >
    <td className="fullname">{`${record.first_name} ${record.last_name}`}</td>
    <td>{record.email_address}</td>
    <td>{record.attended ? 'Yes' : 'No'}</td>      
    </tr>
  );
};

// Function for classes page
export function Classes() {
  const [records, setRecords] = useState([]);
  useEffect(() => {
    async function getClassRecords() {
      const response = await fetch(`http://localhost:5050/record/classes`);
      if (!response.ok) {
        const message = `An error occurred for class: ${response.statusText}`;
        window.alert(message);
        return;
      }
      const data = await response.json();
      setRecords(data);
    }

    getClassRecords();
  }, []);

  // Show the list of classes
  return (
    <div className="table-scroll-container">
      <table className="nameTable">
        <thead>
        <th className="tableLabel" style={{width: '100%'}}>Class</th>
        </thead>
        <tbody>
          {records.map((record) => (
            <ClassRecord key={record._id} record={record} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Function for sessions page
export function Sessions() {
  const { classId } = useParams();
  const [records, setRecords] = useState([]);

  useEffect(() => {
    async function getSessionRecords() {
      const response = await fetch(`http://localhost:5050/record/classes/${classId}/sessions`);
      if (!response.ok) {
        const message = `An error occurred for session: ${response.statusText}`;
        window.alert(message);
        return;
      }
      const data = await response.json();
      setRecords(data);
    }

    getSessionRecords();
  }, [classId]);

  // Connect with backend to generate report
  const handleGenerateReport = async () => {
    try {
      const response = await fetch(`http://localhost:5050/record/class-attendance-report/${classId}`);
      if (!response.ok) {
          const message = `An error occurred while generating the report: ${response.statusText}`;
          window.alert(message);
          return;
      }

      const className = response.headers.get('Class-Name');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${className} Report.xlsx`
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } 
    catch (error) {
      console.error("Error generating the report:", error);
    }
  };

  // Function to navigate back 
  const navigate = useNavigate();
  const goBack = () => {
    navigate(-1);
  };
  
  // Show back button at top left, generate report at top right, and the sessions table
  return (
    <div>
      <button onClick={goBack}>
        Back to Classes
      </button>
      <button 
        style={{float: 'right'}} 
        onClick={handleGenerateReport}> Generate Report
      </button>

      <div className="table-scroll-container">
        <table className="nameTable">
          <thead>
          <th className="tableLabel" style={{width: '100%'}}>Session</th>
          </thead>
          <tbody>
            {records.map((record) => (
            <SessionRecord key={record._id} record={record} classId={classId} />
          ))}
          </tbody>
        </table>
      </div>          
    </div>
  );
}

// Function for admin check-in page
export function Attendees() {
  const [records, setRecords] = useState([]);
  const [session, setSession] = useState({});  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const { sessionId } = useParams();


  useEffect(() => {
    async function fetchData() {
      // Fetch attendees
      const responseAttendees = await fetch(`http://localhost:5050/record/attendees-with-status/${sessionId}`);
      if (!responseAttendees.ok) {
        const message = `An error occurred: ${responseAttendees.statusText}`;
        window.alert(message);
        return;
      }
      const attendees = await responseAttendees.json();
      setRecords(attendees);

      // Fetch session details
      const responseSession = await fetch(`http://localhost:5050/record/session-details/${sessionId}`);
      if (!responseSession.ok) {
        const message = `An error occurred: ${responseSession.statusText}`;
        window.alert(message);
        return;
      }
      const sessionData = await responseSession.json();
      setSession(sessionData);
    }

    fetchData();
  }, [sessionId]);
  
  // Similar to students check in page.

  function showNotification(message, type) {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 3000);
  }

  async function handleCheckIn() {
    if (!selectedId) {
      showNotification("Please select an attendee to check in.", "warning");
      return;
    }

    const response = await fetch(`http://localhost:5050/record/checkin/${selectedId}`, {
      method: "PATCH"
    });

    if (response.ok) {
      showNotification("Check-in successful", "success");
      const updatedRecords = records.map(record => {
        if (record._id === selectedId) {
          record.attended = true;
        }
        return record;
      });
      setRecords(updatedRecords);
    } else {
      const message = await response.text();
      showNotification(`Check-in failed: ${message}`, "danger");

    }
  }

  const filteredRecords = records.filter(record => {
    const fullName = `${record.first_name} ${record.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const navigate = useNavigate();
  const goBack = () => {
    navigate(-1);
  };

  return (
    <div className="container" style={{ alignItems: 'flex-start' }}>
      <Notification type={notification.type} message={notification.message} show={notification.show} />

      <button onClick={goBack} >
        Back to Sessions
      </button>
      
      <h3>Attendees for Session: {session.session_name}</h3>

      <div className="searchBar-container">
        <input
          className="searchBar"
          type="text"
          placeholder="Search by name"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="table-scroll-container">
        <table className="nameTable">
          <thead>
            <th className="tableLabel">Full Name</th>
            <th className="tableLabel">Email Address</th>
            <th className="tableLabel">Attended</th>
          </thead>
          <tbody>
            {filteredRecords.map((record) => (
              <TableRow
              key={record._id}
              record={record}                  
              selectedId={selectedId}  // Pass the selectedId as a prop here
              onRowClick={() => !record.attended && setSelectedId(record._id)}                
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="centered-button">
        <button onClick={handleCheckIn}>
          <div className="buttonName">Check In</div>
        </button>
      </div>
    </div>
  );
}
