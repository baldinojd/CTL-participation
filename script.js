document.addEventListener("DOMContentLoaded", async function () {

  const searchInput = document.getElementById("search");
  const yearSelect = document.getElementById("year");
  const semesterSelect = document.getElementById("semester");
  const typeSelect = document.getElementById("type");
  const searchBtn = document.getElementById("searchBtn");
  const clearBtn = document.getElementById("clearBtn");
  const status = document.getElementById("status");
  const head = document.getElementById("head");
  const body = document.getElementById("body");
  const empty = document.getElementById("empty");
  const updatedDate = document.getElementById("updatedDate");
  const personChoices = document.getElementById("personChoices");
  const personSummary = document.getElementById("personSummary");

  const FT_COHORT_FACILITATOR = "Baldino, John";
  const IRT_FACILITATOR = "Baldino, John";
  const OFFICE_HOURS_FACILITATOR = "Baldino, John";

  let events = [];
  let selectedPerson = "";

  const cohortMembership = new Map();


  /* =========================================================
     GENERAL HELPERS
     ========================================================= */

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[.,;:()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }


  function personKey(person) {
    return normalize(person);
  }


  function displayPersonName(person) {

    if (!person) {
      return "";
    }

    if (person.includes(",")) {

      const parts = person.split(",");

      return (
        parts.slice(1).join(",").trim() +
        " " +
        parts[0].trim()
      );
    }

    return person;
  }


  /* =========================================================
     CSV PARSER
     ========================================================= */

  function parseCSV(text) {

    const rows = [];

    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {

      const char = text[i];
      const next = text[i + 1];

      if (
        char === '"' &&
        inQuotes &&
        next === '"'
      ) {

        field += '"';
        i++;

      } else if (char === '"') {

        inQuotes = !inQuotes;

      } else if (
        char === "," &&
        !inQuotes
      ) {

        row.push(field);
        field = "";

      } else if (
        (char === "\n" || char === "\r") &&
        !inQuotes
      ) {

        if (
          char === "\r" &&
          next === "\n"
        ) {
          i++;
        }

        row.push(field);
        field = "";

        if (
          row.some(
            cell => cell.trim() !== ""
          )
        ) {
          rows.push(row);
        }

        row = [];

      } else {

        field += char;
      }
    }

    if (
      field.length ||
      row.length
    ) {

      row.push(field);

      if (
        row.some(
          cell => cell.trim() !== ""
        )
      ) {
        rows.push(row);
      }
    }

    return rows;
  }


  function getHeaders(rows) {

    if (!rows.length) {
      return [];
    }

    return rows[0].map(
      header =>
        header
          .replace(/^\uFEFF/, "")
          .trim()
    );
  }


  /* =========================================================
     GENERAL PARTICIPATION MASTER
     ========================================================= */

  function loadParticipationCSV(text) {

    const rows = parseCSV(text);

    if (rows.length < 2) {

      return {
        events: [],
        updated: ""
      };
    }

    const headers = getHeaders(rows);

    const index = {
      updated: headers.indexOf("Updated"),
      date: headers.indexOf("Date"),
      semester: headers.indexOf("Semester"),
      ay: headers.indexOf("AY"),
      topic: headers.indexOf("Topic"),
      facilitator: headers.indexOf("Facilitator"),
      participants: headers.indexOf("Participants"),
      total: headers.indexOf("Total"),
      type: headers.indexOf("Event Type")
    };

    const updated =
      index.updated >= 0
        ? (rows[1][index.updated] || "").trim()
        : "";

    const parsedEvents =
      rows
        .slice(1)
        .map(row => ({

          date:
            row[index.date] || "",

          semester:
            row[index.semester] || "",

          academicYear:
            row[index.ay] || "",

         topic:
  normalize(row[index.topic]) === normalize("One-on-One Office Hours")
    ? "Office Hours"
    : row[index.topic] || "",

          facilitator:
            row[index.facilitator] || "",

          participants:
            (row[index.participants] || "")
              .split(";")
              .map(name => name.trim())
              .filter(Boolean),

          total:
            Number(
              row[index.total] || 0
            ),

type:
  normalize(row[index.type]) === normalize("One-on-One Office Hours")
    ? "Office Hours"
    : row[index.type] || "",

          source:
            "Participation",

          rosterOnly:
            false
        }));

    return {
      events: parsedEvents,
      updated: updated
    };
  }


  /* =========================================================
     FULL-TIME COHORT MEMBERSHIP
     ========================================================= */

  function loadCohortMembershipCSV(text) {

    const rows = parseCSV(text);

    if (rows.length < 2) {
      return;
    }

    const headers = getHeaders(rows);

    const ayIndex =
      headers.indexOf("AY");

    const participantIndex =
      headers.indexOf("Participant");

    rows
      .slice(1)
      .forEach(row => {

        const ay =
          (row[ayIndex] || "").trim();

        const participant =
          (row[participantIndex] || "").trim();

        if (
          !ay ||
          !participant
        ) {
          return;
        }

        const key =
          personKey(participant);

        if (
          !cohortMembership.has(key)
        ) {

          cohortMembership.set(
            key,
            {
              name: participant,
              years: new Set()
            }
          );
        }

        cohortMembership
          .get(key)
          .years
          .add(ay);
      });
  }


  function getCohortYears(person) {

    const record =
      cohortMembership.get(
        personKey(person)
      );

    if (!record) {
      return [];
    }

    return Array
      .from(record.years)
      .sort();
  }


  /* =========================================================
     FULL-TIME COHORT ATTENDANCE
     ========================================================= */

  function loadCohortAttendanceCSV(text) {

    const rows = parseCSV(text);

    if (rows.length < 2) {
      return [];
    }

    const headers = getHeaders(rows);

    const index = {
      ay: headers.indexOf("AY"),
      participant: headers.indexOf("Participant"),
      semester: headers.indexOf("Semester"),
      title: headers.indexOf("Session Title"),
      date: headers.indexOf("Date"),
      attended: headers.indexOf("Attended")
    };

    const groupedSessions =
      new Map();

    rows
      .slice(1)
      .forEach(row => {

        const ay =
          (row[index.ay] || "").trim();

        const participant =
          (row[index.participant] || "").trim();

        const semester =
          (row[index.semester] || "").trim();

        const title =
          (row[index.title] || "").trim();

        const date =
          (row[index.date] || "").trim();

        const attended =
          (row[index.attended] || "")
            .trim()
            .toLowerCase();

        if (
          !ay ||
          !participant ||
          !title
        ) {
          return;
        }

        const didAttend =
          attended === "yes" ||
          attended === "y" ||
          attended === "true" ||
          attended === "1";

        const key =
          [
            ay,
            semester,
            date,
            title
          ].join("|||");

        if (
          !groupedSessions.has(key)
        ) {

          groupedSessions.set(
            key,
            {
              date: date,
              semester: semester,
              academicYear: ay,
              topic: title,
              facilitator:
                FT_COHORT_FACILITATOR,
              participants: [],
              total: 0,
              type: "Full-Time Cohort",
              source:
                "Full-Time Cohort",
              rosterOnly: false
            }
          );
        }

        if (didAttend) {

          const session =
            groupedSessions.get(key);

          const alreadyPresent =
            session.participants.some(
              existing =>
                personKey(existing) ===
                personKey(participant)
            );

          if (!alreadyPresent) {

            session.participants.push(
              participant
            );
          }
        }
      });

    const cohortEvents =
      Array.from(
        groupedSessions.values()
      );

    cohortEvents.forEach(event => {

      event.participants.sort(
        (a, b) =>
          a.localeCompare(b)
      );

      event.total =
        event.participants.length + 1;
    });

    return cohortEvents;
  }


  /* =========================================================
     EARLIER FT COHORT ROSTERS
     ========================================================= */

  function buildCohortRosterEvents(
    cohortEvents
  ) {

    const detailedYears =
      new Set(
        cohortEvents
          .map(
            event =>
              event.academicYear
          )
          .filter(Boolean)
      );

    const rosters =
      new Map();

    cohortMembership.forEach(
      record => {

        record.years.forEach(
          year => {

            if (
              !rosters.has(year)
            ) {
              rosters.set(
                year,
                []
              );
            }

            rosters
              .get(year)
              .push(
                record.name
              );
          }
        );
      }
    );

    const rosterEvents = [];

    rosters.forEach(
      (people, year) => {

        if (
          detailedYears.has(year)
        ) {
          return;
        }

        people.sort(
          (a, b) =>
            a.localeCompare(b)
        );

        rosterEvents.push({

          date: "",

          semester: "",

          academicYear:
            year,

          topic:
            "Full-Time Cohort: AY " +
            year +
            " Roster",

          facilitator:
            FT_COHORT_FACILITATOR,

          participants:
            people,

          total:
            people.length + 1,

          type:
            "Full-Time Cohort",

          source:
            "Full-Time Cohort Roster",

          rosterOnly:
            true
        });
      }
    );

    return rosterEvents;
  }


  /* =========================================================
     INSTRUCTOR READINESS TRAINING
     ========================================================= */

  function loadIRTCSV(text) {

    const rows = parseCSV(text);

    if (rows.length < 2) {
      return [];
    }

    const headers = getHeaders(rows);

    const index = {
      ay: headers.indexOf("AY"),
      semester: headers.indexOf("Semester"),
      program: headers.indexOf("Program"),
      facilitator: headers.indexOf("Facilitator"),
      participant: headers.indexOf("Participant")
    };

    const groups =
      new Map();

    rows
      .slice(1)
      .forEach(row => {

        const ay =
          (row[index.ay] || "").trim();

        const semester =
          (row[index.semester] || "").trim();

        const program =
          (row[index.program] || "").trim();

        const participant =
          (row[index.participant] || "").trim();

        const facilitator =
          (row[index.facilitator] || "").trim()
          || IRT_FACILITATOR;

        if (
          !ay ||
          !semester ||
          !program ||
          !participant
        ) {
          return;
        }

        const key =
          [
            ay,
            semester,
            program
          ].join("|||");

        if (
          !groups.has(key)
        ) {

          groups.set(
            key,
            {
              date: "",
              semester: semester,
              academicYear: ay,
              topic: program,
              facilitator: facilitator,
              participants: [],
              total: 0,
              type: program,
              source:
                "Instructor Readiness Training",
              rosterOnly: false
            }
          );
        }

        const event =
          groups.get(key);

        const alreadyPresent =
          event.participants.some(
            existing =>
              personKey(existing) ===
              personKey(participant)
          );

        if (!alreadyPresent) {

          event.participants.push(
            participant
          );
        }
      });

    const irtEvents =
      Array.from(
        groups.values()
      );

    irtEvents.forEach(event => {

      event.participants.sort(
        (a, b) =>
          a.localeCompare(b)
      );

      event.total =
        event.participants.length + 1;
    });

    return irtEvents;
  }


  /* =========================================================
     OFFICE HOURS
     ========================================================= */

  function isOfficeHoursEvent(event) {

    return (
      normalize(event.type) ===
        normalize("Office Hours") ||
      normalize(event.topic)
        .includes(
          normalize("Office Hours")
        )
    );
  }


  function makeOfficeHoursPersonKey(
    ay,
    semester,
    participant
  ) {

    return [
      normalize(ay),
      normalize(semester),
      personKey(participant)
    ].join("|||");
  }


  function getMasterOfficeHoursPeople(
    participationEvents
  ) {

    const existing =
      new Set();

    participationEvents
      .filter(
        event =>
          isOfficeHoursEvent(event)
      )
      .forEach(event => {

        event.participants.forEach(
          participant => {

            existing.add(
              makeOfficeHoursPersonKey(
                event.academicYear,
                event.semester,
                participant
              )
            );
          }
        );
      });

    return existing;
  }


  /*
    Supplemental Office Hours are grouped by
    AY + Semester so they display like the
    existing master Office Hours records.
  */

  function loadOfficeHoursCSV(
    text,
    participationEvents
  ) {

    const rows =
      parseCSV(text);

    if (
      rows.length < 2
    ) {
      return [];
    }

    const headers =
      getHeaders(rows);

    const index = {
      ay:
        headers.indexOf("AY"),
      semester:
        headers.indexOf("Semester"),
      facilitator:
        headers.indexOf("Facilitator"),
      participant:
        headers.indexOf("Participant")
    };


    const existingMasterPeople =
      getMasterOfficeHoursPeople(
        participationEvents
      );


    const grouped =
      new Map();


    rows
      .slice(1)
      .forEach(row => {

        const ay =
          (row[index.ay] || "").trim();

        const semester =
          (row[index.semester] || "").trim();

        const participant =
          (row[index.participant] || "").trim();

        const facilitator =
          (row[index.facilitator] || "").trim()
          || OFFICE_HOURS_FACILITATOR;


        if (
          !ay ||
          !semester ||
          !participant
        ) {
          return;
        }


        /*
          Do not add someone already represented
          in the master Office Hours data for the
          same AY and semester.
        */

        const personSemesterKey =
          makeOfficeHoursPersonKey(
            ay,
            semester,
            participant
          );


        if (
          existingMasterPeople.has(
            personSemesterKey
          )
        ) {
          return;
        }


        const groupKey =
          [
            ay,
            semester
          ].join("|||");


        if (
          !grouped.has(
            groupKey
          )
        ) {

          grouped.set(
            groupKey,
            {
              date: "",
              semester: semester,
              academicYear: ay,
              topic: "Office Hours",
              facilitator: facilitator,
              participants: [],
              total: 0,
              type: "Office Hours",
              source:
                "Office Hours Supplemental",
              rosterOnly: false
            }
          );
        }


        const event =
          grouped.get(
            groupKey
          );


        const alreadyPresent =
          event.participants.some(
            existing =>
              personKey(existing) ===
              personKey(participant)
          );


        if (
          !alreadyPresent
        ) {

          event.participants.push(
            participant
          );
        }
      });


    const officeEvents =
      Array.from(
        grouped.values()
      );


    officeEvents.forEach(
      event => {

        event.participants.sort(
          (a, b) =>
            a.localeCompare(b)
        );


        /*
          Total = participants + facilitator.
        */

        event.total =
          event.participants.length + 1;
      }
    );


    return officeEvents;
  }


  /* =========================================================
     FILTER MENUS
     ========================================================= */

  function populateFilters() {

    yearSelect.innerHTML =
      '<option value="">All years</option>';

    semesterSelect.innerHTML =
      '<option value="">All semesters</option>';

    typeSelect.innerHTML =
      '<option value="">All event types</option>';


    const yearSet =
      new Set(
        events
          .map(
            event =>
              event.academicYear
          )
          .filter(Boolean)
      );


    cohortMembership.forEach(
      record => {

        record.years.forEach(
          year =>
            yearSet.add(year)
        );
      }
    );


    Array
      .from(yearSet)
      .sort()
      .forEach(year => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          year;

        option.textContent =
          year;

        yearSelect.appendChild(
          option
        );
      });


    const preferredSemesters = [
      "Fall",
      "Intersession",
      "Spring",
      "Summer I",
      "Summer II"
    ];


    const availableSemesters =
      [
        ...new Set(
          events
            .map(
              event =>
                event.semester
            )
            .filter(Boolean)
        )
      ];


    preferredSemesters.forEach(
      semester => {

        if (
          availableSemesters.includes(
            semester
          )
        ) {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            semester;

          option.textContent =
            semester;

          semesterSelect.appendChild(
            option
          );
        }
      }
    );


    availableSemesters
      .filter(
        semester =>
          !preferredSemesters.includes(
            semester
          )
      )
      .sort()
      .forEach(semester => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          semester;

        option.textContent =
          semester;

        semesterSelect.appendChild(
          option
        );
      });


    const preferredTypes = [
      "Roundtable",
      "Topical Session",
      "Full-Time Cohort",
      "Instructor Readiness Training - Adjunct",
      "Instructor Readiness Training - FT",
      "Office Hours",
      "Focus Group",
      "Headshots",
      "Kickoff"
    ];


    const availableTypes =
      [
        ...new Set(
          events
            .map(
              event =>
                event.type
            )
            .filter(Boolean)
        )
      ];


    preferredTypes.forEach(
      type => {

        if (
          availableTypes.includes(
            type
          )
        ) {

          const option =
            document.createElement(
              "option"
            );

          option.value =
            type;

          option.textContent =
            type;

          typeSelect.appendChild(
            option
          );
        }
      }
    );


    availableTypes
      .filter(
        type =>
          !preferredTypes.includes(
            type
          )
      )
      .sort()
      .forEach(type => {

        const option =
          document.createElement(
            "option"
          );

        option.value =
          type;

        option.textContent =
          type;

        typeSelect.appendChild(
          option
        );
      });
  }


  /* =========================================================
     PEOPLE
     ========================================================= */

  function getAllPeople() {

    const people =
      new Map();


    events.forEach(event => {

      if (
        event.facilitator
      ) {

        const key =
          personKey(
            event.facilitator
          );

        if (
          !people.has(key)
        ) {

          people.set(
            key,
            event.facilitator
          );
        }
      }


      event.participants.forEach(
        person => {

          const key =
            personKey(person);

          if (
            !people.has(key)
          ) {

            people.set(
              key,
              person
            );
          }
        }
      );
    });


    cohortMembership.forEach(
      record => {

        const key =
          personKey(
            record.name
          );

        if (
          !people.has(key)
        ) {

          people.set(
            key,
            record.name
          );
        }
      }
    );


    return [
      ...people.values()
    ].sort(
      (a, b) =>
        a.localeCompare(b)
    );
  }


  function personMatchesQuery(
    name,
    query
  ) {

    const normalizedName =
      normalize(name);

    const normalizedQuery =
      normalize(query);

    if (
      !normalizedQuery
    ) {
      return false;
    }

    const queryParts =
      normalizedQuery.split(" ");

    return queryParts.every(
      part =>
        normalizedName.includes(
          part
        )
    );
  }


  function findMatchingPeople(
    query
  ) {

    return getAllPeople().filter(
      person =>
        personMatchesQuery(
          person,
          query
        )
    );
  }


  function exactPersonMatch(
    name,
    selectedName
  ) {

    return (
      personKey(name) ===
      personKey(selectedName)
    );
  }


  function eventIncludesPerson(
    event,
    person
  ) {

    if (
      event.facilitator &&
      exactPersonMatch(
        event.facilitator,
        person
      )
    ) {
      return true;
    }

    return event.participants.some(
      participant =>
        exactPersonMatch(
          participant,
          person
        )
    );
  }


  /* =========================================================
     FILTERING
     ========================================================= */

  function passesFilters(event) {

    const selectedYear =
      yearSelect.value;

    const selectedSemester =
      semesterSelect.value;

    const selectedType =
      typeSelect.value;

    const yearMatch =
      !selectedYear ||
      event.academicYear ===
        selectedYear;

    const semesterMatch =
      !selectedSemester ||
      event.semester ===
        selectedSemester;

    const typeMatch =
      !selectedType ||
      event.type ===
        selectedType;

    return (
      yearMatch &&
      semesterMatch &&
      typeMatch
    );
  }


  function eventMatchesGeneralSearch(
    event,
    query
  ) {

    const q =
      normalize(query);

    if (!q) {
      return true;
    }

    const searchableText =
      normalize(
        [
          event.date,
          event.semester,
          event.academicYear,
          event.topic,
          event.facilitator,
          event.type,
          ...event.participants
        ].join(" ")
      );

    const queryParts =
      q.split(" ");

    return queryParts.every(
      part =>
        searchableText.includes(
          part
        )
    );
  }


  /* =========================================================
     TABLE HELPERS
     ========================================================= */

  function createCell(
    text,
    className
  ) {

    const td =
      document.createElement(
        "td"
      );

    if (
      className
    ) {
      td.className =
        className;
    }

    td.textContent =
      text || "";

    return td;
  }


  function setPersonHeader() {

    head.innerHTML = `
      <tr>
        <th>Date</th>
        <th>Semester</th>
        <th>AY</th>
        <th>Topic</th>
        <th>Facilitator</th>
      </tr>
    `;
  }


  function setEventHeader() {

    head.innerHTML = `
      <tr>
        <th>Date</th>
        <th>Semester</th>
        <th>AY</th>
        <th>Topic</th>
        <th>Facilitator</th>
        <th>Participants</th>
        <th>Total</th>
      </tr>
    `;
  }


  /* =========================================================
     PERSON SELECTION + SUMMARY
     ========================================================= */

  function hidePersonChoices() {

    personChoices.innerHTML =
      "";

    personChoices.style.display =
      "none";
  }


  function hidePersonSummary() {

    personSummary.innerHTML =
      "";

    personSummary.style.display =
      "none";
  }


  function displayPersonChoices(
    query,
    people
  ) {

    selectedPerson =
      "";

    hidePersonSummary();

    personChoices.innerHTML =
      "";

    const message =
      document.createElement(
        "div"
      );

    message.className =
      "person-choice-message";

    message.textContent =
      'Multiple people match "' +
      query +
      '". Please select the person you want:';

    personChoices.appendChild(
      message
    );

    const buttons =
      document.createElement(
        "div"
      );

    buttons.className =
      "person-choice-buttons";

    people.forEach(person => {

      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "person-choice-button";

      button.textContent =
        displayPersonName(
          person
        );

      button.addEventListener(
        "click",
        function () {

          selectedPerson =
            person;

          hidePersonChoices();

          runPersonSearch(
            person
          );
        }
      );

      buttons.appendChild(
        button
      );
    });

    personChoices.appendChild(
      buttons
    );

    personChoices.style.display =
      "block";

    body.innerHTML =
      "";

    setPersonHeader();

    empty.style.display =
      "none";

    status.textContent =
      "Select a person to view participation.";
  }


  function displayPersonSummary(
    person,
    total
  ) {

    const displayName =
      displayPersonName(person);

    const cohortYears =
      getCohortYears(person);

    let html =
      "<strong>" +
      displayName +
      "</strong>" +
      " &nbsp;|&nbsp; " +
      "<strong>Total Sessions Attended:</strong> " +
      total;


    if (
      cohortYears.length
    ) {

      const cohortText =
        cohortYears
          .map(
            year =>
              "AY " + year
          )
          .join(", ");

      html +=
        " &nbsp;|&nbsp; " +
        "<strong>Full-Time Cohort:</strong> " +
        cohortText;
    }


    personSummary.innerHTML =
      html;

    personSummary.style.display =
      "block";
  }


  /* =========================================================
     RESULT RENDERING
     ========================================================= */

  function renderResults(
    results,
    personMode
  ) {

    body.innerHTML =
      "";

    if (
      personMode
    ) {
      setPersonHeader();
    } else {
      setEventHeader();
    }

    if (
      results.length === 0
    ) {

      empty.style.display =
        "block";

      status.textContent =
        "No matching participation records.";

      return;
    }

    empty.style.display =
      "none";

    results.forEach(event => {

      const row =
        document.createElement(
          "tr"
        );

      row.appendChild(
        createCell(
          event.date,
          "date"
        )
      );

      row.appendChild(
        createCell(
          event.semester
        )
      );

      row.appendChild(
        createCell(
          event.academicYear
        )
      );

      row.appendChild(
        createCell(
          event.topic
        )
      );

      row.appendChild(
        createCell(
          event.facilitator
        )
      );

      if (
        !personMode
      ) {

        row.appendChild(
          createCell(
            event.participants.join(
              ", "
            )
          )
        );

        row.appendChild(
          createCell(
            String(
              event.total
            ),
            "total"
          )
        );
      }

      body.appendChild(row);
    });

    status.textContent =
      "Showing " +
      results.length +
      (
        results.length === 1
          ? " matching event."
          : " matching events."
      );
  }


  /* =========================================================
     SEARCH
     ========================================================= */

  function runPersonSearch(
    person
  ) {

    selectedPerson =
      person;

    const results =
      events.filter(
        event =>
          !event.rosterOnly &&
          passesFilters(event) &&
          eventIncludesPerson(
            event,
            person
          )
      );

    hidePersonChoices();

    displayPersonSummary(
      person,
      results.length
    );

    renderResults(
      results,
      true
    );
  }


  function runGeneralSearch(
    query
  ) {

    selectedPerson =
      "";

    hidePersonChoices();
    hidePersonSummary();

    const results =
      events.filter(
        event =>
          passesFilters(event) &&
          eventMatchesGeneralSearch(
            event,
            query
          )
      );

    renderResults(
      results,
      false
    );
  }


  function runSearch() {

    const query =
      searchInput.value.trim();


    if (
      selectedPerson
    ) {

      runPersonSearch(
        selectedPerson
      );

      return;
    }


    if (
      !query
    ) {

      const hasFilter =
        yearSelect.value ||
        semesterSelect.value ||
        typeSelect.value;


      if (
        hasFilter
      ) {

        runGeneralSearch(
          ""
        );

      } else {

        body.innerHTML =
          "";

        setEventHeader();

        empty.style.display =
          "none";

        hidePersonChoices();
        hidePersonSummary();

        status.textContent =
          "Enter a search term or select a filter to begin.";
      }

      return;
    }


    const matchingPeople =
      findMatchingPeople(
        query
      );


    if (
      matchingPeople.length === 1
    ) {

      selectedPerson =
        matchingPeople[0];

      runPersonSearch(
        matchingPeople[0]
      );

      return;
    }


    if (
      matchingPeople.length > 1
    ) {

      displayPersonChoices(
        query,
        matchingPeople
      );

      return;
    }


    runGeneralSearch(
      query
    );
  }


  /* =========================================================
     CLEAR
     ========================================================= */

  function clearSearch() {

    searchInput.value =
      "";

    yearSelect.value =
      "";

    semesterSelect.value =
      "";

    typeSelect.value =
      "";

    selectedPerson =
      "";

    hidePersonChoices();
    hidePersonSummary();

    body.innerHTML =
      "";

    setEventHeader();

    empty.style.display =
      "none";

    status.textContent =
      "Enter a search term or select a filter to begin.";

    searchInput.focus();
  }


  /* =========================================================
     EVENT LISTENERS
     ========================================================= */

  searchInput.addEventListener(
    "input",
    function () {

      selectedPerson =
        "";

      hidePersonChoices();
      hidePersonSummary();
    }
  );


  searchBtn.addEventListener(
    "click",
    runSearch
  );


  searchInput.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key ===
        "Enter"
      ) {

        event.preventDefault();

        runSearch();
      }
    }
  );


  yearSelect.addEventListener(
    "change",
    runSearch
  );


  semesterSelect.addEventListener(
    "change",
    runSearch
  );


  typeSelect.addEventListener(
    "change",
    runSearch
  );


  clearBtn.addEventListener(
    "click",
    clearSearch
  );


  /* =========================================================
     LOAD ALL FIVE DATASETS
     ========================================================= */

  try {

    const [
      participationResponse,
      membershipResponse,
      cohortAttendanceResponse,
      irtResponse,
      officeHoursResponse
    ] = await Promise.all([

      fetch(
        "CTL_Participation_Master.csv",
        {
          cache:
            "no-store"
        }
      ),

      fetch(
        "CTL_Full_Time_Cohort.csv",
        {
          cache:
            "no-store"
        }
      ),

      fetch(
        "CTL_Full_Time_Cohort_Attendance.csv",
        {
          cache:
            "no-store"
        }
      ),

      fetch(
        "CTL_Instructor_Readiness_Training.csv",
        {
          cache:
            "no-store"
        }
      ),

      fetch(
        "CTL_Office_Hours.csv",
        {
          cache:
            "no-store"
        }
      )

    ]);


    if (
      !participationResponse.ok
    ) {
      throw new Error(
        "CTL participation data could not be loaded."
      );
    }


    if (
      !membershipResponse.ok
    ) {
      throw new Error(
        "Full-Time Cohort membership data could not be loaded."
      );
    }


    if (
      !cohortAttendanceResponse.ok
    ) {
      throw new Error(
        "Full-Time Cohort attendance data could not be loaded."
      );
    }


    if (
      !irtResponse.ok
    ) {
      throw new Error(
        "Instructor Readiness Training data could not be loaded."
      );
    }


    if (
      !officeHoursResponse.ok
    ) {
      throw new Error(
        "Office Hours data could not be loaded."
      );
    }


    const [
      participationText,
      membershipText,
      cohortAttendanceText,
      irtText,
      officeHoursText
    ] = await Promise.all([

      participationResponse.text(),
      membershipResponse.text(),
      cohortAttendanceResponse.text(),
      irtResponse.text(),
      officeHoursResponse.text()

    ]);


    loadCohortMembershipCSV(
      membershipText
    );


    const participationData =
      loadParticipationCSV(
        participationText
      );


    const cohortEvents =
      loadCohortAttendanceCSV(
        cohortAttendanceText
      );


    const cohortRosterEvents =
      buildCohortRosterEvents(
        cohortEvents
      );


    const irtEvents =
      loadIRTCSV(
        irtText
      );


    const officeHoursEvents =
      loadOfficeHoursCSV(
        officeHoursText,
        participationData.events
      );


    events = [
      ...participationData.events,
      ...cohortEvents,
      ...cohortRosterEvents,
      ...irtEvents,
      ...officeHoursEvents
    ];


    if (
      updatedDate
    ) {

      updatedDate.textContent =
        participationData.updated
          ? "Data updated: " +
            participationData.updated
          : "Data updated: —";
    }


    populateFilters();


    body.innerHTML =
      "";

    setEventHeader();

    empty.style.display =
      "none";

    status.textContent =
      "Enter a search term or select a filter to begin.";


  } catch (error) {

    console.error(error);

    status.textContent =
      "Participation data could not be loaded.";
  }

});
