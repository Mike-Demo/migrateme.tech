const uploadForm = document.querySelector("#upload-form");
const approveForm = document.querySelector("#approve-form");
const preview = document.querySelector("#preview");
const report = document.querySelector("#report");
let currentPlanId;

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const file = document.querySelector("#wxr").files[0];
  if (!file) return;
  preview.textContent = "Reading and inventorying WXR…";
  approveForm.hidden = true;
  const response = await fetch("/api/plan", {
    method: "POST",
    headers: { "content-type": "application/xml" },
    body: file
  });
  const result = await response.json();
  if (!response.ok) {
    preview.textContent = result.error ?? "Unable to plan migration";
    return;
  }
  currentPlanId = result.planId;
  preview.textContent = JSON.stringify({
    inventory: result.inventory,
    mappings: result.mappings,
    risks: result.risks,
    preview: result.preview
  }, null, 2);
  approveForm.hidden = false;
});

approveForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!document.querySelector("#approval").checked || !currentPlanId) return;
  const response = await fetch("/api/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ planId: currentPlanId, approved: true })
  });
  const result = await response.json();
  report.textContent = JSON.stringify(result, null, 2);
  approveForm.hidden = true;
});
