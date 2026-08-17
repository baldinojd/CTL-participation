document.addEventListener("DOMContentLoaded", async function () {

  const searchInput = document.getElementById("search");
  const yearSelect = document.getElementById("year");
  const typeSelect = document.getElementById("type");
  const searchBtn = document.getElementById("searchBtn");
  const clearBtn = document.getElementById("clearBtn");
  const status = document.getElementById("status");
  const head = document.getElementById("head");
  const body = document.getElementById("body");
  const empty = document.getElementById("empty");
  const updatedDate = document.getElementById("updatedDate");

  let events = [];

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
      return [];
    }

    const headers = rows[0].map(h => h.trim());

    const index = {
      date: headers.indexOf("Date"),
      semester: headers.indexOf("Semester"),
      ay: headers.indexOf("AY"),
      topic: headers.indexOf("Topic"),
      facilitator: headers.indexOf("Facilitator"),
      participants: headers.indexOf("Participants"),
      total: headers.indexOf("Total"),
      type: headers.indexOf("Event Type")
    };

    return rows.slice(1).map(row => ({
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
  }

  function populateFilters() {
    yearSelect.innerHTML = '<option value="">All years</option>';
    typeSelect.innerHTML = '<option value="">All event types</option>';

    const years = [...new Set(
      events.map(event => event.academicYear)
    )].sort();

    years.forEach(year => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    });

    const preferredTypes = [
      "Roundtable",
      "Topical Session",
      "Headshots",
      "Kickoff",
      "Office Hours"
    ];

    const availableTypes = [...new Set(
      events.map(event => event.type)
    )];

    preferredTypes.forEach(type => {
      if (availableTypes.includes(type)) {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type;
        typeSelect.appendChild(option);
      }
    });
  }

  function matchesPerson(name, query) {
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
    const people = new Set();

    events.forEach(event => {
      if (event.facilitator) {
        people.add(event.facilitator);
      }

      event.participants.forEach(person => {
        people.add(person);
      });
    });

    return [...people].filter(person =>
      matchesPerson(person, query)
    );
  }

  function isPersonSearch(query) {
    if (!query.trim()) {
      return false;
    }

    return findMatchingPeople(query).length > 0;
  }

  function eventMatchesPerson(event, query) {
    if (
      event.facilitator &&
      matchesPerson(event.facilitator, query)
    ) {
      return true;
    }

    return event.participants.some(person =>
      matchesPerson(person, query)
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

  function renderResults(results, personMode) {
    body.innerHTML = "";

    if (personMode) {
      setPersonHeader();
    } else {
      setEventHeader();
    }

    if (results.length === 0) {
      empty.style.display = "block";
      status.textContent = "No matching participation records.";
      return;
    }

    empty.style.display = "none";

    results.forEach(event => {
      const row = document.createElement("tr");

      row.appendChild(createCell(event.date, "date"));
      row.appendChild(createCell(event.semester));
      row.appendChild(createCell(event.academicYear));
      row.appendChild(createCell(event.topic));
      row.appendChild(createCell(event.facilitator));

      if (!personMode) {
        row.appendChild(
          createCell(event.participants.join(", "))
        );

        row.appendChild(
          createCell(String(event.total), "total")
        );
      }

      body.appendChild(row);
    });

    status.textContent =
      "Showing " +
      results.length +
      (results.length === 1
        ? " matching event."
        : " matching events.");
  }

  function runSearch() {
    const query = searchInput.value.trim();
    const selectedYear = yearSelect.value;
    const selectedType = typeSelect.value;

    const personMode = isPersonSearch(query);

    const results = events.filter(event => {
      const yearMatch =
        !selectedYear ||
        event.academicYear === selectedYear;

      const typeMatch =
        !selectedType ||
        event.type === selectedType;

      let searchMatch = true;

      if (query) {
        if (personMode) {
          searchMatch =
            eventMatchesPerson(event, query);
        } else {
          searchMatch =
            eventMatchesGeneralSearch(event, query);
        }
      }

      return (
        yearMatch &&
        typeMatch &&
        searchMatch
      );
    });

    renderResults(results, personMode);
  }

  function clearSearch() {
    searchInput.value = "";
    yearSelect.value = "";
    typeSelect.value = "";

    renderResults(events, false);

    searchInput.focus();
  }

  searchBtn.addEventListener("click", runSearch);

  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      runSearch();
    }
  });

  yearSelect.addEventListener("change", runSearch);
  typeSelect.addEventListener("change", runSearch);
  clearBtn.addEventListener("click", clearSearch);

  try {
   const response = await fetch("CTL_Participation_Master.csv", {
  cache: "no-store"
});

if (!response.ok) {
  throw new Error("CSV could not be loaded.");
}

// Automatically show the date the CSV was last updated
const lastModified = response.headers.get("Last-Modified");

if (lastModified && updatedDate) {
  const date = new Date(lastModified);

  updatedDate.textContent =
    "Data updated: " +
    date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });
}

const csvText = await response.text();

    events = loadEventsFromCSV(csvText);

    populateFilters();
    renderResults(events, false);

  } catch (error) {
    console.error(error);
    status.textContent = "Participation data could not be loaded.";
  }

});
