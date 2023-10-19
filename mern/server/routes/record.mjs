import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";
import ExcelJS from "exceljs";
//const ExcelJS = require('exceljs');

const router = express.Router();

// Get all classes
router.get("/classes/", async (req, res) => {
  let collection = await db.collection("Class");
  let results = await collection.find({}).toArray();
  res.status(200).send(results);
});

// Get all sessions for a particular class
router.get("/classes/:class_id/sessions", async (req, res) => {
  const class_id = req.params.class_id;
  let collection = await db.collection("Session");
  let results = await collection.find({class_id: new ObjectId(class_id)}).toArray();
  if (results.length === 0) {
    return res.status(404).send("Not found");
  }
  res.status(200).send(results);
});

// This section will help you get a list of all the check-ins with attendee details
router.get("/checkin", async (req, res) => {
  try {
    let collection = await db.collection("Check_in");
    let results = await collection.aggregate([
      {
        $lookup: {
          from: "Attendee",
          localField: "attendee_id",
          foreignField: "_id",
          as: "attendeeDetails"
        }
      },
      {
        $unwind: "$attendeeDetails"
      },
      {
        $project: {
          first_name: "$attendeeDetails.first_name",
          last_name: "$attendeeDetails.last_name",
          attended: 1
        }
      }
    ]).toArray();
    res.status(200).send(results);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// This section will help you get a list of all attendee details for a specific session (Admin).
router.get("/admin/attendees-for-session/:sessionId", async (req, res) => {
  try {
    let collection = await db.collection("Check_in");
    let results = await collection.aggregate([
      { $match: { session_id: new ObjectId(req.params.sessionId) }},
      {
        $lookup: {
          from: "Attendee",
          localField: "attendee_id",
          foreignField: "_id",
          as: "attendeeDetails"
        }
      },
      {
        $unwind: "$attendeeDetails"
      },
      {
        $project: {
          first_name: "$attendeeDetails.first_name",
          last_name: "$attendeeDetails.last_name",
          email_address: "$attendeeDetails.email_address",
          attended:"$attendeeDetails.attended",
        }
      }
    ]).toArray();
    
    res.status(200).send(results);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});


// This section will help you get a list of all attendee details for a specific session (for false attended)
router.get("/attendees-for-session/:sessionId", async (req, res) => {
  try {
    let collection = await db.collection("Check_in");
    let results = await collection.aggregate([
      { $match: { session_id: new ObjectId(req.params.sessionId) }},
      {
        $lookup: {
          from: "Attendee",
          localField: "attendee_id",
          foreignField: "_id",
          as: "attendeeDetails"
        }
      },
      {
        $unwind: "$attendeeDetails"
      },
      {
        $project: {
          first_name: "$attendeeDetails.first_name",
          last_name: "$attendeeDetails.last_name",
        }
      }
    ]).toArray();
    
    res.status(200).send(results);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});



// This section will help you get a single session by its ID
router.get("/session-details/:sessionId", async (req, res) => {
  try {
    let collection = await db.collection("Session");
    let query = {_id: new ObjectId(req.params.sessionId)};
    let result = await collection.findOne(query);

    if (!result) res.send("Not found").status(404);
    else res.send(result).status(200);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});


// This section will help you check-in a person by id.
router.patch("/checkin/:id", async (req, res) => {
  console.log("Check-in request received for id:", req.params.id);  // Debug log

  const query = { _id: new ObjectId(req.params.id) };
  const checkin_data = await db.collection("Check_in").findOne(query);

  if (!checkin_data) {
    console.log("No attendee found for id:", req.params.id);  // Debug log
    return res.status(404).send("Attendee not found");
  }

  if (checkin_data.attended) {
    return res.status(400).send("Already checked in");
  }

  const updates = { $set: { attended: true } };
  await db.collection("Check_in").updateOne(query, updates); // Update the "Check_in" collection
  res.status(200).send("Check-in successful");
});

//router.get("/class-attendance-report/:classId/:startTime/:endTime", async (req, res) => {
router.get("/class-attendance-report/:classId/", async (req, res) => {
  try {
    console.log("here");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance Report');

    //Find info of class
    let classCollection = await db.collection("Class");
    let classRes = await classCollection.findOne({_id: new ObjectId(req.params.classId)});
  
    //Find sessions in class in the timeframe
    let sessionCollection = await db.collection("Session");
    let sessionQuery = {
      class_id: new ObjectId(req.params.classId)//, 
      //session_start_time: {$gte: req.params.startTime},
      //session_end_time: {$lte: req.params.endTime}
    };
    let sessions = await sessionCollection.find(sessionQuery).toArray();

    let checkInCollection = await db.collection("Check_in");
    let attendeeCollection = await db.collection("Attendee");

    //List of attendees in all sessions
    let attendees = [];

    //List of list of session check-ins (same index as corresponding sessions)
    let sessionCheckInsArray = [];

    //Check if attendee in a list
    const isAttendeeInList = (aList, newA) => {
      for (const atdee of aList)
        if (atdee._id.equals(newA._id)) 
          return true;
      return false;
    }

    //Fill up list of attendees
    for (const session of sessions) {
      let checkInQuery = {session_id: new ObjectId(session._id)};
      let sessionCheckIns = await checkInCollection.find(checkInQuery).toArray();
      sessionCheckInsArray.push(sessionCheckIns);
      //console.log(sessionCheckIns);

      for (const checkIn of sessionCheckIns) {
        let qAttendee = await attendeeCollection.findOne( {_id: new ObjectId(checkIn.attendee_id)} );
        if (!isAttendeeInList(attendees, qAttendee))
          attendees.push(qAttendee);
      }
    }

    //Rows to print
    let rows = [['Attendees'], ['']];

    //Total attendance
    let attendeeTotalAttendanceList = [];

    //Setup rows to print
    for (const attendee of attendees) {
      rows.push([attendee.first_name.concat(' ').concat(attendee.last_name)]);
      attendeeTotalAttendanceList.push(0);
    }
    rows.push(['Total Attendees']);

    //Function to find the index in check in list that contains id of attendee
    const attendeeCheckInIndex = (checkInList, atdee) => {
      for (let checkInNum = 0; checkInNum < checkInList.length; checkInNum++)
        if (atdee._id.equals(checkInList[checkInNum].attendee_id)) 
          return checkInNum;
      return -1;
    }

    //Add data for each session
    for (let sesNum = 0; sesNum < sessions.length; sesNum++) {
      rows[0].push(sessions[sesNum].session_name);
      rows[1].push(sessions[sesNum].session_start_time);

      let sessionAttandanceTot = 0;

      //Iterate through all attendees in class and add data
      for (let atdeeNum = 0; atdeeNum < attendees.length; atdeeNum++) {
        let checkInIndex = attendeeCheckInIndex(sessionCheckInsArray[sesNum], attendees[atdeeNum])
        if (checkInIndex != -1) {
          if (sessionCheckInsArray[sesNum][checkInIndex].attended) {
            sessionAttandanceTot++;
            attendeeTotalAttendanceList[atdeeNum]++;
            rows[atdeeNum + 2].push('Yes');
          } else {
            rows[atdeeNum + 2].push('No');
          }
        } else {
          rows[atdeeNum + 2].push('');
        }
      }

      rows[attendees.length + 2].push(sessionAttandanceTot);
    }

    //Calculate attendee and class totals
    let classTotAttendance = 0;
    rows[0].push('Total Attendance');
    rows[1].push('');
    for (let atdeeNum = 0; atdeeNum < attendeeTotalAttendanceList.length; atdeeNum++) {
      let attendeeTotalAttendance = attendeeTotalAttendanceList[atdeeNum]
      rows[atdeeNum + 2].push(attendeeTotalAttendance);
      classTotAttendance += attendeeTotalAttendance;
    }
    rows[attendeeTotalAttendanceList.length + 2].push(classTotAttendance);

    //Add rows
    for (const row of rows) {
      worksheet.addRow(row);
    }

    console.log(classRes.class_name);

    // Set response headers to indicate it's an Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + classRes.class_name
    + ' Report.xlsx');
    res.setHeader('Class-Name', classRes.class_name);
    console.log(res.getHeaders());
    
    // Send the Excel file as the response
    workbook.xlsx.write(res)
    .then(() => {
      res.end();
    });
  } 
  catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// This section will get attendee details for a specific session, with more details
router.get("/attendees-with-status/:sessionId", async (req, res) => {
  try {
    let collection = await db.collection("Check_in");
    let results = await collection.aggregate([
      { $match: { session_id: new ObjectId(req.params.sessionId) } },
      {
        $lookup: {
          from: "Attendee",
          localField: "attendee_id",
          foreignField: "_id",
          as: "attendeeDetails"
        }
      },
      {
        $unwind: "$attendeeDetails"
      },
      {
        $project: {
          first_name: "$attendeeDetails.first_name",
          last_name: "$attendeeDetails.last_name",
          email_address: "$attendeeDetails.email_address",
          attended: 1
        }
      }
    ]).toArray();
    res.status(200).send(results);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// This section will help you get a list of all attendee details for a specific session.
router.get("/attendees-for-session/:sessionId", async (req, res) => {
  try {
    let collection = await db.collection("Check_in");
    let results = await collection.aggregate([
      { $match: { session_id: new ObjectId(req.params.sessionId) } },
      {
        $lookup: {
          from: "Attendee",
          localField: "attendee_id",
          foreignField: "_id",
          as: "attendeeDetails"
        }
      },
      {
        $unwind: "$attendeeDetails"
      },
      {
        $project: {
          first_name: "$attendeeDetails.first_name",
          last_name: "$attendeeDetails.last_name",
        }
      }
    ]).toArray();
    
    res.status(200).send(results);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});

// This section will help you get a single session by its ID
router.get("/session-details/:sessionId", async (req, res) => {
  try {
    let collection = await db.collection("Session");
    let query = {_id: new ObjectId(req.params.sessionId)};
    let result = await collection.findOne(query);

    if (!result) res.send("Not found").status(404);
    else res.send(result).status(200);
  } catch (error) {
    res.status(500).send("Internal Server Error");
  }
});


// This section will help you check-in a person by id.
router.patch("/checkin/:id", async (req, res) => {
  console.log("Check-in request received for id:", req.params.id);  // Debug log

  const query = { _id: new ObjectId(req.params.id) };
  const checkin_data = await db.collection("Check_in").findOne(query);

  if (!checkin_data) {
    console.log("No attendee found for id:", req.params.id);  // Debug log
    return res.status(404).send("Attendee not found");
  }

  if (checkin_data.attended) {
    return res.status(400).send("Already checked in");
  }

  const updates = { $set: { attended: true } };
  await db.collection("Check_in").updateOne(query, updates); // Update the "Check_in" collection
  res.status(200).send("Check-in successful");
});

export default router;