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

  let events = [];
  let selectedPerson = "";

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[.,;:()]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        row.push(field);
        field = "";
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        if (char === "\r" && next === "\n") {
          i++;
        }

        row.push(field);
        field = "";

        if (row.some(cell => cell.trim() !== "")) {
          rows.push(row);
        }

        row = [];
      } else {
        field += char;
      }
    }

    if (field.length || row.length) {
      row.push(field);

      if (row.some(cell => cell.trim() !== "")) {
        rows.push(row);
      }
    }

    return rows;
  }

  function loadEventsFromCSV(text) {
    const rows = parseCSV(text);

    if (rows.length < 2) {
      return {
        events: [],
        updated: ""
      };
    }

    const headers = rows[0].map(h =>
      h.replace(/^\uFEFF/, "").trim()
    );

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

    const parsedEvents = rows.slice(1).map(row => ({
      date: row[index.date] || "",
      semester: row[index.semester] || "",
      academicYear: row[index.ay] || "",
      topic: row[index.topic] || "",
      facilitator: row[index.facilitator] || "",
      participants: (row[index.participants] || "")
        .split(";")
        .map(name => name.trim())
        .filter(Boolean),
      total: Number(row[index.total] || 0),
      type: row[index.type] || ""
    }));

    return {
      events: parsedEvents,
      updated: updated
    };
  }

  function populateFilters() {

    yearSelect.innerHTML =
      '<option value="">All years</option>';

    semesterSelect.innerHTML =
      '<option value="">All semesters</option>';

    typeSelect.innerHTML =
      '<option value="">All event types</option>';

    const years = [...new Set(
      events
        .map(event => event.academicYear)
        .filter(Boolean)
    )].sort();

    years.forEach(year => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    });

    const preferredSemesters = [
      "Fall",
      "Intersession",
      "Spring",
      "Summer I",
      "Summer II"
    ];

    const availableSemesters = [...new Set(
      events
        .map(event => event.semester)
        .filter(Boolean)
    )];

    preferredSemesters.forEach(semester => {
      if (availableSemesters.includes(semester)) {
        const option = document.createElement("option");
        option.value = semester;
        option.textContent = semester;
        semesterSelect.appendChild(option);
      }
    });

    availableSemesters
      .filter(semester =>
        !preferredSemesters.includes(semester)
      )
      .sort()
      .forEach(semester => {
        const option = document.createElement("option");
        option.value = semester;
        option.textContent = semester;
        semesterSelect.appendChild(option);
      });

    const preferredTypes = [
      "Roundtable",
      "Topical Session",
      "Headshots",
      "Kickoff",
      "Office Hours"
    ];

    const availableTypes = [...new Set(
      events
        .map(event => event.type)
        .filter(Boolean)
    )];

    preferredTypes.forEach(type => {
      if (availableTypes.includes(type)) {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
      }
    });

    availableTypes
      .filter(type =>
        !preferredTypes.includes(type)
      )
      .sort()
      .forEach(type => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
      });
  }

  function getAllPeople() {
    const people = new Map();

    events.forEach(event => {

      if (event.facilitator) {
        const key = normalize(event.facilitator);

        if (!people.has(key)) {
          people.set(key, event.facilitator);
        }
      }

      event.participants.forEach(person => {
        const key = normalize(person);

        if (!people.has(key)) {
          people.set(key, person);
        }
      });
    });

    return [...people.values()].sort((a, b) =>
      a.localeCompare(b)
    );
  }

  function personMatchesQuery(name, query) {
    const normalizedName = normalize(name);
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      return false;
    }

    const queryParts = normalizedQuery.split(" ");

    return queryParts.every(part =>
      normalizedName.includes(part)
    );
  }

  function findMatchingPeople(query) {
    return getAllPeople().filter(person =>
      personMatchesQuery(person, query)
    );
  }

  function exactPersonMatch(name, selectedName) {
    return normalize(name) === normalize(selectedName);
  }

  function eventIncludesPerson(event, person) {

    if (
      event.facilitator &&
      exactPersonMatch(event.facilitator, person)
    ) {
      return true;
    }

    return event.participants.some(participant =>
      exactPersonMatch(participant, person)
    );
  }

  function passesFilters(event) {

    const selectedYear = yearSelect.value;
    const selectedSemester = semesterSelect.value;
    const selectedType = typeSelect.value;

    const yearMatch =
      !selectedYear ||
      event.academicYear === selectedYear;

    const semesterMatch =
      !selectedSemester ||
      event.semester === selectedSemester;

    const typeMatch =
      !selectedType ||
      event.type === selectedType;

    return (
      yearMatch &&
      semesterMatch &&
      typeMatch
    );
  }

  function eventMatchesGeneralSearch(event, query) {
    const q = normalize(query);

    if (!q) {
      return true;
    }

    const searchableText = normalize([
      event.date,
      event.semester,
      event.academicYear,
      event.topic,
      event.facilitator,
      event.type,
      ...event.participants
    ].join(" "));

    const queryParts = q.split(" ");

    return queryParts.every(part =>
      searchableText.includes(part)
    );
  }

  function createCell(text, className) {
    const td = document.createElement("td");

    if (className) {
      td.className = className;
    }

    td.textContent = text || "";

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

  function hidePersonChoices() {
    personChoices.innerHTML = "";
    personChoices.style.display = "none";
  }

  function hidePersonSummary() {
    personSummary.innerHTML = "";
    personSummary.style.display = "none";
  }

  function displayPersonChoices(query, people) {

    selectedPerson = "";
    hidePersonSummary();

    personChoices.innerHTML = "";

    const message = document.createElement("div");
    message.className = "person-choice-message";

    message.textContent =
      'Multiple people match "' +
      query +
      '". Please select the person you want:';

    personChoices.appendChild(message);

    const buttons = document.createElement("div");
    buttons.className = "person-choice-buttons";

    people.forEach(person => {

      const button = document.createElement("button");

      button.type = "button";
      button.className = "person-choice-button";

      /*
        Names are stored in the CSV as Last, First.
        Display them as First Last for readability.
      */

      if (person.includes(",")) {
        const parts = person.split(",");

        button.textContent =
          parts.slice(1).join(",").trim() +
          " " +
          parts[0].trim();
      } else {
        button.textContent = person;
      }

      button.addEventListener("click", function () {
        selectedPerson = person;
        hidePersonChoices();
        runPersonSearch(person);
      });

      buttons.appendChild(button);
    });

    personChoices.appendChild(buttons);
    personChoices.style.display = "block";

    body.innerHTML = "";
    setPersonHeader();

    empty.style.display = "none";

    status.textContent =
      "Select a person to view participation.";
  }

  function displayPersonSummary(person, total) {

    let displayName = person;

    if (person.includes(",")) {
      const parts = person.split(",");

      displayName =
        parts.slice(1).join(",").trim() +
        " " +
        parts[0].trim();
    }

    personSummary.innerHTML =
      "<strong>" +
      displayName +
      "</strong>" +
      " &nbsp;|&nbsp; " +
      "<strong>Total Sessions Attended:</strong> " +
      total;

    personSummary.style.display = "block";
  }

  function renderResults(results, personMode) {

    body.innerHTML = "";

    if (personMode) {
      setPersonHeader();
    } else {
      setEventHeader();
    }

    if (results.length === 0) {
      empty.style.display = "block";

      status.textContent =
        "No matching participation records.";

      return;
    }

    empty.style.display = "none";

    results.forEach(event => {

      const row = document.createElement("tr");

      row.appendChild(
        createCell(event.date, "date")
      );

      row.appendChild(
        createCell(event.semester)
      );

      row.appendChild(
        createCell(event.academicYear)
      );

      row.appendChild(
        createCell(event.topic)
      );

      row.appendChild(
        createCell(event.facilitator)
      );

      if (!personMode) {

        row.appendChild(
          createCell(
            event.participants.join(", ")
          )
        );

        row.appendChild(
          createCell(
            String(event.total),
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

  function runPersonSearch(person) {

    selectedPerson = person;

    const results = events.filter(event =>
      passesFilters(event) &&
      eventIncludesPerson(event, person)
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

  function runGeneralSearch(query) {

    selectedPerson = "";

    hidePersonChoices();
    hidePersonSummary();

    const results = events.filter(event =>
      passesFilters(event) &&
      eventMatchesGeneralSearch(event, query)
    );

    renderResults(
      results,
      false
    );
  }

  function runSearch() {

    const query = searchInput.value.trim();

    /*
      If a specific person was already selected,
      preserve that selection when the user changes
      AY, Semester, or Event Type.
    */

    if (selectedPerson) {
      runPersonSearch(selectedPerson);
      return;
    }

    if (!query) {
      runGeneralSearch("");
      return;
    }

    const matchingPeople =
      findMatchingPeople(query);

    if (matchingPeople.length === 1) {

      selectedPerson = matchingPeople[0];

      runPersonSearch(
        matchingPeople[0]
      );

      return;
    }

    if (matchingPeople.length > 1) {

      displayPersonChoices(
        query,
        matchingPeople
      );

      return;
    }

    runGeneralSearch(query);
  }

  function clearSearch() {

  searchInput.value = "";
  yearSelect.value = "";
  semesterSelect.value = "";
  typeSelect.value = "";

  selectedPerson = "";

  hidePersonChoices();
  hidePersonSummary();

  /* Return to the blank starting state */
  body.innerHTML = "";
  setEventHeader();
  empty.style.display = "none";

  status.textContent =
    "Enter a search term or select a filter to begin.";

  searchInput.focus();
}

  /*
    If the user changes the text after selecting
    a person, remove the old person selection.
  */

  searchInput.addEventListener(
    "input",
    function () {
      selectedPerson = "";
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

      if (event.key === "Enter") {
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

  try {

    const response = await fetch(
      "CTL_Participation_Master.csv",
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(
        "CSV could not be loaded."
      );
    }

    const csvText =
      await response.text();

    const data =
      loadEventsFromCSV(csvText);

    events = data.events;

    if (updatedDate) {

      updatedDate.textContent =
        data.updated
          ? "Data updated: " + data.updated
          : "Data updated: —";
    }

populateFilters();

/* Start with no results displayed */
body.innerHTML = "";
setEventHeader();
empty.style.display = "none";
status.textContent = "Enter a search term or select a filter to begin.";

} catch (error) {

    console.error(error);

    status.textContent =
      "Participation data could not be loaded.";
  }

});
