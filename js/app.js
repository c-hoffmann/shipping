/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PUNK SHIPPING - Versandkostenrechner
 * Ein rebellischer, moderner Versandkostenvergleich
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Version: 2.1.0
 *
 * Features:
 * - ✅ Echtzeitfilterung nach Maßen und Gewicht
 * - ✅ Sortierbare Tabelle
 * - ✅ Filter nach Versanddienstleister
 * - ✅ Responsive Design mit Mobile Cards
 * - ✅ Dark/Light Mode
 * - ✅ LocalStorage Speicherung
 * - ✅ URL-Parameter für Sharing
 * - ✅ Suchfeld
 * - ✅ Ranking mit Highlight für günstigste Option
 * - ✅ Gurtmaß-Prüfung
 * - ✅ Keine externen Abhängigkeiten
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  dataUrl: "data/shipping-options.json",
  debounceTime: 150,
  storageKey: "punkShipping",
  defaultSort: {
    field: "price",
    direction: "asc",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────
const state = {
  allOptions: [],
  filteredOptions: [],
  currentSort: { ...CONFIG.defaultSort },
  companyFilter: "all",
  searchQuery: "",
  theme: "dark",
  userInput: {
    side1: 0,
    side2: 0,
    side3: 0,
    weight: 0,
    weightUnit: 1,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// DOM ELEMENTS
// ─────────────────────────────────────────────────────────────────────────────
const elements = {
  // Inputs
  side1: document.getElementById("side1"),
  side2: document.getElementById("side2"),
  side3: document.getElementById("side3"),
  weight: document.getElementById("weight"),
  weightUnit: document.getElementById("weight-unit"),
  searchInput: document.getElementById("search-input"),

  // Buttons
  resetBtn: document.getElementById("reset-btn"),
  shareBtn: document.getElementById("share-btn"),
  themeToggle: document.getElementById("theme-toggle"),

  // Stats
  volumeDisplay: document.getElementById("volume-display"),
  girthDisplay: document.getElementById("girth-display"),
  countDisplay: document.getElementById("count-display"),
  cheapestDisplay: document.getElementById("cheapest-display"),

  // Table & Cards
  resultsBody: document.getElementById("results-body"),
  resultsTable: document.getElementById("results-table"),
  resultsCards: document.getElementById("results-cards"),

  // States
  loadingState: document.getElementById("loading-state"),
  emptyState: document.getElementById("empty-state"),

  // Filter Chips
  filterChips: document.querySelectorAll(".chip"),

  // Toast
  toast: document.getElementById("toast"),
  toastMessage: document.getElementById("toast-message"),
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Debounce-Funktion
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Parst einen Wert zu einer Zahl
 */
function parseNumber(value) {
  if (!value && value !== 0) return 0;
  const cleaned = String(value).replace(",", ".").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.max(0, parsed);
}

/**
 * Sortiert drei Seitenlängen absteigend
 */
function sortSides(a, b, c) {
  return [a, b, c].sort((x, y) => y - x);
}

/**
 * Berechnet das Gurtmaß
 * Formel: Längste Seite + 2 × (mittlere + kürzeste Seite)
 */
function calculateGirth(sides) {
  return sides[0] + 2 * sides[1] + 2 * sides[2];
}

/**
 * Berechnet das Volumen
 */
function calculateVolume(sides) {
  return sides[0] * sides[1] * sides[2];
}

/**
 * Formatiert einen Preis
 */
function formatPrice(price) {
  const numPrice = parseFloat(price);
  return numPrice.toFixed(2).replace(".", ",") + " €";
}

/**
 * Parst Gewicht zu Gramm
 */
function parseWeightToGrams(weightStr) {
  if (!weightStr) return Infinity;

  const cleaned = weightStr.replace(/\s/g, "").replace(",", ".").toLowerCase();

  if (cleaned.includes("kg")) {
    return parseFloat(cleaned) * 1000;
  }
  return parseFloat(cleaned);
}

/**
 * Formatiert Gewicht zur Anzeige
 */
function formatWeight(weightStr) {
  if (!weightStr) return "-";

  const grams = parseWeightToGrams(weightStr);

  if (grams >= 1000) {
    return `${(grams / 1000).toLocaleString("de-DE")} kg`;
  }
  return `${grams.toLocaleString("de-DE")} g`;
}

/**
 * Parst Größen-String zu sortiertem Array
 */
function parseSizeString(sizeStr) {
  if (!sizeStr) return [0, 0, 0];

  // "längste + kürzeste Seite: Xcm" Format erkennen
  if (sizeStr.includes("längste")) {
    return [0, 0, 0]; // Wird separat behandelt
  }

  const cleaned = sizeStr
    .replace(/×/g, " ")
    .replace(/x/gi, " ")
    .replace(/cm/gi, "")
    .replace(/,/g, ".")
    .trim();

  const parts = cleaned
    .split(/\s+/)
    .map(parseFloat)
    .filter((n) => !isNaN(n));

  while (parts.length < 3) {
    parts.push(0);
  }

  return parts.sort((a, b) => b - a);
}

/**
 * Zeigt eine Toast-Benachrichtigung
 */
function showToast(message, duration = 3000) {
  elements.toastMessage.textContent = message;
  elements.toast.classList.add("visible");

  setTimeout(() => {
    elements.toast.classList.remove("visible");
  }, duration);
}

/**
 * Escapes HTML für sichere Ausgabe
 */
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE FUNCTIONS (NEU)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Speichert State in LocalStorage
 */
function saveToStorage() {
  const data = {
    userInput: state.userInput,
    companyFilter: state.companyFilter,
    theme: state.theme,
  };

  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage nicht verfügbar:", e);
  }
}

/**
 * Lädt State aus LocalStorage
 */
function loadFromStorage() {
  try {
    const data = localStorage.getItem(CONFIG.storageKey);
    if (data) {
      const parsed = JSON.parse(data);

      if (parsed.theme) {
        state.theme = parsed.theme;
      }

      // User-Eingaben werden nur geladen, wenn keine URL-Parameter
      return parsed;
    }
  } catch (e) {
    console.warn("Fehler beim Laden aus LocalStorage:", e);
  }
  return null;
}

/**
 * Liest Parameter aus URL
 */
function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);

  const urlData = {
    side1: parseNumber(params.get("l")),
    side2: parseNumber(params.get("b")),
    side3: parseNumber(params.get("h")),
    weight: parseNumber(params.get("g")),
    weightUnit: params.get("u") === "kg" ? 1000 : 1,
  };

  // Nur zurückgeben wenn mindestens ein Wert gesetzt
  if (urlData.side1 || urlData.side2 || urlData.side3 || urlData.weight) {
    return urlData;
  }

  return null;
}

/**
 * Erstellt Share-URL mit aktuellen Eingaben
 */
function createShareUrl() {
  const params = new URLSearchParams();

  if (state.userInput.side1) params.set("l", state.userInput.side1);
  if (state.userInput.side2) params.set("b", state.userInput.side2);
  if (state.userInput.side3) params.set("h", state.userInput.side3);
  if (state.userInput.weight) {
    // Gewicht in Gramm speichern
    params.set("g", state.userInput.weight);
    params.set("u", state.userInput.weightUnit === 1000 ? "kg" : "g");
  }

  const url = new URL(window.location.href);
  url.search = params.toString();

  return url.toString();
}

// ─────────────────────────────────────────────────────────────────────────────
// THEME FUNCTIONS (NEU)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Setzt das Theme
 */
function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  saveToStorage();
}

