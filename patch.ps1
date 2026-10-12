$content = Get-Content -Raw "smart-timetable-frontend/src/pages/MasterTimetable.jsx"

$content = $content -replace "import \{([^}]+)\} from \""../api/timetableApi\"";", "import {$1, getSavedTimetableById, saveTimetableSnapshot } from \""../api/timetableApi\"";"

$stateAdd = @"
  const [readOnlyMode, setReadOnlyMode] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveTimetableName, setSaveTimetableName] = useState("");
  const snapshotId = searchParams.get("snapshotId");
"@
$content = $content -replace 'const \[customSaveName, setCustomSaveName\] = useState\(""\);', "const [customSaveName, setCustomSaveName] = useState(\"");
$stateAdd"

$initHook = @"
    if (snapshotId) {
      setReadOnlyMode(true);
      getSavedTimetableById(snapshotId).then(snapshot => {
        const payload = JSON.parse(snapshot.timetableData);
        if (payload.masterData) setMasterData(payload.masterData);
        if (payload.inputs) setInputs(payload.inputs);
      }).catch(err => console.error("Failed to load snapshot", err));
      return;
    }
"@
$content = $content -replace 'const savedMaster = localStorage.getItem\("masterTimetableData"\);', "$initHook
    const savedMaster = localStorage.getItem(\"masterTimetableData\");"

$buttonsHook = @"
          {/* New Save Timetable Button */}
          {!readOnlyMode && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSaveModalOpen(true)}
              style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fde68a", fontWeight: "700" }}
            >
              ?? Save Timetable
            </button>
          )}
"@
$content = $content -replace '\{/\* Sub-view Selector for Student Class View \*/\}', "$buttonsHook

      {/* Sub-view Selector for Student Class View */}"

$modalHook = @"
      {/* Save Timetable Modal */}
      {saveModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "400px" }}>
            <h3 style={{ marginTop: 0 }}>Save Timetable</h3>
            <p style={{ fontSize: "13px", color: "#64748b" }}>Enter a name for this timetable snapshot.</p>
            <input
              type="text"
              className="form-input"
              value={saveTimetableName}
              onChange={(e) => setSaveTimetableName(e.target.value)}
              placeholder="e.g. SY IT Final Timetable"
              style={{ width: "100%", marginBottom: "15px" }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={() => setSaveModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={async () => {
                if (!saveTimetableName.trim()) {
                  alert("Please enter a name.");
                  return;
                }
                try {
                  await saveTimetableSnapshot({
                    name: saveTimetableName.trim(),
                    timetableData: JSON.stringify({ masterData, inputs })
                  });
                  alert("Timetable saved successfully!");
                  setSaveModalOpen(false);
                  setSaveTimetableName("");
                } catch(e) {
                  alert("Failed to save timetable.");
                }
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
"@
$content = $content -replace '(?s)(?=    </div>\s*<div className="no-print".*?</footer>\s*</div>\s*\);\s*})', "
$modalHook
"

Set-Content -Path "smart-timetable-frontend/src/pages/MasterTimetable.jsx" -Value $content
