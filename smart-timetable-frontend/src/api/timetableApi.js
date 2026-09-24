const API_BASE_URL =
  `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"}/api/timetable`;

export async function generateTimetable(requestData) {
  const response = await fetch(`${API_BASE_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestData)
  });

  if (!response.ok) {
    throw new Error(`Timetable generation failed: ${response.status}`);
  }

  return await response.json();
}

export async function generateMasterTimetable(masterRequestData) {
  const response = await fetch(`${API_BASE_URL}/master/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(masterRequestData)
  });

  if (!response.ok) {
    throw new Error(`Master timetable generation failed: ${response.status}`);
  }

  return await response.json();
}

export async function saveTimetable(timetableData) {
  const response = await fetch(`${API_BASE_URL}/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(timetableData)
  });

  if (!response.ok) {
    throw new Error(`Failed to save timetable: ${response.status}`);
  }

  return await response.json();
}

export async function getLatestTimetable() {
  const response = await fetch(`${API_BASE_URL}/latest`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch latest timetable: ${response.status}`);
  }
  return await response.json();
}

export async function getAllTimetables() {
  const response = await fetch(`${API_BASE_URL}/all`);
  if (!response.ok) {
    throw new Error(`Failed to fetch all timetables: ${response.status}`);
  }
  return await response.json();
}

// ==================== MASTER TIMETABLE DATABASE PERSISTENCE ====================

export async function saveMasterTimetable(masterResponseData, name) {
  const url = name ? `${API_BASE_URL}/master/save?name=${encodeURIComponent(name)}` : `${API_BASE_URL}/master/save`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(masterResponseData)
  });

  if (!response.ok) {
    throw new Error(`Failed to save master timetable: ${response.status}`);
  }

  return await response.json();
}

export async function getLatestMasterTimetable() {
  const response = await fetch(`${API_BASE_URL}/master/latest`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch latest master timetable: ${response.status}`);
  }
  return await response.json();
}

export async function getAllMasterTimetables() {
  const response = await fetch(`${API_BASE_URL}/master/all`);
  if (!response.ok) {
    throw new Error(`Failed to fetch master timetables: ${response.status}`);
  }
  return await response.json();
}

export async function getMasterTimetableById(id) {
  const response = await fetch(`${API_BASE_URL}/master/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch master timetable ${id}: ${response.status}`);
  }
  return await response.json();
}

export async function deleteMasterTimetable(id) {
  const response = await fetch(`${API_BASE_URL}/master/${id}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    throw new Error(`Failed to delete master timetable ${id}: ${response.status}`);
  }
  return true;
}

// ==================== RESOURCES & CONSTRAINTS ====================

export async function getFaculties() {
  const response = await fetch(`${API_BASE_URL}/resources/faculties`);
  if (!response.ok) throw new Error(`Failed to fetch faculties: ${response.status}`);
  return await response.json();
}

export async function saveFaculty(faculty) {
  const response = await fetch(`${API_BASE_URL}/resources/faculties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(faculty)
  });
  if (!response.ok) throw new Error(`Failed to save faculty: ${response.status}`);
  return await response.json();
}

export async function getRooms() {
  const response = await fetch(`${API_BASE_URL}/resources/rooms`);
  if (!response.ok) throw new Error(`Failed to fetch rooms: ${response.status}`);
  return await response.json();
}

export async function saveRoom(room) {
  const response = await fetch(`${API_BASE_URL}/resources/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(room)
  });
  if (!response.ok) throw new Error(`Failed to save room: ${response.status}`);
  return await response.json();
}

export async function getSubjects() {
  const response = await fetch(`${API_BASE_URL}/resources/subjects`);
  if (!response.ok) throw new Error(`Failed to fetch subjects: ${response.status}`);
  return await response.json();
}

export async function saveSubject(subject) {
  const response = await fetch(`${API_BASE_URL}/resources/subjects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subject)
  });
  if (!response.ok) throw new Error(`Failed to save subject: ${response.status}`);
  return await response.json();
}

export async function getBatches() {
  const response = await fetch(`${API_BASE_URL}/resources/batches`);
  if (!response.ok) throw new Error(`Failed to fetch batches: ${response.status}`);
  return await response.json();
}

export async function saveBatch(batch) {
  const response = await fetch(`${API_BASE_URL}/resources/batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(batch)
  });
  if (!response.ok) throw new Error(`Failed to save batch: ${response.status}`);
  return await response.json();
}

export async function getFacultyUnavailabilities() {
  const response = await fetch(`${API_BASE_URL}/constraints/unavailability`);
  if (!response.ok) throw new Error(`Failed to fetch unavailabilities: ${response.status}`);
  return await response.json();
}

export async function saveFacultyUnavailabilities(list) {
  const response = await fetch(`${API_BASE_URL}/constraints/unavailability`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(list)
  });
  if (!response.ok) throw new Error(`Failed to save unavailabilities: ${response.status}`);
  return await response.json();
}

export async function getFixedSlots() {
  const response = await fetch(`${API_BASE_URL}/constraints/fixed-slots`);
  if (!response.ok) throw new Error(`Failed to fetch fixed slots: ${response.status}`);
  return await response.json();
}

export async function saveFixedSlots(list) {
  const response = await fetch(`${API_BASE_URL}/constraints/fixed-slots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(list)
  });
  if (!response.ok) throw new Error(`Failed to save fixed slots: ${response.status}`);
  return await response.json();
}

export async function getTimetableConfig() {
  const response = await fetch(`${API_BASE_URL}/config`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Failed to fetch config: ${response.status}`);
  }
  return await response.json();
}

export async function saveTimetableConfig(config) {
  const response = await fetch(`${API_BASE_URL}/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config)
  });
  if (!response.ok) throw new Error(`Failed to save config: ${response.status}`);
  return await response.json();
}