/**
 * Wechselt zwischen Dark und Light Mode
 */
function toggleTheme() {
  const newTheme = state.theme === "dark" ? "light" : "dark";
  setTheme(newTheme);
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA LOADING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lädt Versandoptionen aus JSON
 */
async function loadShippingOptions() {
  try {
    const response = await fetch(CONFIG.dataUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Fehler beim Laden der Versandoptionen:", error);
    showError("Konnte Versandoptionen nicht laden. Bitte Seite neu laden.");
    return [];
  }
}

/**
 * Zeigt Fehlermeldung
 */
function showError(message) {
  elements.emptyState.innerHTML = `
        <div class="empty-icon">❌</div>
        <h3>Fehler</h3>
        <p>${escapeHtml(message)}</p>
    `;
  elements.emptyState.classList.remove("hidden");
  elements.loadingState.classList.add("hidden");
}

// ─────────────────────────────────────────────────────────────────────────────
// FILTERING LOGIC (VERBESSERT)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prüft Größenanforderungen
 */
function checkSizeRequirements(option, userSides) {
  // Keine Eingabe = alles anzeigen
  if (userSides[0] === 0 && userSides[1] === 0 && userSides[2] === 0) {
    return true;
  }

  // Minimalmaße prüfen
  if (option.minimalsizes) {
    const minSides = parseSizeString(option.minimalsizes);
    // Prüfen ob alle User-Seiten >= Mindestmaße
    if (minSides[0] > 0 && userSides[0] < minSides[2]) return false;
    if (minSides[1] > 0 && userSides[1] < minSides[1]) return false;
    if (minSides[2] > 0 && userSides[2] < minSides[0]) return false;
  }

  // Längste + kürzeste Seite Bedingung (FIX: Bessere Prüfung)
  if (
    option._longestandshortestside &&
    option._longestandshortestside !== false
  ) {
    const maxSum = parseNumber(option._longestandshortestside);
    if (maxSum > 0 && userSides[0] + userSides[2] > maxSum) {
      return false;
    }
    return true; // Wenn diese Bedingung erfüllt, nicht noch maximalsizes prüfen
  }

  // Maximalmaße prüfen
  if (option.maximalsizes && !option.maximalsizes.includes("längste")) {
    const maxSides = parseSizeString(option.maximalsizes);
    if (maxSides[0] > 0 && userSides[0] > maxSides[0]) return false;
    if (maxSides[1] > 0 && userSides[1] > maxSides[1]) return false;
    if (maxSides[2] > 0 && userSides[2] > maxSides[2]) return false;
  }

  return true;
}

/**
 * Prüft Gewichtsanforderungen
 */
function checkWeightRequirements(option, userWeight) {
  if (userWeight === 0) return true;

  const maxWeight = parseWeightToGrams(option.maximalweight);
  return userWeight <= maxWeight;
}

/**
 * Prüft Gurtmaß-Anforderungen (NEU - Verbessert)
 */
function checkGirthRequirements(option, userSides, girth) {
  // Keine Eingabe = ok
  if (userSides[0] === 0 && userSides[1] === 0 && userSides[2] === 0) {
    return true;
  }

  // GLS Pack XL: Gurtmaß max 300cm
  if (option.internal_name === "gls_pack_xl") {
    if (girth > 300) return false;
    if (userSides[0] > 200) return false;
    if (userSides[1] > 80) return false;
    if (userSides[2] > 60) return false;
  }

  // DHL Pakete: Gurtmaß prüfen basierend auf conditions
  if (option.company === "DHL" && option.conditions) {
    const girthMatch = option.conditions.match(/Gurtmaß\s*(\d+)/i);
    if (girthMatch) {
      const maxGirth = parseInt(girthMatch[1], 10);
      if (girth > maxGirth) return false;
    }
  }

  return true;
}

/**
 * Prüft spezielle Bedingungen
 */
function checkSpecialConditions(option, userSides) {
  if (userSides[0] === 0 && userSides[1] === 0 && userSides[2] === 0) {
    return true;
  }

  // Deutsche Post Maxibrief L+B+H
  if (option.internal_name === "deutschepost_brief_maxi_doppelt_lbh") {
    const sum = userSides[0] + userSides[1] + userSides[2];
    if (sum > 90) return false;
  }

  // Hermes XXL: dritte Seite max 50cm
  if (option.internal_name === "hermes_paket_xxl_haustuer") {
    if (userSides[1] > 50) return false; // Mittlere Seite
  }

  return true;
}

/**
 * Prüft Suchquery
 */
function checkSearchQuery(option, query) {
  if (!query) return true;

  const searchLower = query.toLowerCase();
  const searchFields = [
    option.title,
    option.company,
    option.conditions,
    option.options,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchFields.includes(searchLower);
}

/**
 * Filtert alle Optionen
 */
function filterOptions() {
  const userSides = sortSides(
    state.userInput.side1,
    state.userInput.side2,
    state.userInput.side3,
  );

  const userWeight = state.userInput.weight;
  const girth = calculateGirth(userSides);

  return state.allOptions.filter((option) => {
    // Firmenfilter
    if (
      state.companyFilter !== "all" &&
      option.company !== state.companyFilter
    ) {
      return false;
    }

    // Suchfilter
    if (!checkSearchQuery(option, state.searchQuery)) {
      return false;
    }

    // Größencheck
    if (!checkSizeRequirements(option, userSides)) {
      return false;
    }

    // Gewichtscheck
    if (!checkWeightRequirements(option, userWeight)) {
      return false;
    }

    // Gurtmaß-Check
    if (!checkGirthRequirements(option, userSides, girth)) {
      return false;
    }

    // Spezielle Bedingungen
    if (!checkSpecialConditions(option, userSides)) {
      return false;
    }

    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SORTING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sortiert Optionen
 */
function sortOptions(options, field, direction) {
  const multiplier = direction === "asc" ? 1 : -1;

  return [...options].sort((a, b) => {
    let valueA, valueB;

    switch (field) {
      case "price":
        valueA = parseFloat(a.price);
        valueB = parseFloat(b.price);
        break;

      case "maxweight":
        valueA = parseWeightToGrams(a.maximalweight);
        valueB = parseWeightToGrams(b.maximalweight);
        break;

      case "insurance":
        valueA = parseFloat((a.insurance || "0").replace(",", ".")) || 0;
        valueB = parseFloat((b.insurance || "0").replace(",", ".")) || 0;
        break;

      case "company":
      case "title":
      default:
        valueA = a[field] || "";
        valueB = b[field] || "";
        return valueA.localeCompare(valueB, "de") * multiplier;
    }

    return (valueA - valueB) * multiplier;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rendert eine Tabellenzeile
 */
function renderTableRow(option, rank, isCheapest) {
  // Versicherung formatieren
  let insuranceDisplay = "-";
  let hasInsurance = false;
  if (option.insurance) {
    const insuranceValue = parseFloat(option.insurance.replace(",", "."));
    if (insuranceValue > 0) {
      insuranceDisplay = `${option.insurance} €`;
      hasInsurance = true;
    }
  }

  // Link-Button
  const linkButton = option.weblink
    ? `<a href="${escapeHtml(option.weblink)}" target="_blank" rel="noopener" class="link-btn" title="Zum Anbieter">🛒</a>`
    : "";

  // Maße-Anzeige
  let maxSizesDisplay = option.maximalsizes || "-";
  if (
    option._longestandshortestside &&
    option._longestandshortestside !== false
  ) {
    maxSizesDisplay = `L+K ≤ ${option._longestandshortestside}cm`;
  }

  // Rang-Badge
  let rankClass = "rank-other";
  if (rank === 1) rankClass = "rank-1";
  else if (rank === 2) rankClass = "rank-2";
  else if (rank === 3) rankClass = "rank-3";

  // Conditions mit Tooltip
  const conditionsHtml = option.conditions
    ? `<span class="truncated" tabindex="0">${escapeHtml(option.conditions)}</span>
           <span class="tooltip">${escapeHtml(option.conditions)}</span>`
    : "-";

  // Options mit Tooltip
  const optionsHtml = option.options
    ? `<span class="truncated" tabindex="0">${escapeHtml(option.options)}</span>
           <span class="tooltip">${escapeHtml(option.options)}</span>`
    : "-";

  return `
        <tr data-id="${option.internal_name}" class="${isCheapest ? "best-price" : ""}">
            <td class="rank-col">
                <span class="rank-badge ${rankClass}">${rank}</span>
            </td>
            <td>
                <span class="company-badge" data-company="${option.company}">
                    ${escapeHtml(option.company)}
                </span>
            </td>
            <td><strong>${escapeHtml(option.title)}</strong></td>
            <td class="price-cell">${formatPrice(option.price)}</td>
            <td>${linkButton}</td>
            <td>${formatWeight(option.maximalweight)}</td>
            <td>${escapeHtml(maxSizesDisplay)}</td>
            <td class="insurance-cell ${hasInsurance ? "has-insurance" : ""}">
                ${insuranceDisplay}
            </td>
            <td class="conditions-cell">${conditionsHtml}</td>
            <td class="options-cell">${optionsHtml}</td>
        </tr>
    `;
}

/**
 * Rendert eine Mobile Card
 */
function renderCard(option, rank, isCheapest) {
  // Versicherung
  let insuranceDisplay = "-";
  if (option.insurance) {
    const insuranceValue = parseFloat(option.insurance.replace(",", "."));
    if (insuranceValue > 0) {
      insuranceDisplay = `${option.insurance} €`;
    }
  }

  // Maße
  let maxSizesDisplay = option.maximalsizes || "-";
  if (
    option._longestandshortestside &&
    option._longestandshortestside !== false
  ) {
    maxSizesDisplay = `L+K ≤ ${option._longestandshortestside}cm`;
  }

  // Link
  const linkHtml = option.weblink
    ? `<a href="${escapeHtml(option.weblink)}" target="_blank" rel="noopener" class="result-card__link">
             🛒 Zum Anbieter
           </a>`
    : "";

  return `
        <article class="result-card ${isCheapest ? "best-price" : ""}" data-id="${option.internal_name}">
            <div class="result-card__header">
                <div>
                    <span class="company-badge" data-company="${option.company}">
                        ${escapeHtml(option.company)}
                    </span>
                    <h3 class="result-card__title">${escapeHtml(option.title)}</h3>
                </div>
                <div style="text-align: right;">
                    <div class="result-card__price">${formatPrice(option.price)}</div>
                    <div class="result-card__rank">Rang #${rank}</div>
                </div>
            </div>

            <div class="result-card__details">
                <div class="result-card__detail">
                    <span class="result-card__detail-label">Max. Gewicht</span>
                    <span class="result-card__detail-value">${formatWeight(option.maximalweight)}</span>
                </div>
                <div class="result-card__detail">
                    <span class="result-card__detail-label">Max. Maße</span>
                    <span class="result-card__detail-value">${escapeHtml(maxSizesDisplay)}</span>
                </div>
                <div class="result-card__detail">
                    <span class="result-card__detail-label">Versicherung</span>
                    <span class="result-card__detail-value">${insuranceDisplay}</span>
                </div>
                ${
                  option.conditions
                    ? `
                <div class="result-card__detail">
                    <span class="result-card__detail-label">Bedingungen</span>
                    <span class="result-card__detail-value">${escapeHtml(option.conditions)}</span>
                </div>
                `
                    : ""
                }
            </div>

            ${
              linkHtml
                ? `
            <div class="result-card__footer">
                ${linkHtml}
            </div>
            `
                : ""
            }
        </article>
    `;
}

/**
 * Rendert die Tabelle und Cards
 */
function renderTable() {
  const sorted = sortOptions(
    state.filteredOptions,
    state.currentSort.field,
    state.currentSort.direction,
  );

  if (sorted.length === 0) {
    elements.resultsBody.innerHTML = "";
    elements.resultsCards.innerHTML = "";
    elements.emptyState.classList.remove("hidden");
    elements.cheapestDisplay.textContent = "-";
  } else {
    elements.emptyState.classList.add("hidden");

    // Günstigster Preis (nach Sortierung ist es der erste wenn nach Preis sortiert)
    const cheapest = [...sorted].sort(
      (a, b) => parseFloat(a.price) - parseFloat(b.price),
    )[0];
    const cheapestPrice = parseFloat(cheapest.price);

    // Tabellen-Rows rendern
    elements.resultsBody.innerHTML = sorted
      .map((option, index) => {
        const isCheapest = parseFloat(option.price) === cheapestPrice;
        return renderTableRow(option, index + 1, isCheapest);
      })
      .join("");

    // Cards rendern
    elements.resultsCards.innerHTML = sorted
      .map((option, index) => {
        const isCheapest = parseFloat(option.price) === cheapestPrice;
        return renderCard(option, index + 1, isCheapest);
      })
      .join("");

    // Günstigsten Preis anzeigen
    elements.cheapestDisplay.textContent = formatPrice(cheapest.price);
  }

  // Count aktualisieren
  elements.countDisplay.textContent = sorted.length;
}

/**
 * Aktualisiert Live-Statistiken
 */
function updateStats() {
  const sides = [
    state.userInput.side1,
    state.userInput.side2,
    state.userInput.side3,
  ];

  const sortedSides = sortSides(...sides);
  const volume = calculateVolume(sides);
  const girth = calculateGirth(sortedSides);

  // Volumen
  if (volume > 0) {
    if (volume >= 1000000) {
      elements.volumeDisplay.textContent = `${(volume / 1000000).toFixed(2)} dm³`;
    } else {
      elements.volumeDisplay.textContent = `${volume.toLocaleString("de-DE")} cm³`;
    }
  } else {
    elements.volumeDisplay.textContent = "0 cm³";
  }

  // Gurtmaß
  elements.girthDisplay.textContent = `${girth.toLocaleString("de-DE")} cm`;
}

/**
 * Aktualisiert Sortier-Icons
 */
function updateSortIcons() {
  const headers = elements.resultsTable.querySelectorAll("th.sortable");

  headers.forEach((th) => {
    th.classList.remove("sorted-asc", "sorted-desc");
    const icon = th.querySelector(".sort-icon");

    if (th.dataset.sort === state.currentSort.field) {
      th.classList.add(`sorted-${state.currentSort.direction}`);
      icon.textContent = state.currentSort.direction === "asc" ? "↑" : "↓";
    } else {
      icon.textContent = "⇅";
    }
  });
}

/**
 * Setzt Input-Felder auf State-Werte
 */
function updateInputFields() {
  elements.side1.value = state.userInput.side1 || "";
  elements.side2.value = state.userInput.side2 || "";
  elements.side3.value = state.userInput.side3 || "";

  // Gewicht: Wert im state ist in Gramm gespeichert
  if (state.userInput.weight > 0) {
    if (state.userInput.weightUnit === 1000) {
      elements.weight.value = state.userInput.weight / 1000;
    } else {
      elements.weight.value = state.userInput.weight;
    }
  } else {
    elements.weight.value = "";
  }

  elements.weightUnit.value = state.userInput.weightUnit;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Handler für Input-Änderungen
 */
const handleInputChange = debounce(() => {
  state.userInput.side1 = parseNumber(elements.side1.value);
  state.userInput.side2 = parseNumber(elements.side2.value);
  state.userInput.side3 = parseNumber(elements.side3.value);

  const weightValue = parseNumber(elements.weight.value);
  const weightMultiplier = parseInt(elements.weightUnit.value, 10);
  state.userInput.weight = weightValue * weightMultiplier;
  state.userInput.weightUnit = weightMultiplier;

  state.filteredOptions = filterOptions();
  renderTable();
  updateStats();
  saveToStorage();
}, CONFIG.debounceTime);

/**
 * Handler für Suche
 */
const handleSearch = debounce(() => {
  state.searchQuery = elements.searchInput.value.trim();
  state.filteredOptions = filterOptions();
  renderTable();
}, CONFIG.debounceTime);

/**
 * Handler für Reset
 */
function handleReset() {
  // Felder zurücksetzen
  elements.side1.value = "";
  elements.side2.value = "";
  elements.side3.value = "";
  elements.weight.value = "";
  elements.weightUnit.value = "1";
  elements.searchInput.value = "";

  // State zurücksetzen
  state.userInput = { side1: 0, side2: 0, side3: 0, weight: 0, weightUnit: 1 };
  state.companyFilter = "all";
  state.searchQuery = "";

  // Filter-Chips zurücksetzen
  elements.filterChips.forEach((chip) => {
    chip.classList.toggle("active", chip.dataset.filter === "all");
  });

  // URL bereinigen
  window.history.replaceState({}, "", window.location.pathname);

  // Neu rendern
  state.filteredOptions = filterOptions();
  renderTable();
  updateStats();
  saveToStorage();

  showToast("Eingaben zurückgesetzt 🔄");
}

/**
 * Handler für Share-Button
 */
async function handleShare() {
  const url = createShareUrl();

  try {
    await navigator.clipboard.writeText(url);
    showToast("Link kopiert! 📋");
  } catch (e) {
    // Fallback für ältere Browser
    const input = document.createElement("input");
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
    showToast("Link kopiert! 📋");
  }
}

/**
 * Handler für Sortierung
 */
function handleSort(event) {
  const th = event.target.closest("th.sortable");
  if (!th) return;

  const field = th.dataset.sort;

  if (state.currentSort.field === field) {
    state.currentSort.direction =
      state.currentSort.direction === "asc" ? "desc" : "asc";
  } else {
    state.currentSort.field = field;
    state.currentSort.direction = "asc";
  }

  updateSortIcons();
  renderTable();
}

/**
 * Handler für Filter-Chips
 */
function handleFilterChip(event) {
  const chip = event.target.closest(".chip");
  if (!chip) return;

  elements.filterChips.forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");

  state.companyFilter = chip.dataset.filter;

  state.filteredOptions = filterOptions();
  renderTable();
  saveToStorage();
}

/**
 * Handler für Theme-Toggle
 */
function handleThemeToggle() {
  toggleTheme();
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialisiert Event-Listener
 */
function initEventListeners() {
  // Input-Felder
  const inputFields = [
    elements.side1,
    elements.side2,
    elements.side3,
    elements.weight,
    elements.weightUnit,
  ];
  inputFields.forEach((field) => {
    field.addEventListener("input", handleInputChange);
  });

  // Suchfeld
  elements.searchInput.addEventListener("input", handleSearch);

  // Buttons
  elements.resetBtn.addEventListener("click", handleReset);
  elements.shareBtn.addEventListener("click", handleShare);
  elements.themeToggle.addEventListener("click", handleThemeToggle);

  // Tabellen-Header für Sortierung
  elements.resultsTable
    .querySelector("thead")
    .addEventListener("click", handleSort);

  // Filter-Chips
  document
    .querySelector(".filter-chips")
    .addEventListener("click", handleFilterChip);
}

/**
 * Initialisiert State aus Storage/URL
 */
function initState() {
  // Erst Storage laden
  const storageData = loadFromStorage();

  // Theme aus Storage anwenden
  if (storageData?.theme) {
    setTheme(storageData.theme);
  }

  // URL-Parameter haben Priorität
  const urlData = loadFromUrl();

  if (urlData) {
    state.userInput = { ...state.userInput, ...urlData };
  } else if (storageData?.userInput) {
    state.userInput = { ...state.userInput, ...storageData.userInput };
  }

  if (storageData?.companyFilter) {
    state.companyFilter = storageData.companyFilter;

    // Chip aktivieren
    elements.filterChips.forEach((chip) => {
      chip.classList.toggle(
        "active",
        chip.dataset.filter === state.companyFilter,
      );
    });
  }
}

/**
 * Hauptinitialisierung
 */
async function init() {
  console.log("🚀 Punk Shipping Calculator startet...");

  // Event-Listener einrichten
  initEventListeners();

  // State initialisieren (Storage/URL)
  initState();

  // Daten laden
  state.allOptions = await loadShippingOptions();
  state.filteredOptions = filterOptions();

  // Loading-State ausblenden
  elements.loadingState.classList.add("hidden");

  // Input-Felder mit State-Werten füllen
  updateInputFields();

  // Initiale Sortierung und Rendering
  updateSortIcons();
  renderTable();
  updateStats();

  console.log(`✅ ${state.allOptions.length} Versandoptionen geladen`);

  // Info wenn URL-Parameter verwendet wurden
  if (loadFromUrl()) {
    showToast("Daten aus Link geladen 🔗");
  }
}

// Los geht's! 🎸
document.addEventListener("DOMContentLoaded", init);
