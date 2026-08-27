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
  const adminWorkspace = document.getElementById("adminWorkspace");

  let currentAdminUser = null;
  let currentAdminAuthorized = false;
  let adminWorkspaceInitialized = false;

  /* =========================================================
     ADMIN AUTHENTICATION
     Authorized users see the Admin Tools workspace.
     Editing controls are added separately.
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
    }
  }

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
    }

    if (adminWorkspace) {
      adminWorkspace.style.display =
        currentAdminAuthorized ? "" : "none";
    }

    if (currentAdminAuthorized) {
      initializeAdminWorkspace();
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
  }


  /* =========================================================
     ADMIN DATA MANAGEMENT
     Add events, add attendees, edit/delete events, and
     bulk-create a semester schedule.
     ========================================================= */

  function initializeAdminWorkspace() {
    if (
      !adminWorkspace ||
      adminWorkspaceInitialized
    ) {
      return;
    }

    adminWorkspaceInitialized = true;

    const inner =
      adminWorkspace.querySelector(
        ".admin-workspace-inner"
      ) || adminWorkspace;

    inner.innerHTML = `
      <div class="ctl-admin-shell">
        <div class="ctl-admin-heading">
          <div>
            <h2>Admin Tools</h2>
            <p>Add and maintain CTL participation records.</p>
          </div>
        </div>

        <div class="ctl-admin-tabs" role="tablist" aria-label="Admin tools">
          <button type="button" class="ctl-admin-tab is-active" data-admin-panel="addEventPanel">Add Event</button>
          <button type="button" class="ctl-admin-tab" data-admin-panel="addAttendeesPanel">Add Attendees</button>
          <button type="button" class="ctl-admin-tab" data-admin-panel="editEventPanel">Edit Event</button>
          <button type="button" class="ctl-admin-tab" data-admin-panel="bulkEventsPanel">Bulk Semester Events</button>
        </div>

        <div id="adminToolMessage" class="ctl-admin-message" aria-live="polite"></div>

        <section id="addEventPanel" class="ctl-admin-panel is-active">
          <h3>Add New Event</h3>
          <form id="addEventForm">
            ${adminEventFieldsHtml("add")}
            <div class="ctl-admin-actions">
              <button type="submit" class="primary">Add Event</button>
              <button type="reset" class="secondary">Clear</button>
            </div>
          </form>
        </section>

        <section id="addAttendeesPanel" class="ctl-admin-panel">
          <h3>Add Attendees to Existing Event</h3>
          <div class="ctl-admin-field ctl-admin-wide">
            <label for="attendeeEventSearch">Find event</label>
            <input id="attendeeEventSearch" type="search" placeholder="Filter by date, topic, semester, or AY">
          </div>
          <div class="ctl-admin-field ctl-admin-wide">
            <label for="attendeeEventSelect">Event</label>
            <select id="attendeeEventSelect"></select>
          </div>
          <form id="addAttendeesForm">
            <div class="ctl-admin-field ctl-admin-wide">
              <label for="newAttendees">Attendees to add</label>
              <textarea id="newAttendees" rows="7" placeholder="One person per line. First Last or Last, First."></textarea>
              <small>Existing attendees will be preserved. Duplicate names are ignored.</small>
            </div>
            <div class="ctl-admin-actions">
              <button type="submit" class="primary">Add Attendees</button>
            </div>
          </form>
        </section>

        <section id="editEventPanel" class="ctl-admin-panel">
          <h3>Edit Existing Event</h3>
          <div class="ctl-admin-field ctl-admin-wide">
            <label for="editEventSearch">Find event</label>
            <input id="editEventSearch" type="search" placeholder="Filter by date, topic, semester, or AY">
          </div>
          <div class="ctl-admin-field ctl-admin-wide">
            <label for="editEventSelect">Event</label>
            <select id="editEventSelect"></select>
          </div>

          <form id="editEventForm" style="display:none;">
            ${adminEventFieldsHtml("edit")}
            <div class="ctl-admin-actions">
              <button type="submit" class="primary">Save Changes</button>
              <button id="deleteEventBtn" type="button" class="ctl-admin-danger">Delete Event</button>
            </div>
          </form>
        </section>

        <section id="bulkEventsPanel" class="ctl-admin-panel">
          <h3>Bulk Add Semester Events</h3>

          <div class="ctl-admin-grid ctl-admin-two">
            <div class="ctl-admin-field">
              <label for="bulkAcademicYear">Academic Year</label>
              <input id="bulkAcademicYear" list="adminAyList" placeholder="2026-2027">
            </div>

            <div class="ctl-admin-field">
              <label for="bulkSemester">Semester</label>
              <input id="bulkSemester" list="adminSemesterList" placeholder="Fall">
            </div>
          </div>

          <div class="ctl-admin-field ctl-admin-wide">
            <label for="bulkEventsText">Paste semester events</label>
            <textarea id="bulkEventsText" rows="10" placeholder="Paste from Excel using columns: Date | Event Type | Topic | Facilitator | Attendees"></textarea>
            <small>Best method: paste tab-separated rows from Excel. Put multiple attendees in the Attendees cell separated by semicolons.</small>
          </div>

          <div class="ctl-admin-actions">
            <button id="previewBulkEventsBtn" type="button" class="secondary">Preview</button>
            <button id="saveBulkEventsBtn" type="button" class="primary" disabled>Add All Events</button>
          </div>

          <div id="bulkPreview" class="ctl-admin-preview"></div>
        </section>

        <datalist id="adminAyList"></datalist>
        <datalist id="adminSemesterList"></datalist>
        <datalist id="adminTypeList"></datalist>
      </div>
    `;

    injectAdminStyles();
    wireAdminTabs();
    wireAdminForms();

    refreshAdminReferenceData()
      .catch(function (error) {
        console.error(error);
        setAdminMessage(
          error?.message ||
          "Admin reference data could not be loaded.",
          true
        );
      });
  }


  function adminEventFieldsHtml(prefix) {
    const p = prefix;

    return `
      <div class="ctl-admin-grid">
        <div class="ctl-admin-field">
          <label for="${p}EventDate">Date</label>
          <input id="${p}EventDate" type="date">
        </div>

        <div class="ctl-admin-field">
          <label for="${p}AcademicYear">Academic Year</label>
          <input id="${p}AcademicYear" list="adminAyList" placeholder="2026-2027" required>
        </div>

        <div class="ctl-admin-field">
          <label for="${p}Semester">Semester</label>
          <input id="${p}Semester" list="adminSemesterList" placeholder="Fall" required>
        </div>

        <div class="ctl-admin-field">
          <label for="${p}EventType">Event Type</label>
          <input id="${p}EventType" list="adminTypeList" placeholder="Roundtable" required>
        </div>

        <div class="ctl-admin-field ctl-admin-span-2">
          <label for="${p}Topic">Topic</label>
          <input id="${p}Topic" type="text" required>
        </div>

        <div class="ctl-admin-field ctl-admin-span-2">
          <label for="${p}Facilitator">Facilitator</label>
          <input id="${p}Facilitator" type="text" placeholder="First Last or Last, First" required>
        </div>

        <div class="ctl-admin-field ctl-admin-wide">
          <label for="${p}Participants">Attendees</label>
          <textarea id="${p}Participants" rows="8" placeholder="One person per line. First Last or Last, First."></textarea>
          <small>Paste the entire attendee list at once. The facilitator is stored separately and will not be duplicated as an attendee.</small>
        </div>
      </div>
    `;
  }


  function injectAdminStyles() {
    if (
      document.getElementById(
        "ctlAdminRuntimeStyles"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "ctlAdminRuntimeStyles";

    style.textContent = `
      .admin-workspace {
        max-width: 1400px;
        margin: 24px auto 0;
        padding: 0 28px;
      }

      .ctl-admin-shell {
        background: #fff;
        border: 1px solid #d9dde2;
        border-radius: 8px;
        padding: 22px;
        box-shadow: 0 1px 3px rgba(0,0,0,.05);
      }

      .ctl-admin-heading h2 {
        margin: 0 0 5px;
        font-size: 1.35rem;
      }

      .ctl-admin-heading p {
        margin: 0 0 18px;
        color: #666;
      }

      .ctl-admin-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 18px;
      }

      .ctl-admin-tab {
        height: auto;
        min-height: 40px;
        padding: 9px 14px;
        background: #fff;
        color: #263b52;
        border: 1px solid #aeb7c1;
      }

      .ctl-admin-tab.is-active {
        background: #263b52;
        color: #fff;
        border-color: #263b52;
      }

      .ctl-admin-panel {
        display: none;
        border-top: 1px solid #e2e5e8;
        padding-top: 18px;
      }

      .ctl-admin-panel.is-active {
        display: block;
      }

      .ctl-admin-panel h3 {
        margin: 0 0 16px;
      }

      .ctl-admin-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px 18px;
      }

      .ctl-admin-two {
        margin-bottom: 14px;
      }

      .ctl-admin-field {
        display: flex;
        flex-direction: column;
        min-width: 0;
        margin-bottom: 14px;
      }

      .ctl-admin-field label {
        margin-bottom: 6px;
        font-size: .9rem;
        font-weight: 700;
      }

      .ctl-admin-field input,
      .ctl-admin-field select,
      .ctl-admin-field textarea {
        width: 100%;
        border: 1px solid #b9c0c8;
        border-radius: 5px;
        padding: 10px 12px;
        font: inherit;
        background: #fff;
        color: #222;
      }

      .ctl-admin-field input,
      .ctl-admin-field select {
        min-height: 44px;
      }

      .ctl-admin-field textarea {
        resize: vertical;
      }

      .ctl-admin-field small {
        margin-top: 5px;
        color: #6b7279;
        line-height: 1.35;
      }

      .ctl-admin-span-2,
      .ctl-admin-wide {
        grid-column: 1 / -1;
      }

      .ctl-admin-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 4px;
      }

      .ctl-admin-danger {
        background: #fff;
        color: #8b1e1e;
        border: 1px solid #b97171;
      }

      .ctl-admin-danger:hover {
        background: #fff4f4;
      }

      .ctl-admin-message {
        display: none;
        margin: 0 0 18px;
        padding: 11px 13px;
        border-radius: 5px;
        background: #eef3f7;
        border-left: 4px solid #263b52;
      }

      .ctl-admin-message.is-error {
        background: #fff3f3;
        border-left-color: #9d2b2b;
      }

      .ctl-admin-preview {
        margin-top: 18px;
        overflow-x: auto;
      }

      .ctl-admin-preview table {
        min-width: 900px;
      }

      .ctl-admin-preview .preview-error {
        color: #9d2b2b;
        font-weight: 700;
      }

      @media (max-width: 700px) {
        .admin-workspace {
          padding: 0 16px;
        }

        .ctl-admin-grid {
          grid-template-columns: 1fr;
        }

        .ctl-admin-span-2,
        .ctl-admin-wide {
          grid-column: auto;
        }

        .ctl-admin-tab {
          flex: 1 1 45%;
        }
      }
    `;

    document.head.appendChild(
      style
    );
  }


  function wireAdminTabs() {
    const tabs =
      adminWorkspace.querySelectorAll(
        ".ctl-admin-tab"
      );

    const panels =
      adminWorkspace.querySelectorAll(
        ".ctl-admin-panel"
      );

    tabs.forEach(function (tab) {
      tab.addEventListener(
        "click",
        function () {
          tabs.forEach(
            item =>
              item.classList.remove(
                "is-active"
              )
          );

          panels.forEach(
            panel =>
              panel.classList.remove(
                "is-active"
              )
          );

          tab.classList.add(
            "is-active"
          );

          const panel =
            document.getElementById(
              tab.dataset.adminPanel
            );

          if (panel) {
            panel.classList.add(
              "is-active"
            );
          }
        }
      );
    });
  }


  function setAdminMessage(
    message,
    isError = false
  ) {
    const box =
      document.getElementById(
        "adminToolMessage"
      );

    if (!box) {
      return;
    }

    box.textContent =
      message || "";

    box.classList.toggle(
      "is-error",
      Boolean(isError)
    );

    box.style.display =
      message ? "block" : "none";
  }


  function normalizeAdminName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[.,;:()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }


  function adminDisplayName(person) {
    const first =
      String(
        person?.first_name || ""
      ).trim();

    const last =
      String(
        person?.last_name || ""
      ).trim();

    return (
      first + " " + last
    ).trim();
  }


  function parseAdminPersonName(value) {
    const raw =
      String(value || "")
        .trim();

    if (!raw) {
      return null;
    }

    if (raw.includes(",")) {
      const parts =
        raw.split(",");

      const last =
        parts.shift().trim();

      const first =
        parts.join(",").trim();

      if (!last || !first) {
        return null;
      }

      return {
        first_name: first,
        last_name: last
      };
    }

    const parts =
      raw
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length < 2) {
      return null;
    }

    return {
      first_name:
        parts.slice(0, -1).join(" "),
      last_name:
        parts[parts.length - 1]
    };
  }


  function parseAdminNameList(text) {
    const values =
      String(text || "")
        .split(/\r?\n|;/)
        .map(
          value =>
            value.trim()
        )
        .filter(Boolean);

    const unique =
      new Map();

    values.forEach(function (value) {
      unique.set(
        normalizeAdminName(value),
        value
      );
    });

    return [
      ...unique.values()
    ];
  }


  async function adminFetchPeople() {
    const {
      data,
      error
    } = await window.ctlSupabase
      .from("people")
      .select(
        "id, first_name, last_name, email"
      )
      .order(
        "last_name",
        {
          ascending: true
        }
      );

    if (error) {
      throw new Error(
        "People could not be loaded: " +
        error.message
      );
    }

    return data || [];
  }


  async function adminEnsurePeople(
    rawNames
  ) {
    const names =
      rawNames
        .map(
          value =>
            String(value || "").trim()
        )
        .filter(Boolean);

    const people =
      await adminFetchPeople();

    const byName =
      new Map();

    people.forEach(function (person) {
      byName.set(
        normalizeAdminName(
          adminDisplayName(person)
        ),
        person
      );

      byName.set(
        normalizeAdminName(
          `${person.last_name}, ${person.first_name}`
        ),
        person
      );
    });

    const resolved =
      new Map();

    for (const rawName of names) {
      const key =
        normalizeAdminName(
          rawName
        );

      if (resolved.has(key)) {
        continue;
      }

      let person =
        byName.get(key);

      if (!person) {
        const parsed =
          parseAdminPersonName(
            rawName
          );

        if (!parsed) {
          throw new Error(
            `Could not interpret the name "${rawName}". Use First Last or Last, First.`
          );
        }

        const {
          data,
          error
        } = await window.ctlSupabase
          .from("people")
          .insert(parsed)
          .select(
            "id, first_name, last_name, email"
          )
          .single();

        if (error) {
          throw new Error(
            `Could not add "${rawName}": ${error.message}`
          );
        }

        person =
          data;

        byName.set(
          normalizeAdminName(
            adminDisplayName(person)
          ),
          person
        );

        byName.set(
          normalizeAdminName(
            `${person.last_name}, ${person.first_name}`
          ),
          person
        );
      }

      resolved.set(
        key,
        person
      );
    }

    return resolved;
  }


  function getAdminEventFormValues(
    prefix
  ) {
    const date =
      document.getElementById(
        prefix + "EventDate"
      ).value;

    const academicYear =
      document.getElementById(
        prefix + "AcademicYear"
      ).value.trim();

    const semester =
      document.getElementById(
        prefix + "Semester"
      ).value.trim();

    const eventType =
      document.getElementById(
        prefix + "EventType"
      ).value.trim();

    const topic =
      document.getElementById(
        prefix + "Topic"
      ).value.trim();

    const facilitator =
      document.getElementById(
        prefix + "Facilitator"
      ).value.trim();

    const participants =
      parseAdminNameList(
        document.getElementById(
          prefix + "Participants"
        ).value
      );

    if (
      !academicYear ||
      !semester ||
      !eventType ||
      !topic ||
      !facilitator
    ) {
      throw new Error(
        "Academic year, semester, event type, topic, and facilitator are required."
      );
    }

    return {
      date,
      academicYear,
      semester,
      eventType,
      topic,
      facilitator,
      participants
    };
  }


  async function adminResolveEventPeople(
    facilitatorName,
    participantNames
  ) {
    const allNames = [
      facilitatorName,
      ...participantNames
    ];

    const resolved =
      await adminEnsurePeople(
        allNames
      );

    const facilitator =
      resolved.get(
        normalizeAdminName(
          facilitatorName
        )
      );

    if (!facilitator) {
      throw new Error(
        "Facilitator could not be resolved."
      );
    }

    const participantIds =
      participantNames
        .map(function (name) {
          const person =
            resolved.get(
              normalizeAdminName(
                name
              )
            );

          return person?.id || null;
        })
        .filter(Boolean)
        .filter(
          id =>
            id !== facilitator.id
        );

    return {
      facilitator,
      participantIds: [
        ...new Set(
          participantIds
        )
      ]
    };
  }


  async function adminCreateEvent(
    values
  ) {
    const {
      facilitator,
      participantIds
    } = await adminResolveEventPeople(
      values.facilitator,
      values.participants
    );

    const {
      data: event,
      error: eventError
    } = await window.ctlSupabase
      .from("events")
      .insert({
        event_date:
          values.date || null,
        semester:
          values.semester,
        academic_year:
          values.academicYear,
        event_type:
          values.eventType,
        topic:
          values.topic,
        facilitator_id:
          facilitator.id
      })
      .select(
        "id"
      )
      .single();

    if (eventError) {
      throw new Error(
        "Event could not be added: " +
        eventError.message
      );
    }

    if (participantIds.length) {
      const rows =
        participantIds.map(
          personId => ({
            event_id:
              event.id,
            person_id:
              personId
          })
        );

      const {
        error: attendanceError
      } = await window.ctlSupabase
        .from("attendance")
        .insert(rows);

      if (attendanceError) {
        await window.ctlSupabase
          .from("events")
          .delete()
          .eq(
            "id",
            event.id
          );

        throw new Error(
          "The event was rolled back because attendance could not be added: " +
          attendanceError.message
        );
      }
    }

    return event.id;
  }


  async function adminFetchEventBundle() {
    const [
      peopleResult,
      eventsResult,
      attendanceResult
    ] = await Promise.all([
      window.ctlSupabase
        .from("people")
        .select(
          "id, first_name, last_name, email"
        ),

      window.ctlSupabase
        .from("events")
        .select(
          "id, event_date, semester, academic_year, event_type, topic, facilitator_id"
        )
        .order(
          "event_date",
          {
            ascending: false,
            nullsFirst: false
          }
        ),

      window.ctlSupabase
        .from("attendance")
        .select(
          "id, event_id, person_id"
        )
    ]);

    if (peopleResult.error) {
      throw new Error(
        "People could not be loaded: " +
        peopleResult.error.message
      );
    }

    if (eventsResult.error) {
      throw new Error(
        "Events could not be loaded: " +
        eventsResult.error.message
      );
    }

    if (attendanceResult.error) {
      throw new Error(
        "Attendance could not be loaded: " +
        attendanceResult.error.message
      );
    }

    const peopleById =
      new Map();

    (peopleResult.data || [])
      .forEach(function (person) {
        peopleById.set(
          person.id,
          person
        );
      });

    const attendanceByEvent =
      new Map();

    (attendanceResult.data || [])
      .forEach(function (row) {
        if (
          !attendanceByEvent.has(
            row.event_id
          )
        ) {
          attendanceByEvent.set(
            row.event_id,
            []
          );
        }

        attendanceByEvent
          .get(row.event_id)
          .push(row);
      });

    const records =
      (eventsResult.data || [])
        .map(function (event) {
          const facilitator =
            peopleById.get(
              event.facilitator_id
            );

          const attendanceRows =
            attendanceByEvent.get(
              event.id
            ) || [];

          const participants =
            attendanceRows
              .map(
                row =>
                  peopleById.get(
                    row.person_id
                  )
              )
              .filter(Boolean)
              .sort(
                (a, b) =>
                  adminDisplayName(a)
                    .localeCompare(
                      adminDisplayName(b)
                    )
              );

          return {
            ...event,
            facilitator,
            participants,
            attendanceRows
          };
        });

    return records;
  }


  function adminEventLabel(record) {
    const date =
      record.event_date ||
      "Various";

    return [
      date,
      record.semester,
      record.academic_year,
      record.topic
    ]
      .filter(Boolean)
      .join(" — ");
  }


  let adminEventRecords = [];


  async function refreshAdminReferenceData() {
    adminEventRecords =
      await adminFetchEventBundle();

    populateAdminDatalists(
      adminEventRecords
    );

    populateAdminEventSelects(
      adminEventRecords
    );
  }


  function populateAdminDatalists(
    records
  ) {
    const ayList =
      document.getElementById(
        "adminAyList"
      );

    const semesterList =
      document.getElementById(
        "adminSemesterList"
      );

    const typeList =
      document.getElementById(
        "adminTypeList"
      );

    const years = [
      ...new Set(
        records
          .map(
            record =>
              record.academic_year
          )
          .filter(Boolean)
      )
    ].sort();

    const semesters = [
      ...new Set(
        records
          .map(
            record =>
              record.semester
          )
          .filter(Boolean)
      )
    ];

    const types = [
      ...new Set(
        records
          .map(
            record =>
              record.event_type
          )
          .filter(Boolean)
      )
    ].sort();

    ayList.innerHTML =
      years
        .map(
          value =>
            `<option value="${escapeAdminHtml(value)}"></option>`
        )
        .join("");

    semesterList.innerHTML =
      semesters
        .map(
          value =>
            `<option value="${escapeAdminHtml(value)}"></option>`
        )
        .join("");

    typeList.innerHTML =
      types
        .map(
          value =>
            `<option value="${escapeAdminHtml(value)}"></option>`
        )
        .join("");
  }


  function escapeAdminHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }


  function populateAdminEventSelects(
    records,
    filterText = ""
  ) {
    const normalized =
      normalizeAdminName(
        filterText
      );

    const filtered =
      records.filter(
        record => {
          if (!normalized) {
            return true;
          }

          return normalizeAdminName(
            adminEventLabel(
              record
            )
          ).includes(
            normalized
          );
        }
      );

    [
      "attendeeEventSelect",
      "editEventSelect"
    ].forEach(function (id) {
      const select =
        document.getElementById(id);

      if (!select) {
        return;
      }

      const current =
        select.value;

      select.innerHTML =
        '<option value="">Select an event…</option>' +
        filtered
          .map(
            record =>
              `<option value="${record.id}">${escapeAdminHtml(adminEventLabel(record))}</option>`
          )
          .join("");

      if (
        filtered.some(
          record =>
            String(record.id) ===
            String(current)
        )
      ) {
        select.value =
          current;
      }
    });
  }


  function wireAdminForms() {
    const addForm =
      document.getElementById(
        "addEventForm"
      );

    const addAttendeesForm =
      document.getElementById(
        "addAttendeesForm"
      );

    const editForm =
      document.getElementById(
        "editEventForm"
      );

    const editSelect =
      document.getElementById(
        "editEventSelect"
      );

    const attendeeSearch =
      document.getElementById(
        "attendeeEventSearch"
      );

    const editSearch =
      document.getElementById(
        "editEventSearch"
      );

    const previewBtn =
      document.getElementById(
        "previewBulkEventsBtn"
      );

    const saveBulkBtn =
      document.getElementById(
        "saveBulkEventsBtn"
      );

    addForm.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();
        setAdminMessage("");

        const submit =
          addForm.querySelector(
            'button[type="submit"]'
          );

        submit.disabled = true;

        try {
          const values =
            getAdminEventFormValues(
              "add"
            );

          await adminCreateEvent(
            values
          );

          setAdminMessage(
            "Event added successfully."
          );

          addForm.reset();

          await refreshAdminReferenceData();

        } catch (error) {
          console.error(error);
          setAdminMessage(
            error?.message ||
            "The event could not be added.",
            true
          );
        } finally {
          submit.disabled = false;
        }
      }
    );


    addAttendeesForm.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();
        setAdminMessage("");

        const eventId =
          Number(
            document.getElementById(
              "attendeeEventSelect"
            ).value
          );

        const names =
          parseAdminNameList(
            document.getElementById(
              "newAttendees"
            ).value
          );

        if (!eventId) {
          setAdminMessage(
            "Select an event first.",
            true
          );
          return;
        }

        if (!names.length) {
          setAdminMessage(
            "Enter at least one attendee.",
            true
          );
          return;
        }

        try {
          const record =
            adminEventRecords.find(
              item =>
                item.id === eventId
            );

          if (!record) {
            throw new Error(
              "The selected event could not be found."
            );
          }

          const resolved =
            await adminEnsurePeople(
              names
            );

          const existingIds =
            new Set(
              record.attendanceRows.map(
                row =>
                  row.person_id
              )
            );

          const facilitatorId =
            record.facilitator_id;

          const rows = [];

          names.forEach(
            name => {
              const person =
                resolved.get(
                  normalizeAdminName(
                    name
                  )
                );

              if (
                person &&
                person.id !== facilitatorId &&
                !existingIds.has(
                  person.id
                )
              ) {
                rows.push({
                  event_id:
                    eventId,
                  person_id:
                    person.id
                });

                existingIds.add(
                  person.id
                );
              }
            }
          );

          if (!rows.length) {
            setAdminMessage(
              "No new attendees were added; everyone listed was already attached to the event."
            );
            return;
          }

          const {
            error
          } = await window.ctlSupabase
            .from("attendance")
            .insert(rows);

          if (error) {
            throw new Error(
              "Attendance could not be added: " +
              error.message
            );
          }

          document.getElementById(
            "newAttendees"
          ).value = "";

          setAdminMessage(
            `${rows.length} attendee${rows.length === 1 ? "" : "s"} added successfully.`
          );

          await refreshAdminReferenceData();

        } catch (error) {
          console.error(error);
          setAdminMessage(
            error?.message ||
            "Attendance could not be added.",
            true
          );
        }
      }
    );


    editSelect.addEventListener(
      "change",
      function () {
        loadAdminEditForm(
          Number(
            editSelect.value
          )
        );
      }
    );


    editForm.addEventListener(
      "submit",
      async function (event) {
        event.preventDefault();
        setAdminMessage("");

        const eventId =
          Number(
            editSelect.value
          );

        if (!eventId) {
          setAdminMessage(
            "Select an event first.",
            true
          );
          return;
        }

        try {
          const values =
            getAdminEventFormValues(
              "edit"
            );

          await adminUpdateEvent(
            eventId,
            values
          );

          setAdminMessage(
            "Event updated successfully."
          );

          await refreshAdminReferenceData();

          loadAdminEditForm(
            eventId
          );

        } catch (error) {
          console.error(error);
          setAdminMessage(
            error?.message ||
            "The event could not be updated.",
            true
          );
        }
      }
    );


    document.getElementById(
      "deleteEventBtn"
    ).addEventListener(
      "click",
      async function () {
        const eventId =
          Number(
            editSelect.value
          );

        const record =
          adminEventRecords.find(
            item =>
              item.id === eventId
          );

        if (!record) {
          return;
        }

        const confirmed =
          window.confirm(
            `Delete "${record.topic}"? This will also remove its attendance records.`
          );

        if (!confirmed) {
          return;
        }

        try {
          const {
            error: attendanceError
          } = await window.ctlSupabase
            .from("attendance")
            .delete()
            .eq(
              "event_id",
              eventId
            );

          if (attendanceError) {
            throw new Error(
              "Attendance could not be removed: " +
              attendanceError.message
            );
          }

          const {
            error: eventError
          } = await window.ctlSupabase
            .from("events")
            .delete()
            .eq(
              "id",
              eventId
            );

          if (eventError) {
            throw new Error(
              "Event could not be deleted: " +
              eventError.message
            );
          }

          editForm.style.display =
            "none";

          setAdminMessage(
            "Event deleted."
          );

          await refreshAdminReferenceData();

        } catch (error) {
          console.error(error);
          setAdminMessage(
            error?.message ||
            "The event could not be deleted.",
            true
          );
        }
      }
    );


    attendeeSearch.addEventListener(
      "input",
      function () {
        populateOneAdminEventSelect(
          "attendeeEventSelect",
          attendeeSearch.value
        );
      }
    );


    editSearch.addEventListener(
      "input",
      function () {
        populateOneAdminEventSelect(
          "editEventSelect",
          editSearch.value
        );

        editForm.style.display =
          "none";
      }
    );


    previewBtn.addEventListener(
      "click",
      function () {
        previewBulkEvents();
      }
    );


    saveBulkBtn.addEventListener(
      "click",
      async function () {
        await saveBulkEvents();
      }
    );
  }


  function populateOneAdminEventSelect(
    selectId,
    filterText
  ) {
    const select =
      document.getElementById(
        selectId
      );

    const normalized =
      normalizeAdminName(
        filterText
      );

    const filtered =
      adminEventRecords.filter(
        record =>
          !normalized ||
          normalizeAdminName(
            adminEventLabel(record)
          ).includes(
            normalized
          )
      );

    select.innerHTML =
      '<option value="">Select an event…</option>' +
      filtered
        .map(
          record =>
            `<option value="${record.id}">${escapeAdminHtml(adminEventLabel(record))}</option>`
        )
        .join("");
  }


  function loadAdminEditForm(
    eventId
  ) {
    const form =
      document.getElementById(
        "editEventForm"
      );

    const record =
      adminEventRecords.find(
        item =>
          item.id === eventId
      );

    if (!record) {
      form.style.display =
        "none";
      return;
    }

    document.getElementById(
      "editEventDate"
    ).value =
      record.event_date || "";

    document.getElementById(
      "editAcademicYear"
    ).value =
      record.academic_year || "";

    document.getElementById(
      "editSemester"
    ).value =
      record.semester || "";

    document.getElementById(
      "editEventType"
    ).value =
      record.event_type || "";

    document.getElementById(
      "editTopic"
    ).value =
      record.topic || "";

    document.getElementById(
      "editFacilitator"
    ).value =
      adminDisplayName(
        record.facilitator
      );

    document.getElementById(
      "editParticipants"
    ).value =
      record.participants
        .map(
          adminDisplayName
        )
        .join("\n");

    form.style.display =
      "block";
  }


  async function adminUpdateEvent(
    eventId,
    values
  ) {
    const {
      facilitator,
      participantIds
    } = await adminResolveEventPeople(
      values.facilitator,
      values.participants
    );

    const {
      error: eventError
    } = await window.ctlSupabase
      .from("events")
      .update({
        event_date:
          values.date || null,
        semester:
          values.semester,
        academic_year:
          values.academicYear,
        event_type:
          values.eventType,
        topic:
          values.topic,
        facilitator_id:
          facilitator.id
      })
      .eq(
        "id",
        eventId
      );

    if (eventError) {
      throw new Error(
        "Event details could not be updated: " +
        eventError.message
      );
    }

    const {
      error: deleteError
    } = await window.ctlSupabase
      .from("attendance")
      .delete()
      .eq(
        "event_id",
        eventId
      );

    if (deleteError) {
      throw new Error(
        "Old attendance could not be replaced: " +
        deleteError.message
      );
    }

    if (participantIds.length) {
      const rows =
        participantIds.map(
          personId => ({
            event_id:
              eventId,
            person_id:
              personId
          })
        );

      const {
        error: insertError
      } = await window.ctlSupabase
        .from("attendance")
        .insert(rows);

      if (insertError) {
        throw new Error(
          "Updated attendance could not be saved: " +
          insertError.message
        );
      }
    }
  }


  let bulkPreviewRecords = [];


  function parseBulkEventRows(
    text
  ) {
    const raw =
      String(text || "")
        .trim();

    if (!raw) {
      return [];
    }

    let rows;

    if (raw.includes("\t")) {
      rows =
        raw
          .split(/\r?\n/)
          .filter(
            line =>
              line.trim()
          )
          .map(
            line =>
              line.split("\t")
          );
    } else {
      rows =
        parseCSV(raw);
    }

    if (!rows.length) {
      return [];
    }

    const first =
      rows[0].map(
        cell =>
          normalizeAdminName(
            cell
          )
      );

    const hasHeader =
      first.includes("date") &&
      (
        first.includes("topic") ||
        first.includes("event type")
      );

    if (hasHeader) {
      rows =
        rows.slice(1);
    }

    return rows.map(
      (row, index) => {
        const date =
          String(
            row[0] || ""
          ).trim();

        const eventType =
          String(
            row[1] || ""
          ).trim();

        const topic =
          String(
            row[2] || ""
          ).trim();

        const facilitator =
          String(
            row[3] || ""
          ).trim();

        const attendees =
          String(
            row[4] || ""
          ).trim();

        const errors = [];

        if (!eventType) {
          errors.push(
            "missing event type"
          );
        }

        if (!topic) {
          errors.push(
            "missing topic"
          );
        }

        if (!facilitator) {
          errors.push(
            "missing facilitator"
          );
        }

        return {
          rowNumber:
            index + 1,
          date,
          eventType,
          topic,
          facilitator,
          participants:
            parseAdminNameList(
              attendees
            ),
          errors
        };
      }
    );
  }


  function previewBulkEvents() {
    const academicYear =
      document.getElementById(
        "bulkAcademicYear"
      ).value.trim();

    const semester =
      document.getElementById(
        "bulkSemester"
      ).value.trim();

    const preview =
      document.getElementById(
        "bulkPreview"
      );

    const saveBtn =
      document.getElementById(
        "saveBulkEventsBtn"
      );

    if (
      !academicYear ||
      !semester
    ) {
      setAdminMessage(
        "Enter an academic year and semester before previewing.",
        true
      );
      saveBtn.disabled = true;
      return;
    }

    bulkPreviewRecords =
      parseBulkEventRows(
        document.getElementById(
          "bulkEventsText"
        ).value
      );

    if (!bulkPreviewRecords.length) {
      setAdminMessage(
        "Paste at least one event row.",
        true
      );
      preview.innerHTML = "";
      saveBtn.disabled = true;
      return;
    }

    const hasErrors =
      bulkPreviewRecords.some(
        row =>
          row.errors.length
      );

    preview.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Row</th>
            <th>Date</th>
            <th>AY</th>
            <th>Semester</th>
            <th>Event Type</th>
            <th>Topic</th>
            <th>Facilitator</th>
            <th>Attendees</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${bulkPreviewRecords.map(
            row => `
              <tr>
                <td>${row.rowNumber}</td>
                <td>${escapeAdminHtml(row.date)}</td>
                <td>${escapeAdminHtml(academicYear)}</td>
                <td>${escapeAdminHtml(semester)}</td>
                <td>${escapeAdminHtml(row.eventType)}</td>
                <td>${escapeAdminHtml(row.topic)}</td>
                <td>${escapeAdminHtml(row.facilitator)}</td>
                <td>${row.participants.length}</td>
                <td class="${row.errors.length ? "preview-error" : ""}">
                  ${row.errors.length ? escapeAdminHtml(row.errors.join(", ")) : "Ready"}
                </td>
              </tr>
            `
          ).join("")}
        </tbody>
      </table>
    `;

    saveBtn.disabled =
      hasErrors;

    setAdminMessage(
      hasErrors
        ? "Fix the flagged rows before adding events."
        : `${bulkPreviewRecords.length} event${bulkPreviewRecords.length === 1 ? "" : "s"} ready to add.`,
      hasErrors
    );
  }


  async function saveBulkEvents() {
    const academicYear =
      document.getElementById(
        "bulkAcademicYear"
      ).value.trim();

    const semester =
      document.getElementById(
        "bulkSemester"
      ).value.trim();

    const saveBtn =
      document.getElementById(
        "saveBulkEventsBtn"
      );

    if (
      !bulkPreviewRecords.length
    ) {
      setAdminMessage(
        "Preview the bulk events first.",
        true
      );
      return;
    }

    if (
      bulkPreviewRecords.some(
        row =>
          row.errors.length
      )
    ) {
      setAdminMessage(
        "Fix the flagged rows before saving.",
        true
      );
      return;
    }

    saveBtn.disabled = true;

    let created = 0;

    try {
      for (
        const row of bulkPreviewRecords
      ) {
        await adminCreateEvent({
          date:
            row.date,
          academicYear,
          semester,
          eventType:
            row.eventType,
          topic:
            row.topic,
          facilitator:
            row.facilitator,
          participants:
            row.participants
        });

        created++;
      }

      setAdminMessage(
        `${created} event${created === 1 ? "" : "s"} added successfully.`
      );

      document.getElementById(
        "bulkEventsText"
      ).value = "";

      document.getElementById(
        "bulkPreview"
      ).innerHTML = "";

      bulkPreviewRecords = [];

      await refreshAdminReferenceData();

    } catch (error) {
      console.error(error);

      setAdminMessage(
        `${created} event${created === 1 ? "" : "s"} were added before an error occurred. ${error?.message || ""}`.trim(),
        true
      );
    } finally {
      saveBtn.disabled = false;
    }
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
