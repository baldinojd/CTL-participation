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

  const adminSignInBtn = document.getElementById("adminSignInBtn");
  const adminSignOutBtn = document.getElementById("adminSignOutBtn");
  const adminIdentity = document.getElementById("adminIdentity");
  const adminLoginDialog = document.getElementById("adminLoginDialog");
  const adminLoginForm = document.getElementById("adminLoginForm");
  const adminEmail = document.getElementById("adminEmail");
  const adminPassword = document.getElementById("adminPassword");
  const adminLoginMessage = document.getElementById("adminLoginMessage");
  const adminCancelBtn = document.getElementById("adminCancelBtn");
  const adminSubmitBtn = document.getElementById("adminSubmitBtn");

  let currentAdminUser = null;
  let currentAdminAuthorized = false;

  /* =========================================================
     ADMIN AUTHENTICATION
     Sign-in only. Editing controls are intentionally not
     enabled in this version.
     ========================================================= */

  function showSignedOutState() {
    currentAdminUser = null;
    currentAdminAuthorized = false;

    if (adminIdentity) {
      adminIdentity.textContent = "";
      adminIdentity.style.display = "none";
    }

    if (adminSignInBtn) {
      adminSignInBtn.style.display = "";
    }

    if (adminSignOutBtn) {
      adminSignOutBtn.style.display = "none";
    }
  if (adminWorkspace) {
  adminWorkspace.style.display = "none";
}}

  function showSignedInState(user, isAuthorized = false) {
    currentAdminUser = user || null;
    currentAdminAuthorized = Boolean(isAuthorized);

    if (adminIdentity) {
      const label =
        user?.user_metadata?.display_name ||
        user?.user_metadata?.full_name ||
        user?.email ||
        "Admin";

      adminIdentity.textContent =
        "Signed in: " +
        label +
        (currentAdminAuthorized ? " (Admin)" : " (Not authorized)");

      adminIdentity.style.display = "";
    }

    if (adminSignInBtn) {
      adminSignInBtn.style.display = "none";
    }

    if (adminSignOutBtn) {
      adminSignOutBtn.style.display = "";
    }if (adminWorkspace) {
  adminWorkspace.style.display = currentAdminAuthorized ? "" : "none";
}
  }

  async function isAuthorizedEditor(user) {
    if (
      !window.ctlSupabase ||
      !user?.id
    ) {
      return false;
    }

    const {
      data,
      error
    } = await window.ctlSupabase
      .from("authorized_editors")
      .select("auth_user_id, display_name, active")
      .eq("auth_user_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      console.error(
        "Authorized-editor check failed:",
        error
      );
      return false;
    }

    return Boolean(data);
  }

  async function refreshAdminState(user) {
    if (!user) {
      showSignedOutState();
      return;
    }

    const authorized =
      await isAuthorizedEditor(user);

    showSignedInState(
      user,
      authorized
    );
  }

  async function initializeAdminAuth() {
    if (!window.ctlSupabase) {
      showSignedOutState();
      return;
    }

    const {
      data: { session }
    } = await window.ctlSupabase.auth.getSession();

    await refreshAdminState(
      session?.user || null
    );

    window.ctlSupabase.auth.onAuthStateChange(
      function (_event, session) {
        /*
          Do not await Supabase queries directly inside
          the auth callback. Run the authorization refresh
          after the callback returns.
        */
        setTimeout(
          function () {
            refreshAdminState(
              session?.user || null
            );
          },
          0
        );
      }
    );
  

  if (adminSignInBtn) {
      adminSignInBtn.style.display = "";
    }

    if (adminSignOutBtn) {
      adminSignOutBtn.style.display = "none";
    }
  }

  function showSignedInState(user) {
    if (adminIdentity) {
      adminIdentity.textContent =
        "Signed in: " + (user?.email || "Admin");
      adminIdentity.style.display = "";
    }

    if (adminSignInBtn) {
      adminSignInBtn.style.display = "none";
    }

    if (adminSignOutBtn) {
      adminSignOutBtn.style.display = "";
    }
  }

  async function initializeAdminAuth() {
    if (!window.ctlSupabase) {
      showSignedOutState();
      return;
    }

    const {
      data: { session }
    } = await window.ctlSupabase.auth.getSession();

    if (session?.user) {
      showSignedInState(session.user);
    } else {
      showSignedOutState();
    }

    window.ctlSupabase.auth.onAuthStateChange(
      function (_event, session) {
        if (session?.user) {
          showSignedInState(session.user);
        } else {
          showSignedOutState();
        }
      }
    );
  }

  if (adminSignInBtn) {
    adminSignInBtn.addEventListener(
      "click",
      function () {
        adminLoginMessage.textContent = "";
        adminPassword.value = "";

        if (!adminEmail.value) {
          adminEmail.value = "baldinoj@lackawanna.edu";
        }

        adminLoginDialog.showModal();
        adminEmail.focus();
      }
    );
  }

  if (adminCancelBtn) {
    adminCancelBtn.addEventListener(
      "click",
      function () {
        adminLoginDialog.close();
      }
    );
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();

        adminLoginMessage.textContent = "";
        adminSubmitBtn.disabled = true;
        adminSubmitBtn.textContent = "Signing In…";

        try {
          const { data, error } =
            await window.ctlSupabase.auth.signInWithPassword({
              email: adminEmail.value.trim(),
              password: adminPassword.value
            });

          if (error) {
            throw error;
          }

          if (!data?.user) {
            throw new Error("Sign-in did not return a user.");
          }

          adminPassword.value = "";
          adminLoginDialog.close();
          await refreshAdminState(data.user);

        } catch (error) {
          console.error(error);
          adminLoginMessage.textContent =
            error?.message || "Sign-in failed.";
        } finally {
          adminSubmitBtn.disabled = false;
          adminSubmitBtn.textContent = "Sign In";
        }
      }
    );
  }

  if (adminSignOutBtn) {
    adminSignOutBtn.addEventListener(
      "click",
      async function () {
        const { error } =
          await window.ctlSupabase.auth.signOut();

        if (error) {
          console.error(error);
          return;
        }

        showSignedOutState();
      }
    );
  }

  await initializeAdminAuth();

  const FT_COHORT_FACILITATOR = "Baldino, John";
  const IRT_FACILITATOR = "Baldino, John";
  const OFFICE_HOURS_FACILITATOR = "Baldino, John";

  let events = [];
  let selectedPerson = "";

  const ftCohortMembership = new Map();
  const ctlBlueMembership = new Map();


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


  /*
    Canonical CSV format:
      Last, First

    Interface format:
      First Last
  */

  function displayPersonName(person) {

    if (!person) {
      return "";
    }

    if (!person.includes(",")) {
      return person.trim();
    }

    const parts = person.split(",");

    const last =
      parts[0].trim();

    const first =
      parts
        .slice(1)
        .join(",")
        .trim();

    return (
      first + " " + last
    ).trim();
  }


  function displayParticipantList(
    participants
  ) {

    return participants
      .map(displayPersonName)
      .join("; ");
  }


  /* =========================================================
     CSV PARSER
     ========================================================= */

  function parseCSV(text) {

    const rows = [];

    let row = [];
    let field = "";
    let inQuotes = false;

    for (
      let i = 0;
      i < text.length;
      i++
    ) {

      const char =
        text[i];

      const next =
        text[i + 1];

      if (
        char === '"' &&
        inQuotes &&
        next === '"'
      ) {

        field += '"';
        i++;

      } else if (
        char === '"'
      ) {

        inQuotes =
          !inQuotes;

      } else if (
        char === "," &&
        !inQuotes
      ) {

        row.push(field);
        field = "";

      } else if (
        (
          char === "\n" ||
          char === "\r"
        ) &&
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
            cell =>
              cell.trim() !== ""
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
          cell =>
            cell.trim() !== ""
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

    const rows =
      parseCSV(text);

    if (
      rows.length < 2
    ) {

      return {
        events: [],
        updated: ""
      };
    }


    const headers =
      getHeaders(rows);


    const index = {

      updated:
        headers.indexOf(
          "Updated"
        ),

      date:
        headers.indexOf(
          "Date"
        ),

      semester:
        headers.indexOf(
          "Semester"
        ),

      ay:
        headers.indexOf(
          "AY"
        ),

      topic:
        headers.indexOf(
          "Topic"
        ),

      facilitator:
        headers.indexOf(
          "Facilitator"
        ),

      participants:
        headers.indexOf(
          "Participants"
        ),

      total:
        headers.indexOf(
          "Total"
        ),

      type:
        headers.indexOf(
          "Event Type"
        )
    };


    const updated =
      index.updated >= 0
        ? (
            rows[1][
              index.updated
            ] || ""
          ).trim()
        : "";


    const parsedEvents =
      rows
        .slice(1)
        .map(row => {

          let topic =
            (
              row[index.topic] ||
              ""
            ).trim();

          let type =
            (
              row[index.type] ||
              ""
            ).trim();


          /*
            Normalize historical terminology.
          */

          if (
            normalize(topic) ===
            normalize(
              "One-on-One Office Hours"
            )
          ) {

            topic =
              "Office Hours";
          }


          if (
            normalize(type) ===
            normalize(
              "One-on-One Office Hours"
            )
          ) {

            type =
              "Office Hours";
          }


          return {

            date:
              (
                row[index.date] ||
                ""
              ).trim(),

            semester:
              (
                row[
                  index.semester
                ] ||
                ""
              ).trim(),

            academicYear:
              (
                row[index.ay] ||
                ""
              ).trim(),

            topic:
              topic,

            facilitator:
              (
                row[
                  index.facilitator
                ] ||
                ""
              ).trim(),

            participants:
              (
                row[
                  index.participants
                ] ||
                ""
              )
                .split(";")
                .map(
                  name =>
                    name.trim()
                )
                .filter(Boolean),

            total:
              Number(
                row[index.total] ||
                0
              ),

            type:
              type,

            source:
              "Participation"
          };
        });


    return {
      events:
        parsedEvents,
      updated:
        updated
    };
  }


  /* =========================================================
     PROGRAM MEMBERSHIP
     ========================================================= */

  function loadMembershipCSV(
    text,
    membershipMap
  ) {

    const rows =
      parseCSV(text);

    if (
      rows.length < 2
    ) {
      return;
    }


    const headers =
      getHeaders(rows);


    const ayIndex =
      headers.indexOf("AY");

    const participantIndex =
      headers.indexOf(
        "Participant"
      );


    rows
      .slice(1)
      .forEach(row => {

        const ay =
          (
            row[ayIndex] ||
            ""
          ).trim();

        const participant =
          (
            row[
              participantIndex
            ] ||
            ""
          ).trim();


        if (
          !ay ||
          !participant
        ) {
          return;
        }


        const key =
          personKey(
            participant
          );


        if (
          !membershipMap.has(
            key
          )
        ) {

          membershipMap.set(
            key,
            {
              name:
                participant,

              years:
                new Set()
            }
          );
        }


        membershipMap
          .get(key)
          .years
          .add(ay);
      });
  }


  function getMembershipYears(
    membershipMap,
    person
  ) {

    const record =
      membershipMap.get(
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
     FULL-TIME COHORT SESSION ATTENDANCE
     ========================================================= */

  function loadCohortAttendanceCSV(
    text
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
        headers.indexOf(
          "AY"
        ),

      participant:
        headers.indexOf(
          "Participant"
        ),

      semester:
        headers.indexOf(
          "Semester"
        ),

      title:
        headers.indexOf(
          "Session Title"
        ),

      date:
        headers.indexOf(
          "Date"
        ),

      attended:
        headers.indexOf(
          "Attended"
        )
    };


    const groupedSessions =
      new Map();


    rows
      .slice(1)
      .forEach(row => {

        const ay =
          (
            row[index.ay] ||
            ""
          ).trim();

        const participant =
          (
            row[
              index.participant
            ] ||
            ""
          ).trim();

        const semester =
          (
            row[
              index.semester
            ] ||
            ""
          ).trim();

        const title =
          (
            row[index.title] ||
            ""
          ).trim();

        const date =
          (
            row[index.date] ||
            ""
          ).trim();

        const attended =
          (
            row[
              index.attended
            ] ||
            ""
          )
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


        /*
          A "No" record documents an absence.
          It does NOT create attendance.
        */

        if (!didAttend) {
          return;
        }


        const key =
          [
            ay,
            semester,
            date,
            title
          ].join("|||");


        if (
          !groupedSessions.has(
            key
          )
        ) {

          groupedSessions.set(
            key,
            {
              date:
                date,

              semester:
                semester,

              academicYear:
                ay,

              topic:
                title,

              facilitator:
                FT_COHORT_FACILITATOR,

              participants:
                [],

              total:
                0,

              type:
                "Full-Time Cohort",

              source:
                "Full-Time Cohort Attendance"
            }
          );
        }


        const session =
          groupedSessions.get(
            key
          );


        const alreadyPresent =
          session.participants.some(
            existing =>
              personKey(existing) ===
              personKey(
                participant
              )
          );


        if (
          !alreadyPresent
        ) {

          session.participants.push(
            participant
          );
        }
      });


    const cohortEvents =
      Array.from(
        groupedSessions.values()
      );


    cohortEvents.forEach(
      event => {

        event.participants.sort(
          (a, b) =>
            displayPersonName(a)
              .localeCompare(
                displayPersonName(b)
              )
        );


        /*
          Total includes facilitator.
        */

        event.total =
          event.participants.length +
          1;
      }
    );


    return cohortEvents;
  }


  /* =========================================================
     INSTRUCTOR READINESS TRAINING
     ========================================================= */

  function loadIRTCSV(text) {

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
        headers.indexOf(
          "AY"
        ),

      semester:
        headers.indexOf(
          "Semester"
        ),

      program:
        headers.indexOf(
          "Program"
        ),

      facilitator:
        headers.indexOf(
          "Facilitator"
        ),

      participant:
        headers.indexOf(
          "Participant"
        )
    };


    const groups =
      new Map();


    rows
      .slice(1)
      .forEach(row => {

        const ay =
          (
            row[index.ay] ||
            ""
          ).trim();

        const semester =
          (
            row[
              index.semester
            ] ||
            ""
          ).trim();

        const program =
          (
            row[
              index.program
            ] ||
            ""
          ).trim();

        const participant =
          (
            row[
              index.participant
            ] ||
            ""
          ).trim();

        const facilitator =
          (
            row[
              index.facilitator
            ] ||
            ""
          ).trim() ||
          IRT_FACILITATOR;


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
              date:
                "",

              semester:
                semester,

              academicYear:
                ay,

              topic:
                program,

              facilitator:
                facilitator,

              participants:
                [],

              total:
                0,

              type:
                program,

              source:
                "Instructor Readiness Training"
            }
          );
        }


        const event =
          groups.get(key);


        const alreadyPresent =
          event.participants.some(
            existing =>
              personKey(existing) ===
              personKey(
                participant
              )
          );


        if (
          !alreadyPresent
        ) {

          event.participants.push(
            participant
          );
        }
      });


    const irtEvents =
      Array.from(
        groups.values()
      );


    irtEvents.forEach(
      event => {

        event.participants.sort(
          (a, b) =>
            displayPersonName(a)
              .localeCompare(
                displayPersonName(b)
              )
        );


        event.total =
          event.participants.length +
          1;
      }
    );


    return irtEvents;
  }


  /* =========================================================
     OFFICE HOURS
     ========================================================= */

  function isOfficeHoursEvent(
    event
  ) {

    return (
      normalize(event.type) ===
        normalize(
          "Office Hours"
        ) ||
      normalize(event.topic)
        .includes(
          normalize(
            "Office Hours"
          )
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
          isOfficeHoursEvent(
            event
          )
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
        headers.indexOf(
          "AY"
        ),

      semester:
        headers.indexOf(
          "Semester"
        ),

      facilitator:
        headers.indexOf(
          "Facilitator"
        ),

      participant:
        headers.indexOf(
          "Participant"
        )
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
          (
            row[index.ay] ||
            ""
          ).trim();

        const semester =
          (
            row[
              index.semester
            ] ||
            ""
          ).trim();

        const participant =
          (
            row[
              index.participant
            ] ||
            ""
          ).trim();

        const facilitator =
          (
            row[
              index.facilitator
            ] ||
            ""
          ).trim() ||
          OFFICE_HOURS_FACILITATOR;


        if (
          !ay ||
          !semester ||
          !participant
        ) {
          return;
        }


        const personSemesterKey =
          makeOfficeHoursPersonKey(
            ay,
            semester,
            participant
          );


        /*
          Do not duplicate an Office Hours
          record already in the master.
        */

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
              date:
                "",

              semester:
                semester,

              academicYear:
                ay,

              topic:
                "Office Hours",

              facilitator:
                facilitator,

              participants:
                [],

              total:
                0,

              type:
                "Office Hours",

              source:
                "Office Hours Supplemental"
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
              personKey(
                participant
              )
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
            displayPersonName(a)
              .localeCompare(
                displayPersonName(b)
              )
        );


        event.total =
          event.participants.length +
          1;
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


    /*
      Membership AYs also belong in the
      AY selector even when no session
      has yet occurred.
    */

    [
      ftCohortMembership,
      ctlBlueMembership
    ].forEach(
      membershipMap => {

        membershipMap.forEach(
          record => {

            record.years.forEach(
              year =>
                yearSet.add(
                  year
                )
            );
          }
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
      .forEach(
        semester => {

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
      );


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

  function addPersonToMap(
    people,
    person
  ) {

    if (!person) {
      return;
    }

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


  function getAllPeople() {

    const people =
      new Map();


    /*
      Actual participation.
    */

    events.forEach(event => {

      addPersonToMap(
        people,
        event.facilitator
      );


      event.participants.forEach(
        person =>
          addPersonToMap(
            people,
            person
          )
      );
    });


    /*
      Program membership.

      This makes enrolled people searchable
      even if they have not yet attended
      a session. This is especially important
      for CTL Blue AY 2026-2027.
    */

    ftCohortMembership.forEach(
      record =>
        addPersonToMap(
          people,
          record.name
        )
    );


    ctlBlueMembership.forEach(
      record =>
        addPersonToMap(
          people,
          record.name
        )
    );


    return [
      ...people.values()
    ].sort(
      (a, b) =>
        displayPersonName(a)
          .localeCompare(
            displayPersonName(b)
          )
    );
  }


  function personMatchesQuery(
    name,
    query
  ) {

    const normalizedName =
      normalize(
        displayPersonName(
          name
        )
      );

    const canonicalName =
      normalize(name);

    const normalizedQuery =
      normalize(query);


    if (
      !normalizedQuery
    ) {
      return false;
    }


    const queryParts =
      normalizedQuery
        .split(" ");


    /*
      Search works with either
      First Last or Last, First.
    */

    return queryParts.every(
      part =>
        normalizedName.includes(
          part
        ) ||
        canonicalName.includes(
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
      personKey(
        selectedName
      )
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
          displayPersonName(
            event.facilitator
          ),
          event.type,
          ...event.participants,
          ...event.participants.map(
            displayPersonName
          )
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
     PERSON SELECTION
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


  /* =========================================================
     PERSON SUMMARY
     ========================================================= */

  function displayPersonSummary(
    person,
    total
  ) {

    const displayName =
      displayPersonName(
        person
      );


    const cohortYears =
      getMembershipYears(
        ftCohortMembership,
        person
      );


    const blueYears =
      getMembershipYears(
        ctlBlueMembership,
        person
      );


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


    if (
      blueYears.length
    ) {

      const blueText =
        blueYears
          .map(
            year =>
              "AY " + year
          )
          .join(", ");


      html +=
        " &nbsp;|&nbsp; " +
        "<strong>CTL Blue:</strong> " +
        blueText;
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


      /*
        Facilitator is displayed First Last.
      */

      row.appendChild(
        createCell(
          displayPersonName(
            event.facilitator
          )
        )
      );


      if (
        !personMode
      ) {

        /*
          Outlook-ready participant list:
          First Last; First Last; First Last
        */

        row.appendChild(
          createCell(
            displayParticipantList(
              event.participants
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


      body.appendChild(
        row
      );
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


    /*
      Only actual event participation counts.

      Membership in FT Cohort or CTL Blue
      never creates a session count.
    */

    const results =
      events.filter(
        event =>
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
     SUPABASE DATA LAYER
     ========================================================= */

  function canonicalNameFromPersonRecord(person) {
    if (!person) {
      return "";
    }

    const first = String(person.first_name || "").trim();
    const last = String(person.last_name || "").trim();

    if (last && first) {
      return `${last}, ${first}`;
    }

    return last || first;
  }


  function formatDatabaseDate(value, eventType) {
    if (!value) {
      return eventType === "Office Hours" ? "Various" : "";
    }

    const parts = String(value).split("-");

    if (parts.length !== 3) {
      return String(value);
    }

    const [year, month, day] = parts.map(Number);

    if (!year || !month || !day) {
      return String(value);
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC"
      }
    ).format(
      new Date(Date.UTC(year, month - 1, day))
    );
  }


  function formatUpdatedTimestamp(value) {
    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "en-US",
      {
        month: "numeric",
        day: "numeric",
        year: "numeric"
      }
    ).format(date);
  }


  async function selectAllRows(
    table,
    columns,
    orderBy = "id"
  ) {
    const pageSize = 1000;
    let from = 0;
    let allRows = [];

    while (true) {
      const {
        data,
        error
      } = await window.ctlSupabase
        .from(table)
        .select(columns)
        .order(
          orderBy,
          {
            ascending: true
          }
        )
        .range(
          from,
          from + pageSize - 1
        );

      if (error) {
        throw new Error(
          `${table} could not be loaded: ${error.message}`
        );
      }

      const rows = data || [];

      allRows.push(...rows);

      if (rows.length < pageSize) {
        break;
      }

      from += pageSize;
    }

    return allRows;
  }


  function addMembershipRecord(
    membershipMap,
    person,
    academicYear
  ) {
    if (
      !person ||
      !academicYear
    ) {
      return;
    }

    const key =
      personKey(person);

    if (
      !membershipMap.has(key)
    ) {
      membershipMap.set(
        key,
        {
          name: person,
          years: new Set()
        }
      );
    }

    membershipMap
      .get(key)
      .years
      .add(academicYear);
  }


  try {
    if (
      !window.ctlSupabase
    ) {
      throw new Error(
        "Supabase client is not available."
      );
    }

    status.textContent =
      "Loading participation data…";


    const [
      peopleRows,
      eventRows,
      attendanceRows,
      enrollmentRows
    ] = await Promise.all([
      selectAllRows(
        "people",
        "id, first_name, last_name, email, created_at, updated_at"
      ),

      selectAllRows(
        "events",
        "id, event_date, semester, academic_year, event_type, topic, facilitator_id, created_at, updated_at"
      ),

      selectAllRows(
        "attendance",
        "id, event_id, person_id, created_at"
      ),

      selectAllRows(
        "program_enrollments",
        "id, person_id, program_name, academic_year, created_at, updated_at"
      )
    ]);


    /*
      Build one canonical Last, First name
      for every person in the database.
    */

    const peopleById =
      new Map();

    peopleRows.forEach(
      person => {
        peopleById.set(
          person.id,
          canonicalNameFromPersonRecord(
            person
          )
        );
      }
    );


    /*
      Program membership remains separate
      from event participation.
    */

    ftCohortMembership.clear();
    ctlBlueMembership.clear();

    enrollmentRows.forEach(
      enrollment => {
        const person =
          peopleById.get(
            enrollment.person_id
          ) || "";

        if (
          enrollment.program_name ===
          "Full-Time Cohort"
        ) {
          addMembershipRecord(
            ftCohortMembership,
            person,
            enrollment.academic_year
          );
        }

        if (
          enrollment.program_name ===
          "CTL Blue"
        ) {
          addMembershipRecord(
            ctlBlueMembership,
            person,
            enrollment.academic_year
          );
        }
      }
    );


    /*
      Group attendance by event.
    */

    const participantsByEvent =
      new Map();

    attendanceRows.forEach(
      attendance => {
        const person =
          peopleById.get(
            attendance.person_id
          );

        if (!person) {
          return;
        }

        if (
          !participantsByEvent.has(
            attendance.event_id
          )
        ) {
          participantsByEvent.set(
            attendance.event_id,
            new Set()
          );
        }

        participantsByEvent
          .get(attendance.event_id)
          .add(person);
      }
    );


    /*
      Convert relational event records to
      the same event objects used by the
      existing search/rendering interface.
    */

    events =
      eventRows.map(
        event => {
          const facilitator =
            peopleById.get(
              event.facilitator_id
            ) || "";

          const participantSet =
            participantsByEvent.get(
              event.id
            ) || new Set();

          /*
            Defensive check: even if bad data
            is ever inserted later, do not count
            the facilitator twice.
          */

          if (facilitator) {
            participantSet.delete(
              facilitator
            );
          }

          const participants =
            Array
              .from(participantSet)
              .sort(
                (a, b) =>
                  displayPersonName(a)
                    .localeCompare(
                      displayPersonName(b)
                    )
              );

          return {
            id:
              event.id,

            date:
              formatDatabaseDate(
                event.event_date,
                event.event_type
              ),

            semester:
              event.semester || "",

            academicYear:
              event.academic_year || "",

            topic:
              event.topic || "",

            facilitator:
              facilitator,

            participants:
              participants,

            total:
              participants.length +
              (facilitator ? 1 : 0),

            type:
              event.event_type || "",

            source:
              "Supabase"
          };
        }
      );


    /*
      Find the latest database activity date
      for the small "Data updated" indicator.
    */

    const timestamps = [
      ...peopleRows.map(
        row =>
          row.updated_at ||
          row.created_at
      ),

      ...eventRows.map(
        row =>
          row.updated_at ||
          row.created_at
      ),

      ...attendanceRows.map(
        row =>
          row.created_at
      ),

      ...enrollmentRows.map(
        row =>
          row.updated_at ||
          row.created_at
      )
    ]
      .filter(Boolean)
      .map(
        value =>
          new Date(value)
      )
      .filter(
        date =>
          !Number.isNaN(
            date.getTime()
          )
      );

    const latestTimestamp =
      timestamps.length
        ? new Date(
            Math.max(
              ...timestamps.map(
                date =>
                  date.getTime()
              )
            )
          )
        : null;


    if (
      updatedDate
    ) {
      updatedDate.textContent =
        latestTimestamp
          ? "Data updated: " +
            formatUpdatedTimestamp(
              latestTimestamp
            )
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
