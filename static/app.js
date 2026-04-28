// ---------- Tab Switching ----------
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ---------- Helpers ----------
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} ${i18n.t("size.byte")}`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${i18n.t("size.kilobyte")}`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} ${i18n.t("size.megabyte")}`;
}

function calcReduction(orig, comp) {
  if (orig === 0) return "0%";
  return `${((1 - comp / orig) * 100).toFixed(1)}%`;
}

// ---------- Drop Zone Setup ----------
function initDropZone(zone) {
  const input = zone.querySelector('input[type="file"]');
  const accept = zone.dataset.accept;
  const multiple = zone.hasAttribute("data-multiple");

  zone.addEventListener("click", () => input.click());

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      accept === "image/*"
        ? f.type.startsWith("image/")
        : f.type === "application/pdf"
    );
    if (files.length === 0) return;
    input.files = (() => {
      const dt = new DataTransfer();
      // For merge tab, add to existing files; for others, replace
      if (multiple && zone.closest("#tab-merge")) {
        // append to existing
        const existing = input.files;
        const seen = new Set();
        for (const f of existing) seen.add(f.name);
        for (const f of existing) dt.items.add(f);
        for (const f of files) if (!seen.has(f.name)) dt.items.add(f);
      } else {
        files.forEach((f) => dt.items.add(f));
      }
      return dt.files;
    })();
    input.dispatchEvent(new Event("change"));
  });
}

document.querySelectorAll(".drop-zone").forEach(initDropZone);

// ---------- Quality Sliders ----------
document.querySelectorAll(".quality-slider").forEach((slider) => {
  slider.addEventListener("input", () => {
    slider.previousElementSibling.textContent = slider.value;
  });
});

// ---------- Tab: Compress Image & PDF ----------
function initCompressTab(tabId, endpoint) {
  const tab = document.getElementById(tabId);
  const zone = tab.querySelector(".drop-zone");
  const input = zone.querySelector('input[type="file"]');
  const fileInfo = tab.querySelector(".file-info");
  const fileName = fileInfo.querySelector(".file-name");
  const fileSize = fileInfo.querySelector(".file-size");
  const btn = tab.querySelector(".btn-primary");
  const slider = tab.querySelector(".quality-slider");
  const results = tab.querySelector(".results");
  const progressBar = tab.querySelector(".progress-bar");
  const progressFill = progressBar.querySelector(".progress-fill");

  let currentBlob = null;
  let currentFilename = "";

  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    fileName.textContent = file.name;
    fileSize.textContent = formatSize(file.size);
    fileInfo.hidden = false;
    results.hidden = true;
    currentBlob = null;
    btn.disabled = false;
  });

  btn.addEventListener("click", async () => {
    const file = input.files[0];
    if (!file) return;

    btn.disabled = true;
    btn.textContent = i18n.t("state.compressing");
    progressBar.hidden = false;
    progressFill.style.width = "0%";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("quality", slider.value);

    const xhr = new XMLHttpRequest();

    try {
      const result = await new Promise((resolve, reject) => {
        xhr.open("POST", endpoint);
        xhr.responseType = "blob";
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            progressFill.style.width = `${(e.loaded / e.total) * 100}%`;
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
          else reject(new Error(i18n.t("error.server_error", { status: xhr.status })));
        };
        xhr.onerror = () => reject(new Error(i18n.t("error.network_error")));
        xhr.send(formData);
      });

      progressFill.style.width = "100%";
      currentBlob = result;

      // infer filename from content-disposition header
      const disposition = xhr.getResponseHeader("content-disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      currentFilename = match ? match[1] : "download";

      // show results
      const origSize = file.size;
      const compSize = result.size;
      tab.querySelector(".original-size").textContent = formatSize(origSize);
      tab.querySelector(".compressed-size").textContent = formatSize(compSize);
      tab.querySelector(".reduction").textContent = calcReduction(origSize, compSize);
      results.hidden = false;
      btn.textContent = i18n.t(btn.dataset.i18n);
      btn.disabled = false;
    } catch (err) {
      btn.textContent = i18n.t(btn.dataset.i18n);
      btn.disabled = false;
      progressBar.hidden = true;
      alert(i18n.t("error.generic", { message: err.message }));
    }
  });

  tab.querySelector(".btn-download").addEventListener("click", () => {
    if (!currentBlob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(currentBlob);
    a.download = currentFilename;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  tab.querySelector(".btn-reset").addEventListener("click", () => {
    input.value = "";
    fileInfo.hidden = true;
    results.hidden = true;
    progressBar.hidden = true;
    progressFill.style.width = "0%";
    btn.disabled = true;
    currentBlob = null;
    // Re-show drop zone
  });
}

initCompressTab("tab-image", "/api/compress-image");
initCompressTab("tab-pdf", "/api/compress-pdf");

// ---------- Tab: Merge PDF ----------
const mergeTab = document.getElementById("tab-merge");
const mergeZone = mergeTab.querySelector(".drop-zone");
const mergeInput = mergeZone.querySelector('input[type="file"]');
const fileListContainer = mergeTab.querySelector(".file-list-container");
const fileList = mergeTab.querySelector(".file-list");
const mergeBtn = mergeTab.querySelector(".btn-primary");
const mergeResults = mergeTab.querySelector(".results");
const mergeProgress = mergeTab.querySelector(".progress-bar");
const mergeProgressFill = mergeProgress.querySelector(".progress-fill");

let mergeFiles = []; // array of { name, file }

mergeInput.addEventListener("change", () => {
  const newFiles = Array.from(mergeInput.files).filter(
    (f) => !mergeFiles.some((e) => e.name === f.name)
  );
  for (const f of newFiles) mergeFiles.push({ name: f.name, file: f });
  renderMergeList();
  mergeBtn.disabled = mergeFiles.length < 2;
});

function renderMergeList() {
  fileListContainer.hidden = mergeFiles.length === 0;
  fileList.innerHTML = "";
  mergeFiles.forEach((entry, i) => {
    const li = document.createElement("li");
    li.draggable = true;
    li.dataset.index = i;

    li.innerHTML = `
      <span class="drag-handle">&#9776;</span>
      <span class="file-name">${entry.name}</span>
      <span class="file-size">${formatSize(entry.file.size)}</span>
      <button class="remove-btn" data-index="${i}">&times;</button>
    `;

    li.addEventListener("dragstart", (e) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", i);
      li.classList.add("dragging");
    });
    li.addEventListener("dragend", () => li.classList.remove("dragging"));

    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      // remove from all others
      fileList.querySelectorAll("li").forEach((l) => l.classList.remove("drag-over"));
      const rects = li.getBoundingClientRect();
      const mid = rects.top + rects.height / 2;
      if (e.clientY > mid) li.classList.add("drag-over");
    });

    li.addEventListener("dragleave", () => li.classList.remove("drag-over"));

    li.addEventListener("drop", (e) => {
      e.preventDefault();
      fileList.querySelectorAll("li").forEach((l) => l.classList.remove("drag-over"));
      const fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
      const toIdx = i;
      if (fromIdx === toIdx) return;
      const [item] = mergeFiles.splice(fromIdx, 1);
      mergeFiles.splice(toIdx, 0, item);
      renderMergeList();
    });

    li.querySelector(".remove-btn").addEventListener("click", () => {
      mergeFiles.splice(i, 1);
      updateMergeInputFiles();
      renderMergeList();
      mergeBtn.disabled = mergeFiles.length < 2;
    });

    fileList.appendChild(li);
  });
}

function updateMergeInputFiles() {
  const dt = new DataTransfer();
  mergeFiles.forEach((e) => dt.items.add(e.file));
  mergeInput.files = dt.files;
}

mergeBtn.addEventListener("click", async () => {
  if (mergeFiles.length < 2) return;
  mergeBtn.disabled = true;
  mergeBtn.textContent = i18n.t("state.merging");
  mergeProgress.hidden = false;
  mergeProgressFill.style.width = "0%";

  const formData = new FormData();
  mergeFiles.forEach((entry) => formData.append("files", entry.file));

  const xhr = new XMLHttpRequest();

  try {
    const result = await new Promise((resolve, reject) => {
      xhr.open("POST", "/api/merge-pdf");
      xhr.responseType = "blob";
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          mergeProgressFill.style.width = `${(e.loaded / e.total) * 100}%`;
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response);
        else reject(new Error(`Server error ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(formData);
    });

    mergeProgressFill.style.width = "100%";

    const totalPages = 0; // We'll get from server header
    const resultSize = result.size;
    mergeTab.querySelector(".total-pages").textContent = i18n.t("result.files_count", { n: mergeFiles.length });
    mergeTab.querySelector(".result-size").textContent = formatSize(resultSize);
    mergeResults.hidden = false;
    mergeBtn.textContent = i18n.t(mergeBtn.dataset.i18n);
    mergeBtn.disabled = false;

    mergeTab.querySelector(".btn-download").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(result);
      a.download = "merged.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    };

    // Reset merge files so user can start fresh
    mergeTab.querySelector(".btn-reset").addEventListener("click", () => {
      mergeFiles = [];
      mergeInput.value = "";
      updateMergeInputFiles();
      renderMergeList();
      mergeResults.hidden = true;
      mergeProgress.hidden = true;
      mergeProgressFill.style.width = "0%";
      mergeBtn.disabled = true;
    });
  } catch (err) {
    mergeBtn.textContent = i18n.t(mergeBtn.dataset.i18n);
    mergeBtn.disabled = false;
    mergeProgress.hidden = true;
    alert(i18n.t("error.generic", { message: err.message }));
  }
});

// ---------- i18n ----------
document.addEventListener("DOMContentLoaded", () => {
  i18n.init();

  document.getElementById("lang-select").addEventListener("change", (e) => {
    i18n.setLocale(e.target.value);
  });
});
